# 源码布局

布局服务于边界：库是纯的，程序是薄的，测试从公共接口进入。这里只定目录和文件职责；CMake target 由 `configuring-cmake` 的 `steps/01-targets.md` 定。

## 组件

```text
<component>/
  include/
    <name>.h         公共接口，从源码根写完整路径包含
  src/
    <name>.cpp       实现，可以包含私有头
    <detail>.h       私有头，只被本组件 src 包含
  tests/
    <name>_test.cpp  通过公共接口测试
```

- 公共头直接放 `include/` 下，包含时写裸文件名，例如 `#include "task_list.h"`；不要写 `"task_list/include/task_list.h"` 这种从仓库根起的长路径，也不要写 `../` 相对路径。
- 私有头放 `src/`，不进入公共 include 根；测试不得包含私有头。
- 一个组件一个职责；组件名用 snake_case，和命名空间一致。
- 组件之间通过公共头依赖；不要用 `../other/src/private.h` 跨组件包含私有实现。

## 程序

```text
app/
  include/
    cli.h            输入输出与参数解析的私有接口
  src/
    cli.cpp          终端交互
    main.cpp         只做装配：构造依赖、调用 Run、翻译退出码
```

- `main.cpp` 不写业务规则；它只解析参数、打开流、调用库、捕获边界异常。
- 终端输入输出集中在 `app/`；库不包含 `<iostream>`，也不打印。
- 只有一个程序时 `app/` 可以退化成根 `src/main.cpp`；一旦需要测试交互逻辑，再拆 `cli.h` / `cli.cpp`。
- 程序可以依赖库；库不能反向依赖程序。

## 单文件与多文件

| 形态 | 何时用 | 布局 |
| --- | --- | --- |
| 单文件 | 一次性脚本、极小示例 | `src/main.cpp`，辅助函数放匿名命名空间 |
| 多文件单程序 | 逻辑开始分块，但还没有复用方 | `src/*.cpp` + `include/*.h`，一个 `app` target |
| 静态库 + 程序 | 需要测试、需要被多个程序链接 | `<component>/` + `app/`，库 target + `app` target |
| 动态库 + 程序 | 需要运行时替换实现、插件式加载 | 同上，库 target 改 `SHARED`，注意运行时库路径 |

不要为了「以后可能复用」提前拆库；出现第二个调用方或测试需要直接调用时再拆。拆的时候接口不变，只移动文件。

## 文件扩展名与归属

扩展名、槽位与守卫名以 `references/file-template.md` 为准；本文只定位置：公共头放 `include/`，私有头放 `src/`，实现文件放 `src/`，测试放 `tests/`。

## 头文件契约

自包含、共享常量、`using namespace`、模板实现与 `<iostream>` 的规则见 `references/google-cpp-style.md`「头文件」和 `references/file-template.md`。本文只强调一条边界：公共头只暴露稳定契约，测试只包含公共头。

## 测试

- 测试文件放组件 `tests/` 或顶层 `tests/`，命名 `<被测>_test.cpp`。
- 测试只包含公共头；需要测私有逻辑时，先判断它是否应该成为公共行为。
- 一个测试文件对应一个行为组；测试名描述行为，不描述实现。
- 测试不复制实现，不依赖执行顺序，不读写固定绝对路径。

## 迁移

从单文件迁到库 + 程序时：

1. 先定边界（第 2 步），列出公共头。
2. 移动文件，不改行为；测试保持绿色。
3. 再改 CMake target（`configuring-cmake` 的 `steps/01-targets.md`），最后跑 `building-cpp` 的 `steps/03-check.md`。

一次只做一种迁移；不要把「拆库 + 改名 + 改行为」混在一起。
