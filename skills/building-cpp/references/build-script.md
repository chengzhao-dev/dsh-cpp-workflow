# 构建脚本

`assets/templates/projects/common/running-build.sh` 是 POSIX build-host 脚本，适用于 Linux、macOS 和 Windows + WSL。Windows 原生组合（`build_host=native`）本版本没有 PowerShell 版本；这是已知缺口，不是编译器问题。

## 用法

```bash
./running-build.sh clang
./running-build.sh gcc
```

- 参数是编译器名，只接受 `clang` / `gcc`；省略时默认 `clang`。
- 脚本必须在工程根执行；内部 `cd "$(dirname "$0")"`，从其他目录调用也能找到工程。
- 构建目录由参数决定：`build/clang` 或 `build/gcc`；不要用环境变量临时改目录。
- 脚本不安装依赖、不下载工具、不改 PATH；缺工具时让命令失败，由第 7 步分诊。

## 结构

1. **shebang + 文件头**：说明用途、支持的 build host、参数。
2. **严格模式与目录**：`set -euo pipefail`；`cd "$(dirname "$0")"`；`readonly BUILD_DIR`、`readonly APP_NAME="app"`。
3. **输出辅助**：`header()` 打印阶段名，`err()` 打印到 stderr；`trap ERR` 打印失败命令与行号。
4. **configure**：每次运行都重新 configure，不复用缓存；传 `-G Ninja`、`-DCMAKE_BUILD_TYPE=Debug`、`-DCMAKE_CXX_COMPILER`、`-DCMAKE_EXPORT_COMPILE_COMMANDS=ON`。
5. **build**：`cmake --build "$BUILD_DIR"`。
6. **编译数据库链接**：先 `rm -f build/compile_commands.json`，再 `ln -s "${COMPILER}/compile_commands.json" build/compile_commands.json`；不用 `ln -n`，它在 BSD/macOS 上不可移植。
7. **format**：收集项目源码，`clang-format --dry-run --Werror --fallback-style=Google`；没有源文件时跳过。
8. **tidy**：`clang-tidy -p "$BUILD_DIR" --header-filter='^(include|src|apps|tests|greeting)/' --exclude-header-filter='(^|/)build/_deps/' --warnings-as-errors='*'` 扫描项目源文件。
9. **test**：`ctest --test-dir "$BUILD_DIR" --output-on-failure`；没有测试时 CTest 成功。
10. **run**：`(cd "$BUILD_DIR/bin" && "./$APP_NAME")`；共享库需要时只在这一步设置 `LD_LIBRARY_PATH`。

最后一行是 `main "$@"`；函数定义在 `main()` 之前，`set` / `readonly` 在最前。

## 关键约束

- 只用 POSIX shell + Bash 数组；不要依赖 `mapfile`（macOS 自带 Bash 3.2 没有）。
- 路径含空格时全部加引号；`find -print0` 配 `read -d ''`。
- `set -u` 下空数组展开会报错；先判 `${#sources[@]}` 再传给工具。
- 不把 `clang-format -i` 放进脚本；检查阶段只读。
- 不设置全局 `LD_LIBRARY_PATH`；需要时只包住测试/运行命令。
- 不 `sudo`、不 `apt install`、不 `pip install`。
- 失败时保留原始命令输出；不要在脚本里 `2>/dev/null` 吞掉诊断。
- 脚本自身用 `bash -n` 检查语法；文件权限保持可执行。

## 失败分诊

| 输出 | 先看 | 回到 |
| --- | --- | --- |
| `CMake Error ... CXX compiler` | `environment.json`、`--live` | 05 / 07 |
| `ninja: error: ... missing and no known rule` | 源文件是否在 CMake 中列出 | 05 |
| `fatal error: ... No such file` | `target_include_directories` | 05 |
| `undefined reference` | `target_link_libraries`、库 target 名 | 05 |
| `clang-format` 差异 | 源码排版 | 06 |
| `clang-tidy` 命名/类型诊断 | 声明或实现 | `developing-cpp` 03/04 |
| `CTest` 失败 | 测试断言、行为句 | `developing-cpp` 01/04 |
| 运行时报找不到 `.so` | RPATH / `LD_LIBRARY_PATH` | 05 |

## 验收

- `bash -n running-build.sh` 通过。
- 在声明的 build host 上，`./running-build.sh clang` 与 `./running-build.sh gcc` 都能从 configure 走到 run。
- 从工程根直接 `./build/clang/bin/app` 能启动（共享库场景由 RPATH 保证）。
- 切换编译器后 `build/compile_commands.json` 指向新数据库。
- 调用者的 `LD_LIBRARY_PATH` 在脚本结束后不变。
- Windows 原生：没有脚本时明确报告缺口，不伪造通过。
