# 插件流程

这个包只做一件事：在已经声明 C++ 工作流的仓库里，提供 `developing-cpp`、`engineering` 与 `building-cpp` 三个技能。它不注册工具，不编译，不写项目文件，也不改系统提示词；浏览器半侧只有插件页里的一张配置卡片，用来调整注释写法与标签的默认值。

## 第一层：安装

用 `dsh plugin --profile <name> add` 安装。npm 版本、Git 标签两种地址和桌面应用的 `desktop` profile 限制见 [README 的安装一节](../README.md#安装)。本包只发预构建的 `lib/`，没有需要授权执行的安装脚本。

安装后不会立刻出现在所有会话里。技能目录由宿主按 `cwd`、作用域与修订号缓存，插件不观察文件系统：新增、删除或移动项目技能标记后，要等目录重算（插件重载、注册表失效或作用域变化）才生效。`get()` 带 `cwd` 时重新判断门禁；不带 `cwd` 时只服务已加载的 candidate。

## 第二层：门禁

`list({ cwd })` 只检查一件事：从 `cwd` 向上、停在 git 根，沿途存在 `.agents/skills/cpp-workflow-project/SKILL.md`。项目技能标记就是仓库选择加入本工作流的声明；不再要求同一仓库里已经有 `CMakeLists.txt` 或 C++ 源文件。只复制了模板、还没有源文件的仓库也要出现，轴为空时停在定构建。

没有标记就返回空列表。`get()` 带 `cwd` 时重新判断；不带 `cwd` 时只服务已经加载的 candidate。边界情形和扫描上限见 [plugin-boundaries.md](plugin-boundaries.md)。

## 开销（实测）

在本书仓库上实测（Node 26，重复测量）：门禁通过时 `list()` 约 1 ms（热缓存 50 次均值 0.999 ms），门禁不通过时 0.11 ms，`get()` 每份约 0.4–1.3 ms；宿主按 `cwd`、作用域与修订号缓存完成的目录，同一工作区不会每轮重扫。模型侧的三行目录共 595 个字符（按中文约 1.8 字符一个 token 估算约 331 tokens，下同）；三份技能正文分别是 4855、5053 与 4694 个字符（`developing-cpp` 已含 161 字符的注释配置快照），合计约 1.46 万字符，全部加载约 8.1k tokens；正文不常驻，只有目录行常驻，加载时才进上下文，改正文也不产生目录消息；`references/` 在入口表或步骤点名时打开，判不准、规则冲突或排错时按需读取。运行时不写盘、不建缓存，见 [plugin-storage.md](plugin-storage.md)。

### 失败路径

链路里没有抛出：`list()` 的确定性空目录给空数组，**读盘失败给 `{ candidates, complete: false }`**；`get()` 失败一律给 `undefined`。宿主看到不完整观察时不会缓存，下一轮会重试。

| 情形 | `list()` | `get()` |
| --- | --- | --- |
| 没传 `cwd` 或为空 | 空数组 | 只服务已加载的候选，不再过门禁 |
| 不在 git 检出内，或标记不在 `cwd` 到 git 根之间 | 空数组 | 传了 `cwd` 时重跑门禁，不通过给 `undefined` |
| `skills/` 读不出来（权限、目录被删） | `{ candidates: [], complete: false }`；不缓存，下一轮重试 | — |
| 某份 `SKILL.md` 读不出来 | 其余候选照常返回，`{ candidates, complete: false }`；不缓存 | 该名字给 `undefined` |
| 某份 `SKILL.md` 的 frontmatter 不合规（`name` 与目录不同、`description` 为空、名字不在白名单、块标量不支持） | 该技能静默跳过，其余照常返回，complete 仍为 true | 该名字给 `undefined` |
| 调用方 abort | 插件返回空数组；宿主在调用前后检查 abort 并抛出 `AbortError` | `undefined` |
| `locator` 越出 `skills/`，或末段与 `name` 不符 | — | `undefined` |

静默跳过是有意的：一份写坏的文件不该拖垮另外两个技能。代价是没有诊断输出，排错时只能对照本表逐项复核。门禁按 `cwd` 现算，所以同一份候选在另一个工作区里可能立刻变成 `undefined`。

## 第三层：分流

| 改动 | 打开 |
| --- | --- |
| `.h`、`.cpp`、`.cc`、命名、异常、源码注释 | `developing-cpp` |
| `CMakeLists.txt`、`cmake/`、target、属性、语言标准、GLOB、RPATH；`.clang-format`、`.clang-tidy`、`.clangd` 与编码的规则条文 | `engineering` |
| `running-build.sh`、`.clang-*` 的复制与落地、`.vscode/`、`environment.json`、构建目录与命令 | `building-cpp` |
| 只改函数体、命名、异常、注释，且入口命令可运行 | `developing-cpp`；定实现后只开 `building-cpp` 的「通过检查」 |
| 新增或移动源文件、改库与程序的边界、补测试 target | 先定声明和实现；再用 `engineering` 把文件写进 CMake，最后到 `building-cpp` 定工具配置并通过检查 |
| 入口命令仍是 `<entry-command>` 或空白 | 到 `building-cpp` 的通过检查停住，不猜命令 |
| `.qmd`、仓库 README、Python、非 C++ 文档 | 三个都不开 |

编译失败先分因：诊断指向函数体，回到定实现；指向声明或类型，回到定声明；指向找不到头、链接失败、target 不存在或标准不对，转 `engineering`；指向没有编译数据库、工具配置不对，转 `engineering` 的 formatting；入口脚本错误留在 `building-cpp` 的定构建。

VSCode 侧只保留一个入口：推荐 clangd、CMake Tools 和 C/C++ 扩展；clangd 负责编辑、补全、诊断和格式化，CMake Tools 负责配置、构建、运行和调试，C/C++ 扩展只作为 `CMake: Debug` 的调试后端并关闭 IntelliSense。工程根只带 `.vscode/extensions.json` 和 `settings.json`，不写 `tasks.json` 或 `launch.json`，避免第二套构建或启动路径。 接线细节在 `skills/building-cpp/project/vscode/`；工程没有 `.vscode/` 时不新建。

## 第四层：检查

源码四步不依赖环境组合。构建三步先读项目声明，再在构建宿主上运行环境脚本。`<skill-dir>` 是安装后的 `building-cpp` 目录：

```bash
node "<skill-dir>/scripts/checking-environment.mjs" --project .
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live
```

第一条只验证三个环境轴、`standard` 和组合，任何机器都能跑。第二条在当前 PATH 上核对构建宿主、命令和版本。通过后才运行项目入口命令；入口内部依次 configure、build、ctest、run，format 与 tidy 由工具配置单独执行，不塞进入口脚本。

环境脚本不安装、不下载、不改 PATH。缺命令时打印缺的名字并非零退出。

## 第五层：设置

设置只有一个入口：「插件 → dsh-cpp-workflow → 配置」。它通过宿主 `configForms` 服务读取 `cpp-workflow` 命名空间（profile 条目 id），插件页不再替它转发表单；宿主没有提供这个命名空间时，表单进入不可用状态，仍以出厂值只读呈现；整份 `configForms` 服务都不存在时，设置卡片不挂载，技能本身不受影响（服务端注入只有 `skills`，`configForms` 属客户端）。

表单订阅 `ConfigFormController` 的快照，写入用 `mutate(ops, baseRevision)`：基准是草稿开始时的 revision，草稿期间外部改过配置时宿主会拒绝这次写入，不会拿新 revision 把旧草稿盖上去；字段按叶子路径 `['brief','value']` 提交，因为宿主只把叶子上的 `volatile()` 字段当作可写项。

页面分五个区块：注释符号（`///` 或 `/** ... */`）、文件头、类型、函数声明与只读预览；`@file` 固定为文件名，函数体固定用 `//`；除这两项外，文件头、类型与函数声明标签的开关出厂全开，空值仍不会写进文件。函数参数要求 `@param`，返回值要求 `@return`（成立条件由函数名与返回类型说清时可省），会抛才要求 `@throws`。

预览用示例文件名 `<文件名>`，不扫工程、不写文件；底部的保存按钮写入 `cordis.patch.yml`，成功后状态行提示下一次读取技能时生效。

保存走宿主表单，配置留在 profile 的 `cordis.patch.yml`；下次 `get()` 读取时把当前开关附在技能正文末尾，文件头标签开着但没填默认值的单列为「未填值」，这类标签不会写进文件。检查器按同一开关生成 `--comment-style block`、`--no-brief` 与 `--allow-tag` 参数。插件页、快照与检查器读同一份策略，改一处不会出现三种默认值。

浏览器半侧是手写 CJS，构建时把 `comment-policy` 内联进去，不引入打包器；它只依赖宿主的 `react`，以及由 `@deepseek-ai/dsh-client-ui-renderer` 提供的 `slots` 与 `@deepseek-ai/dsh-client-ui-settings` 提供的 `configForms` 两个服务，没有各自的版本副本。
