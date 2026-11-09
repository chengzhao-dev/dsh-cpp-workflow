<!-- 读取时机：查语言细节时；读完能回答：测量顺序；预算：一次只开这一份（22 行），不自动串联。 -->
# 测量顺序

先证明慢在哪里，再改代码。没有测量的“优化”通常只是把复杂度搬了个位置。

本组条文只管性能判断与测量；语言规则见 `references/language/language-basics/01-objects.md`，容器与算法选择见 `references/language/standard-library/01-containers.md`，静态检查开关见 `engineering` 的 `references/formatting/03-clang-tidy.md`。

1. 写清可观察的性能目标：延迟、吞吐、内存上限，或“输入规模翻倍时耗时如何增长”。
2. 用真实规模的输入测量；玩具数据上的常数差异没有意义。
3. 先看算法复杂度，再看内存访问，再看常数因子。
4. 用 profiler 找热点；不要凭代码长短猜。
5. 改一处，复测同一指标；记录测量条件和结果。

- 发布构建（`-O2` / `-O3`）测性能，调试构建测正确性。
- 微基准要防止编译器把结果优化掉；使用输入、累加结果并输出。
- 单次测量受缓存、频率、调度影响；取多次的中位数或分位数，不只报最好的一次。
- 采样 profiler（Linux `perf record`、macOS Instruments、Windows ETW）给出热点分布；调用次数与单次耗时一起看，避免被高频小函数带偏。

## 依据

- [ISO C++ `[intro.abstract]`](https://eel.is/c++draft/intro.abstract)：as-if 规则允许编译器重排，性能结论只能来自测量。
- [C++ Core Guidelines: Per.1](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-performance)：没有理由不要优化；先测量再改。
- [C++ Core Guidelines: Per.6](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-performance)：没有测量就没有性能结论。
