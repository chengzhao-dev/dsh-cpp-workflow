<!-- 读取时机：查语言细节时；读完能回答：算法优先于手写循环；预算：一次只开这一份（26 行），不自动串联。 -->
# 算法优先于手写循环

能用标准算法表达意图时，不写下标循环：

| 意图 | 算法 |
| --- | --- |
| 查找 | `std::find` / `std::find_if` |
| 计数 | `std::count` / `std::count_if` |
| 任一/全部 | `std::any_of` / `std::all_of` / `std::none_of` |
| 变换 | `std::transform` |
| 排序 | `std::sort` / `std::stable_sort` |
| 最值 | `std::min_element` / `std::max_element` |
| 累加 | `std::accumulate`（注意初始值类型） |
| 二分查找 | `std::lower_bound` / `std::upper_bound`（要求已排序） |

- 算法接收迭代器区间，不接收容器；调用时写 `values.begin(), values.end()` 或 C++20 `std::ranges::sort(values)`。
- 嵌套数组整体赋同一个值时用 `std::ranges::fill` 与 `std::views::join`；逐格做不同处理时仍用 `row` / `col` 循环。
- 谓词只做判断，不改元素；需要修改时用 `transform`。
- 捕获列表只捕获需要的变量；默认 `[&]` 容易悬空，默认 `[=]` 容易复制大对象。
- 不在比较函数里写有副作用的逻辑；排序要求严格弱序，违反会导致未定义行为。

## 依据

- [ISO C++ `[algorithms]`](https://eel.is/c++draft/algorithms)：算法要求、复杂度与谓词契约。
- [cppreference: Algorithms library](https://en.cppreference.com/w/cpp/algorithm)：算法分类与 `ranges` 版本。
- [C++ Core Guidelines: SL.11](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-stdlib)：用标准算法表达意图，避免手写循环。
