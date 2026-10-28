# 插件流程

这个包只做一件事：在已经声明 C++ 工作流的仓库里，提供 `developing-cpp`、`configuring-cmake` 与 `building-cpp` 三个技能。它不注册工具，不编译，不写项目文件，也不改系统提示词；唯一的浏览器半侧是一个设置页，用来调整注释标签的默认值。

## 第一层：安装

用 `dsh plugin --profile <name> add` 安装。npm 版本、Git 标签两种地址和桌面应用的 `desktop` profile 限制见 [README 的安装一节](../README.md#安装)。本包只发预构建的 `lib/`，没有需要授权执行的安装脚本。

安装后不会立刻出现在所有会话里。每次技能列表查询都会重新判断当前工作区。

## 第二层：门禁

`list({ cwd })` 只检查一件事：从 `cwd` 向上、停在 git 根，沿途存在 `.agents/skills/cpp-workflow-project/SKILL.md`。项目技能标记就是仓库选择加入本工作流的声明；不再要求同一仓库里已经有 `CMakeLists.txt` 或 C++ 源文件。只复制了模板、还没有源文件的仓库也要出现，轴为空时停在定构建。

没有标记就返回空列表。`get()` 带 `cwd` 时重新判断；不带 `cwd` 时只服务已经加载的 candidate。边界情形和扫描上限见 [plugin-boundaries.md](plugin-boundaries.md)。

## 第三层：分流

| 改动 | 打开 |
| --- | --- |
| `.h`、`.cpp`、`.cc`、命名、异常、源码注释 | `developing-cpp` |
| `CMakeLists.txt`、`cmake/`、target、属性、语言标准、GLOB、RPATH | `configuring-cmake` |
| `running-build.sh`、`.clang-*`、`.vscode/`、`environment.json`、构建目录与命令 | `building-cpp` |
| 只改函数体、命名、异常、注释，且入口命令可运行 | `developing-cpp`；定实现后只开 `building-cpp` 的「通过检查」 |
| 新增或移动源文件、改库与程序的边界、补测试 target | 先定声明和实现；再用 `configuring-cmake` 把文件写进 CMake，最后到 `building-cpp` 定工具配置并通过检查 |
| 入口命令仍是 `<entry-command>` 或空白 | 到 `building-cpp` 的通过检查停住，不猜命令 |
| `.qmd`、仓库 README、Python、非 C++ 文档 | 三个都不开 |

编译失败先分因：诊断指向函数体，回到定实现；指向声明或类型，回到定声明；指向找不到头、链接失败、target 不存在或标准不对，转 `configuring-cmake`；指向没有编译数据库、工具不在 PATH 或入口脚本错误，留在 `building-cpp` 的定构建或定工具配置。

VSCode 侧只保留一个入口：推荐 clangd、CMake Tools 和 C/C++ 扩展；clangd 负责编辑、补全、诊断和格式化，CMake Tools 负责配置、构建、运行和调试，C/C++ 扩展只作为 `CMake: Debug` 的调试后端并关闭 IntelliSense。工程根只带 `.vscode/extensions.json` 和 `settings.json`，不写 `tasks.json` 或 `launch.json`，避免第二套构建或启动路径。

## 第四层：检查

源码四步不依赖环境组合。构建三步先读项目声明，再在构建宿主上运行环境脚本。`<skill-dir>` 是安装后的 `building-cpp` 目录：

```bash
node "<skill-dir>/scripts/checking-environment.mjs" --project .
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live
```

第一条只验证三个环境轴、`standard` 和组合，任何机器都能跑。第二条在当前 PATH 上核对构建宿主、命令和版本。通过后才运行项目入口命令；入口内部依次 configure、build、format、tidy、ctest、run。

环境脚本不安装、不下载、不改 PATH。缺命令时打印缺的名字并非零退出。

## 第五层：设置

设置只有一个入口：「插件 → dsh-cpp-workflow → 配置」。它通过宿主 `configForms` 服务读取 `cpp-workflow` 命名空间，插件页不再替它转发表单；浏览器半侧拿不到这个命名空间时才退回只读出厂值，并说明这份部署没有提供配置。它只编辑文件头标签：`@file` 固定为文件名，`@brief` 默认写，`@author`、`@date`、`@copyright`、`@version` 默认不写且值空着就不写出，有参数就要求 `@param`，有返回值就要求 `@return`，会抛才要求 `@throws`，`@note`、`@see`、`@pre`、`@post`、`@tparam`、`@retval` 默认关闭。预览用示例文件名 `board.h`，不扫工程、不写文件。

保存走宿主表单，配置留在 profile 的 `cordis.yml`；下次技能列表或 `get()` 读取时把当前开关附在技能正文末尾，检查器按同一开关生成 `--no-brief` 与 `--allow-tag` 参数。设置页、快照与检查器读同一份策略，改一处不会出现三种默认值。

浏览器半侧是手写 CJS，构建时把 `comment-policy` 内联进去，不引入打包器；它只依赖宿主的 `react` 与 `@deepseek-ai/dsh-client-ui-slots`，没有各自的版本副本。
