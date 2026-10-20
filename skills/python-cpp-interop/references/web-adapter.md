# 本地 HTTP 适配

浏览器不能直接启动 C++ 进程。Python 可以做一个只监听本机的薄适配层：HTTP 请求进，JSON 快照出，C++ 进程仍拥有规则和状态。

## 架构

```text
浏览器  --HTTP/JSON-->  Python 适配层  --stdin/stdout JSON 行-->  C++ app
```

- 适配层不实现游戏规则，只转发命令、缓存最后一条快照、把错误翻译成 HTTP 状态码。
- C++ 进程是唯一状态源；Python 不维护第二份棋盘。
- 一个页面会话对应一个 C++ 进程；不要多个浏览器共享一个可变会话，除非显式设计。

## 服务器骨架

```python
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json

MAX_BODY = 4096

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > MAX_BODY:
            self.send_error(413, "请求体过大")
            return
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            self.send_error(400, "JSON 格式错误")
            return
        try:
            snapshot = session.command(payload)
        except ValueError as error:
            self.send_error(400, str(error))
            return
        except Exception:
            self.send_error(500, "内部错误")
            return
        body = json.dumps(snapshot, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
```

- `ThreadingHTTPServer` 每个请求一个线程，适合本地单用户；共享状态要加锁。
- `MAX_BODY` 限制请求体；没有上限的服务会被一个坏请求拖垮。
- `json.loads` 只接受合法 JSON；不要用 `eval`。
- `ValueError` 映射 400（客户端输入问题），其他异常映射 500，不把堆栈返回给浏览器。
- 响应写 `Content-Length`，避免连接悬挂。

## 绑定与安全

- 只绑定 `127.0.0.1`，不写 `0.0.0.0`；本地工具不需要暴露到局域网。
- 端口从参数或环境变量读，默认值写常量；端口被占用时给出清晰错误。
- 不做认证，因为没有远程访问；一旦需要远程访问，先加认证和 TLS，不要直接改绑定地址。
- 请求体、命令数量、会话时长都设上限。
- 把用户输入当数据，不拼进 shell 命令；WSL 启动参数用列表并转义。
- 静态页面从包内读取，不拼接文件路径；防止路径穿越。

## 会话管理

- 启动时创建 C++ 进程，读第一条快照；失败则返回 503 并记录 stderr。
- 每个会话有 id；请求携带 id，服务器按 id 找进程，不依赖全局“当前会话”。
- 会话空闲超时后自动关闭；关闭时先 `quit`，再终止，最后回收。
- 同一会话的命令串行执行；加锁，避免两个请求同时写 stdin。
- 浏览器断开不等于会话结束；由显式 `close` 或超时决定。
- 服务器退出时关闭所有会话；用 `atexit` 或信号处理。

## API 形状

```text
POST /api/session   {} -> {"session": "...", "snapshot": {...}}
POST /api/move      {"session": "...", "row": 1, "col": 2} -> {"snapshot": {...}}
POST /api/close     {"session": "..."} -> {"ok": true}
GET  /              -> 静态页面
```

- 请求字段用明确名字，不用位置数组。
- 返回总是包含最新快照；错误返回 `{"error": {"code": "...", "message": "..."}}`。
- 不把 C++ 异常文本直接当 `code`；`code` 稳定，`message` 可变。
- 版本字段与协议一致；前端按 `version` 拒绝不兼容快照。

## 前端

- 页面只做渲染和发命令；不复制规则，不在前端判断胜负。
- 按钮点击后禁用，等快照返回再恢复；避免重复提交。
- 显示 `sequence` 或最后更新时间，方便发现快照停滞。
- 错误显示在页面上，不静默 `console.log`。
- 不把用户输入直接塞进 `innerHTML`；用 `textContent` 或转义。

## 测试

- 用 `unittest` 启动服务器（端口 0 让系统分配），发真实 HTTP 请求。
- 覆盖：正常创建会话、非法 JSON（400）、超大体（413）、未知会话（404/400）、C++ 进程提前退出（503/500）。
- 测试结束关闭服务器和所有子进程；确认端口释放。
- 不在测试里绑定固定端口；并行测试会冲突。

## 检查清单

- [ ] 只绑定 `127.0.0.1`，请求体有上限。
- [ ] C++ 是唯一状态源，Python 不复制规则。
- [ ] 每个会话独立进程，命令串行化。
- [ ] 400/413/500 映射清楚，不泄露堆栈。
- [ ] 服务器和子进程都有清理路径。
- [ ] 前端不拼 HTML，不复制规则。
