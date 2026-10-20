# 进程边界

Python 调 C++ 最常用的方式是启动一个可执行文件。边界简单，但进程、管道、编码和平台差异都能让它在生产里出错。

## 一次性调用

输入固定、输出一次读完时用 `subprocess.run`：

```python
import subprocess

result = subprocess.run(
    [app_path, "--moves", "1 1", "2 2"],
    input="".join(move + "\n" for move in moves),
    text=True,
    encoding="utf-8",
    capture_output=True,
    timeout=8,
    check=False,
)
if result.returncode != 0:
    raise RuntimeError(f"程序退出码 {result.returncode}: {result.stderr.strip()}")
snapshots = [line for line in result.stdout.splitlines() if line.startswith("{")]
```

- 参数用列表，不用 `shell=True`；路径含空格时也不会被拆分。
- `text=True` 与显式 `encoding="utf-8"` 一起用，避免平台默认编码不同。
- `capture_output=True` 分离 stdout/stderr；不要让两者混在一个管道里。
- 始终设置 `timeout`；捕获 `subprocess.TimeoutExpired` 后终止并回收。
- `check=False` 让调用方自己决定如何报告错误；不要静默忽略非零退出码。
- 只把以 `{` 开头的行当快照；其他行是日志或提示。

## 长会话

需要连续命令和即时快照时用 `subprocess.Popen`：

```python
process = subprocess.Popen(
    [app_path],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    encoding="utf-8",
    bufsize=1,
)
```

- `bufsize=1` 只对文本模式的行缓冲有效；C++ 端仍要 flush。
- stdout 和 stderr 必须由两个线程（或 `selectors`）分别读取；只读 stdout 会让 stderr 管道填满，进程阻塞。
- 读线程把行放进 `queue.Queue`；主线程按超时等待，不直接阻塞在 `readline()`。
- 用哨兵对象表示 EOF；读到 EOF 后不要继续等。
- 每条命令发出后等待对应快照；不要假设“写进去就处理完了”。
- 会话结束时先发 `quit`，再 `wait(timeout)`；超时后 `terminate()`，仍不退则 `kill()`。
- `communicate()` 会关闭 stdin，不能用于需要持续输入的会话。

## 同步：不要解析人类提示

```python
# 脆弱：提示文案一改就挂
wait_for("请输入行和列")
```

- 不要用“看到某句中文提示”判断程序状态；文案、语言和格式都会变。
- 用显式命令和快照确认状态：发 `move 1 2`，等到 `sequence` 增加且 `status` 合法。
- 如果 C++ 端目前只有交互式提示，先加一个非交互协议模式；不要在 Python 里堆正则适配提示。
- 启动时等待第一条快照（或明确的 `ready` 快照），不要用固定 `sleep`。

## 工作目录、路径与环境

- `cwd` 显式传给子进程；不要依赖 Python 进程的当前目录。
- 可执行文件路径从项目根或命令行参数推导，不写死绝对路径。
- 动态库在 `build/<compiler>/lib` 时，设置 `LD_LIBRARY_PATH`（Linux）或 `DYLD_LIBRARY_PATH`（macOS）；更稳的是 RPATH。链接与运行时查找规则见 `building-cpp` 的 linking 参考。
- 环境变量只传需要的，不整份复制；`env={**os.environ, "LD_LIBRARY_PATH": lib_dir}` 可以，但要意识到会覆盖。
- Windows 与 WSL 之间路径格式不同；在边界处转换，不把 `D:\\...` 传给 Linux 程序。

## WSL 桥接

Windows 上的 Python 调 WSL 里的 Linux 可执行文件：

```python
command = [
    "wsl.exe", "bash", "-lc",
    f"cd '{linux_root}' && exec env LD_LIBRARY_PATH=build/clang/lib ./build/clang/bin/app",
]
```

- 路径先转成 `/mnt/d/...`；用 `wslpath -a` 或明确的盘符映射，不手工拼。
- 用 `bash -lc` 时注意登录 shell 可能改 PATH；需要固定环境时用 `env`。
- 参数里的单引号要转义；不要让用户输入直接进 shell 字符串。
- WSL 进程的退出码和信号语义与 Windows 不同；超时后杀 `wsl.exe` 不一定杀到 Linux 子进程，必要时用进程组。

## 编码与文本

- 统一 UTF-8；C++ 端输出 UTF-8，Python 端显式 `encoding="utf-8"`。
- Windows 控制台代码页可能不是 UTF-8；不要把控制台输出直接当协议流。
- 处理 CRLF：`splitlines()` 会去掉 `\r`；手工按 `\n` 切时记得 `rstrip("\r")`。
- 不假设一行很短；设置最大行长度，防止内存被单行拖垮。
- 二进制数据不要走文本管道；用文件、socket 或明确的 base64 字段。

## 超时与清理

- 一次性调用：`timeout` 秒；超时后 `kill()` 并 `communicate()` 回收。
- 长会话：每条命令一个超时；会话总时长另设上限。
- 在 `finally` 里关闭管道和进程；异常路径也不能留下子进程。
- 不要让子进程继承不需要的句柄；`close_fds=True`（POSIX 默认）避免泄漏。
- 记录退出码、stderr 末尾和最后一条快照；排查时这些比“失败了”有用。

## 测试

- 用一个假的 C++ 可执行文件（Python 脚本模拟）测超时、非零退出、stderr 噪声、非法 JSON。
- 用真实可执行文件测正常路径和协议兼容性；测试标记为集成测试，不要求每个单元测试都编译 C++。
- 测试结束确认进程已退出；用 `process.poll()` 或 `wait(timeout)`。
- 不在测试里 `sleep(1)` 等启动；用快照或事件同步。

## 检查清单

- [ ] 参数用列表，没有 `shell=True`。
- [ ] stdout/stderr 分离，两个管道都被读取。
- [ ] 有超时、终止和回收路径。
- [ ] 不解析人类提示同步状态。
- [ ] `cwd`、可执行文件路径、动态库路径显式设置。
- [ ] 编码统一 UTF-8，CRLF 已处理。
- [ ] 测试覆盖超时、非零退出、stderr 噪声和非法快照。
