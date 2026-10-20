#!/usr/bin/env python3
"""Run a C++ CLI once and validate its versioned JSON-lines snapshots."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Iterable

VERSION = 1
CELL_COUNT = 9
CELL_VALUES = {"X", "O", " "}
PLAYERS = {"X", "O"}
STATUSES = {"in_progress", "x_wins", "o_wins", "draw"}


def parse_snapshot(line: str) -> dict:
    """Parse and validate one snapshot line."""
    try:
        data = json.loads(line)
    except json.JSONDecodeError as error:
        raise ValueError(f"不是合法 JSON：{line[:120]!r}") from error
    if not isinstance(data, dict):
        raise ValueError("快照必须是 JSON 对象")
    if data.get("version") != VERSION:
        raise ValueError(f"不支持的协议版本：{data.get('version')!r}")
    sequence = data.get("sequence")
    if not isinstance(sequence, int) or isinstance(sequence, bool):
        raise ValueError("sequence 必须是整数")
    cells = data.get("cells")
    if not isinstance(cells, list) or len(cells) != CELL_COUNT:
        raise ValueError(f"cells 必须是长度 {CELL_COUNT} 的数组")
    if any(cell not in CELL_VALUES for cell in cells):
        raise ValueError("cells 含非法值")
    if data.get("player") not in PLAYERS:
        raise ValueError("player 非法")
    if data.get("status") not in STATUSES:
        raise ValueError("status 非法")
    return data


def read_snapshots(lines: Iterable[str]) -> list[dict]:
    """Parse snapshot lines and require strictly increasing sequence numbers."""
    snapshots: list[dict] = []
    previous: int | None = None
    for line in lines:
        text = line.rstrip("\r\n")
        if not text.startswith("{"):
            continue
        snapshot = parse_snapshot(text)
        sequence = snapshot["sequence"]
        if previous is not None and sequence <= previous:
            raise ValueError(f"sequence 必须严格递增：{sequence} 在 {previous} 之后")
        previous = sequence
        snapshots.append(snapshot)
    return snapshots


def run_app(app: str, moves: list[str], timeout: float) -> tuple[list[dict], str]:
    """Run the app with line-oriented moves and return snapshots plus stderr."""
    payload = "".join(move + "\n" for move in moves)
    try:
        result = subprocess.run(
            [app],
            input=payload,
            text=True,
            encoding="utf-8",
            capture_output=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise RuntimeError(f"程序在 {timeout:g} 秒内未结束") from error
    if result.returncode != 0:
        detail = result.stderr.strip() or "无 stderr"
        raise RuntimeError(f"程序退出码 {result.returncode}：{detail}")
    snapshots = read_snapshots(result.stdout.splitlines())
    if not snapshots:
        raise RuntimeError("stdout 中没有快照行")
    return snapshots, result.stderr


def build_moves(raw: list[str]) -> list[str]:
    """Turn row/col pairs into `row col` command lines."""
    if len(raw) % 2 != 0:
        raise ValueError("--moves 需要成对的 row col")
    return [f"{raw[index]} {raw[index + 1]}" for index in range(0, len(raw), 2)]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", required=True, help="C++ 可执行文件")
    parser.add_argument("--moves", nargs="*", default=[], metavar="N", help="row col 成对出现")
    parser.add_argument("--timeout", type=float, default=8.0, help="超时秒数")
    parser.add_argument("--show-stderr", action="store_true", help="打印 stderr")
    args = parser.parse_args(argv)

    try:
        moves = build_moves(args.moves)
        snapshots, stderr = run_app(args.app, moves, args.timeout)
    except (OSError, RuntimeError, ValueError) as error:
        print(f"replay: {error}", file=sys.stderr)
        return 1

    if args.show_stderr and stderr.strip():
        print(stderr.rstrip(), file=sys.stderr)
    for snapshot in snapshots:
        print(json.dumps(snapshot, ensure_ascii=False, sort_keys=True))
    print(f"replay: {len(snapshots)} 条快照，最终状态 {snapshots[-1]['status']}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
