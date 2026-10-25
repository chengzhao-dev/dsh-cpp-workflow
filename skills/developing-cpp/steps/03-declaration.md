# 第 3 步：定声明

## 产出

公共头文件、类型与函数声明、命名、声明顺序和声明注释。声明要能让调用方在不读 `.cpp` 的情况下知道怎么用、什么时候失败。

## 通用情况

- 语言标准由项目声明决定，新工程默认 C++23，支持 C++11–C++23；头文件用 `#define` 守卫，名字由源码树全路径生成，不要用 `#pragma once`。槽位与守卫名按 `references/file-template.md`。
- 命名按 `references/naming.md`：类型与函数 PascalCase，变量与参数 snake_case，类成员尾随 `_`、结构体成员不尾随，常量与枚举子 `k` 前缀。布尔查询与 `Check` 的分工见同文件「谓词与查询命名」。
- 声明顺序按 `references/declaration-order.md`：类型 → 静态常量 → 工厂 → 构造/赋值/析构 → 其他函数 → 数据成员。
- 公共头文件自包含：自身需要的头都直接包含，不依赖调用方的包含顺序。
- 单参数构造函数写 `explicit`；可查询的成员函数加 `[[nodiscard]]`；默认成员初始化写在声明处，不在构造函数里重复。
- 头文件只就地定义大约 10 行以内的短函数；更长或需要完整定义的普通函数只在 `.cpp` 定义，模板和 `constexpr` 例外。
- 失败是调用方的正常结果时，用结果类型、`bool` + 输出参数或 `std::optional` 表达；函数无法完成自己的任务、或构造函数无法建立 invariant 时，才在声明注释里写清抛出的异常类型；越界用 `std::out_of_range`，前置条件被破坏用 `std::logic_error`，只有调用方必须区分时才新增派生类型；Debug/Release 的抛出条件相同。判据见 `references/exceptions.md`。
- 声明注释按 `references/comments.md` 分四层写：文件头的范围与边界、类型注释的结果/限制与约定、函数注释的第一句结果或失败方式与契约、数据成员的行尾说明。类型注释不罗列成员功能、不写方案对比与设计论证；全项目的风格理由写进项目文档，不写进注释。
- `std::format` 用于组合消息；声明里不要承诺 `std::print`（C++23）。

## 情况

**新增类型**：先判断是聚合 `struct`、有不变量的 `class`，还是 `enum class`；接口多于数据且有 invariant 时用 `class`，纯数据传递用 `struct`。

**改公共接口**：先找所有调用方；改签名、改返回类型、改异常声明都算破坏性变更。能加默认参数或重载时优先加，不要静默改变旧调用的含义。

**异常声明**：构造函数、`Get` 类查询、解析函数最容易抛；在声明注释里写「当……时抛出 `std::out_of_range`」这样的具体类型，不要只写「可能抛异常」，也不要给每个参数错误都新建类型。类型选择见 `references/exceptions.md`。

**注释**：声明注释用 `///` 写中文散文，只写调用方需要知道的；实现细节留给 `.cpp`。`@param`、`@return`、`@throws` 要么全写要么全不写，标识符和标签保持英文。写完运行 `node "<skill-dir>/scripts/checking-comments.mjs" --root <项目根>`，横幅、标签、参数完整性、成员清单与设计论证由脚本兜底。文件头、章节横幅和 TODO 的格式见 `references/comments.md`。

## 正反例指针

- 命名、访问器、语义角色：`examples/naming.md`。
- 异常声明与返回值选择：`examples/exceptions.md`。
- 声明注释写成了实现说明：`examples/comments.md`「声明注释」。
