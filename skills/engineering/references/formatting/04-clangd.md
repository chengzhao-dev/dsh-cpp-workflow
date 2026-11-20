<!-- 读取时机：排版或工具配置时；读完能回答：clangd 与编辑器；预算：一次只开这一份（84 行），不自动串联。 -->
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

- `CompilationDatabase` 指向当前编译器目录；GCC 模式改 `build/gcc`。项目技能声明单一构建目录时指向该目录（如 `games/tictactoe/build`），不再按编译器分目录。目录必须与 `environment.json` 的 `compiler` 一致，切换编译器时两处同改。
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

- 路径用绝对路径；多个驱动用逗号分隔。GCC 模式指向真实 GCC 驱动；macOS 的 `/usr/bin/g++` 是 Apple clang 别名，不能用。
- 不要写 `--query-driver=*` 或宽泛的 glob；这等于允许 clangd 执行任意匹配的驱动。
- 如果编译数据库里的编译器是相对路径，clangd 可能拒绝执行；用绝对路径重新 configure。
- `--query-driver` 只影响 clangd，不影响 clang-tidy；tidy 用编译数据库里的命令。

## 编辑器

`.vscode/extensions.json` 推荐（`ms-vscode.cpptools` 只作调试后端，关闭 IntelliSense 与格式化；clangd 安装文档要求不装它，是针对 IntelliSense 冲突的默认建议，这里是明确的本地例外）：

```json
{
    "recommendations": [
        "llvm-vs-code-extensions.vscode-clangd",
        "ms-vscode.cmake-tools",
        "ms-vscode.cpptools"
    ]
}
```

`.vscode/settings.json` 的键、作用与取值规则（完整可复制件在 `building-cpp` 的 `assets/config/.vscode/settings.json`；工程内实际取值由该步骤落）：

| 键 | 作用 | 取值规则 |
| --- | --- | --- |
| `clangd.arguments` | 传给 clangd 的参数 | `--query-driver=<绝对路径>` 与 `environment.json` 的编译器一致；只列当前构建用的一个驱动，确有多个时按上文用逗号分隔，不写 `*`；`--header-insertion=never`；`--background-index` |
| `cmake.buildDirectory` | 构建目录与编译数据库位置 | 与 `.clangd` 的 `CompilationDatabase` 同一目录：默认 `build/<compiler>`，工程声明单一目录时写该目录 |
| `cmake.generator` | 生成器 | `Ninja`，与入口脚本一致 |
| `cmake.configureOnOpen` | 打开工程时自动配置 | `false`，配置时机由入口脚本决定 |
| `cmake.buildBeforeRun` | 运行前先构建 | `true`，避免跑到旧产物 |
| `cmake.exportCompileCommandsFile` | 导出编译数据库 | `true`，供 clangd 与 clang-tidy 读取 |
| `cmake.debugConfig` | 调试后端 | `type` 仍是 `cppdbg`；clang 模式 `MIMode: lldb`、`miDebuggerPath: /usr/bin/lldb`，GCC 模式换 `gdb` 与其绝对路径 |
| `C_Cpp.intelliSenseEngine` | C/C++ 扩展的语言服务 | `disabled`，只保留 clangd |
| `editor.formatOnSave` | 保存即格式化 | 由工程决定；构建脚本不跑 `clang-format -i` |
| `[cpp]`、`[c]` 的 `editor.defaultFormatter` | 默认格式化器 | `llvm-vs-code-extensions.vscode-clangd` |
| `files.associations` | 头文件按哪种语言解析 | `*.h` 用 `cpp` |
| `files.encoding`、`files.eol` | 保存编码与行尾 | `utf8` 与 `\n`，与 `.editorconfig`、`.gitattributes`、`LineEnding: LF` 一致 |
| `files.exclude`、`search.exclude` | 隐藏构建产物与缓存 | `**/build`、`**/.cache` |

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
