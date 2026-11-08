# 推荐扩展

只在工程已经有 `.vscode/` 时读本页；从当前目录向上到 git 根都没有 `.vscode/` 时，不打开本页，也不新建目录。新工程从 `../../assets/config/.vscode/extensions.json` 复制时除外。

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
4. 模板在 `../../assets/config/.vscode/extensions.json`，只作为新工程的起点；工程已有文件时不复制整份覆盖。

下一步：扩展对齐后，读 [02-settings.md](02-settings.md) 接线设置。

## 依据

- [clangd: Editor Plugins](https://clangd.llvm.org/installation#editor-plugins)：VS Code 的 clangd 扩展与语言服务。
- [CMake Tools for VS Code](https://github.com/microsoft/vscode-cmake-tools/blob/main/docs/README.md)：配置、构建、调试入口。
- [VS Code: Extension Recommendations](https://code.visualstudio.com/docs/editor/extension-marketplace#_workspace-recommended-extensions)：`extensions.json` 的 `recommendations`。
