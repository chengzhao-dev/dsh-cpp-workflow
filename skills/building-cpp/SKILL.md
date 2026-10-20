---
name: building-cpp
description: 使用 CMake、Ninja、clang-format、clang-tidy、clangd 配置、构建和检查 C++20 工程时使用；按定构建、定工具配置、通过检查三步推进。用于构建与环境配置，不用于只改源码语义、文档、Python 或与 C++ 无关的文件。
metadata:
  short-description: C++20 构建三步
---

# building-cpp

负责让一个 C++20 工程在声明的环境组合里配置、构建、格式化、静态检查、测试并运行。源码行为、命名、异常和源码注释归 `developing-cpp`。整个流程有七步，本技能占后三步：定构建、定工具配置、通过检查。

## 先选走法

| 走法 | 什么时候用 | 怎么做 |
| --- | --- | --- |
| 整段 | 新工程、换环境组合、第一次接构建，或工具链整体升级 | 按 05 → 06 → 07 走完；先读项目技能与环境声明 |
| 一处 | 用户点了一条链接错误、一个 `.clangd` 配置或一条 clang-tidy 诊断 | 先判断属于 05 还是 06，只改那一处；不动无关 target 和配置 |

拿不准先用「一处」。发现环境轴、编译器或构建目录需要改，退回「整段」，从 05 重走。

## 路由

| 改动 | 打开 |
| --- | --- |
| `CMakeLists.txt`、target、生成器、编译数据库、输出目录 | 05 定构建 |
| 链接失败、静态库/动态库、RPATH、`file` / `ldd` | 05 定构建，并读 `references/linking.md` |
| `.clang-format` / `.clang-tidy` / `.clangd` / `.vscode`、格式化与静态检查命令 | 06 定工具配置 |
| 跑入口命令、核对环境、分诊失败 | 07 通过检查 |
| Python 驱动、JSON 行协议、本地 HTTP | 转到 `python-cpp-interop` |
| 函数体、类型、命名、异常、源码注释 | 只开 `developing-cpp`，不要在这里改源码语义 |
| 换编译器或换平台 | 先改项目 `environment.json`，再走 05 → 06 → 07；不要只改构建脚本 |

## 项目技能先读

存在项目技能 `cpp-workflow-project` 时，先读：

- `SKILL.md`：工程名、入口命令、库与程序边界、阶段表。
- `environment.json`：`host`、`build_host`、`compiler` 三个轴。
- `stages/stage-table.md`：当前阶段的可观察行为。

没有项目技能时，先问用户要环境声明；不要默认 WSL、Clang 或某个构建目录。

## 三步

| 步 | 名称 | 文件 | 一句话 |
| --- | --- | --- | --- |
| 5 | 定构建 | `steps/05-build.md` | 一个编译器、Ninja、target-based CMake、编译数据库 |
| 6 | 定工具配置 | `steps/06-tooling.md` | 格式化、静态检查、clangd 各管一段，互不越界 |
| 7 | 通过检查 | `steps/07-check.md` | 先核对环境，再跑入口命令，再按失败位置分诊 |

## 完成判据

- 项目 `environment.json` 的三个轴齐全且是合法组合；没有靠猜。
- `cmake -S . -B build/<compiler> -G Ninja -DCMAKE_CXX_COMPILER=<compiler>` 能配置，`build/<compiler>/compile_commands.json` 存在。
- `build/compile_commands.json` 指向当前编译器的数据库；切换编译器后同步更新。
- `target_compile_features(... cxx_std_20)` 与 `CXX_EXTENSIONS OFF` 存在；没有全局 `include_directories()`。
- `clang-format --dry-run --Werror` 与 `clang-tidy` 在项目源码上零告警；工具只扫描项目源码和项目头。
- `ctest --test-dir build/<compiler> --output-on-failure` 全绿；`app` 能运行。
- 环境静态校验与 `--live` 都通过；失败时报告的是具体角色和原因，不是「环境不对」。
