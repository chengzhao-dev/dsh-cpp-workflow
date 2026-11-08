# clangd 与编辑器

## clangd

`.clangd`：

```yaml
CompileFlags:
  CompilationDatabase: build/clang
Diagnostics:
  Suppress:
    - pp_file_not_found
```

- `CompilationDatabase` 指向当前编译器目录；GCC 模式改 `build/gcc`。
- 不要在 `.clangd` 写 `-std`：它会覆盖 `compile_commands.json`，把 C++23 工程降成旧标准。标准只由构建声明和编译数据库决定。
- 静态检查规则只在 `.clang-tidy` 里维护；clangd 读取同一份配置，不要在这里复制检查列表。
- `Suppress` 只放确实无法避免的解析噪声（如 `pp_file_not_found`），并写理由。

`--query-driver`：

- 它是 clangd 的命令行参数，不是 `.clangd` 的 YAML 键。
- 作用：允许 clangd 执行编译器驱动，读取系统头路径；只对编译数据库里出现的驱动生效。
- 写在 `.vscode/settings.json`：

```jsonc
{
  "clangd.arguments": [
    "--query-driver=/usr/bin/clang++",
    "--header-insertion=never",
    "--background-index"
  ]
}
```

- 路径用绝对路径；多个驱动用逗号分隔。GCC 模式指向 `/usr/bin/g++`。
- 不要写 `--query-driver=*` 或宽泛的 glob；这等于允许 clangd 执行任意匹配的驱动。
- 如果编译数据库里的编译器是相对路径，clangd 可能拒绝执行；用绝对路径重新 configure。
- `--query-driver` 只影响 clangd，不影响 clang-tidy；tidy 用编译数据库里的命令。

## 编辑器

`.vscode/extensions.json` 推荐：

```json
{
  "recommendations": [
    "llvm-vs-code-extensions.vscode-clangd",
    "ms-vscode.cmake-tools",
    "ms-vscode.cpptools"
  ]
}
```

`.vscode/settings.json` 固定：

```jsonc
{
  "clangd.arguments": [
    "--query-driver=/usr/bin/clang++",
    "--header-insertion=never",
    "--background-index"
  ],
  "cmake.buildDirectory": "${workspaceFolder}/build/clang",
  "cmake.generator": "Ninja",
  "cmake.buildBeforeRun": true,
  "cmake.exportCompileCommandsFile": true,
  "cmake.debugConfig": {
    "type": "cppdbg",
    "request": "launch",
    "MIMode": "lldb",
    "miDebuggerPath": "/usr/bin/lldb",
    "stopAtEntry": false
  },
  "C_Cpp.intelliSenseEngine": "disabled"
}
```

- 配置、构建、运行和调试只从 CMake Tools 进入；不要同时维护 `tasks.json` 或 `launch.json`，否则会出现第二套构建或启动路径。
- C/C++ 扩展只作为 CMake 快速调试的 `cppdbg` 后端；IntelliSense 关闭，补全、跳转、诊断和格式化只由 clangd 提供。
- 不推荐与 clangd 冲突的 C++ 智能提示插件；只保留一个语言服务。
- 不把 `compile_commands.json` 提交进仓库；它是构建产物。
- 切换编译器时同时改 `.clangd`、`settings.json` 和构建目录；三处不一致会让诊断指向旧代码。GCC 模式把 `MIMode` 改为 `gdb`、`miDebuggerPath` 改为 `/usr/bin/gdb`。

## 依据

- [clangd: Configuration](https://clangd.llvm.org/config)：`.clangd` 的 `CompileFlags`、`Diagnostics` 与 `CompilationDatabase`。
- [clangd: `--query-driver`](https://clangd.llvm.org/design/compile-commands#query-driver)：允许读取系统头的驱动白名单。
- [clangd: Editor Plugins](https://clangd.llvm.org/installation#editor-plugins)：VS Code 扩展与语言服务配置。
- [CMake Tools for VS Code](https://github.com/microsoft/vscode-cmake-tools/blob/main/docs/README.md)：`cmake.buildDirectory`、`cmake.generator` 与调试配置。
