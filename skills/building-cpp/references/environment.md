# 环境组合

环境是**声明**，不是探测结果。项目技能 `cpp-workflow-project` 的 `environment.json` 写清楚三个轴；构建规则、工具配置和检查都按这个声明执行。声明为空或组合非法时，先修声明，不要靠猜。

## 三个轴

| 轴 | 取值 | 说明 |
| --- | --- | --- |
| `host` | `windows` / `linux` / `macos` | 编辑器与代理壳所在的系统 |
| `build_host` | `native` / `wsl` | 编译在哪执行；`wsl` 只对 `host=windows` 合法 |
| `compiler` | `clang` / `gcc` | 一次只配一个；不支持 MSVC、clang-cl，也不把 C 编译器单独作为一个轴 |

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
| windows | native | clang | 合法 | 否：缺 POSIX 壳（本版无 PowerShell 脚本） |
| windows | native | gcc | 合法 | 否：缺 POSIX 壳（本版无 PowerShell 脚本） |
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

工具角色与编译器解耦：GCC 模式下仍用 Clang 的格式化、静态检查和语言服务。不要因为编译器是 GCC 就换成 `gcc-format` 之类不存在的工具。工程确有 C 源时，C 编译器用同一套的 `clang` 或 `gcc`，不能与 C++ 编译器分属两套；`--live` 的 compiler 角色核对的是 C++ 驱动，C 驱动缺失时由 configure 报错。

## 版本与能力

- **C++20**：编译器必须支持 `-std=c++20`；CMake ≥ 3.20（C++20 标准属性从 3.12 起可用）。
- **clang-format / clang-tidy**：≥ 16。`BreakAfterAttributes` 在 16 才支持，15 及以下没有该选项。
- **clang 模式同版本**：`clang++`、`clang-format`、`clang-tidy`、`clangd` 必须是同一 LLVM 主版本。混装 17 的 clangd 与 18 的 clang-format 会出现诊断与格式化不一致。Apple Clang 也按这条核对；若工具版本对不上，报告的是具体角色和版本，不要为了通过而改声明。
- **gcc 模式**：检查器不拿 GCC 的主版本去比 Clang 工具；`clang-format` / `clang-tidy` 仍要 ≥ 16，`clangd` 只要求可用。`g++` 必须是真的 GCC，不能是 Apple clang 的别名。GCC 需要自带 C++20 `<format>` 的标准库；版本过旧时先升级工具链，不要改检查器绕过。
- **Apple Clang**：`/usr/bin/clang++` 通常是 Apple Clang；clangd 需能经 `xcrun` 找到 SDK。不要混用 Homebrew LLVM 与 Xcode 资源目录，也不要把 Homebrew 路径写死。

## 构建目录

| compiler | 构建目录 | 编译数据库 |
| --- | --- | --- |
| clang | `build/clang/` | `build/clang/compile_commands.json` |
| gcc | `build/gcc/` | `build/gcc/compile_commands.json` |
| 当前 | `build/` | `build/compile_commands.json` → 上面之一的符号链接 |

一次 configure 只用一个编译器；切换编译器时用另一个目录，不要在同一目录里改 `CMAKE_CXX_COMPILER` 后复用缓存。

## 活动校验

`<skill-dir>/scripts/checking-environment.mjs` 做两件事：

1. **静态**（默认）：读 `environment.json`，检查三个轴和组合。轴为空或组合非法时以退出码 2 结束，不查找任何可执行文件。
2. **活动**（`--live`）：先做静态检查，再核对当前进程是否在声明的 build host 上，然后查 PATH、角色和版本。声明本身不合法时仍以退出码 2 结束；声明合法但活动核对失败时以退出码 3 结束。

```bash
node "<skill-dir>/scripts/checking-environment.mjs" --project . --json
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live
```

`<skill-dir>` 是安装后的 `building-cpp` 目录；脚本不复制到目标工程，也不改目标工程的 PATH。

约束：

- 只读：不安装、不下载、不改 PATH、不写项目文件。
- `--live` 在 `host=windows` + `build_host=native` 下直接报告「缺 POSIX 壳；本版没有 PowerShell 构建脚本」，不继续找编译器。
- WSL 模式要求当前进程在 WSL 内（`WSL_DISTRO_NAME` / `WSL_INTEROP` 或 `/proc/version` 含 Microsoft）；只在 Linux 上但不在 WSL 时失败。
- macOS 上声明 `compiler=gcc` 时，`g++ --version` 若显示 Apple clang，按「不是真正的 GCC」失败。
- 没有 `--live` 时不做任何 PATH 探测，CI 和 Windows 开发机都能跑静态检查。

## 退出码

| 码 | 含义 |
| --- | --- |
| 0 | 通过 |
| 2 | 声明缺失、轴为空、组合非法 |
| 3 | 活动校验失败：不在声明的 build host、角色缺失、版本不符 |
| 1 | 脚本自身错误：参数错误或内部异常 |
