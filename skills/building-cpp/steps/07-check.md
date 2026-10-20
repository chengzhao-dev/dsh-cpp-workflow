# 第 7 步：通过检查

## 产出

一次可复现的通过记录：环境校验、配置、构建、格式化、静态检查、测试、运行都通过；失败时能指出是哪一步、哪个角色、哪条诊断。

## 通用情况

按固定顺序跑，前一步失败就停，不要带着失败继续：

1. **静态校验环境声明**：读 `environment.json`，检查三个轴和组合是否合法。轴为空或组合非法时，停在这里，不找可执行文件。
2. **活动校验**：在声明的 build host 上跑 `--live`，核对 PATH 中的角色、版本和 `std::format` 可用性。Windows 原生组合当前没有构建脚本，`--live` 会明确报告「缺的是 shell，不是编译器」。
3. **跑项目入口命令**：项目技能里写的入口命令（如 `./running-build.sh clang`）。入口内部依次 configure → build → format → tidy → ctest → run；每一步失败都保留原始输出。
4. **核对产物**：`build/<compiler>/compile_commands.json` 存在；`build/compile_commands.json` 指向当前编译器；`app` 可执行文件在 `build/<compiler>/bin`。
5. **记录结果**：通过时记录编译器版本、构建目录、测试数量；失败时记录命令、退出码、第一条根因诊断。

环境校验脚本：

```bash
node <skill-dir>/scripts/checking-environment.mjs --project .          # 静态
node <skill-dir>/scripts/checking-environment.mjs --project . --live   # 活动
```

`<skill-dir>` 换成插件里 `building-cpp` 的实际目录；不要复制脚本到项目里再改。脚本只读，不安装、不下载、不改 PATH。

## 失败分诊

| 现象 | 先看 | 回到 |
| --- | --- | --- |
| 轴为空、组合非法、版本不匹配 | `environment.json`、`--live` 输出 | 05，先修声明 |
| 找不到头文件、链接失败、target 不存在 | `CMakeLists.txt`、`target_include_directories`、`target_link_libraries` | 05 |
| 没有 `compile_commands.json`、clangd 跳转失败 | 生成器、`CMAKE_EXPORT_COMPILE_COMMANDS`、`.clangd` 路径 | 05 / 06 |
| `clang-format` 报格式 | 源码排版 | 06；只改格式，不改行为 |
| `clang-tidy` 报命名/类型/现代 C++ 用法 | 源码声明或实现 | `developing-cpp` 的 03 / 04 |
| 编译错误指向函数体或类型 | 源码 | `developing-cpp` 的 04；先修语义，再重跑 |
| CTest 失败 | 测试断言、行为句 | `developing-cpp` 的 01 / 04 |
| `app` 启动失败、找不到共享库 | 输出目录、RPATH / 运行时库路径 | 05 |

分诊只定位，不自动改。一次只改一类问题；改完从第 1 步重跑，不要跳步验证。

## 情况

**第一次接工程**：先跑静态校验，再跑 `--live`；两者都过再跑入口命令。环境没声明对时，构建脚本再完美也会失败。

**只改源码**：仍跑完整入口命令；格式化和静态检查可能暴露声明层问题，不要只看编译通过。

**只改配置**：至少跑一次完整构建 + 格式化 + 静态检查；配置错误常常在 clangd 或 tidy 阶段才暴露。

**没有测试**：CTest 显示没有测试是合法结果；不要为了「全绿」造空测试。行为验收由第 1 步的验收句负责。

**Windows 原生**：当前版本没有 PowerShell 构建脚本；`--live` 会失败并说明缺 shell。不要伪造一个临时脚本绕过，也不要把 `build_host` 改成 `wsl` 来「让它过」；先和用户确认是否补脚本。

**macOS**：Apple Clang 的 `clang++` 与 Homebrew 的 `clang-format` 可能不同主版本；`--live` 对 Apple Clang 只要求工具 ≥ 16 并给出提示，不强制同版本。不要为了通过而改 `environment.json` 的编译器。

## 正反例指针

- 环境组合与 `--live` 输出：`examples/environment.md`。
- 失败分诊的具体命令：`references/build-script.md`「失败分诊」。
- 工具调用细节：`references/static-analysis.md`。
