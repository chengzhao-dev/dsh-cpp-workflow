<!-- 读取时机：入口表点名或判不准时；读完能回答：每份条文的读取时机、产出与预算；预算：一次只开这一份，按需再开单份。 -->
# 条文索引

先读本页，再按主题或语义开一份；不要一次打开多份。

## comments

| 文件 | 读取时机 | 读完能回答 | 预算 |
| --- | --- | --- | --- |
| `comments/01-comment-rules.md` | 写或改注释时 | 注释：写什么 | 一次只开这一份（199 行），不自动串联。 |
| `comments/02-style.md` | 写或改注释时 | 注释的结构、版式与措辞 | 一次只开这一份（79 行），不自动串联。 |
| `comments/examples/01-declaration-class.md` | 写或改注释的示例时 | 正反例：类型注释：概念与约定，不是功能清单 | 一次只开这一份（65 行），不自动串联。 |
| `comments/examples/02-declaration-constructor.md` | 写或改注释的示例时 | 正反例：构造函数与析构函数：标签 + 职责 | 一次只开这一份（22 行），不自动串联。 |
| `comments/examples/03-declaration-enum.md` | 写或改注释的示例时 | 正反例：枚举 | 一次只开这一份（47 行），不自动串联。 |
| `comments/examples/04-declaration-file.md` | 写或改注释的示例时 | 正反例：文件头与注释边界 | 一次只开这一份（66 行），不自动串联。 |
| `comments/examples/05-declaration-function.md` | 写或改注释的示例时 | 正反例：函数声明注释 | 一次只开这一份（115 行），不自动串联。 |
| `comments/examples/06-declaration-member.md` | 写或改注释的示例时 | 正反例：数据成员 | 一次只开这一份（23 行），不自动串联。 |
| `comments/examples/07-declaration-predicate.md` | 写或改注释的示例时 | 正反例：布尔查询写主体是否状态 | 一次只开这一份（14 行），不自动串联。 |
| `comments/examples/08-declaration-struct.md` | 写或改注释的示例时 | 正反例：完整声明：后置条件与轴向 | 一次只开这一份（18 行），不自动串联。 |
| `comments/examples/09-implementation-body.md` | 写或改注释的示例时 | 正反例：实现注释 | 一次只开这一份（113 行），不自动串联。 |
| `comments/examples/10-implementation-todo.md` | 写或改注释的示例时 | 正反例：TODO | 一次只开这一份（16 行），不自动串联。 |
| `comments/glossary/01-comment-terms.md` | 统一注释术语时 | 注释术语与用词 | 一次只开这一份（92 行），不自动串联。 |

## design

| 文件 | 读取时机 | 读完能回答 | 预算 |
| --- | --- | --- | --- |
| `design/examples/01-behavior-sentence.md` | 看设计案例时 | 正反例：行为句 | 一次只开这一份（14 行），不自动串联。 |
| `design/examples/02-coordinate-table.md` | 看设计案例时 | 正反例：固定坐标用表 | 一次只开这一份（31 行），不自动串联。 |
| `design/examples/03-header-place.md` | 看设计案例时 | 正反例：头文件位置 | 一次只开这一份（26 行），不自动串联。 |
| `design/examples/04-library-boundary.md` | 看设计案例时 | 正反例：边界 | 一次只开这一份（30 行），不自动串联。 |
| `design/examples/05-library-split.md` | 看设计案例时 | 正反例：单文件何时拆库 | 一次只开这一份（7 行），不自动串联。 |
| `design/examples/06-move-result.md` | 看设计案例时 | 正反例：落子结果用返回值回答 | 一次只开这一份（41 行），不自动串联。 |
| `design/examples/07-preview-read.md` | 看设计案例时 | 正反例：推演一步读原数据 | 一次只开这一份（36 行），不自动串联。 |
| `design/examples/08-screen-enter-exit.md` | 看设计案例时 | 正反例：进入与退出显式配对 | 一次只开这一份（39 行），不自动串联。 |
| `design/01-project-design.md` | 设计类型、接口或目录时 | 领域建模与项目设计 | 一次只开这一份（160 行），不自动串联。 |
| `design/session-layer.md` | 设计会话、选着、规则与构建边界时 | 会话层与程序边界 | 一次只开这一份（90 行），不自动串联。 |

## exceptions

| 文件 | 读取时机 | 读完能回答 | 预算 |
| --- | --- | --- | --- |
| `exceptions/examples/01-throw-boundary.md` | 抛异常或写异常契约时 | 正反例：边界 | 一次只开这一份（28 行），不自动串联。 |
| `exceptions/examples/02-throw-build-mode.md` | 抛异常或写异常契约时 | 正反例：Debug 与 Release 的三层合同 | 一次只开这一份（38 行），不自动串联。 |
| `exceptions/examples/03-throw-catch.md` | 抛异常或写异常契约时 | 正反例：捕获 | 一次只开这一份（21 行），不自动串联。 |
| `exceptions/examples/04-throw-destructor.md` | 抛异常或写异常契约时 | 正反例：析构 | 一次只开这一份（21 行），不自动串联。 |
| `exceptions/examples/05-throw-format.md` | 抛异常或写异常契约时 | 正反例：`std::format` 与 `std::print` | 一次只开这一份（13 行），不自动串联。 |
| `exceptions/examples/06-throw-message.md` | 抛异常或写异常契约时 | 正反例：异常类型与消息 | 一次只开这一份（24 行），不自动串联。 |
| `exceptions/examples/07-throw-when.md` | 抛异常或写异常契约时 | 正反例：什么时候抛 | 一次只开这一份（27 行），不自动串联。 |
| `exceptions/01-exception-rules.md` | 抛异常或写异常契约时 | 异常与错误 | 一次只开这一份（207 行），不自动串联。 |

## language

| 文件 | 读取时机 | 读完能回答 | 预算 |
| --- | --- | --- | --- |
| `language/glossary/01-language-terms.md` | 查语言细节时 | 术语 | 一次只开这一份（88 行），不自动串联。 |
| `language/language-basics/01-objects.md` | 查语言细节时 | 值与对象 | 一次只开这一份（15 行），不自动串联。 |
| `language/language-basics/02-initialization.md` | 查语言细节时 | 初始化与列表初始化 | 一次只开这一份（33 行），不自动串联。 |
| `language/language-basics/03-deduction.md` | 查语言细节时 | `auto` 与类型推导 | 一次只开这一份（12 行），不自动串联。 |
| `language/language-basics/04-const.md` | 查语言细节时 | `const`、`constexpr`、`consteval`、`constinit` | 一次只开这一份（25 行），不自动串联。 |
| `language/language-basics/05-expressions.md` | 查语言细节时 | 表达式与比较 | 一次只开这一份（31 行），不自动串联。 |
| `language/language-basics/06-functions.md` | 查语言细节时 | 函数、参数与返回值 | 一次只开这一份（19 行），不自动串联。 |
| `language/language-basics/07-classes.md` | 查语言细节时 | 类、结构体与特殊成员 | 一次只开这一份（15 行），不自动串联。 |
| `language/language-basics/08-raii.md` | 查语言细节时 | RAII、所有权与移动 | 一次只开这一份（15 行），不自动串联。 |
| `language/language-basics/09-templates.md` | 查语言细节时 | 模板、概念与 CTAD | 一次只开这一份（26 行），不自动串联。 |
| `language/language-basics/10-language-checklist.md` | 查语言细节时 | 检查清单 | 一次只开这一份（11 行），不自动串联。 |
| `language/performance/01-measure.md` | 查语言细节时 | 测量顺序 | 一次只开这一份（22 行），不自动串联。 |
| `language/performance/02-complexity.md` | 查语言细节时 | 复杂度与数据结构 | 一次只开这一份（13 行），不自动串联。 |
| `language/performance/03-memory.md` | 查语言细节时 | 内存与缓存 | 一次只开这一份（14 行），不自动串联。 |
| `language/performance/04-undefined-behavior.md` | 查语言细节时 | 未定义行为与安全 | 一次只开这一份（28 行），不自动串联。 |
| `language/performance/05-pitfalls.md` | 查语言细节时 | 常见性能陷阱 | 一次只开这一份（17 行），不自动串联。 |
| `language/performance/06-false-optimizations.md` | 查语言细节时 | 不要做的“优化” | 一次只开这一份（13 行），不自动串联。 |
| `language/performance/07-checklist.md` | 查语言细节时 | 检查清单 | 一次只开这一份（8 行），不自动串联。 |
| `language/standard-library/01-containers.md` | 查语言细节时 | 容器选择 | 一次只开这一份（30 行），不自动串联。 |
| `language/standard-library/02-access.md` | 查语言细节时 | 访问与边界 | 一次只开这一份（14 行），不自动串联。 |
| `language/standard-library/03-iteration.md` | 查语言细节时 | 迭代与失效 | 一次只开这一份（18 行），不自动串联。 |
| `language/standard-library/04-algorithms.md` | 查语言细节时 | 算法优先于手写循环 | 一次只开这一份（26 行），不自动串联。 |
| `language/standard-library/05-string.md` | 查语言细节时 | `std::string` 与 `std::string_view` | 一次只开这一份（13 行），不自动串联。 |
| `language/standard-library/06-format.md` | 查语言细节时 | `std::format` 与输出 | 一次只开这一份（116 行），不自动串联。 |
| `language/standard-library/07-time.md` | 查语言细节时 | 时间 | 一次只开这一份（13 行），不自动串联。 |
| `language/standard-library/08-random.md` | 查语言细节时 | 随机 | 一次只开这一份（14 行），不自动串联。 |
| `language/standard-library/09-files.md` | 查语言细节时 | 文件 | 一次只开这一份（14 行），不自动串联。 |
| `language/standard-library/10-library-checklist.md` | 查语言细节时 | 检查清单 | 一次只开这一份（9 行），不自动串联。 |
| `language/value-types/01-width.md` | 查语言细节时 | 宽度、范围与 `std::size_t` | 一次只开这一份（17 行），不自动串联。 |
| `language/value-types/02-signed.md` | 查语言细节时 | 有符号、无符号与溢出 | 一次只开这一份（26 行），不自动串联。 |
| `language/value-types/03-integer-roles.md` | 查语言细节时 | 项目对整型角色的约定 | 一次只开这一份（38 行），不自动串联。 |
| `language/value-types/04-enum.md` | 查语言细节时 | 枚举类与返回值选型 | 一次只开这一份（35 行），不自动串联。 |
| `language/value-types/05-strong-type.md` | 查语言细节时 | 强类型包装 | 一次只开这一份（17 行），不自动串联。 |
| `language/value-types/06-const-method.md` | 查语言细节时 | 成员函数尾部的 `const` | 一次只开这一份（22 行），不自动串联。 |
| `language/value-types/07-nodiscard.md` | 查语言细节时 | `[[nodiscard]]` | 一次只开这一份（15 行），不自动串联。 |
| `language/value-types/08-comparison.md` | 查语言细节时 | 比较运算符 | 一次只开这一份（10 行），不自动串联。 |
| `language/value-types/09-subscript.md` | 查语言细节时 | 下标与 `at` | 一次只开这一份（15 行），不自动串联。 |
| `language/value-types/10-float-bool.md` | 查语言细节时 | 浮点与布尔 | 一次只开这一份（13 行），不自动串联。 |
| `language/value-types/11-checklist.md` | 查语言细节时 | 检查清单 | 一次只开这一份（9 行），不自动串联。 |

## layout

| 文件 | 读取时机 | 读完能回答 | 预算 |
| --- | --- | --- | --- |
| `layout/01-source-layout.md` | 排声明顺序时 | 源码布局 | 一次只开这一份（78 行），不自动串联。 |
| `layout/02-file-template.md` | 排声明顺序时 | 文件模板 | 一次只开这一份（137 行），不自动串联。 |
| `layout/03-declaration-order.md` | 排声明顺序时 | 声明顺序 | 一次只开这一份（151 行），不自动串联。 |

## naming

| 文件 | 读取时机 | 读完能回答 | 预算 |
| --- | --- | --- | --- |
| `naming/examples/01-naming-accessor.md` | 命名示例时 | 正反例：访问器 | 一次只开这一份（28 行），不自动串联。 |
| `naming/examples/02-naming-basic.md` | 命名示例时 | 正反例：基本规则 | 一次只开这一份（3 行），不自动串联。 |
| `naming/examples/03-naming-current-prefix.md` | 命名示例时 | 正反例：`current_` 前缀 | 一次只开这一份（19 行），不自动串联。 |
| `naming/examples/04-naming-local.md` | 命名示例时 | 正反例：局部名字 | 一次只开这一份（45 行），不自动串联。 |
| `naming/examples/05-naming-lookup.md` | 命名示例时 | 正反例：查找与读取 | 一次只开这一份（18 行），不自动串联。 |
| `naming/examples/06-naming-lower-layer.md` | 命名示例时 | 正反例：下层类型不要借用上层词汇 | 一次只开这一份（45 行），不自动串联。 |
| `naming/examples/07-naming-multiple-return.md` | 命名示例时 | 正反例：多返回值 | 一次只开这一份（20 行），不自动串联。 |
| `naming/examples/08-naming-player-value.md` | 命名示例时 | 正反例：玩家与方格的值 | 一次只开这一份（15 行），不自动串联。 |
| `naming/examples/09-naming-predicate.md` | 命名示例时 | 正反例：谓词与 Lambda | 一次只开这一份（18 行），不自动串联。 |
| `naming/examples/10-naming-rename.md` | 命名示例时 | 正反例：改名检查 | 一次只开这一份（5 行），不自动串联。 |
| `naming/examples/11-naming-responsibility.md` | 命名示例时 | 正反例：名字与职责 | 一次只开这一份（19 行），不自动串联。 |
| `naming/examples/12-naming-role.md` | 命名示例时 | 正反例：语义角色 | 一次只开这一份（21 行），不自动串联。 |
| `naming/examples/13-naming-state-change.md` | 命名示例时 | 正反例：状态变更：动作与结果枚举 | 一次只开这一份（69 行），不自动串联。 |
| `naming/glossary/01-naming-terms.md` | 统一命名术语时 | 命名术语与用词 | 一次只开这一份（27 行），不自动串联。 |
| `naming/glossary/02-position.md` | 统一命名术语时 | position 与 pos | 一次只开这一份（23 行），不自动串联。 |
| `naming/glossary/03-selection.md` | 判不准选择类函数用 Choose、Find 还是 Try 时 | 选择、查找与尝试 | 一次只开这一份（22 行），不自动串联。 |
| `naming/glossary/04-square.md` | 统一命名术语时 | square 与 SquareValue | 一次只开这一份（47 行），不自动串联。 |
| `naming/glossary/05-scoring.md` | 统一命名术语时 | 终局评分与搜索分 | 一次只开这一份（26 行），不自动串联。 |
| `naming/glossary/06-difficulty.md` | 统一命名术语时 | 电脑难度与对局模式 | 一次只开这一份（25 行），不自动串联。 |
| `naming/glossary/07-stream.md` | 统一命名术语时 | 流的 input、output 与 diagnostics 写法 | 一次只开这一份（20 行），不自动串联。 |
| `naming/01-identifier-names.md` | 命名或统一术语时 | 命名 | 一次只开这一份（130 行），不自动串联。 |

## style

| 文件 | 读取时机 | 读完能回答 | 预算 |
| --- | --- | --- | --- |
| `style/01-google-cpp-style.md` | 查格式与写法时 | Google C++ 风格：本技能采用的版本 | 一次只开这一份（93 行），不自动串联。 |
