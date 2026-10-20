#!/usr/bin/env python3
"""A loopback-only HTTP bridge over a persistent C++ JSON-lines process."""

from __future__ import annotations

import argparse
import json
import queue
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

MAX_BODY = 4096
READY_TIMEOUT = 8.0

HTML = """<!doctype html>
<meta charset="utf-8">
<title>engine bridge</title>
<style>
 body { font: 16px system-ui, sans-serif; max-width: 46rem; margin: 2rem auto; }
 pre { background: #f3f3f3; padding: 1rem; overflow: auto; }
 input, button { font: inherit; padding: .3rem .5rem; }
</style>
<h1>engine bridge</h1>
<p>输入命令，例如 <code>move 1 2</code>、<code>status</code>、<code>quit</code>。</p>
<form id="form"><input id="command" value="status" size="30"><button>发送</button></form>
<pre id="output"></pre>
<script>
const form = document.querySelector('#form');
const output = document.querySelector('#output');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const command = document.querySelector('#command').value;
  const response = await fetch('/api/command', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({command}),
  });
  const body = await response.json();
  output.textContent = JSON.stringify(body, null, 2);
});
</script>
"""


class Session:
    """Own one C++ process and serialize commands against it."""

    def __init__(self, app: str, cwd: str | None, timeout: float) -> None:
        self.app = app
        self.timeout = timeout
        self.lock = threading.Lock()
        self.process = subprocess.Popen(
            [app],
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            bufsize=1,
        )
        self.snapshots: queue.Queue[str | None] = queue.Queue()
        self.errors: queue.Queue[str | None] = queue.Queue()
        self.last_sequence = -1
        threading.Thread(target=self._pump, args=(self.process.stdout, self.snapshots), daemon=True).start()
        threading.Thread(target=self._pump, args=(self.process.stderr, self.errors), daemon=True).start()
        self._wait_snapshot(READY_TIMEOUT)

    @staticmethod
    def _pump(stream: Any, target: queue.Queue[str | None]) -> None:
        try:
            for line in stream:
                target.put(line)
        finally:
            target.put(None)

    def _wait_snapshot(self, timeout: float) -> dict:
        while True:
            try:
                line = self.snapshots.get(timeout=timeout)
            except queue.Empty as error:
                raise TimeoutError("等待快照超时") from error
            if line is None:
                detail = "".join(iter(self.errors.get_nowait, None)).strip() if not self.errors.empty() else ""
                raise RuntimeError(f"C++ 进程已退出{': ' + detail if detail else ''}")
            text = line.rstrip("\r\n")
            if not text.startswith("{"):
                continue
            data = json.loads(text)
            sequence = data.get("sequence")
            if not isinstance(sequence, int) or isinstance(sequence, bool):
                raise ValueError("快照缺少整数 sequence")
            if sequence <= self.last_sequence:
                raise ValueError("sequence 必须严格递增")
            self.last_sequence = sequence
            return data

    def command(self, command: str) -> dict:
        if not command.strip():
            raise ValueError("command 不能为空")
        if "\n" in command or "\r" in command:
            raise ValueError("command 不能包含换行")
        with self.lock:
            if self.process.poll() is not None:
                raise RuntimeError("C++ 进程已退出")
            assert self.process.stdin is not None
            self.process.stdin.write(command.rstrip("\r\n") + "\n")
            self.process.stdin.flush()
            return self._wait_snapshot(self.timeout)

    def close(self) -> None:
        with self.lock:
            if self.process.poll() is not None:
                return
            try:
                if self.process.stdin is not None:
                    self.process.stdin.write("quit\n")
                    self.process.stdin.flush()
            except (BrokenPipeError, OSError):
                pass
            try:
                self.process.wait(timeout=1.0)
            except subprocess.TimeoutExpired:
                self.process.terminate()
                try:
                    self.process.wait(timeout=1.0)
                except subprocess.TimeoutExpired:
                    self.process.kill()
                    self.process.wait(timeout=1.0)


class Handler(BaseHTTPRequestHandler):
    server: "BridgeServer"

    def log_message(self, format: str, *args: Any) -> None:
        print(f"bridge: {format % args}", file=sys.stderr)

    def _send_json(self, status: int, payload: Any) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/":
            self.send_error(404)
            return
        body = HTML.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/api/close":
            self.server.session.close()
            self._send_json(200, {"ok": True})
            return
        if self.path != "/api/command":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        if length > MAX_BODY:
            self.send_error(413, "请求体过大")
            return
        try:
            payload = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            self._send_json(400, {"error": {"code": "bad_json", "message": "JSON 格式错误"}})
            return
        if not isinstance(payload, dict) or not isinstance(payload.get("command"), str):
            self._send_json(400, {"error": {"code": "bad_command", "message": "需要 command 字符串"}})
            return
        try:
            snapshot = self.server.session.command(payload["command"])
        except ValueError as error:
            self._send_json(400, {"error": {"code": "bad_command", "message": str(error)}})
            return
        except (RuntimeError, TimeoutError) as error:
            self._send_json(503, {"error": {"code": "session_failed", "message": str(error)}})
            return
        self._send_json(200, {"snapshot": snapshot})


class BridgeServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], session: Session) -> None:
        super().__init__(address, Handler)
        self.session = session


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", required=True, help="C++ 可执行文件")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--cwd", default=None, help="子进程工作目录")
    parser.add_argument("--timeout", type=float, default=8.0)
    args = parser.parse_args(argv)

    try:
        session = Session(args.app, args.cwd, args.timeout)
    except (OSError, RuntimeError, TimeoutError, ValueError) as error:
        print(f"bridge: 启动失败：{error}", file=sys.stderr)
        return 1
    server = BridgeServer(("127.0.0.1", args.port), session)
    print(f"bridge: http://127.0.0.1:{server.server_port}/", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        session.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
