#!/usr/bin/env python3
"""
Algorithmic Solver & Optimizer for BambooPost (Polyomino Bin Packing)
Supports rotation (0, 90, 180, 270), obstacle placement, and BFS FloodFill density scoring.
"""

from collections import deque
from typing import List, Tuple, Dict, Any, Optional

def rotate_cells_90(cells: List[Dict[str, int]]) -> List[Dict[str, int]]:
    """Rotate cells clockwise by 90 degrees: (x, y) -> (y, -x), then normalize min x,y to 0."""
    if not cells:
        return []
    raw = [(c["y"], -c["x"]) for c in cells]
    min_x = min(p[0] for p in raw)
    min_y = min(p[1] for p in raw)
    return [{"x": p[0] - min_x, "y": p[1] - min_y} for p in raw]

def get_unique_rotations(cells: List[Dict[str, int]]) -> List[List[Dict[str, int]]]:
    """Return all unique rotated variations (0, 90, 180, 270)."""
    rotations = []
    seen = set()
    current = cells
    for _ in range(4):
        # Normalize representation to check uniqueness
        sorted_coords = tuple(sorted((c["x"], c["y"]) for c in current))
        if sorted_coords not in seen:
            seen.add(sorted_coords)
            rotations.append(current)
        current = rotate_cells_90(current)
    return rotations

def calculate_bfs_density(grid_w: int, grid_h: int, blocked_or_filled: set) -> Dict[str, Any]:
    """
    Implements the exact BambooPostDensityCalculator logic:
    Finds empty cell islands using BFS FloodFill.
    DensityMultiplier = max(0.3, 1.0 - 0.15 * max(0, island_count - 1))
    Reward = 30 + round(20 * DensityMultiplier)
    """
    empty_cells = set()
    for x in range(grid_w):
        for y in range(grid_h):
            if (x, y) not in blocked_or_filled:
                empty_cells.add((x, y))

    total_empty = len(empty_cells)
    if total_empty == 0:
        return {
            "densityMultiplier": 1.0,
            "densityPercent": 100,
            "largestIsland": 0,
            "totalEmpty": 0,
            "rewardCoins": 50
        }

    visited = set()
    islands = []

    for cell in empty_cells:
        if cell in visited:
            continue
        
        # BFS from this cell
        island_size = 0
        q = deque([cell])
        visited.add(cell)

        while q:
            cx, cy = q.popleft()
            island_size += 1

            for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                nx, ny = cx + dx, cy + dy
                if (nx, ny) in empty_cells and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    q.append((nx, ny))

        islands.append(island_size)

    largest_island = max(islands) if islands else 0
    island_count = len(islands)
    if island_count == 0:
        multiplier = 1.0
    else:
        multiplier = max(0.3, 1.0 - 0.15 * max(0, island_count - 1))
    multiplier = max(0.0, min(1.0, multiplier))
    reward = 30 + round(20 * multiplier)

    return {
        "densityMultiplier": round(multiplier, 3),
        "densityPercent": round(multiplier * 100),
        "largestIsland": largest_island,
        "totalEmpty": total_empty,
        "islands": islands,
        "rewardCoins": reward
    }

def solve_polyomino_packing(
    grid_w: int,
    grid_h: int,
    shapes: List[Dict[str, Any]],
    blocked: List[Dict[str, int]]
) -> Dict[str, Any]:
    """
    Backtracking solver for BambooPost.
    Attempts to place all given shapes into grid without overlapping obstacles or each other.
    Returns placement coordinates and density score.
    """
    blocked_set = {(b["x"], b["y"]) for b in blocked}
    
    # Precompute rotations for each shape
    prepared_shapes = []
    for s in shapes:
        shape_id = s.get("shapeId") or s.get("id")
        cells = s.get("cells", [])
        rots = get_unique_rotations(cells)
        prepared_shapes.append({
            "id": shape_id,
            "rotations": rots
        })

    # Sort shapes by cell count descending (heuristic for faster backtracking)
    indexed_shapes = list(enumerate(prepared_shapes))
    indexed_shapes.sort(key=lambda item: len(item[1]["rotations"][0]), reverse=True)

    grid = [[False for _ in range(grid_h)] for _ in range(grid_w)]
    for bx, by in blocked_set:
        if 0 <= bx < grid_w and 0 <= by < grid_h:
            grid[bx][by] = True

    placements = [None] * len(shapes)

    def can_place(rot_cells, ox, oy):
        for c in rot_cells:
            tx = ox + c["x"]
            ty = oy + c["y"]
            if tx < 0 or tx >= grid_w or ty < 0 or ty >= grid_h:
                return False
            if grid[tx][ty]:
                return False
        return True

    def place_shape(rot_cells, ox, oy, val):
        for c in rot_cells:
            grid[ox + c["x"]][oy + c["y"]] = val

    def backtrack(idx):
        if idx == len(indexed_shapes):
            return True

        orig_idx, shape_data = indexed_shapes[idx]
        for rot_idx, rot_cells in enumerate(shape_data["rotations"]):
            for x in range(grid_w):
                for y in range(grid_h):
                    if can_place(rot_cells, x, y):
                        place_shape(rot_cells, x, y, True)
                        placements[orig_idx] = {
                            "shapeId": shape_data["id"],
                            "origin": {"x": x, "y": y},
                            "rotationIndex": rot_idx,
                            "placedCells": [{"x": x + c["x"], "y": y + c["y"]} for c in rot_cells]
                        }

                        if backtrack(idx + 1):
                            return True

                        place_shape(rot_cells, x, y, False)
                        placements[orig_idx] = None
        return False

    success = backtrack(0)

    # Calculate final density
    filled_set = set(blocked_set)
    if success:
        for p in placements:
            if p:
                for c in p["placedCells"]:
                    filled_set.add((c["x"], c["y"]))

    density = calculate_bfs_density(grid_w, grid_h, filled_set)

    return {
        "solvable": success,
        "gridWidth": grid_w,
        "gridHeight": grid_h,
        "placements": placements if success else [],
        "density": density
    }
