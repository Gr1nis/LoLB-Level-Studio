#!/usr/bin/env python3
"""
LoLB Level Studio - Standalone Server
Zero-dependency HTTP server & solver bridge for PandaGames Level Studio.
Serves static frontend directly from repo root and level data from ./data/.
"""

import os
import sys
import json
import time
import queue
import threading
from urllib.parse import urlparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from typing import Any

# Import local solver
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
import solver

STATIC_DIR = BASE_DIR
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE_DIR, "data"))

BOOK_LEVELS_PATH = os.environ.get("BOOK_LEVELS_PATH", os.path.join(DATA_DIR, "book_levels.json"))
POST_LEVELS_PATH = os.environ.get("POST_LEVELS_PATH", os.path.join(DATA_DIR, "post_levels.json"))
SHAPES_CATALOG_PATH = os.environ.get("SHAPES_CATALOG_PATH", os.path.join(DATA_DIR, "shapes_catalog.json"))
RULES_CATALOG_PATH = os.environ.get("RULES_CATALOG_PATH", os.path.join(DATA_DIR, "rules_catalog.json"))

# Optional Unity project integration path
DEFAULT_UNITY_STREAMING = os.path.abspath(os.path.join(BASE_DIR, "..", "LoLB", "Assets", "StreamingAssets"))
UNITY_STREAMING_DIR = os.environ.get("UNITY_STREAMING_DIR", DEFAULT_UNITY_STREAMING if os.path.isdir(DEFAULT_UNITY_STREAMING) else None)

# SSE Clients for real-time broadcasts
sse_clients = []
sse_lock = threading.Lock()

def broadcast_sse(event_type: str, data: dict):
    payload = f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
    with sse_lock:
        dead_clients = []
        for q in sse_clients:
            try:
                q.put_nowait(payload)
            except Exception:
                dead_clients.append(q)
        for d in dead_clients:
            if d in sse_clients:
                sse_clients.remove(d)

class LevelStudioHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        if not any(h.startswith(b"Access-Control-Allow-Origin") for h in getattr(self, "_headers_buffer", [])):
            self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def _send_json(self, status_code: int, data: Any):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # SSE Stream for real-time AI updates
        if path == "/api/sse":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            client_queue = queue.Queue()
            with sse_lock:
                sse_clients.append(client_queue)

            initial_ping = f"event: connected\ndata: {json.dumps({'time': time.time(), 'status': 'connected'})}\n\n"
            self.wfile.write(initial_ping.encode("utf-8"))
            self.wfile.flush()

            try:
                while True:
                    msg = client_queue.get()
                    self.wfile.write(msg.encode("utf-8"))
                    self.wfile.flush()
            except (ConnectionResetError, BrokenPipeError):
                pass
            finally:
                with sse_lock:
                    if client_queue in sse_clients:
                        sse_clients.remove(client_queue)
            return

        # REST API endpoints
        if path == "/api/levels/books":
            if os.path.exists(BOOK_LEVELS_PATH):
                with open(BOOK_LEVELS_PATH, "r", encoding="utf-8") as f:
                    self._send_json(200, json.load(f))
            else:
                self._send_json(404, {"error": "book_levels.json not found"})
            return

        if path == "/api/levels/post":
            if os.path.exists(POST_LEVELS_PATH):
                with open(POST_LEVELS_PATH, "r", encoding="utf-8") as f:
                    self._send_json(200, json.load(f))
            else:
                self._send_json(404, {"error": "post_levels.json not found"})
            return

        if path == "/api/catalog/shapes":
            if os.path.exists(SHAPES_CATALOG_PATH):
                with open(SHAPES_CATALOG_PATH, "r", encoding="utf-8") as f:
                    self._send_json(200, json.load(f))
            else:
                self._send_json(404, {"error": "shapes_catalog.json not found"})
            return

        if path == "/api/catalog/rules":
            if os.path.exists(RULES_CATALOG_PATH):
                with open(RULES_CATALOG_PATH, "r", encoding="utf-8") as f:
                    self._send_json(200, json.load(f))
            else:
                self._send_json(404, {"error": "rules_catalog.json not found"})
            return

        # Fallback to static files
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(length) if length > 0 else b"{}"
        try:
            body = json.loads(raw_body.decode("utf-8"))
        except Exception as e:
            self._send_json(400, {"error": f"Invalid JSON body: {str(e)}"})
            return

        if path == "/api/levels/books":
            os.makedirs(os.path.dirname(BOOK_LEVELS_PATH), exist_ok=True)
            with open(BOOK_LEVELS_PATH, "w", encoding="utf-8") as f:
                json.dump(body, f, ensure_ascii=False, indent=4)

            # Optional synchronization with Unity StreamingAssets if available
            if UNITY_STREAMING_DIR:
                unity_books = os.path.join(UNITY_STREAMING_DIR, "BookLevels", "book_levels.json")
                if os.path.exists(os.path.dirname(unity_books)):
                    try:
                        with open(unity_books, "w", encoding="utf-8") as uf:
                            json.dump(body, uf, ensure_ascii=False, indent=4)
                    except Exception as ue:
                        print(f"Notice: Unity sync skipped: {ue}")

            broadcast_sse("level_saved", {"type": "books", "count": len(body.get("levels", []))})
            self._send_json(200, {"ok": True, "saved": BOOK_LEVELS_PATH, "count": len(body.get("levels", []))})
            return

        if path == "/api/levels/post":
            os.makedirs(os.path.dirname(POST_LEVELS_PATH), exist_ok=True)
            with open(POST_LEVELS_PATH, "w", encoding="utf-8") as f:
                json.dump(body, f, ensure_ascii=False, indent=4)

            # Optional synchronization with Unity StreamingAssets if available
            if UNITY_STREAMING_DIR:
                unity_post = os.path.join(UNITY_STREAMING_DIR, "PostLevels", "post_levels.json")
                if os.path.exists(os.path.dirname(unity_post)):
                    try:
                        with open(unity_post, "w", encoding="utf-8") as uf:
                            json.dump(body, uf, ensure_ascii=False, indent=4)
                    except Exception as ue:
                        print(f"Notice: Unity sync skipped: {ue}")

            broadcast_sse("level_saved", {"type": "post", "count": len(body.get("levels", []))})
            self._send_json(200, {"ok": True, "saved": POST_LEVELS_PATH, "count": len(body.get("levels", []))})
            return

        if path == "/api/ai/solve-post":
            grid_w = body.get("gridWidth", 6)
            grid_h = body.get("gridHeight", 6)
            shapes = body.get("shapes", [])
            blocked = body.get("blockedCells", [])

            # Load full shapes catalog to enrich cells if not provided
            if os.path.exists(SHAPES_CATALOG_PATH):
                with open(SHAPES_CATALOG_PATH, "r", encoding="utf-8") as cf:
                    cat = {item["id"]: item for item in json.load(cf)}
                for s in shapes:
                    sid = s.get("shapeId") or s.get("id")
                    if "cells" not in s and sid in cat:
                        s["cells"] = cat[sid]["cells"]

            result = solver.solve_polyomino_packing(grid_w, grid_h, shapes, blocked)
            self._send_json(200, result)
            return

        if path == "/api/ai/broadcast-step":
            broadcast_sse("ai_step", body)
            self._send_json(200, {"ok": True, "broadcasted": body})
            return

        self._send_json(404, {"error": "Endpoint not found"})

def run_server(port=8080):
    start_port = port
    server = None
    for p in range(start_port, start_port + 10):
        try:
            server = ThreadingHTTPServer(("0.0.0.0", p), LevelStudioHandler)
            port = p
            break
        except OSError as e:
            if getattr(e, 'errno', None) == 48 or 'Address already in use' in str(e):
                print(f"⚠️ Port {p} is busy, trying port {p + 1}...")
                continue
            raise
    if server is None:
        print(f"❌ Could not bind to any port in range {start_port}..{start_port + 9}")
        return

    print(f"🚀 LoLB Level Studio Server running at http://localhost:{port}/")
    print(f"📁 Serving static files from: {STATIC_DIR}")
    print(f"📦 Level Data Targets:")
    print(f"   Books: {BOOK_LEVELS_PATH}")
    print(f"   Post:  {POST_LEVELS_PATH}")
    if UNITY_STREAMING_DIR:
        print(f"🔄 Unity Mirroring: {UNITY_STREAMING_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        server.server_close()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    run_server(port)
