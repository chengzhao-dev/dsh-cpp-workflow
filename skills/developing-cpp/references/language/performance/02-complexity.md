# 复杂度与数据结构

- 先问操作的渐进复杂度：`vector` 尾部追加摊还 O(1)，中间插入 O(n)；`map` 查找 O(log n)；`unordered_map` 平均 O(1)、最坏 O(n)。
- 嵌套循环里做线性查找通常是把 O(n) 变成 O(n²)；先建索引或排序。
- 频繁按 key 查找时，`unordered_map` 通常比 `map` 快，但迭代顺序不稳定；需要有序输出时不要选它。
- 小规模数据（几十个元素）上，连续 `vector` 的线性扫描常比哈希表更快；不要机械套用复杂度。
- 递归深度可能随输入增长时，改成迭代或显式栈；栈溢出不是可捕获的异常。

## 依据

- [ISO C++ `[container.requirements]`](https://eel.is/c++draft/container.requirements)：各容器的复杂度保证。
- [cppreference: Containers library](https://en.cppreference.com/w/cpp/container)：查找、插入、遍历的复杂度对照。
- [C++ Core Guidelines: Per.4](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-performance)：理解算法与数据结构的成本，再谈常数因子。
