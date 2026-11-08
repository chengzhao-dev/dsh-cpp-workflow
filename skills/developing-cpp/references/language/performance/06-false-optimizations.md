# 不要做的“优化”

- 不要用全局可变状态换速度；正确性和可测试性先于常数因子。
- 不要为未测量的热点写复杂的手工内存管理。
- 不要用 `reinterpret_cast` 绕过类型系统；需要二进制布局时用 `std::bit_cast` 并确认可平凡复制。
- 不要把 `std::endl` 当换行符；它每次都会 flush。
- 不要用 `-ffast-math` 换浮点速度；它改变 NaN、Inf 和结合律语义，`std::isfinite` 等判断会失真。

## 依据

- [C++ Core Guidelines: Per.2](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-performance)：不要过早优化。
- [C++ Core Guidelines: Per.3](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-performance)：不要优化不重要的部分。
- [cppreference: `std::bit_cast`](https://en.cppreference.com/w/cpp/numeric/bit_cast)：要求可平凡复制且大小相同，不是任意类型双关。
