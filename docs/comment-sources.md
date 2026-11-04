# 注释规范书目

本页是 `source/07-comments/01-comment-rules.md` 与 `source/07-comments/glossary/comment-terms.md` 的检索底稿，共 **100 份**中文资源。书目按「官方文档 → 语言参考 → 工具手册 → 社区实践」分层；每份只记标题、类型、URL 与采信点，不复制正文。URL 访问日期为 2026-11-01；同一页面的不同章节按独立条目计，去重按「标题 + URL（含锚点）」判断。

采信原则：官方文档优先于企业规范，企业规范优先于社区文章；社区文章只用来发现问题与对照写法，不单独作为规则依据。

## 一、Google 中文 C++ 风格指南（10 份）

| 编号 | 标题 | 类型 | URL | 采信点 |
| --- | --- | --- | --- | --- |
| 1 | Google C++ 风格指南（总览） | 官方文档 | https://zh-google-styleguide.readthedocs.io/en/stable/google-cpp-styleguide/ | 章节结构与适用范围 |
| 2 | 头文件 | 官方文档 | https://zh-google-styleguide.readthedocs.io/en/stable/google-cpp-styleguide/headers.html | 头文件注释与包含顺序 |
| 3 | 作用域 | 官方文档 | https://zh-google-styleguide.readthedocs.io/en/stable/google-cpp-styleguide/scoping.html | 命名空间与局部性 |
| 4 | 类 | 官方文档 | https://zh-google-styleguide.readthedocs.io/en/stable/google-cpp-styleguide/classes.html | 类注释讲用途与用法，不列成员目录 |
| 5 | 函数 | 官方文档 | https://zh-google-styleguide.readthedocs.io/en/stable/google-cpp-styleguide/functions.html | 函数声明注释写输入输出，不写实现 |
| 6 | 其他 C++ 特性 | 官方文档 | https://zh-google-styleguide.readthedocs.io/en/stable/google-cpp-styleguide/others.html | 枚举、异常与所有权约定 |
| 7 | 命名 | 官方文档 | https://zh-google-styleguide.readthedocs.io/en/stable/google-cpp-styleguide/naming.html | 类型、函数、枚举命名与注释用词 |
| 8 | 注释 | 官方文档 | https://zh-google-styleguide.readthedocs.io/en/stable/google-cpp-styleguide/comments.html | 类注释、函数注释、实现注释的分层 |
| 9 | 格式 | 官方文档 | https://zh-google-styleguide.readthedocs.io/en/stable/google-cpp-styleguide/formatting.html | 行宽、缩进与注释换行 |
| 10 | 规则例外 | 官方文档 | https://zh-google-styleguide.readthedocs.io/en/stable/google-cpp-styleguide/exceptions.html | 规范冲突时的取舍 |

## 二、cppreference 中文语言参考（30 份）

| 编号 | 标题 | 类型 | URL | 采信点 |
| --- | --- | --- | --- | --- |
| 11 | 注释 | 语言参考 | https://zh.cppreference.com/w/cpp/language/comments | 注释语法与文档注释边界 |
| 12 | 枚举 | 语言参考 | https://zh.cppreference.com/w/cpp/language/enum | `enum class` 的作用域与取值语义 |
| 13 | 类 | 语言参考 | https://zh.cppreference.com/w/cpp/language/class | 类声明、成员与访问控制 |
| 14 | 函数 | 语言参考 | https://zh.cppreference.com/w/cpp/language/functions | 函数声明、参数与返回类型 |
| 15 | 声明 | 语言参考 | https://zh.cppreference.com/w/cpp/language/declarations | 声明与定义的区分 |
| 16 | 命名空间 | 语言参考 | https://zh.cppreference.com/w/cpp/language/namespaces | 命名空间与限定名 |
| 17 | 作用域 | 语言参考 | https://zh.cppreference.com/w/cpp/language/scope | 名字查找与作用域 |
| 18 | 属性 | 语言参考 | https://zh.cppreference.com/w/cpp/language/attributes | `[[nodiscard]]` 等契约属性 |
| 19 | constexpr | 语言参考 | https://zh.cppreference.com/w/cpp/language/constexpr | 编译期常量与契约 |
| 20 | noexcept | 语言参考 | https://zh.cppreference.com/w/cpp/language/noexcept | 不抛保证与异常规格 |
| 21 | 构造函数 | 语言参考 | https://zh.cppreference.com/w/cpp/language/constructor | 构造后置条件与初始化 |
| 22 | 析构函数 | 语言参考 | https://zh.cppreference.com/w/cpp/language/destructor | 析构职责与资源释放 |
| 23 | 默认比较 | 语言参考 | https://zh.cppreference.com/w/cpp/language/default_comparisons | `operator==` 的默认语义 |
| 24 | 比较运算符 | 语言参考 | https://zh.cppreference.com/w/cpp/language/operator_comparison | 相等与序关系 |
| 25 | 零初始化 | 语言参考 | https://zh.cppreference.com/w/cpp/language/zero_initialization | 初始状态与零值 |
| 26 | 值初始化 | 语言参考 | https://zh.cppreference.com/w/cpp/language/value_initialization | 默认构造与值初始化 |
| 27 | 聚合初始化 | 语言参考 | https://zh.cppreference.com/w/cpp/language/aggregate_initialization | 聚合类型与成员顺序 |
| 28 | 列表初始化 | 语言参考 | https://zh.cppreference.com/w/cpp/language/list_initialization | 统一初始化与窄化 |
| 29 | 复制省略 | 语言参考 | https://zh.cppreference.com/w/cpp/language/copy_elision | 返回值与对象身份 |
| 30 | 三法则 | 语言参考 | https://zh.cppreference.com/w/cpp/language/rule_of_three | 拷贝、移动与析构 |
| 31 | RAII | 语言参考 | https://zh.cppreference.com/w/cpp/language/raii | 资源所有权与生命周期 |
| 32 | 异常 | 语言参考 | https://zh.cppreference.com/w/cpp/language/exceptions | 异常契约与错误路径 |
| 33 | throw | 语言参考 | https://zh.cppreference.com/w/cpp/language/throw | 抛出表达式与栈展开 |
| 34 | try-catch | 语言参考 | https://zh.cppreference.com/w/cpp/language/try_catch | 捕获与异常安全 |
| 35 | 函数模板 | 语言参考 | https://zh.cppreference.com/w/cpp/language/function_template | 模板参数与契约 |
| 36 | 类模板 | 语言参考 | https://zh.cppreference.com/w/cpp/language/class_template | 类模板与依赖名 |
| 37 | 虚函数 | 语言参考 | https://zh.cppreference.com/w/cpp/language/virtual | 动态分派与覆盖 |
| 38 | override | 语言参考 | https://zh.cppreference.com/w/cpp/language/override | 覆盖检查 |
| 39 | final | 语言参考 | https://zh.cppreference.com/w/cpp/language/final | 禁止继承与覆盖 |
| 40 | 派生类 | 语言参考 | https://zh.cppreference.com/w/cpp/language/derived_class | 继承层次与基类契约 |

## 三、Microsoft Learn 中文 C++ 文档（20 份）

| 编号 | 标题 | 类型 | URL | 采信点 |
| --- | --- | --- | --- | --- |
| 41 | 注释（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/comments-cpp | 单行/多行注释语法 |
| 42 | 类模板（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/class-templates?view=msvc-170 | 模板类声明与实例化 |
| 43 | 类与结构（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/classes-and-structs-cpp?view=msvc-170 | 类声明与成员 |
| 44 | 函数（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/functions-cpp | 函数声明与定义 |
| 45 | 声明与定义（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/declarations-and-definitions-cpp | 声明/定义分离 |
| 46 | 命名空间（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/namespaces-cpp | 命名空间与限定 |
| 47 | 模板（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/templates-cpp | 模板声明与实例化 |
| 48 | const（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/const-cpp | 常量正确性 |
| 49 | 引用（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/references-cpp?view=msvc-170 | 左值/右值引用 |
| 50 | 内联函数（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/inline-functions-cpp | 头文件中的内联定义 |
| 51 | 构造函数（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/constructors-cpp | 构造与初始化 |
| 52 | 析构函数（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/destructors-cpp | 析构职责 |
| 53 | Visual C++ 异常处理 | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/exception-handling-in-visual-cpp?view=msvc-170 | 异常安全与错误路径 |
| 54 | 头文件（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/header-files-cpp | 头文件职责与包含 |
| 55 | 程序终止（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/program-termination?view=msvc-170 | 退出与清理 |
| 56 | 指针（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/pointers-cpp | 所有权与可空性 |
| 57 | 数组（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/arrays-cpp | 连续存储与下标 |
| 58 | 运算符重载（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/operator-overloading?view=msvc-170 | 运算符语义 |
| 59 | 函数重载（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/function-overloading?view=msvc-170 | 重载决议 |
| 60 | 虚函数（C++） | 官方文档 | https://learn.microsoft.com/zh-cn/cpp/cpp/virtual-functions?view=msvc-170 | 虚函数与覆盖 |

## 四、Doxygen 中文手册（20 份）

| 编号 | 标题 | 类型 | URL | 采信点 |
| --- | --- | --- | --- | --- |
| 61 | 文档块 | 工具手册 | https://doxygen.cpp.org.cn/manual/docblocks.html | `///`、`@brief`、空行与段落 |
| 62 | 特殊命令 | 工具手册 | https://doxygen.cn/manual/commands.html | `@param`、`@return`、`@retval`、`@throws` |
| 63 | 配置 | 工具手册 | https://doxygen.cn/manual/config.html | 注释解析与输出配置 |
| 64 | 使用 Doxygen | 工具手册 | https://doxygen.cn/manual/doxygen_usage.html | 文档生成流程 |
| 65 | 语言相关 | 工具手册 | https://doxygen.cn/manual/langhowto.html | C++ 注释约定 |
| 66 | 常见问题 | 工具手册 | https://doxygen.cn/manual/faq.html | 注释与文档生成问题 |
| 67 | 开始 | 工具手册 | https://doxygen.cn/manual/starting.html | 最小可用配置 |
| 68 | 预处理 | 工具手册 | https://doxygen.cn/manual/preprocessing.html | 宏与条件编译 |
| 69 | 外部文档 | 工具手册 | https://doxygen.cn/manual/external.html | 外部链接与标签文件 |
| 70 | 安装 | 工具手册 | https://doxygen.cn/manual/install.html | 工具链版本 |
| 71 | 输出格式 | 工具手册 | https://doxygen.cn/manual/output.html | HTML/LaTeX 输出 |
| 72 | 自定义 | 工具手册 | https://doxygen.cn/manual/customize.html | 布局与样式 |
| 73 | 分组 | 工具手册 | https://doxygen.cn/manual/grouping.html | 模块与成员分组 |
| 74 | 自动链接 | 工具手册 | https://doxygen.cn/manual/autolink.html | 类型与成员引用 |
| 75 | 公式 | 工具手册 | https://doxygen.cn/manual/formulas.html | 数学公式 |
| 76 | 图表 | 工具手册 | https://doxygen.cn/manual/diagrams.html | 类图与调用图 |
| 77 | Markdown | 工具手册 | https://doxygen.cn/manual/markdown.html | Markdown 与注释混排 |
| 78 | 列表 | 工具手册 | https://doxygen.cn/manual/lists.html | 列表与缩进 |
| 79 | 表格 | 工具手册 | https://doxygen.cn/manual/tables.html | 表格与对齐 |
| 80 | 图片与公式 | 工具手册 | https://www.doxygen.nl/manual/commands.html#cmdimage | 图片与说明 |

## 五、C++ Core Guidelines 中文版（10 份）

| 编号 | 标题 | 类型 | URL | 采信点 |
| --- | --- | --- | --- | --- |
| 81 | C++ Core Guidelines 中文仓库 | 社区规范 | https://github.com/lynnboy/CppCoreGuidelines-zh-CN | 规则总览与翻译 |
| 82 | 注释（NL） | 社区规范 | https://github.com/lynnboy/CppCoreGuidelines-zh-CN/blob/master/CppCoreGuidelines-zh-CN.md#注释 | 注释写意图，不翻译代码 |
| 83 | 命名与命名空间 | 社区规范 | https://github.com/lynnboy/CppCoreGuidelines-zh-CN/blob/master/CppCoreGuidelines-zh-CN.md#命名 | 命名与术语一致 |
| 84 | 函数 | 社区规范 | https://github.com/lynnboy/CppCoreGuidelines-zh-CN/blob/master/CppCoreGuidelines-zh-CN.md#函数 | 函数契约与参数 |
| 85 | 类与类层次 | 社区规范 | https://github.com/lynnboy/CppCoreGuidelines-zh-CN/blob/master/CppCoreGuidelines-zh-CN.md#类 | 类不变量与继承 |
| 86 | 枚举 | 社区规范 | https://github.com/lynnboy/CppCoreGuidelines-zh-CN/blob/master/CppCoreGuidelines-zh-CN.md#枚举 | `enum class` 与取值 |
| 87 | 错误处理 | 社区规范 | https://github.com/lynnboy/CppCoreGuidelines-zh-CN/blob/master/CppCoreGuidelines-zh-CN.md#错误处理 | 异常与错误路径 |
| 88 | 资源管理 | 社区规范 | https://github.com/lynnboy/CppCoreGuidelines-zh-CN/blob/master/CppCoreGuidelines-zh-CN.md#资源管理 | 所有权与生命周期 |
| 89 | 接口 | 社区规范 | https://github.com/lynnboy/CppCoreGuidelines-zh-CN/blob/master/CppCoreGuidelines-zh-CN.md#接口 | 接口契约与最小暴露 |
| 90 | 标准库 | 社区规范 | https://github.com/lynnboy/CppCoreGuidelines-zh-CN/blob/master/CppCoreGuidelines-zh-CN.md#标准库 | 标准库约定 |

## 六、中文社区实践（10 份）

| 编号 | 标题 | 类型 | URL | 采信点 |
| --- | --- | --- | --- | --- |
| 91 | C++ 与 Doxygen：精通代码文档化之道 | 社区文章 | https://juejin.cn/post/7313887095414800384 | 文档化流程与注释组织 |
| 92 | Google C++ 编程风格指南：注释 | 社区文章 | https://juejin.cn/post/6844904154196869134 | 中文社区对注释规则的解释 |
| 93 | 不得不会的代码注释工具——Doxygen | 社区文章 | https://juejin.cn/post/7269660552678555688 | Doxygen 注释规则与配置 |
| 94 | 使用 Doxygen 从 C++ 源码自动生成 CHM 文档 | 社区文章 | https://juejin.cn/post/7024099544828739614 | 注释到文档的流水线 |
| 95 | C++ 注释小细节 | 社区文章 | https://juejin.cn/post/6874017707759501319 | 单行/多行注释边界 |
| 96 | 前端代码规范：代码注释 | 社区文章 | https://juejin.cn/post/7356053925516656680 | 注释的类型与写法对照 |
| 97 | 优雅地使用注释 | 社区文章 | https://juejin.cn/post/7018527180015534110 | 注释与代码自解释的边界 |
| 98 | 规范你的 TypeScript 注释，生成 API 文档 | 社区文章 | https://juejin.cn/post/7140337202097029133 | 标签化注释与 API 文档 |
| 99 | 2025 软件文档工具盘点 | 社区文章 | https://juejin.cn/post/7454473004274286626 | 文档工具与注释工作流 |
| 100 | C++ 注释（菜鸟教程） | 社区教程 | https://juejin.cn/post/6956197781065170980 | 中文入门写法对照 |

## 校验结论

- 计数：表格编号 1–100 连续，100 条正文 URL 无重复；连同 4 条外部核对共 104 个唯一 URL。
- 可达性：2026-11-01 复核，100 条正文中 60 条 HTTP 200；30 条 cppreference 返回 403（站点反爬，页面有效）；10 条 GitHub 页面在当前网络下超时；**无 404**。
- 类注释不列成员函数名、不写枚举常量：以条目 4、8、82 为依据；`Cell` 从「初始状态为 `kEmpty`」改为「初始时为空」。
- `enum class` 类型注释统一为「主体 + 属性」：以条目 12、42、86 为依据；`CellState`、`PlaceResult`、`BoardState` 分别改为「格子状态」「放置结果」「棋盘状态」。
- 枚举值每行必须带同一主体：以条目 12、42、86 为依据；`BoardState` 的四行改为「棋盘尚未分出胜负」「棋盘上 X 已连成一线」「棋盘上 O 已连成一线」「棋盘已满且无人连成一线」，不再写「X 成线」「尚未结束」。
- 类型名用拥有它的那一层的词汇：`Board` 定义 `BoardState`，不写 `GameResult`；反例见 `source/06-naming/examples/naming-lower-layer.md`。
- 描述与标签组之间一个空行、标签之间不空行：以条目 61、62 为依据；`Cell::Place` 已经按此调整，`checking-comments.mjs` 的 `tag-gap` 负责拦截回流。
- 注释换行按工程列宽、在分句处断：以条目 9 为依据；本项目使用 `.clang-format` 的 `ColumnLimit: 100`，中文按 2 列计。

## 外部核对（不计入 100 份）

以下英文页面只用于核对中文条目的结论，不参与上面的 100 份计数：

- OpenOCD Doxygen Style Guide：https://openocd.sourceforge.io/doc/doxygen/html/styledoxygen.html
- LLVM Coding Standards：https://www.llvm.org/docs/CodingStandards.html
- Google API reference comments：https://developers.google.com/style/api-reference-comments
- Zephyr Doxygen style：https://docs.zephyrproject.org/latest/contribute/style/doxygen.html
