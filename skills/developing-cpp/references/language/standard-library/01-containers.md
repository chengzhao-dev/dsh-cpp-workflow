<!-- 读取时机：查语言细节时；读完能回答：容器选择；预算：一次只开这一份（29 行），不自动串联。 -->
# 容器选择

标准库不是“能用就行”的工具箱。先确定访问模式、所有权和失败方式，再选容器和算法。

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

## 依据

- [ISO C++ `[containers]`](https://eel.is/c++draft/containers)：容器要求、复杂度与迭代器失效规则。
- [cppreference: Containers library](https://en.cppreference.com/w/cpp/container)：各容器的接口与复杂度对照。
- [C++ Core Guidelines: SL.con.1](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-stdlib)：优先标准容器与算法，不手写动态数组。
