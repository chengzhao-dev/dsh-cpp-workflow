# 第 3 步：通过检查

## 产出

一次可复现的通过记录：环境校验、配置、构建、测试、运行都通过；失败时能指出是哪一步、哪个角色、哪条诊断。

## 通用情况

按固定顺序跑，前一步失败就停，不要带着失败继续：

1. **校验编码与行尾**：在仓库根跑编码检查。默认 UTF-8 无 BOM、LF；MSVC 原生工程加 `--profile msvc`。有问题先按 `references/encoding.md` 修正，不带着 BOM 或混用行尾继续。
2. **校验环境声明（不带 `--live`）**：读 `environment.json`，检查三个环境轴、`standard` 和组合是否合法。环境轴为空、`standard` 非法或组合非法时，停在这里，不找可执行文件。
3. **活动校验**：在声明的 build host 上跑 `--live`，核对 PATH 中的角色和版本。`windows` + `native` 在声明校验阶段就返回失败，不会进入这一步。
4. **跑项目入口命令**：项目技能里写的入口命令（如 `./running-build.sh clang`）。入口命令仍是 `<entry-command>` 或空白时，停在这里，不要猜命令；是真实命令才跑。入口内部依次 configure → build → ctest → run；每一步失败都保留原始输出。
5. **核对产物**：`build/<compiler>/compile_commands.json` 存在；`build/compile_commands.json` 指向当前编译器；`app` 可执行文件在 `build/<compiler>/bin`。
6. **记录结果**：通过时记录编译器版本、构建目录、测试数量；失败时记录命令、退出码、第一条根因诊断。

编码检查与环境校验脚本：

```bash
node "<skill-dir>/scripts/checking-encoding.mjs" --profile portable      # UTF-8 无 BOM、LF
node "<skill-dir>/scripts/checking-environment.mjs" --project .          # 声明校验
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live   # 活动校验
```

`<skill-dir>` 换成插件里 `building-cpp` 的实际目录；不要复制脚本到项目里再改。脚本只读，不安装、不下载、不改 PATH。

## 失败分诊

| 现象 | 先看 | 回到 |
| --- | --- | --- |
| 轴为空、组合非法、版本不匹配 | `environment.json`、`--live` 输出 | 定构建，先修声明 |
| 找不到头文件、链接失败、target 不存在 | `CMakeLists.txt`、`target_include_directories`、`target_link_libraries` | 定构建 |
| 没有 `compile_commands.json`、clangd 跳转失败 | 生成器、`CMAKE_EXPORT_COMPILE_COMMANDS`、`.clangd` 路径 | 定构建 / 定工具配置 |
| 编译错误指向函数体 | 实现 | `developing-cpp` 的定实现；先修语义，再重跑 |
| CTest 失败 | 测试断言、行为句 | `developing-cpp` 的定行为 / 定实现 |
| `app` 启动失败、找不到共享库 | 输出目录、RPATH / 运行时库路径 | 定构建 |

分诊只定位，不自动改。一次只改一类问题；改完从失败的那一步重跑，只有行为或边界也变了才回到定行为。

## 情况

**第一次接工程**：先跑声明校验，再跑 `--live`；两者都过再跑入口命令。环境没声明对时，构建脚本再完美也会失败。

**只改源码**：仍跑完整入口命令；CTest 可能暴露声明层问题，不要只看编译通过。

**只改配置**：至少跑一次完整构建 + CTest；配置错误常常在链接或测试阶段才暴露。

**没有测试**：CTest 显示没有测试是合法结果；不要为了「全绿」造空测试。行为验收由定行为的验收句负责。

**Windows 原生**：本版本不支持 `host=windows` + `build_host=native`。声明校验会返回 `ok: false`，`issues` 只有一句「本版本不能在 Windows 原生壳里构建」。停在这里，不要伪造 PowerShell 脚本，不要建议改 WSL 来绕过，也不要让代理改 `environment.json` 过关。

**macOS**：`/usr/bin/clang++` 通常是 Apple Clang；`.clangd` 不写死 Homebrew 路径，clangd 要能经 xcrun 找到 SDK。`compiler=clang` 时 `--live` 按同一 LLVM 主版本核对 clang++、clang-format、clang-tidy、clangd；不要混用 Homebrew LLVM 与 Xcode 资源目录来凑版本，也不要为了通过而改 `environment.json` 的编译器。

## 正反例指针

- 环境组合与 `--live` 输出：`examples/environment.md`。
- 失败分诊的具体命令：`references/build-script.md`「失败分诊」。
- 工具调用细节：`references/static-analysis.md`。
