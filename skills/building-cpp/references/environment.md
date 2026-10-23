# 环境组合

环境是**声明**，不是探测结果。项目技能 `cpp-workflow-project` 的 `environment.json` 写清楚三个环境轴和一个语言标准；构建规则、工具配置和检查都按这个声明执行。声明为空或组合非法时，先修声明，不要靠猜。

## 四个轴

| 轴 | 取值 | 说明 |
| --- | --- | --- |
| `host` | `windows` / `linux` / `macos` | 编辑器与代理壳所在的系统 |
| `build_host` | `native` / `wsl` | 编译在哪执行；`wsl` 只对 `host=windows` 合法 |
| `compiler` | `clang` / `gcc` | 一次只配一个；不支持 MSVC、clang-cl，也不把 C 编译器单独作为一个轴 |
| `standard` | `c++11` / `c++14` / `c++17` / `c++20` / `c++23` | 一个工程一个标准；新工程默认 `c++23`，旧声明缺字段时也按 `c++23` 处理 |

```json
{
  "host": "windows",
  "build_host": "wsl",
  "compiler": "clang",
  "standard": "c++23"
}
```

## 合法组合

| host | build_host | compiler | 声明 | 本版本能构建 |
| --- | --- | --- | --- | --- |
| windows | wsl | clang | 合法 | 是（WSL 内跑 POSIX 脚本） |
| windows | wsl | gcc | 合法 | 是 |
| linux | native | clang | 合法 | 是 |
| linux | native | gcc | 合法 | 是 |
| macos | native | clang | 合法 | 是 |
| macos | native | gcc | 合法 | 是（要求真正的 GCC，不是 Apple 的 `g++` 别名） |

非法组合：

- `host`、`build_host`、`compiler` 不是各自允许的值，或 `standard` 不在 `c++11`–`c++23` 内。
- 三个环境轴任意为空、缺失、写成数组或同时写两个值；`standard` 缺失或为空时按默认 `c++23` 处理并给出提示（视为声明升级，不覆盖已写出的 `c++11`–`c++20`）。
- `host=linux` / `host=macos` + `build_host=wsl`。
- `host=windows` + `build_host=native`：本版本不支持，静态校验直接返回失败。
- `compiler=msvc`、`compiler=clang-cl`、`compiler=c`。

`windows` + `native` 不再作为「合法但不能构建」的声明保留。声明校验直接返回 `ok: false`，`issues` 只有一句「本版本不能在 Windows 原生壳里构建」；不要建议改 WSL，也不要临时写 PowerShell 脚本伪装成已支持。

## 工具角色

| 角色 | clang 模式 | gcc 模式 |
| --- | --- | --- |
| 编译器 | `clang++` | `g++`（macOS 上必须是真正的 GCC） |
| 格式化 | `clang-format` | `clang-format` |
| 静态检查 | `clang-tidy` | `clang-tidy` |
| 语言服务 | `clangd` | `clangd` |
| 构建 | `cmake` + `ninja` | `cmake` + `ninja` |
| 测试 | `ctest` | `ctest` |
| 程序 | `app` | `app` |

工具角色与编译器解耦：GCC 模式下仍用 Clang 的格式化、静态检查和语言服务。不要因为编译器是 GCC 就换成 `gcc-format` 之类不存在的工具。工程确有 C 源时，C 编译器用同一套的 `clang` 或 `gcc`，不能与 C++ 编译器分属两套；`--live` 的 compiler 角色核对的是 C++ 驱动，C 驱动缺失时由 configure 报错。

## 版本与能力

- **标准**：新工程默认 C++23，可声明 `c++11`–`c++23`；编译器必须支持对应的 `-std=c++NN`。CMake ≥ 3.20；C++11/14 的 `cxx_std_*` 需要 CMake ≥ 3.8，但本工作流统一按 3.20 起步。`CXX_STANDARD_REQUIRED ON` 防止标准 decay；C++23 的库设施（如 `std::print`）以实际编译器/标准库为准。
- **clang-format / clang-tidy**：≥ 16。这是本工作流的工具基线；低于该版本时检查器报告具体角色和版本。
- **clang 模式同版本**：`clang++`、`clang-format`、`clang-tidy`、`clangd` 必须是同一 LLVM 主版本。混装 17 的 clangd 与 18 的 clang-format 会出现诊断与格式化不一致。Apple Clang 也按这条核对；若工具版本对不上，报告的是具体角色和版本，不要为了通过而改声明。
- **gcc 模式**：检查器不拿 GCC 的主版本去比 Clang 工具；`clang-format` / `clang-tidy` 仍要 ≥ 16，`clangd` 只要求可用。`g++` 必须是真的 GCC，不能是 Apple clang 的别名。GCC 需要自带 C++23 `<print>` / `std::expected` 的标准库；版本过旧时先升级工具链，或把项目标准降到实际可用的档位，不要改检查器绕过。
- **Apple Clang**：`/usr/bin/clang++` 通常是 Apple Clang；clangd 需能经 `xcrun` 找到 SDK。不要混用 Homebrew LLVM 与 Xcode 资源目录，也不要把 Homebrew 路径写死。
- **调试器**：VSCode 的 `CMake: Debug` 由 CMake Tools 调 C/C++ 扩展的 `cppdbg`；clang 模式要 `lldb`，gcc 模式要 `gdb`。调试器不在 `--live` 的编译器角色核对里，也不写进 `environment.json`；缺它时是调试启动失败，不是构建声明失败。

## 构建目录

| compiler | 构建目录 | 编译数据库 |
| --- | --- | --- |
| clang | `build/clang/` | `build/clang/compile_commands.json` |
| gcc | `build/gcc/` | `build/gcc/compile_commands.json` |
| 当前 | `build/` | `build/compile_commands.json` → 上面之一的符号链接 |

一次 configure 只用一个编译器；切换编译器时用另一个目录，不要在同一目录里改 `CMAKE_CXX_COMPILER` 后复用缓存。

## 活动校验

`<skill-dir>/scripts/checking-environment.mjs` 做两件事：

1. **静态**（默认）：读 `environment.json`，检查三个环境轴、`standard` 和组合。轴为空或组合非法时以退出码 2 结束，不查找任何可执行文件。
2. **活动**（`--live`）：先做声明校验，再核对当前进程是否在声明的 build host 上，然后查 PATH、角色和版本。声明本身不合法时仍以退出码 2 结束；声明合法但活动核对失败时以退出码 3 结束。

```bash
node "<skill-dir>/scripts/checking-environment.mjs" --project . --json
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live
```

`<skill-dir>` 是安装后的 `building-cpp` 目录；脚本不复制到目标工程，也不改目标工程的 PATH。

约束：

- 只读：不安装、不下载、不改 PATH、不写项目文件。
- `--live` 在 `host=windows` + `build_host=native` 下不会继续：声明校验已经失败，错误是「本版本不能在 Windows 原生壳里构建」。
- WSL 模式要求当前进程在 WSL 内（`WSL_DISTRO_NAME` / `WSL_INTEROP` 或 `/proc/version` 含 Microsoft）；只在 Linux 上但不在 WSL 时失败。
- macOS 上声明 `compiler=gcc` 时，`g++ --version` 若显示 Apple clang，按「不是真正的 GCC」失败。
- 没有 `--live` 时不做任何 PATH 探测，CI 和 Windows 开发机都能做声明校验。

## 退出码

| 码 | 含义 |
| --- | --- |
| 0 | 通过 |
| 2 | 声明缺失、轴为空、组合非法 |
| 3 | 活动校验失败：不在声明的 build host、角色缺失、版本不符 |
| 1 | 脚本自身错误：参数错误或内部异常 |

各标准对应的编译器、库设施和工具档位见 [standards/README.md](standards/README.md)。
