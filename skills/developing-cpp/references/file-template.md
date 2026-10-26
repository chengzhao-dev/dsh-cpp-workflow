# 文件模板

本文件是头文件与实现文件槽位的唯一权威。`google-cpp-style.md` 只保留「路径式守卫、不用 `#pragma once`」的决定；`layout.md` 只定文件放在哪；`steps/03-declaration.md` 指向这里。类内声明顺序仍只写在 `declaration-order.md`，本文件不复制。

## 选择扩展名

| 扩展名 | 用途 | 是否写守卫 |
| --- | --- | --- |
| `.h` | C++ 公共或私有头文件 | 是 |
| `.hpp` | 与 `.h` 同槽位；一个工程统一选一种头扩展名 | 是 |
| `.cpp` | 实现文件；新工程与示例一律使用 | 否 |
| `.cc` | 已有工程常见的实现后缀；新工程与示例不选 | 否 |
| `.inc` | 稀有文本包含 | 否；本工作流不用 |

- 一个工程只选一种头扩展名和一种实现扩展名；新工程与示例一律 `.cpp` / `.h`，已有工程跟随既有后缀，不批量改名。
- 不写 `#pragma once`，也不与包含守卫并用。Google C++ Style Guide 要求路径式 include guards；标准守卫被编译器优化后与 `#pragma once` 等价，并存只会多一条非标准指令。
- 新文件先按本模板起骨架，再填内容；不因「先跑起来」省略守卫。

## 守卫名

格式：`<PROJECT>_<PATH>_<FILE>_H_`。

- `PROJECT` 是源码树顶的项目名，全大写；`PATH` 是相对源码树顶的目录；`FILE` 是文件名；非字母数字改成下划线。
- 末尾固定 `_H_`；`#endif` 后两个空格，再写 `//` 和同一个宏。
- 井字棋源码树顶是 `games/tictactoe/`：

| 文件 | 守卫 |
| --- | --- |
| `tictactoe/include/board.h` | `TICTACTOE_INCLUDE_BOARD_H_` |
| `tictactoe/include/game.h` | `TICTACTOE_INCLUDE_GAME_H_` |
| `tictactoe/include/ai.h` | `TICTACTOE_INCLUDE_AI_H_` |
| `apps/include/cli.h` | `APPS_INCLUDE_CLI_H_` |
| `tests/supporting-tests.h` | `TESTS_SUPPORTING_TESTS_H_` |

- 通用示例：`taskflow/include/task_table.h` → `TASKFLOW_INCLUDE_TASK_TABLE_H_`。
- 不用 `TICTACTOE_BOARD_H` 这类省略路径的名字；两个同名头会撞宏。

## `.h` 与 `.hpp`

槽位顺序固定：

1. 文件头注释（格式见 `comments.md`，留在守卫外）
2. `#ifndef` / `#define`
3. 分组包含（组间空行，组内字母序）
4. 命名空间内：常量 → 枚举 → 结构体 → 自由函数 → 类
5. `#endif  // MACRO`

```cpp
//===----------------------------------------------------------------------===//
// thing_table.h - 定义 ThingTable 与它用到的状态。
//
// 头文件放常量、枚举、结构体与类声明。
//===----------------------------------------------------------------------===//

#ifndef PROJECT_PATH_FILE_H_
#define PROJECT_PATH_FILE_H_

#include <cstdint>
#include <vector>

#include "project/path/dependency.h"

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

#endif  // PROJECT_PATH_FILE_H_
```

- 文件头不写版权、作者或变更日志；守卫外只放文件头，文件头只介绍本文件。
- 头文件自包含：自己用到的类型、宏和标准库头都直接包含，不依赖调用方先包含什么。
- 不把 `using namespace`、非 inline 普通全局变量、匿名命名空间或 `static` 定义放进头文件。
- 模板、`constexpr` 和类内短函数可以留在头文件；普通函数体放实现文件。
- `.hpp` 完全套用 `.h` 的槽位，只换扩展名，不换顺序。

## `.cpp`

槽位顺序：

1. 文件头注释
2. 配对头在最前（若有）
3. 分组包含
4. 命名空间与定义

```cpp
//===----------------------------------------------------------------------===//
// thing_table.cpp - 实现 ThingTable 的添加与查询。
//===----------------------------------------------------------------------===//

#include "project/path/thing.h"

#include <algorithm>

#include "project/path/other.h"

namespace project {

void ThingTable::Add(const Thing& thing) { things_.push_back(thing); }

}  // namespace project
```

- 实现文件不写 `#ifndef` / `#define` / `#endif`，也不写 `#pragma once`。
- 新工程与示例一律 `.cpp`；已有工程沿用它原本的实现后缀（常见 `.cc`），不批量改名。
- `main` 文件同样只做装配；模板不替项目决定业务结构。

## `.inc`

只用于必须做文本包含的场景。本工作流不新写 `.inc`；第三方 `.inc` 不补守卫，也不为它改本模板。

## 自检

- 每个头文件恰好一对 `#ifndef` / `#define`，末尾一个 `#endif  // 同名宏`。
- 守卫名与相对路径一致；`#endif` 注释与宏逐字相同。
- 头文件能单独编译：只包含它的一个空 `.cpp` 必须通过。
- 实现文件没有守卫，配对头在第一组。
- 工程内没有 `#pragma once`，也没有守卫与 pragma 并存。
