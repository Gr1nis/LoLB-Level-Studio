#!/usr/bin/env python3
"""
LoLB Level Studio - QA Verification Test Suite
Automated sanity, syntax, API endpoint, and export verification.
"""

import json
import os
import subprocess
import sys

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC_JS_DIR = os.path.join(REPO_ROOT, "js")
DATA_DIR = os.path.join(REPO_ROOT, "data")

JS_FILES = [
    "state.js",
    "bamboo_post.js",
    "shelf_zen.js",
    "ai_bridge.js",
    "app.js"
]

PY_FILES = [
    "server.py",
    "solver.py"
]

REQUIRED_EXPORTS = [
    "switchMode",
    "saveLevelsToDisk",
    "reloadLevelsFromDisk",
    "selectLevel",
    "setGridSize",
    "clearGrid",
    "fillGapsWithObstacles",
    "addShelf",
    "deleteShelf",
    "toggleShelfRule",
    "toggleStaticSlot",
    "runAiSolver",
    "solvePolyominoClient",
    "calculateBfsDensityClient"
]

def check_python_syntax():
    print("🔍 [1/5] Checking Python syntax...")
    for pf in PY_FILES:
        path = os.path.join(REPO_ROOT, pf)
        if not os.path.exists(path):
            print(f"❌ Missing Python file: {path}")
            return False
        res = subprocess.run([sys.executable, "-m", "py_compile", path], capture_output=True, text=True)
        if res.returncode != 0:
            print(f"❌ Python syntax error in {pf}:\n{res.stderr}")
            return False
        print(f"  ✓ {pf} syntax OK")
    return True

def check_js_syntax():
    print("🔍 [2/5] Checking JavaScript syntax (node -c)...")
    for jf in JS_FILES:
        path = os.path.join(STATIC_JS_DIR, jf)
        if not os.path.exists(path):
            print(f"❌ Missing JS file: {path}")
            return False
        res = subprocess.run(["node", "-c", path], capture_output=True, text=True)
        if res.returncode != 0:
            print(f"❌ JS syntax error in {jf}:\n{res.stderr}")
            return False
        print(f"  ✓ {jf} syntax OK")
    return True

def check_data_catalogs():
    print("🔍 [3/5] Validating JSON data files...")
    files = ["post_levels.json", "book_levels.json", "shapes_catalog.json", "rules_catalog.json"]
    for df in files:
        path = os.path.join(DATA_DIR, df)
        if not os.path.exists(path):
            print(f"❌ Missing data file: {path}")
            return False
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            count = len(data.get("levels", [])) if isinstance(data, dict) and "levels" in data else len(data) if isinstance(data, list) else len(data.get("rules", []))
            print(f"  ✓ {df} valid JSON (entries: {count})")
        except Exception as e:
            print(f"❌ Corrupt JSON in {df}: {e}")
            return False
    return True

def check_required_exports():
    print("🔍 [4/5] Checking required window functions in HTML & JS...")
    combined_content = ""
    index_path = os.path.join(REPO_ROOT, "index.html")
    with open(index_path, "r", encoding="utf-8") as f:
        combined_content += f.read()

    for jf in JS_FILES:
        with open(os.path.join(STATIC_JS_DIR, jf), "r", encoding="utf-8") as f:
            combined_content += "\n" + f.read()

    missing = []
    for exp in REQUIRED_EXPORTS:
        if exp not in combined_content:
            missing.append(exp)

    if missing:
        print(f"❌ Missing required exports: {missing}")
        return False
    print(f"  ✓ All {len(REQUIRED_EXPORTS)} required functions defined across codebase")
    return True

def check_solver_algorithm():
    print("🔍 [5/5] Testing solver algorithm...")
    sys.path.insert(0, REPO_ROOT)
    import solver

    shapes = [
        {"shapeId": "Keys", "cells": [{"x": 0, "y": 0}, {"x": 1, "y": 0}, {"x": 0, "y": 1}]},
        {"shapeId": "Feather", "cells": [{"x": 0, "y": 0}, {"x": 1, "y": 0}]}
    ]
    blocked = [{"x": 0, "y": 0}]
    res = solver.solve_polyomino_packing(3, 3, shapes, blocked)
    if not res.get("solvable"):
        print("❌ Solver failed to solve a simple 3x3 packing puzzle")
        return False
    density = res.get("density", {})
    if "densityMultiplier" not in density or "rewardCoins" not in density:
        print("❌ Solver result missing density calculation")
        return False
    print(f"  ✓ Solver verified (solvable: {res['solvable']}, density: {density['densityPercent']}%, coins: {density['rewardCoins']})")
    return True

def main():
    print("=" * 60)
    print("LoLB Level Studio - Automated QA Verification")
    print("=" * 60)
    success = (
        check_python_syntax() and
        check_js_syntax() and
        check_data_catalogs() and
        check_required_exports() and
        check_solver_algorithm()
    )
    print("=" * 60)
    if success:
        print("🎉 ALL CHECKS PASSED: Level Studio is ready for production and standalone release!")
        sys.exit(0)
    else:
        print("💥 QA VERIFICATION FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()
