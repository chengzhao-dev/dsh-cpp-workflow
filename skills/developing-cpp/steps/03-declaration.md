# 第 3 步：定声明

## 产出

公共头文件、类型与函数声明、命名、声明顺序和声明注释。声明要能让调用方在不读 `.cpp` 的情况下知道怎么用、什么时候失败。

## 通用情况

- 语言标准由项目声明决定：项目技能写明档位时以其为准，未写才读 `environment.json` 的 `standard`，两者都没有时用新工程默认 C++23（C++11–C++23）。
- 文件槽位、`#pragma once` 与扩展名以 `references/layout/02-file-template.md` 为准；本步只决定声明写什么。
- 命名以 `references/naming/01-identifier-names.md` 为准：规则表、语义角色、谓词与查询命名都在那里；字符集、保留标识符与不向 `std` 添加声明见同文件的「字符集与保留标识符」。
- 声明顺序、组内次序与空行以 `references/layout/03-declaration-order.md` 为准。数据成员按初始化依赖、逻辑分组和阅读顺序排列，不按字母序；先声明先初始化，初始化器只能安全使用已经完成初始化的成员。
- 公共头自包含：自己用到的类型、宏和标准库头都直接包含。验证方式：建一个只包含该头的空 `.cpp` 编译一次，不通过就补 include；五条自检见 `references/layout/02-file-template.md` 的「自检」。
- 单参数构造函数默认写 `explicit`，例外见 `references/language/language-basics/06-functions.md`；查询成员函数尾部写 `const`；返回结果对象的 API 加 `[[nodiscard]]`，位置与 `friend` 例外见 `references/language/value-types/07-nodiscard.md`。默认成员初始化写在声明处；初始化默认用花括号，为什么保留 `std::vector<int>(n)` 这类容量构造的 `()` 见 `references/language/language-basics/02-initialization.md`。特殊成员（含 `= default`）放在成员组最前，定义位置见 `references/layout/03-declaration-order.md`。
- 头文件与实现文件的槽位见 `references/layout/02-file-template.md`；本步只守一条：不要一部分内联、一部分外移。头文件里不写 `using namespace`、非 `inline` 普通全局变量、匿名命名空间或 `static` 定义。
- 失败是调用方的正常结果时，用结果类型或 `std::optional` 表达；输出参数只留给热循环里复用容器容量的例外，终端读入不使用。函数无法完成自己的任务、或构造函数无法建立不变量时才抛；异常类型与消息见 `references/exceptions/01-exception-rules.md`。析构与 `swap` 标 `noexcept`；「拒绝」与「抛」并存时在公共头各写一行。
- 一次操作有多种必须区分的正常结果时用 `enum class` 返回（如落子：成功、玩家不对、终局、占用），不用 `bool` 把原因压掉；成功还要附带数据时再考虑 `std::expected` 或结果结构；纯查询谓词仍用 `bool`。枚举项默认不显式写值；确需编号时状态与结果枚举把 0 留给正常态、失败态按固定顺序随后，身份枚举按领域编号。封闭状态码默认 `: std::uint8_t`，普通枚举用默认底层；不要用 `bool` 开关参数承载两种以上行为（见 `references/language/value-types/04-enum.md` 与 `10-float-bool.md`）。
- 注释内容按 `references/comments/01-comment-rules.md`、结构版式按 `02-style.md`。本步只决定「写哪些事实」：结果、失败方式、检查项、参数与返回值契约。行宽跟 `.clang-format` 的 `ColumnLimit`（默认 120，中文按两列、tab 按 4 列）；枚举项与 `struct` 短字段的 `///<` 与声明对齐；私有函数同样写声明契约；out 参数标 `[out]`，既读又写标 `[in,out]`。
- 自定义类型的 `std::formatter` 特化放在类型头文件；占位符解析与非法值回退见 `references/language/standard-library/06-format.md` 的「自定义类型的格式化」。

## 情况

**新增类型**：先判断是聚合 `struct`、有不变量的 `class`，还是 `enum class`；接口多于数据且有 invariant 时用 `class`，纯数据传递用 `struct`。

**改公共接口**：先找所有调用方；改签名、改返回类型、改异常声明都算破坏性变更。配对 `.cpp` 的定义、构造函数初始化列表与调用点在同一轮同步改。能加默认参数或重载时优先加，不静默改变旧调用的含义。

**改名**：改名是一次独立改动，先搜全部调用点，再改声明、定义、测试和注释；不与改行为混，改完测试保持绿色；公共 API 改名按破坏性变更处理。

**异常声明**：构造函数、`Get` 类查询、解析函数最容易抛；在声明注释里写「当……时抛出 `std::out_of_range`」这样的具体类型，不给每个参数错误新建类型。

**注释**：声明注释用 `///` 写中文散文，只写调用方需要知道的事实，实现细节留给 `.cpp`。文件头、标签、参数完整性与设计论证的规则见 `references/comments/01-comment-rules.md` 与 `references/comments/02-style.md`。类型注释先写一句名词短语；纯值容器到此为止，初始状态归默认构造函数，写入与清空条件归对应函数。只有类有不变量才加第二段，且不写别的类型负责什么，也不列「不检查…」这类能力边界。写完运行：

```bash
node "<skill-dir>/scripts/checking-comments.mjs" --root <项目根>
```

需要关掉简报时加 `--no-brief`；关掉参数或返回值文档时加 `--no-param` 或 `--no-return`；项目确实要写作者、日期等隐私标签时加 `--allow-tag <标签>`。完整参数用 `node <skill-dir>/scripts/checking-comments.mjs --help` 查看。

## 正反例指针

- 命名、访问器、语义角色：`references/naming/examples/`。
- 异常声明与返回值选择：`references/exceptions/examples/`。
- 声明注释写成了实现说明：`references/comments/examples/05-declaration-function.md`。
