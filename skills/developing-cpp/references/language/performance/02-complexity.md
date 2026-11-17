<!-- 读取时机：查语言细节时；读完能回答：复杂度与数据结构；预算：一次只开这一份（12 行），不自动串联。 -->
# 复杂度与数据结构

- 先问操作的渐进复杂度：常见容器各操作的数量级见 `../standard-library/01-containers.md` 的选型表；写循环前先确认每一层的规模。
- 嵌套循环里做线性查找通常是把 O(n) 变成 O(n²)；先建索引或排序。
- 小规模数据（几十个元素）上，连续 `vector` 的线性扫描常比哈希表更快；不要机械套用复杂度。
- 递归深度可能随输入增长时，改成迭代或显式栈；栈溢出不是可捕获的异常。

## 依据

- [ISO C++ `[container.requirements]`](https://eel.is/c++draft/container.requirements)：各容器的复杂度保证。
- [cppreference: Containers library](https://en.cppreference.com/w/cpp/container)：查找、插入、遍历的复杂度对照。
- [C++ Core Guidelines: Per.4](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-performance)：理解算法与数据结构的成本，再谈常数因子。
