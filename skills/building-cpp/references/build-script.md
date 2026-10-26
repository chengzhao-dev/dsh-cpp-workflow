# 构建脚本

`assets/templates/projects/common/running-build.sh` 是 POSIX build-host 脚本，适用于 Linux、macOS 和 Windows + WSL。`host=windows` + `build_host=native` 不是本版本支持的组合：声明校验会直接拒绝，脚本也不会在原生 Windows 壳里运行。脚本只做配置、构建、CTest 与运行；格式化与静态检查在编辑时手动跑，不混进构建入口。

## 格式化与静态检查

不在 `running-build.sh` 里跑。构建脚本只做配置、构建、CTest 与运行；格式化是编辑时动作，不能让构建顺手改动源码。检查放在编辑器保存时或 CI 的独立步骤里。

检查（按工程实际源码根替换 `src/`、`include/`、`apps/`、`tests/`）：

```bash
clang-format --dry-run --Werror src/*.cpp include/*.h
```

需要修复时单独运行 `clang-format -i`，再回看 diff。`clang-format` 只排版，不会把行尾注释搬到上一行；数据成员注释位置按 `developing-cpp/references/comments.md` 的规则和 `checking-comments.mjs` 检查。

## 用法

```bash
./running-build.sh clang
./running-build.sh gcc
```

- 参数是编译器名，只接受 `clang` / `gcc`；省略时默认 `clang`。
- 脚本以自身所在目录为工程根；把它放在工程根，从其他目录调用时会先 `cd` 到脚本目录。
- 构建目录由参数决定：`build/clang` 或 `build/gcc`；不要用环境变量临时改目录。
- 脚本不安装依赖、不下载工具、不改 PATH；缺工具时让命令失败，由 `building-cpp` 的通过检查分诊。

## 结构

1. **shebang + 文件头**：说明用途、支持的 build host、参数。
2. **严格模式与目录**：`set -euo pipefail`；`cd "$(dirname "$0")"`；`readonly BUILD_DIR`、`readonly APP_NAME="app"`。
3. **输出辅助**：`header()` 打印阶段名，`err()` 打印到 stderr；`trap ERR` 打印失败命令。
4. **configure**：每次运行都重新 configure，不复用缓存；传 `-G Ninja`、`-DCMAKE_BUILD_TYPE=Debug`、`-DCMAKE_C_COMPILER`、`-DCMAKE_CXX_COMPILER`、`-DCMAKE_EXPORT_COMPILE_COMMANDS=ON`。C 与 C++ 使用同一套编译器；没有 C 语言的工程会忽略 C 编译器设置。
5. **build**：`cmake --build "$BUILD_DIR"`。
6. **编译数据库链接**：先 `rm -f build/compile_commands.json`，再 `ln -s "${COMPILER}/compile_commands.json" build/compile_commands.json`；不用 `ln -n`，它在 BSD/macOS 上不可移植。
7. **test**：`ctest --test-dir "$BUILD_DIR" --output-on-failure`；没有测试时 CTest 成功。
8. **run**：`(cd "$BUILD_DIR/bin" && "./$APP_NAME")`；共享库的运行时路径由定构建的 CMake RPATH 负责，不在脚本里设全局 `LD_LIBRARY_PATH`。

最后一行是 `main "$@"`；函数定义在 `main()` 之前，`set` / `readonly` 在最前。

## 关键约束

- 只用 POSIX shell + Bash 数组；不要依赖 `mapfile`（macOS 自带 Bash 3.2 没有）。
- 路径含空格时全部加引号；`find -print0` 配 `read -d ''`。
- `set -u` 下空数组展开会报错；先判 `${#sources[@]}` 再传给工具。
- 不在脚本里设全局 `LD_LIBRARY_PATH`；共享库的运行时路径由 CMake 的 RPATH 设置。
- 不 `sudo`、不 `apt install`、不 `pip install`。
- 失败时保留原始命令输出；不要在脚本里 `2>/dev/null` 吞掉诊断。
- 脚本自身用 `bash -n` 检查语法；文件权限保持可执行。

## 构建模式的错误合同

工程需要 Release 时另建构建目录；模式只改变诊断详略，不改变失败方式：

- 返回值：两种模式的返回值相同，调用方不按 `NDEBUG` 分支。
- 自定义异常：两种模式都抛；Debug 的 `what()` 可以带 `file:line`，Release 只留值。
- `Check`：两种模式都在条件不成立时打印诊断并终止。
- `DebugCheck`：只在 Debug 生效，`NDEBUG` 后展开为空，参数不能带副作用。

不要写成 Debug 抛异常、Release 返回 false 的模式分支；这会把调用方逼成两套逻辑。规则详见 `developing-cpp/references/exceptions.md`。

## 失败分诊

| 输出 | 先看 | 回到 |
| --- | --- | --- |
| `CMake Error ... CXX compiler` | `environment.json`、`--live` | `building-cpp` 的定构建 / 通过检查 |
| `ninja: error: ... missing and no known rule` | 源文件是否在 CMake 中列出 | 定构建 |
| `fatal error: ... No such file` | `target_include_directories` | 定构建 |
| `undefined reference` | `target_link_libraries`、库 target 名 | 定构建 |
| `CTest` 失败 | 测试断言、行为句 | `developing-cpp` 的定行为 / 定实现 |
| 运行时报找不到 `.so` | RPATH / `LD_LIBRARY_PATH` | 定构建 |

## 验收

- `bash -n running-build.sh` 通过。
- 在声明的 build host 上，`./running-build.sh clang` 与 `./running-build.sh gcc` 都能从 configure 走到 run。
- 从工程根直接 `./build/clang/bin/app` 能启动（共享库场景由 RPATH 保证）。
- 切换编译器后 `build/compile_commands.json` 指向新数据库。
- 调用者的 `LD_LIBRARY_PATH` 在脚本结束后不变。
- Windows 原生：声明校验已拒绝该组合；不要伪造 PowerShell 脚本，也不要绕过声明。
