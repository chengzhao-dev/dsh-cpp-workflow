# 正反例：环境组合

## 合法声明

```json
{
  "host": "windows",
  "build_host": "wsl",
  "compiler": "clang"
}
```

在 WSL 内执行 `running-build.sh clang`；构建目录 `build/clang`。

```json
{
  "host": "linux",
  "build_host": "native",
  "compiler": "gcc"
}
```

在 Linux 上执行 `running-build.sh gcc`；构建目录 `build/gcc`。

## 非法声明

**轴为空**：

```json
{
  "host": "linux",
  "build_host": "",
  "compiler": "gcc"
}
```

声明校验以退出码 2 失败，不查找 `g++`。先让用户填 `build_host`。

**组合非法**：

```json
{
  "host": "linux",
  "build_host": "wsl",
  "compiler": "clang"
}
```

WSL 只对 `host=windows` 合法；不要通过改 `host` 来绕过，先确认工程到底跑在哪。

**同时写两个编译器**：

```json
{
  "host": "linux",
  "build_host": "native",
  "compiler": ["clang", "gcc"]
}
```

一个 configure 只允许一个编译器；拆成两次声明或两个工程。

## Windows 原生

```json
{
  "host": "windows",
  "build_host": "native",
  "compiler": "clang"
}
```

声明合法，但本版本没有 PowerShell 构建脚本。`--live` 输出类似：

```text
声明合法，但 Windows 原生构建缺少 POSIX 构建脚本；缺的是 shell，不是编译器。
```

不要把 `build_host` 改成 `wsl` 来「让它过」；要么补脚本，要么换到 WSL 并更新声明。

## GCC 模式不比较 GCC 主版本

```text
g++ 14.1.0
clang-format 18.1.8
clang-tidy 18.1.8
clangd 18.1.8
```

通过：检查器只要求 `g++` 是真的 GCC，`clang-format` / `clang-tidy` ≥ 16，`clangd` 可用。不要拿 GCC 的主版本去要求 Clang 工具，也不要因为版本号不同就换成一套不存在的 `gcc-format`。若 GCC 的标准库太旧、`<format>` 不可用，升级工具链，而不是改检查器。

## macOS 的 `g++` 别名

```json
{
  "host": "macos",
  "build_host": "native",
  "compiler": "gcc"
}
```

`/usr/bin/g++` 实际是 Apple clang 的别名；`--live` 应报告「声明的 g++ 实际是 Apple clang」。安装真正的 GCC（如 Homebrew `gcc`）并把 `g++` 指向它，或把声明改成 `compiler=clang`。

## 版本不一致

```text
clang++ 18.1.8
clang-format 16.0.6
clang-tidy 16.0.6
clangd 16.0.6
```

clang 模式要求四者同主版本；这里 18 与 16 不一致，`--live` 失败。统一到同一 LLVM 发行版，不要只升级编译器。

## 声明校验与活动校验

```bash
# CI / Windows 开发机：只读声明，不需要工具链
node scripts/checking-environment.mjs --project .

# build host 上：核对构建宿主、PATH 和版本
node scripts/checking-environment.mjs --project . --live
```

不带 `--live` 时永远不探测 PATH；不要把活动校验塞进每次构建，构建脚本已经隐含了工具存在性。
