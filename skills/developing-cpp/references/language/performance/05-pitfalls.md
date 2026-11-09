<!-- 读取时机：查语言细节时；读完能回答：常见性能陷阱；预算：一次只开这一份（17 行），不自动串联。 -->
# 常见性能陷阱

| 现象 | 常见原因 | 先做什么 |
| --- | --- | --- |
| 循环里反复分配 | 每次迭代构造容器/字符串 | 移到循环外，或 `reserve` |
| 大量拷贝 | 范围 `for` 按值、参数按值传大对象 | 改 `const&`，确认所有权 |
| 哈希表慢 | 哈希冲突、频繁 rehash | 预留桶数，检查哈希质量 |
| 字符串拼接慢 | 反复 `+` 产生临时对象 | `reserve` + `+=`，或 `std::format` 一次成型 |
| 多线程没有变快 | 锁竞争、伪共享 | 缩小临界区，按缓存行对齐 |
| 递归慢/栈溢出 | 重复子问题、深度大 | 记忆化或改迭代 |
| 输出慢 | 每行 flush、频繁 `std::endl` | 用 `'\n'`，需要时再 flush |

## 依据

- [C++ Core Guidelines: Per.14](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-performance)：减少不必要的分配与释放。
- [C++ Core Guidelines: Per.15](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-performance)：不要在关键路径里分配。
- [cppreference: `std::vector`](https://en.cppreference.com/w/cpp/container/vector)：扩容、`reserve` 与引用失效。
