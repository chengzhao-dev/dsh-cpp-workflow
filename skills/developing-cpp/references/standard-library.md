# 标准库选择

标准库不是“能用就行”的工具箱。先确定访问模式、所有权和失败方式，再选容器和算法。

## 容器选择

| 需求 | 默认选择 | 说明 |
| --- | --- | --- |
| 固定长度、编译期已知 | `std::array<T, N>` | 不堆分配，可当聚合成员；长度是类型的一部分 |
| 可变长度、连续存储 | `std::vector<T>` | 默认容器；随机访问、尾部追加、缓存友好 |
| 两端增删 | `std::deque<T>` | 分段连续；中间插入仍然昂贵 |
| 文本 | `std::string` | 拥有字符；修改后 `c_str()` / `data()` 可能失效 |
| 只读文本视图 | `std::string_view` | 不拥有字符；不能比原字符串活得更久 |
| 有序键值 | `std::map<K, V>` | 按 key 有序；查找 O(log n)；节点独立 |
| 无序键值 | `std::unordered_map<K, V>` | 平均 O(1)，最坏 O(n)；迭代顺序不稳定 |
| 去重集合 | `std::set` / `std::unordered_set` | 只存 key；不要用 `map<K, bool>` 代替 |
| 连续只读视图 | `std::span<T>` | 不拥有元素；C++20 没有 `at` |

选择顺序：

1. 先问是否需要稳定顺序、是否需要按 key 查找、是否需要连续内存。
2. 默认 `vector`；只有剖析或明确复杂度要求时才换。
3. 需要“可能没有”的返回值时用 `std::optional<T>`，不要用特殊值（`-1`、空字符串）表示缺失。
4. 需要“成功值或错误原因”时用 `std::expected<T, E>`（C++23）——C++20 项目改用项目自己的结果类型或 `std::variant`，不要假称标准库已有。
5. 需要多态值集合时用 `std::variant` 或 `std::unique_ptr<Base>`；不要用 `void*`。

## 访问与边界

- `operator[]` 不检查边界，越界是未定义行为；`at` 检查并抛 `std::out_of_range`。规则与家族差异见 `references/types.md`。
- `vector::front()` / `back()` / `data()` 在空容器上未定义；先 `empty()`。
- `map::operator[]` 缺键会插入默认值；只读查询用 `find`、`contains`（C++20）或 `at`。
- `string_view` 不保证以 `\0` 结尾；传给需要 C 字符串的 API 前先转成 `std::string`。
- `span` 不拥有元素，也不延长生命周期；不要从临时容器构造后保存。
- 迭代器区间是半开的 `[first, last)`；`end()` 不指向元素，不能解引用。

## 迭代与失效

- 范围 `for` 默认按值复制元素；大对象写 `const auto&`，需要修改写 `auto&`。
- 在范围 `for` 里修改容器大小会使迭代器失效；先收集要改的 key，再统一修改。
- `vector` 扩容会使所有指针、引用、迭代器失效；`reserve` 只能减少扩容次数，不能保证永不失效。
- `map` / `unordered_map` 插入不会使其他元素的引用失效；`unordered_map` 的 rehash 会使迭代器失效。
- 删除元素用 `erase-remove` 惯用法或 C++20 `std::erase` / `std::erase_if`；不要在遍历中直接 `erase` 当前迭代器以外的元素。

```cpp
std::vector<int> values{1, 2, 3, 4, 5};
std::erase_if(values, [](int value) { return value % 2 == 0; });
```

## 算法优先于手写循环

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
- 谓词只做判断，不改元素；需要修改时用 `transform`。
- 捕获列表只捕获需要的变量；默认 `[&]` 容易悬空，默认 `[=]` 容易复制大对象。
- 不在比较函数里写有副作用的逻辑；排序要求严格弱序，违反会导致未定义行为。

## `std::string` 与 `std::string_view`

- 函数只读文本时参数用 `std::string_view`；需要保存或修改时用 `std::string`。
- `string_view` 不拥有内存；不要返回指向局部 `std::string` 的 `string_view`，也不要把临时 `std::string` 转成 `string_view` 后保存。
- 拼接少量文本用 `std::string` 的 `+=` 或 `std::format`；大量拼接先 `reserve`。
- 查找子串用 `find`，找不到返回 `npos`；不要用 `-1` 比较。
- 数值与文本互转用 `std::to_string` / `std::from_chars` / `std::format`；`std::stoi` 会抛异常且不报告消耗长度。

## `std::format` 与输出

- 组合消息优先 `std::format`；它返回 `std::string`，不直接写流。
- 输出仍走 `std::cout` / `std::cerr` / 项目传入的 `std::ostream&`；C++20 没有 `std::print`。
- 格式串里的 `{}` 按顺序取参数；需要位置时写 `{0}`、`{1}`。
- 自定义类型要格式化时，特化 `std::formatter<T>`；不要在 `operator<<` 里塞业务格式。
- 浮点默认格式可能与预期不同；需要固定精度时写 `{:.2f}`，需要科学计数时写 `{:e}`。
- 异常消息、日志、用户界面文本都通过 `std::format` 组合，不手工拼接数字和字符串。

## 时间、随机与文件

- 时间用 `<chrono>` 的 `std::chrono::steady_clock` 测耗时，不用系统时钟做间隔。
- 随机数用 `<random>` 的引擎 + 分布；不要用 `rand()`，也不要每次调用重新播种。
- 文件用 `std::ifstream` / `std::ofstream`，构造后检查 `is_open()`；读写失败检查流状态，不假设成功。
- 路径用 `std::filesystem::path`；拼接用 `/` 运算符，不手工拼分隔符。

## 检查清单

- [ ] 容器选择有明确理由，默认是 `vector`。
- [ ] 访问前有边界证明，或使用 `at`。
- [ ] 没有保存 `string_view` / `span` 指向的临时对象。
- [ ] 修改容器大小前处理了迭代器失效。
- [ ] 能用算法表达时没有手写下标循环。
- [ ] 输出用 `std::format` 组合、流输出，没有 `std::print`。
