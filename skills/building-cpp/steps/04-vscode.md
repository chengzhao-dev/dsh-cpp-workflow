# 第 4 步：VS Code 接线

只在工程已经有 `.vscode/` 时读本页；从当前目录向上到 git 根都没有 `.vscode/` 时，不打开本页，也不新建目录。新工程从 `../assets/config/.vscode/` 复制时除外。

## 三个角色

| 扩展 | 负责 | 不负责 |
| --- | --- | --- |
| `llvm-vs-code-extensions.vscode-clangd` | 补全、跳转、诊断、格式化 | 配置与构建 |
| `ms-vscode.cmake-tools` | 配置、构建、运行、调试入口 | 语言服务 |
| `ms-vscode.cpptools` | 只作为 `CMake: Debug` 的调试后端 | IntelliSense 与格式化（关闭） |

不要同时开两套语言服务；C/C++ 扩展的 IntelliSense 必须关闭，否则会和 clangd 抢编译数据库。

## 对照现有文件

1. 读工程根 `.vscode/extensions.json`；已有推荐只补缺，不重排、不删除。
2. 旧工程只写了 C/C++ 扩展时，加 clangd 与 CMake Tools，并在设置里关掉 IntelliSense，理由写在提交说明里。
3. 不写 `tasks.json` 或 `launch.json`；配置、构建、运行和调试都从 CMake Tools 进入，构建命令仍以 `running-build.sh` 为准。
4. 模板在 `../assets/config/.vscode/extensions.json`，只作为新工程的起点；工程已有文件时不复制整份覆盖。

## 复制后改三处

| 键 | clang 模式 | gcc 模式 |
| --- | --- | --- |
| `cmake.buildDirectory` | `${workspaceFolder}/build/clang` | `${workspaceFolder}/build/gcc` |
| `clangd.arguments` 的 `--query-driver` | `/usr/bin/clang++` | `/usr/bin/g++` |
| `cmake.debugConfig` | `MIMode: lldb`、`miDebuggerPath: /usr/bin/lldb` | `MIMode: gdb`、`miDebuggerPath: /usr/bin/gdb` |

只改与 `environment.json` 冲突的键；其余保持工程原值。`.clangd` 的 `CompilationDatabase` 也随编译器改，见 `../../engineering/references/formatting/04-clangd.md`。

## 各键分工

- `cmake.buildDirectory`：与定构建的 `build/<compiler>` 一致；不要在 CMake Tools 里再选第二个构建目录。
- `cmake.generator: Ninja`、`cmake.configureOnOpen: false`、`cmake.buildBeforeRun: true`、`cmake.exportCompileCommandsFile: true`：构建仍由入口脚本和 CMake 决定，编辑器只消费同一份数据库。
- `clangd.arguments`：`--query-driver` 写绝对路径且只列一个驱动，不用 `*`；`--header-insertion=never` 与 `--background-index` 沿用模板。
- `cmake.debugConfig`：只改调试后端；`type` 仍是 `cppdbg`。
- `C_Cpp.intelliSenseEngine: "disabled"`：把语言服务让给 clangd；不要把 C/C++ 扩展再配一套 include 路径。
- `editor.formatOnSave` 与 `[cpp]` / `[c]` 的默认格式化器：都指向 clangd；是否开启保存即格式化由工程决定，不在构建脚本里跑 `clang-format -i`。

## 不写什么

- 不写 `tasks.json`、`launch.json`，不另起构建或启动路径。
- 不把标准写死在设置里，也不靠 `.clangd` 的 `-std` 覆盖编译数据库。
- 不在设置里堆 `-I` / `-D` 或系统头路径；这些从 `compile_commands.json` 来。
- 注释用 JSONC 的 `//`，只写为什么这样设。

## 依据

- [clangd: Editor Plugins](https://clangd.llvm.org/installation#editor-plugins)：VS Code 的 clangd 扩展与语言服务。
- [CMake Tools for VS Code](https://github.com/microsoft/vscode-cmake-tools/blob/main/docs/README.md)：配置、构建、调试入口。
- [VS Code: Extension Recommendations](https://code.visualstudio.com/docs/editor/extension-marketplace#_workspace-recommended-extensions)：`extensions.json` 的 `recommendations`。
- [clangd: Configuration](https://clangd.llvm.org/config)：`.clangd` 与 `clangd.arguments`。
- [CMake Tools: Settings](https://github.com/microsoft/vscode-cmake-tools/blob/main/docs/cmake-settings.md)：`cmake.buildDirectory`、`cmake.generator`、`cmake.exportCompileCommandsFile`。
- [VS Code: Debugging](https://code.visualstudio.com/docs/debugtest/debugging)：`cppdbg` 调试配置与 `miDebuggerPath`。

下一步：扩展与设置对齐后，回到 [定工具配置](02-tooling.md) 收尾，再进 [通过检查](03-check.md)。
