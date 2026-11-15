<!-- 读取时机：排声明顺序时；读完能回答：文件模板；预算：一次只开这一份（123 行），不自动串联。 -->
# 文件模板

本文件是头文件与实现文件槽位的唯一权威。`references/style/01-google-cpp-style.md` 的头文件节保留文件级规则（头文件去重、自包含、包含顺序），槽位细节以本文件为准；`references/layout/01-source-layout.md` 只定文件放在哪；`steps/03-declaration.md` 指向这里。类内声明顺序仍只写在 `references/layout/03-declaration-order.md`，本文件不复制。

## 选择扩展名

| 扩展名 | 用途 | 是否写 `#pragma once` |
| --- | --- | --- |
| `.h` | C++ 公共或私有头文件 | 是 |
| `.hpp` | 与 `.h` 同槽位；一个工程统一选一种头扩展名 | 是 |
| `.cpp` | 实现文件；新工程与示例一律使用 | 否 |
| `.cc` | 已有工程常见的实现后缀；新工程与示例不选 | 否 |
| `.inc` | 稀有文本包含 | 否；本工作流不用 |

- 一个工程只选一种头扩展名和一种实现扩展名；新工程与示例一律 `.cpp` / `.h`，已有工程跟随既有后缀，不批量改名。
- 头文件用一行 `#pragma once` 去重，不写 `#ifndef` / `#define` / `#endif` 包含守卫。这是本工作流对 Google 的明确偏离：路径式守卫要把项目名、目录名和文件名拼进宏，组件改名或头文件跨工程复用时宏名会跟着失效；`#pragma once` 由编译器按文件身份判断，不需要宏名，GCC、Clang、MSVC 都支持。
- 新文件先按本模板起骨架，再填内容；不因「先跑起来」省略 `#pragma once`。

## `#pragma once`

- 位置固定在文件头注释之后、第一组 `#include` 之前，单独一行。
- 只写 `#pragma once`，不写行尾注释，也不写与之配对的宏。
- 实现文件（`.cpp` / `.cc`）不写；`.inc` 本工作流不新写，第三方 `.inc` 不补。
- 不把 `#pragma once` 和 `#ifndef` 守卫混用；旧工程已有守卫时，只在改动该文件时顺手换成本模板的写法，不批量改名。
- 支持范围是 GCC、Clang 与 MSVC 的当前版本；需要在其他预处理器上复用时再讨论退回守卫，不预先写两套。

## `.h` 与 `.hpp`

槽位顺序固定：

1. 文件头注释（格式见 `references/comments/01-comment-rules.md`，留在 `#pragma once` 外）
2. `#pragma once`
3. 分组包含（组间空行，组内字母序）
4. 命名空间内：常量 → 枚举 → 结构体 → 自由函数 → 类

```cpp
/// @file thing_table.h
/// @brief 定义 ThingTable 与它用到的状态。
///
/// 头文件放常量、枚举、结构体与类声明。

#pragma once

#include <cstdint>
#include <vector>

#include "dependency.h"

namespace project {

inline constexpr int kThingCount = 3;

enum class ThingState { kIdle, kBusy };

struct Thing {
  int id;
};

class ThingTable {
 public:
  void Add(const Thing& thing);

 private:
  std::vector<Thing> things_;
};

}  // namespace project
```

- 文件头不写版权、作者或变更日志；文件头之后紧跟 `#pragma once`，再进入包含。
- 头文件自包含：自己用到的类型、宏和标准库头都直接包含，不依赖调用方先包含什么。
- 不把 `using namespace`、非 inline 普通全局变量、匿名命名空间或 `static` 定义放进头文件。
- 模板、`constexpr` 和类内短函数可以留在头文件；普通函数体放实现文件。
- 构造函数即使很短，只要带成员初始化列表或函数体，头文件只留声明，定义放 `.cpp`；`= default`、`= delete`、空体且无初始化列表的转发构造，以及 `constexpr` 需要的定义可留在类内。
- `.hpp` 完全套用 `.h` 的槽位，只换扩展名，不换顺序。

## `.cpp`

槽位顺序：

1. 文件头注释
2. 配对头在最前（若有）
3. 分组包含
4. 命名空间与定义

```cpp
/// @file thing_table.cpp
/// @brief 实现 ThingTable 的添加与查询。

#include "thing.h"

#include <algorithm>

#include "other.h"

namespace project {

void ThingTable::Add(const Thing& thing) { things_.push_back(thing); }

}  // namespace project
```

- 实现文件不写 `#ifndef` / `#define` / `#endif`，也不写 `#pragma once`。
- 新工程与示例一律 `.cpp`；已有工程沿用它原本的实现后缀（常见 `.cc`），不批量改名。
- `main` 文件同样只做装配；模板不替项目决定业务结构。

## `.inc`

只用于必须做文本包含的场景。本工作流不新写 `.inc`；第三方 `.inc` 不补 `#pragma once`，也不为它改本模板。

## 自检

- 每个头文件在文件头之后、包含之前恰好一行 `#pragma once`。
- 头文件没有 `#ifndef` / `#define` / `#endif` 包含守卫，也没有与 `#pragma once` 并存。
- 头文件能单独编译：只包含它的一个空 `.cpp` 必须通过。
- 实现文件没有 `#pragma once`，配对头在第一组。
- 工程内不再新增路径式守卫宏。

## 依据

- [Google C++ Style Guide: Header Files](https://google.github.io/styleguide/cppguide.html#Header_Files)：头文件自包含、包含顺序；本工作流保留这两条。
- [Google C++ Style Guide: The #define Guard](https://google.github.io/styleguide/cppguide.html#The__define_Guard)：Google 要求 `<PROJECT>_<PATH>_<FILE>_H_` 守卫；本工作流明确偏离，改用 `#pragma once`，理由见「`#pragma once`」一节。
- [C++ Core Guidelines: SF.8](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#rs-guards)：同样建议包含守卫；本工作流按上一行的偏离执行。
