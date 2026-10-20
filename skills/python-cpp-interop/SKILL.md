---
name: python-cpp-interop
description: 用 Python 驱动、测试或展示 C++20 程序时使用；覆盖子进程边界、带版本的 JSON 行协议、超时与 stderr 分离、本地 HTTP 适配、ctypes/pybind11 的取舍。Python 是外围，规则与状态仍归 C++。
metadata:
  short-description: Python 与 C++ 的边界
---

# python-cpp-interop

C++ 程序拥有领域规则和状态；Python 只做编排、验证、展示和一次性工具。先选边界，再写代码。

## 先选走法

| 走法 | 什么时候用 | 怎么做 |
| --- | --- | --- |
| 进程 | Python 启动 C++ 可执行文件，输入命令、读结果；跨语言、跨进程、不需要共享内存 | 先读 `references/protocol.md`，再读 `references/process-boundary.md` |
| 本地 Web | 浏览器要操作同一个 C++ 会话，但不想引入桌面 GUI | 在进程模式之上加 `references/web-adapter.md` |
| 绑定 | 需要高频调用、传递复杂对象，且进程边界成本不可接受 | 先读 `references/bindings.md`，确认 ABI 与构建成本 |

拿不准先用进程模式。进程边界清楚、可单独测试、崩溃不拖垮 Python；绑定是最后手段。

## 升级阶梯

1. Python 标准库 + `unittest`：解析、校验、纯 Python 逻辑。
2. `subprocess` 调用 C++ CLI：一次性输入，读取 stdout/stderr。
3. 带版本的 JSON 行协议：每条快照可独立解析，序列号严格递增。
4. 回放与统计：把快照序列写成测试或分析输入。
5. 本地 HTTP：浏览器通过 JSON API 操作同一个会话。
6. WebSocket / pybind11 / ctypes：只有实时性、调用频率或对象共享确实需要时才上。

不要从第 6 步开始。大多数教学和工具场景在第 3–5 步就够。

## 路由

| 要做的事 | 打开 |
| --- | --- |
| 定义 JSON 字段、版本、序列号、状态字符串 | `references/protocol.md` |
| 启动/关闭子进程，处理 stdout/stderr、超时、编码、WSL | `references/process-boundary.md` |
| 本地 HTTP 服务、请求校验、单会话、静态页面 | `references/web-adapter.md` |
| ctypes / pybind11 / C ABI / 异常映射 | `references/bindings.md` |
| 回放脚本骨架 | `assets/replay.py` |
| 本地 HTTP 骨架 | `assets/web_bridge.py` |
| 最小 C++ 协议端与手工验证 | `assets/snapshot_demo.cpp`、`assets/README.md` |

## 硬规则

- C++ 核心不依赖 Python、终端、GUI、Web 或 Quarto；Python 只调用公开入口。
- 协议带 `version`；不兼容变更升版本，不在同一版本里改字段含义。
- 每条快照带严格递增的 `sequence`；重复、倒退、缺失都算协议错误。
- 人类可读提示写 stderr 或独立通道；stdout 只放机器可解析的快照，或明确标记快照行。
- Python 不解析“请选择”“请输入”这类提示来同步状态；用显式命令和快照确认。
- 子进程必须有超时；超时后终止并回收，不留下僵尸进程。
- 测试不依赖当前工作目录、绝对路径或本机用户名；路径从参数或项目根推导。
- 本地 Web 只绑定 `127.0.0.1`，不默认监听所有网卡；请求体有上限。

## 完成判据

- 协议字段、版本、状态集合和错误行为写清楚了。
- 一次性调用和长会话的区别写清楚了；会话有明确的关闭路径。
- stdout 与 stderr 分离，日志不污染快照流。
- Python 测试覆盖协议校验、超时、错误退出和非递增序列。
- 没有为了“方便”让 Python 复刻 C++ 规则；规则只有一份。
- 需要绑定时，说明了为什么进程边界不够，以及 ABI/构建/异常映射怎么处理。

C++ 源码与构建规则分别归 `developing-cpp` 和 `building-cpp`；本技能不改规则语义，也不替代它们的构建检查。
