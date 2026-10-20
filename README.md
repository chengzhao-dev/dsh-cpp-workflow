# dsh-cpp-workflow

[English](README.en.md) | **简体中文**

为 [DeepSeek Harness](https://deepseek-harness.github.io/deepseek-harness/) 提供一套 C++20 工程技能：按「定行为 → 定边界 → 定声明 → 定实现 → 定构建 → 定工具配置 → 通过检查」推进，源码规则以 Google C++ Style Guide 为基线，构建统一用 CMake + Ninja，输出组合优先用 `std::format`。

插件只注册技能，不注册工具，不扫描项目，不安装工具链，也不改写工程文件。项目级事实放在目标仓库的 `.agents/skills/cpp-workflow-project/`，通用规则留在插件里。

## 提供什么

| 技能 | 覆盖 | 负责 | 不负责 |
| --- | --- | --- | --- |
| `developing-cpp` | 第 1–4 步 | 可观察行为、库与程序边界、头文件与声明、命名、异常、源码注释、`.cpp` 实现 | CMake、`.clang-*`、构建脚本、文档、Python |
| `building-cpp` | 第 5–7 步 | CMake target、Ninja、编译数据库、clang-format/tidy/clangd、环境三轴校验、构建脚本 | 源码语义、命名、异常正文 |

两个技能从包内 `skills/<name>/SKILL.md` 发现，按需加载。步骤文件、references、examples 和 assets 都以技能目录为基准解析相对路径。

## 安装

```bash
dsh plugin --profile web add npm:dsh-cpp-workflow@0.1.0
```

`--profile` 换成实际运行的 profile。桌面应用使用 `desktop` profile 时，请在应用里走「设置 → 插件 → 添加插件」，地址填 `npm:dsh-cpp-workflow@0.1.0`；由应用管理的 profile 不要直接跑命令行 `add`。跟 GitHub 标签也可以写 `github:<owner>/dsh-cpp-workflow#v0.1.0`，但要锁定 commit 或 tag，并确认 `lib/` 已在仓库里。

要求 DSH 0.2.x、Node.js 22 及以上。发布包已带 `lib/`，安装后不需要构建；从 Git 链接安装时需要 `prepare` 或预编译的 `lib/`，本仓库提交了 `lib/`。

## 工作区门禁

`apply()` 只注册技能 provider，不扫描、不探测、不写文件。provider 的 `list({ cwd })` 决定这次会话能不能看见两个技能：

- 从 `cwd` 向上找到最近的 git 根；
- 在 `cwd` 到 git 根之间，必须存在 `.agents/skills/cpp-workflow-project/SKILL.md`；
- 没有 `cwd`、不在 git checkout、标记在 git 根之上，都返回空列表。

门禁只影响技能发现，不影响 `get()` 对已加载 candidate 的正文读取。项目 `.agents/skills` 的 rank 是 200，插件是 550：同名技能由项目层胜出。**不要把 `developing-cpp` 或 `building-cpp` 嵌进项目**，否则项目里那份会覆盖插件正文，通用规则就会分叉。

## 七步流程

| 步 | 名称 | 产出 | 文件 |
| --- | --- | --- | --- |
| 1 | 定行为 | 一句可验收的可观察行为 | `skills/developing-cpp/steps/01-behavior.md` |
| 2 | 定边界 | 库与程序的责任、依赖方向 | `skills/developing-cpp/steps/02-boundary.md` |
| 3 | 定声明 | 头文件、命名、声明顺序、合同 | `skills/developing-cpp/steps/03-declaration.md` |
| 4 | 定实现 | `.cpp` 操作顺序、分组、实现注释 | `skills/developing-cpp/steps/04-implementation.md` |
| 5 | 定构建 | target-based CMake、Ninja、编译数据库 | `skills/building-cpp/steps/05-build.md` |
| 6 | 定工具配置 | clang-format/tidy/clangd、编辑器 | `skills/building-cpp/steps/06-tooling.md` |
| 7 | 通过检查 | 环境 live、入口命令、CTest、运行 | `skills/building-cpp/steps/07-check.md` |

后一步发现前一步不完整时，退回被打破的那一步重走，不在当前层打补丁。第 5 步先做环境**静态**校验；第 7 步跑入口命令前再做 `--live`，检查真实 build host、PATH 角色、版本和 `std::format` 探针。

## 项目级约定

目标仓库只放这一份自己的技能：

```text
<repo>/.agents/skills/cpp-workflow-project/
├── SKILL.md                  # 工程名、职责、入口命令、库/程序边界、阶段表
├── environment.json          # host / build_host / compiler，三个空轴
└── stages/stage-table.md     # 当前阶段的可观察行为、验证方式、状态
```

模板见 `templates/cpp-workflow-project/`。复制整个目录后填写真实事实；三个轴故意留空，插件不会替用户猜 WSL、Clang 或构建目录。项目的领域词、输入格式、外部约束放这里；Google 风格、CMake 规则、clang-tidy 清单不要复制进来。

## 环境三轴

`environment.json` 只声明三个独立事实：

| 轴 | 允许值 | 说明 |
| --- | --- | --- |
| `host` | `windows` / `linux` / `macos` | 工程实际运行的操作系统 |
| `build_host` | `native` / `wsl` | `wsl` 只在 `host=windows` 合法；Linux/macOS 必须 `native` |
| `compiler` | `clang` / `gcc` | 每次 configure 只选一个；生成器固定 Ninja |

合法组合：Windows + WSL + clang/gcc、Linux + native + clang/gcc、macOS + native + clang/gcc。Windows + native 是合法声明，但本版本没有 PowerShell 构建脚本；`--live` 会报告缺的是 shell，不是编译器。构建目录固定 `build/clang`、`build/gcc`，根 `build/compile_commands.json` 指向当前数据库。

```bash
node skills/building-cpp/scripts/checking-environment.mjs --project <repo>
node skills/building-cpp/scripts/checking-environment.mjs --project <repo> --live
node skills/building-cpp/scripts/checking-environment.mjs --project <repo> --json
```

退出码：`0` 通过，`1` 脚本内部错误，`2` 声明缺失或非法，`3` live 检查失败。检查器只读；唯一临时写入是系统临时目录里的 `std::format` 探针，退出前删除。

## 工具链要求

- **C++20**，不使用 C++23；`std::print` 不可用，输出用 `std::cout` / `std::cerr` 配合 `std::format`。
- **CMake ≥ 3.20**、**Ninja**、**CTest**。
- **Clang 模式**：`clang++`、`clang-format`、`clang-tidy`、`clangd` 同一 LLVM 主版本，且都 ≥ 16。
- **GCC 模式**：`g++ ≥ 13`（libstdc++ 的 `<format>`），`clang-format` / `clang-tidy` ≥ 16，`clangd` 只要求可用（工具角色固定用 Clang 工具链，不因编译器是 GCC 而降低）。
- `std::format` 还要求实际标准库支持：GCC/libstdc++ ≥ 13，或 libc++ ≥ 14；检查器会编译运行探针，不只看版本号。
- `.clangd` 的 `--query-driver` 是 clangd 命令行参数，放在 `.vscode/settings.json`，不是 `.clangd` 的 YAML 键；换编译器时先确认再改绝对路径。

## 资产与模板

`skills/building-cpp/assets/` 是脚手架来源：

- `config/`：`.clang-format`、`.clang-tidy`、`.clangd`、`.vscode/`。
- `cmake/`：统一警告、固定版本 GoogleTest、跨平台 `BUILD_RPATH`。
- `templates/projects/`：`single`、`multi`、`static-library`、`shared-library`，外加 `common/running-build.sh`。四个模板都用 target-based CMake、`cxx_std_20`、`app` 程序 target，库与程序分离。

只复制缺失文件，不覆盖已有 `CMakeLists.txt`、`.clang-*`、`.vscode` 或源码。CMake 助手模块复制到项目 `cmake/`，由项目在顶层 `CMAKE_MODULE_PATH` 后 include；不要从插件目录直接 include。

`running-build.sh <clang|gcc>` 依次执行：无条件 configure → build → 编译数据库软链接 → CRLF 检查 → clang-format → clang-tidy（只收 `.cpp`）→ CTest → 从 `build/<compiler>/bin` 运行 `app`。

## 包结构

```text
dsh-cpp-workflow/
├── src/index.ts              # provider 与门禁
├── lib/index.js              # tsc 产物，随包发布
├── skills/                   # 两个技能与 assets
├── templates/                # 项目技能模板
├── docs/                     # 创建参考、结构、校验记录
├── scripts/                  # 结构自检
├── locale/{zh,en}.json
├── cordis.patch.yml          # 只 insert 一行 cpp-workflow
└── icon.svg
```

更细的分层、复制规则和自检项见 `docs/cpp-workflow-layout.md`；来源、Google 偏差和 cpp-board-games 审计见 `docs/cpp-workflow-validation.md` 与 `docs/creation-references.md`。

## 本地开发

```bash
npm install
npm run build      # tsc → lib/
npm test           # provider + checker，不依赖本机 C++ 工具链
npm run check      # build + 结构/链接/shell/模板/包元数据 + 同一组样例测试
npm run pack:check # npm pack --dry-run
```

`npm run check` 是计划里的完整自检：先编译 `lib/`，再核对技能链接与包元数据，最后跑 `tests/` 里的 provider 与 checker 样例。测试用临时目录模拟 `.git` 和项目技能标记，不写入真实仓库；checker 测试用 fixtures 和 CLI 子进程。模板编译不在 Node 测试里伪装，必须在声明的 build host 上按项目入口命令验收。

## 设计基线

- DSH 官方技能子系统与发布文档：bundle patch、`SkillProvider` 的 `list()`/`get()`、rank、`engines.dsh`、`files` 白名单。
- Google C++ Style Guide：C++20 基线、命名、声明顺序、异常、include 顺序、cast 与所有权。
- `cpp-board-games` 的 C++ 教学约定：Google 命名与声明顺序、异常分层、注释层次、target-based CMake、构建脚本阶段顺序。
- 结构参考 `dsh-quarto-book` 与 `dsh-embedded-workbench`；下载量快照中没有 C++ 专用头部插件，因此按通用 bundle 约定实现，不发明运行时协议。

有意偏差：异常只在合同违反/程序边界使用（Google 禁止异常）；`#pragma once`（Google 用 include guard）；100 列（Google 80）；`Get` + PascalCase 访问器；`.h/.cpp` 扩展；项目头从组件 `PUBLIC include/` 裸文件名包含；用 clang-format/tidy 代替 `cpplint.py`；封闭状态枚举可指定 `std::uint8_t`。完整表格和理由见 `skills/developing-cpp/references/google-cpp-style.md`。

## 不做什么

- 不修改源工程以外的仓库；本轮审计没有改 `cpp-board-games`。
- 不提供 MSVC/clang-cl、C-only、调试器、ASan、vcpkg/Conan、Debug/Release 轴。
- 不安装工具、不下载依赖、不编辑 PATH、不写 `~/.bashrc`。
- 不注册工具，不在 `apply()` 里探测环境；环境检查只在用户/技能调用 checker 时发生。
- 不做 LSP 客户端或代码导航服务；只保证当前构建写出 `compile_commands.json`，导航交给已有的 clangd/LSP 插件。
- Windows 原生构建没有 PowerShell 入口；这是 v1 的已知缺口，不是隐式回退。

## 许可

MIT，见 [LICENSE](LICENSE)。
