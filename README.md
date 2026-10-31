# dsh-cpp-workflow

[English](README.en.md)

把 C++11–C++23 的源码、CMake 与构建工作收成三个技能，新工程默认 C++23。插件注册技能 provider 与设置面，不注册工具、不编译、不下载工具链、不写项目文件。

## 提供什么

| 技能 | 管什么 | 什么时候打开 |
| --- | --- | --- |
| `developing-cpp` | 定行为、定边界、定声明、定实现；`.h` / `.cpp` / `.cc` 的命名、异常和源码注释 | 用户点名源码，或需要新建/整段重构源码 |
| `configuring-cmake` | 定 target、定模块、通过检查；CMakeLists.txt、`cmake/` 函数与模块、target 属性、C++11–C++23 标准、2 空格排版 | 改动落在 CMake target、标准、链接边界、函数或模块上 |
| `building-cpp` | 定构建、定工具配置、通过检查；Ninja、Clang 配置、构建脚本、环境组合、格式化与静态检查 | 改动落在构建命令、工具配置或环境声明上，或第一次接构建 |

异常条文采用 C++ Core Guidelines 的 Error handling，只在开发阶段指导源码和示例；插件运行时不编译、不执行这些规则。三个技能都先读项目技能 `cpp-workflow-project`。没有项目技能时，门禁不会放出这三个名字。

## 安装

npm 安装钉死版本：

```bash
dsh plugin --profile web add npm:@chengzhao-dev/dsh-cpp-workflow@0.6.13
```

同版本的 Git 标签：

```bash
dsh plugin --profile web add github:chengzhao-dev/dsh-cpp-workflow#v0.6.13
```

桌面应用独占 `desktop` profile。命令行 `add` 被拒绝时，在应用设置里添加插件，地址填同一个 npm 版本。Git 标签安装使用仓库内已构建的 `lib/`，不在目标机器上重新构建；包内也不含需要授权执行的安装脚本。

### 设置

插件页的「C++ 工程流程」是唯一入口：注释符号可选 `///` 或 `/** ... */`，页面按注释符号、文件头、类型、函数声明与只读预览分块。`@file` 固定为文件名；除它和函数体 `//` 外，文件头、类型与函数声明标签的开关出厂全开，空值跳过。函数参数要求 `@param`，返回值要求 `@return`（成立条件自明时可省），会抛才要求 `@throws`；`@pre`、`@post`、`@retval` 与类型块的 `@tparam`、`@note`、`@see` 也出厂开启，需要时可逐项关掉。函数体固定用 `//`。预览随改动即时更新，保存后下一次读取技能即生效，已有源码不会被改写。设置导航不再重复放一份。

升级插件后如果这一页暂时只显示出厂值，说明当前窗口还挂着旧的前端产物：页脚会显示写入的 `~/.dsh/profiles/<profile>/cordis.patch.yml`，并提示重载；重启 DeepSeek Harness，或在插件页点“重新载入页面”即可编辑，不需要重装插件。页面会在打开后自动重试连接，拿到表单就切换为可编辑。保存、撤销修改与恢复默认值分三个按钮：撤销只回到最近一次读到的值，恢复默认值只填草稿，点保存才写盘。

## 工作区门禁

一个会话里只需要满足一件事，技能就会出现：从当前目录向上、停在 git 根，沿途有 `.agents/skills/cpp-workflow-project/SKILL.md`。

项目技能标记就是仓库选择加入本工作流的声明。插件不再要求同一仓库里已经有第一方 `CMakeLists.txt` 或 C++ 源文件：纯文档仓库、只复制了模板、还没有任何源文件的仓库也会出现；环境轴为空时，源码四步仍能做，但定构建会停。没有标记就返回空列表，即使仓库里有 CMake 或 `.cpp`。扫描上限和边界情形见 [docs/plugin-boundaries.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-boundaries.md)。

插件技能 rank 550。项目自己的 `.agents/skills` 技能 rank 200，会以同名覆盖插件；不要在项目里复制 `developing-cpp`、`configuring-cmake` 或 `building-cpp`。

## 项目级约定

把 [templates/cpp-workflow-project](templates/cpp-workflow-project) 整个复制到目标仓库的 `.agents/skills/` 下，目录名保持 `cpp-workflow-project`；只补还不存在的文件，不覆盖已有的源码、`CMakeLists.txt` 或 `.clang-*`。项目技能只写本工程特有的事实：

- 工程名、组件名和源码根；
- 库与程序的边界、公共头位置；
- 从仓库根能直接运行的入口命令；
- 阶段表路径和术语增补。

`environment.json` 一个仓库只有一份。模板里的前三个环境轴故意留空，`standard` 预置为 `c++23`；复制后把环境轴填成工程的真实组合，需要旧标准时再改 `standard`。环境轴留空时源码四步仍能做，但定构建会停。阶段表只写可观察行为，不写内部重构。

## 环境组合

| 轴 | 允许值 | 说明 |
| --- | --- | --- |
| `host` | `windows`、`linux`、`macos` | 编辑器和代理壳在哪 |
| `build_host` | `native`、`wsl` | `wsl` 只在 `host=windows` 时合法 |
| `compiler` | `clang`、`gcc` | 一次配置一个编译器 |
| `standard` | `c++11`、`c++14`、`c++17`、`c++20`、`c++23` | 新工程默认 `c++23`；一个工程一个标准 |

标准写在 `environment.json` 的 `standard`，并同步到 CMake target 和编译数据库；CMake 侧优先调用 `configuring-cmake` 提供的 `CompileSettings_SetCxxStandard` 函数。新工程默认 C++23；C++11–C++20 工程把 `standard`、`cxx_std_*`、`CXX_STANDARD` 和 `.clang-format` 的解析档位一起降级，不要只改一处。每档的设施、工具和降档表见 [标准目录](skills/building-cpp/references/standards/README.md)，CMake 两层声明见 [cxx-standard.md](skills/configuring-cmake/references/cxx-standard.md)。

生成器固定 Ninja，构建目录是 `build/clang/` 与 `build/gcc/`，不共用 `build/`。诊断工具固定 `clang-format`、`clang-tidy`、`clangd`；GCC 模式也不换成别的分析器。

构建前先跑声明校验，再在构建宿主上跑活动校验。`<skill-dir>` 是插件安装后的 `building-cpp` 目录，不是目标工程里的目录：

```bash
node "<skill-dir>/scripts/checking-environment.mjs" --project .
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live
```

`windows + native` 在本版本中不是合法组合：声明校验直接返回 `ok: false`，`issues` 只有一句「本版本不能在 Windows 原生壳里构建」。停在这里，不要补 PowerShell 脚本，也不要靠改声明绕过。环境脚本不安装、不下载、不改 PATH。

工程根只带 `.vscode/extensions.json` 和 `settings.json`：推荐 clangd（编辑、补全、格式化）、CMake Tools（唯一的配置、构建、运行和调试入口）与 C/C++ 扩展（只作为 CMake 快速调试的后端）。不提供 `tasks.json` 或 `launch.json`，不维护第二套构建或启动路径。Windows 上用 Remote - WSL 打开工程根；在 CMake 侧栏选中 Launch target 后按 `CMake: Debug`。clangd 从 `build/<compiler>/compile_commands.json` 读语言标准，`.clangd` 不写 `-std`；C/C++ 扩展的 IntelliSense 关闭，编辑与诊断只由 clangd 提供。

## 包结构

```text
dsh-cpp-workflow/
├── lib/                 # 构建产物，随 npm 包发布
├── skills/              # developing-cpp、configuring-cmake 与 building-cpp
├── templates/           # 复制到项目的空模板
├── package.json
├── package-lock.json    # 只在仓库，供 npm ci
├── LICENSE
├── README.md
├── README.en.md
├── cordis.patch.yml     # 只 insert 一行
├── locale/              # 中英文标题与描述
└── icon.svg
```

仓库另有 `src/`、`scripts/`、`tests/` 与 `docs/`，只服务开发与评审，不进包；白名单见 [docs/plugin-layout.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-layout.md)。

边界与门禁的维护说明在 [docs/plugin-flow.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-flow.md)，技能的层次与数据流在 [docs/architecture.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/architecture.md)，触发矩阵在 [docs/triggering.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/triggering.md)，目录和进包白名单在 [docs/plugin-layout.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/plugin-layout.md)，版本规则在 [docs/versioning.md](https://github.com/chengzhao-dev/dsh-cpp-workflow/blob/main/docs/versioning.md)。

## 本地开发

需要 Node.js 22 或更新版本。

```bash
npm ci
npm test              # 构建、三技能结构检查、门禁/环境/schema/注释测试
npm run test:matrix   # 四套模板 × 五档标准的真实构建矩阵
npm run pack:check    # 核对 npm 包内容
npm run ci            # 复现 Ubuntu CI：安装、测试、打包检查
npm run ci:full       # 在 ci 之上再跑标准矩阵，需 POSIX 宿主
```

源码在 `src/`，`npm run build` 生成 `lib/`。结构检查在 `scripts/checking-skill-links.mjs`；测试不调用本机编译器，环境检查用固定版本字符串。标准矩阵需要 POSIX 宿主上的 `cmake`、`ninja`、`perl` 和 `clang++`（或 `CXX` 指定的编译器），在 WSL/Linux/macOS 上运行。Windows 上先跑 `npm run ci`，再从 WSL 进入仓库跑 `npm run ci:full`。

## 许可

MIT，见 [LICENSE](LICENSE)。
