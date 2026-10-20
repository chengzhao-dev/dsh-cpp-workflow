# 环境组合

环境是**声明**，不是探测结果。项目技能 `cpp-workflow-project` 的 `environment.json` 写清楚三个轴；构建规则、工具配置和检查都按这个声明执行。声明为空或组合非法时，先修声明，不要靠猜。

## 三个轴

| 轴 | 取值 | 说明 |
| --- | --- | --- |
| `host` | `windows` / `linux` / `macos` | 工程最终运行的系统 |
| `build_host` | `native` / `wsl` | 编译在哪执行；`wsl` 只对 `host=windows` 合法 |
| `compiler` | `clang` / `gcc` | 一次只配一个；不支持 MSVC、clang-cl、C 编译器 |

```json
{
  "host": "windows",
  "build_host": "wsl",
  "compiler": "clang"
}
```

## 合法组合

| host | build_host | compiler | 声明 | 本版本能构建 |
| --- | --- | --- | --- | --- |
| windows | wsl | clang | 合法 | 是（WSL 内跑 POSIX 脚本） |
| windows | wsl | gcc | 合法 | 是 |
| windows | native | clang | 合法 | 否：缺 PowerShell 构建脚本 |
| windows | native | gcc | 合法 | 否：缺 PowerShell 构建脚本 |
| linux | native | clang | 合法 | 是 |
| linux | native | gcc | 合法 | 是 |
| macos | native | clang | 合法 | 是 |
| macos | native | gcc | 合法 | 是（要求真正的 GCC，不是 Apple 的 `g++` 别名） |

非法组合：

- `host` 不是三个值之一，或 `build_host` / `compiler` 不是两个值之一。
- 三个轴任意为空、缺失、写成数组或同时写两个值。
- `host=linux` / `host=macos` + `build_host=wsl`。
- `compiler=msvc`、`compiler=clang-cl`、`compiler=c`。

`windows` + `native` 是合法声明，但本版本**没有** PowerShell 构建脚本。`--live` 会明确报告「缺的是 shell，不是编译器」；不要为了让它通过把 `build_host` 改成 `wsl`，也不要临时写一个脚本伪装成已支持。

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

工具角色与编译器解耦：GCC 模式下仍用 Clang 的格式化、静态检查和语言服务。不要因为编译器是 GCC 就换成 `gcc-format` 之类不存在的工具。

## 版本与能力

- **C++20**：编译器必须支持 `-std=c++20`；CMake ≥ 3.20（C++20 标准属性从 3.12 起可用）。
- **`std::format`**：GCC 需要 libstdc++ ≥ 13；Clang 通常搭配 libstdc++，所以系统里的 GCC 头文件也要 ≥ 13；使用 libc++ 时需要 libc++ ≥ 14（功能测试宏到 LLVM 19 才设置，不能只看宏）。检查器会实际编译运行一个 `std::format` 小程序，而不是只看版本号。
- **clang-format / clang-tidy**：≥ 16。`BreakAfterAttributes` 等关键选项在 16 才稳定；15 及以下会静默忽略或行为不同。
- **clang 模式同版本**：`clang++`、`clang-format`、`clang-tidy`、`clangd` 必须是同一 LLVM 主版本。混装 17 的 clangd 与 18 的 clang-format 会出现诊断与格式化不一致。
- **gcc 模式**：`g++` ≥ 13；`clang-format` / `clang-tidy` ≥ 16；`clangd` 只要求存在（用于导航），不要求与 GCC 同版本。
- **Apple Clang**：`clang++` 版本号与 Homebrew LLVM 工具不同是常态；检查器对 Apple Clang 跳过「同主版本」要求，但仍要求 `clang-format` / `clang-tidy` ≥ 16，并提示 clangd 需经 `xcrun` 找到 SDK。不要为了同版本降级工具，也不要把 Homebrew LLVM 与 Xcode 资源目录混用。

## 构建目录

| compiler | 构建目录 | 编译数据库 |
| --- | --- | --- |
| clang | `build/clang/` | `build/clang/compile_commands.json` |
| gcc | `build/gcc/` | `build/gcc/compile_commands.json` |
| 当前 | `build/` | `build/compile_commands.json` → 上面之一的符号链接 |

一次 configure 只用一个编译器；切换编译器时用另一个目录，不要在同一目录里改 `CMAKE_CXX_COMPILER` 后复用缓存。

## 活动校验

`scripts/checking-environment.mjs` 做两件事：

1. **静态**（默认）：读 `environment.json`，检查三个轴和组合。轴为空或组合非法时以退出码 2 结束，不查找任何可执行文件。
2. **活动**（`--live`）：先做静态检查，再核对当前进程是否在声明的 build host 上，然后查 PATH、版本、同版本要求和 `std::format` 探针。失败以退出码 3 结束。

```bash
node scripts/checking-environment.mjs --project . --json
node scripts/checking-environment.mjs --project . --live
```

约束：

- 只读：不安装、不下载、不改 PATH、不写项目文件；探针只写系统临时目录并在结束时删除。
- `--live` 在 `host=windows` + `build_host=native` 下直接报告「缺 PowerShell 构建脚本」，不继续找编译器。
- WSL 模式要求当前进程在 WSL 内（`WSL_DISTRO_NAME` / `WSL_INTEROP` 或 `/proc/version` 含 Microsoft）；只在 Linux 上但不在 WSL 时失败。
- macOS 上声明 `compiler=gcc` 时，`g++ --version` 若显示 Apple clang，按「不是真正的 GCC」失败。
- 没有 `--live` 时不做任何 PATH 探测，CI 和 Windows 开发机都能跑静态检查。

## 退出码

| 码 | 含义 |
| --- | --- |
| 0 | 通过 |
| 2 | 声明缺失、轴为空、组合非法 |
| 3 | 活动校验失败：不在声明的 build host、角色缺失、版本不符、`std::format` 探针失败 |
| 1 | 脚本自身错误（参数、文件读取） |
