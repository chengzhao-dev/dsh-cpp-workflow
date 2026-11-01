# 第 3 步：定声明

## 产出

公共头文件、类型与函数声明、命名、声明顺序和声明注释。声明要能让调用方在不读 `.cpp` 的情况下知道怎么用、什么时候失败。

## 通用情况

- 语言标准由项目声明决定，新工程默认 C++23（C++11–C++23）；`environment.json` 的 `standard` 是唯一来源。
- 文件槽位、包含守卫与扩展名以 `references/file-template.md` 为准；本步只决定声明写什么。
- 命名以 `references/naming.md` 为准：规则表、语义角色、谓词与查询命名都在那里。
- 声明顺序以 `references/declaration-order.md` 为准：类型 → 静态常量 → 工厂 → 构造/赋值/析构 → 其他函数 → 数据成员。
- 公共头自包含：自己用到的类型、宏和标准库头都直接包含。
- 单参数构造函数写 `explicit`；查询成员函数尾部写 `const`；返回结果对象的 API 加 `[[nodiscard]]`，标注位置与 `friend` 的例外见 `references/types.md`；默认成员初始化写在声明处。
- 头文件只就地定义约 10 行以内的短函数；模板与 `constexpr` 例外，其余函数体在 `.cpp`。
- 失败是调用方的正常结果时，用结果类型、`bool` + 输出参数或 `std::optional` 表达；函数无法完成自己的任务、或构造函数无法建立不变量时才抛，异常类型的选择与消息见 `references/exceptions.md`。
- 一次操作有多种必须区分的正常结果时用 `enum class` 返回（如落子：成功、越界、类型非法、已占），不用 `bool` 把原因压掉；成功还要附带数据时再考虑 `std::expected` 或结果结构。纯查询谓词仍用 `bool`。
- 声明注释按 `references/comments.md` 的四节写：类型注释、特殊成员、函数注释、数据成员。本步只决定「写哪些事实」：结果、失败方式、检查项、参数与返回值契约；句式、标签、宽度和示例由该文件定。判不准用词时再开 `references/comment-terms.md`，它只列词表，不重复句式。
- 组合消息用 `std::format`；声明里只承诺 `std::format`，`std::print` 是 C++23 的程序边界设施。

## 情况

**新增类型**：先判断是聚合 `struct`、有不变量的 `class`，还是 `enum class`；接口多于数据且有 invariant 时用 `class`，纯数据传递用 `struct`。

**改公共接口**：先找所有调用方；改签名、改返回类型、改异常声明都算破坏性变更。能加默认参数或重载时优先加，不静默改变旧调用的含义。

**异常声明**：构造函数、`Get` 类查询、解析函数最容易抛；在声明注释里写「当……时抛出 `std::out_of_range`」这样的具体类型，不给每个参数错误新建类型。

**注释**：声明注释用 `///` 写中文散文，只写调用方需要知道的事实，实现细节留给 `.cpp`。文件头、标签、参数完整性与设计论证的规则见 `references/comments.md`。写完运行：

```bash
node "<skill-dir>/scripts/checking-comments.mjs" --root <项目根>
```

关闭 `@brief` 时加 `--no-brief`；配置里打开了隐私标签并填了值时加 `--allow-tag <标签>`。

## 正反例指针

- 命名、访问器、语义角色：`examples/naming.md`。
- 异常声明与返回值选择：`examples/exceptions.md`。
- 声明注释写成了实现说明：`examples/comments-declaration.md`。
