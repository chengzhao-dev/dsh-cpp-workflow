# 设置接线

## 什么时候打开

工程已经有 `.vscode/` 时，格式、静态检查与 clangd 的选择落定后再读本页；没有 `.vscode/` 时不打开，也不新建。模板在 `../../assets/config/.vscode/settings.json`。

## 复制后改三处

| 键 | clang 模式 | gcc 模式 |
| --- | --- | --- |
| `cmake.buildDirectory` | `${workspaceFolder}/build/clang` | `${workspaceFolder}/build/gcc` |
| `clangd.arguments` 的 `--query-driver` | `/usr/bin/clang++` | `/usr/bin/g++` |
| `cmake.debugConfig` | `MIMode: lldb`、`miDebuggerPath: /usr/bin/lldb` | `MIMode: gdb`、`miDebuggerPath: /usr/bin/gdb` |

只改与 `environment.json` 冲突的键；其余保持工程原值。`.clangd` 的 `CompilationDatabase` 也随编译器改，见 `../../../engineering/references/formatting/04-clangd.md`。

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

下一步：设置与扩展对齐后，回到 [定工具配置](../../steps/02-tooling.md) 收尾，再进 [通过检查](../../steps/03-check.md)。

## 依据

- [clangd: Configuration](https://clangd.llvm.org/config)：`.clangd` 与 `clangd.arguments`。
- [CMake Tools: Settings](https://github.com/microsoft/vscode-cmake-tools/blob/main/docs/cmake-settings.md)：`cmake.buildDirectory`、`cmake.generator`、`cmake.exportCompileCommandsFile`。
- [VS Code: Debugging](https://code.visualstudio.com/docs/debugtest/debugging)：`cppdbg` 调试配置与 `miDebuggerPath`。
