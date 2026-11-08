# 正反例：头文件位置

**差**：

```text
src/task_list.h                  // 公共头藏在 src，测试无法只依赖公共接口
src/detail.h                     // 私有头被测试直接包含
```

```cpp
#include "src/task_list.h"       // 从仓库根写到了实现目录
```

**好**：

```text
task_list/include/task_list.h    // 公共头
task_list/src/task_list.cpp       // 实现
task_list/src/detail.h           // 私有头，只被本组件包含
```

```cpp
#include "task_list.h"            // 公共头按裸文件名包含
```

构建时把组件的 `include/` 目录加入 include 搜索路径，模板写法是 `target_include_directories(greeting PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)`；不要用 `#include "../task_list/include/task_list.h"` 这种随文件位置漂移的写法。
