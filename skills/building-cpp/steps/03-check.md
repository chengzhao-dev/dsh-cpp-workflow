# 第 3 步：通过检查

## 产出

一次可复现的通过记录：环境校验、配置、构建、测试、运行都通过；失败时能指出是哪一步、哪个角色、哪条诊断。

## 通用情况

按固定顺序跑，前一步失败就停，不要带着失败继续：

1. **校验编码与行尾**：在仓库根跑编码检查。默认 UTF-8 无 BOM、LF；MSVC 原生工程加 `--profile msvc`。有问题先按 `../../engineering/references/formatting/01-encoding.md` 修正，不带着 BOM 或混用行尾继续；脚本退出码为 0 后再跑 `git diff --check`，有空白错误同样停在这里。
2. **校验环境声明（不带 `--live`）**：读 `environment.json`，检查三个环境轴、`standard` 和组合是否合法。三个环境轴为空、`standard` 取值不在 `c++11`–`c++23` 内或组合非法时，停在这里，不找可执行文件；`standard` 缺失或为空时按默认 `c++23` 继续并提示声明升级。
3. **活动校验**：在声明的 build host 上跑 `--live`，核对 PATH 中的角色和版本。`windows` + `native` 在声明校验阶段就返回失败，不会进入这一步。
4. **跑项目入口命令**：项目技能里写的入口命令（如 `./running-build.sh clang`）。入口命令仍是 `<entry-command>` 或空白时，停在这里，不要猜命令；是真实命令才跑。入口内部依次 configure → build → ctest → run；每一步失败都保留原始输出。有 `tests/` 目录时，脚本里的 ctest 必须带 `--output-on-failure --no-tests=error`；缺参数时按 `ctest --test-dir build/<compiler> --output-on-failure --no-tests=error` 补跑，并以补跑的退出码为准；没有测试目录时按「没有测试」情形处理，不补 `--no-tests=error`。入口通过后，再对项目源码跑 `clang-format --dry-run --Werror` 与 `clang-tidy -p build/<compiler> --header-filter="^$(pwd -P)/(include|src|apps|tests)/" --warnings-as-errors='*'`；任一非零即失败，命令细节见 `../../engineering/references/formatting/02-clang-format.md` 与 `03-clang-tidy.md`。
5. **核对产物**：`build/<compiler>/compile_commands.json` 存在；`build/compile_commands.json` 指向当前编译器；`app` 可执行文件在 `build/<compiler>/bin`。对 `app` 跑 `file` 与 `ldd`（macOS 用 `otool -L`），`ldd` 不得出现 `not found`，并做一次最小启动；见 `../../engineering/references/cmake/linking/04-inspect.md`。
6. **记录结果**：通过时记录编译器版本、构建目录、测试数量；失败时记录命令、退出码、第一条根因诊断。

编码检查与环境校验脚本（`<skill-dir>` 换成插件里 `building-cpp` 的实际目录）：

```bash
node "<skill-dir>/../engineering/references/formatting/scripts/checking-encoding.mjs" --profile portable      # UTF-8 无 BOM、LF
node "<skill-dir>/scripts/checking-environment.mjs" --project .          # 声明校验
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live   # 活动校验
```

脚本只读，不安装、不下载、不改 PATH；不要复制到项目里再改。

## 失败分诊

| 现象 | 先看 | 回到 |
| --- | --- | --- |
| 轴为空、组合非法、版本不匹配 | `environment.json`、`--live` 输出 | 定构建，先修声明 |
| 找不到头文件、链接失败、target 不存在 | `CMakeLists.txt`、`target_include_directories`、`target_link_libraries` | `engineering` 的定 target；修完回定构建 |
| 没有 `compile_commands.json` | 顶层 `CMAKE_EXPORT_COMPILE_COMMANDS` 是否由 target 图声明 | `engineering` 的定 target；生成器与目录回定构建 |
| clangd 跳转失败、数据库指向旧编译器 | `.clangd` 的 `CompilationDatabase`、`build/compile_commands.json` 链接 | 定工具配置 |
| 编译错误指向函数体 | 实现 | `developing-cpp` 的定实现；先修语义，再重跑 |
| CTest 失败 | 测试断言、行为句 | `developing-cpp` 的定行为 / 定实现 |
| `app` 启动失败、找不到共享库 | 输出目录、RPATH / 运行时库路径 | `engineering` 的定 target（输出目录与 RPATH） |

分诊只定位，不自动改。一次只改一类问题；改完从失败的那一步重跑，只有行为或边界也变了才回到定行为。

## 情况

**第一次接工程**：先跑声明校验，再跑 `--live`；两者都过再跑入口命令。环境没声明对时，构建脚本再完美也会失败。

**只改源码**：仍跑完整入口命令；CTest 可能暴露声明层问题，不要只看编译通过。

**改过 C++ 源码**：再按 `../../engineering/references/cmake/testing/ctest.md` 的运行顺序第 4 条，用 `-fsanitize=address,undefined -fno-omit-frame-pointer` 重新 configure 并跑一轮 CTest；报告按第一条栈帧定位，不靠猜。

**只改配置**：至少跑一次完整构建 + CTest；配置错误常常在链接或测试阶段才暴露。

**没有测试**：项目确实还没有测试时，CTest 显示 0 条不算构建失败；不要为了「全绿」造空测试。已有公开行为却没有任何用例时，按 `../../engineering/references/cmake/testing/ctest.md` 的「先决定测什么」补成功与拒绝各一条，再跑 `--no-tests=error` 确认它真的被注册。

**Windows 原生**：本版本不支持 `host=windows` + `build_host=native`。声明校验会返回 `ok: false`，`issues` 只有一句「本版本不能在 Windows 原生壳里构建」。停在这里，不要伪造 PowerShell 脚本，不要建议改 WSL 来绕过，也不要让代理改 `environment.json` 过关。

**macOS**：`/usr/bin/clang++` 通常是 Apple Clang；`.clangd` 不写死 Homebrew 路径，clangd 要能经 xcrun 找到 SDK。`compiler=clang` 时 `--live` 按同一 LLVM 主版本核对 clang++、clang-format、clang-tidy、clangd；不要混用 Homebrew LLVM 与 Xcode 资源目录来凑版本，也不要为了通过而改 `environment.json` 的编译器。

## 正反例指针

- 环境组合与 `--live` 输出：`../examples/environment.md`。
- 失败分诊的具体命令：`../references/build-script.md`「失败分诊」。
- 工具调用细节：`../../engineering/references/formatting/03-clang-tidy.md`。
