<!-- 读取时机：查语言细节时；读完能回答：浮点与布尔；预算：一次只开这一份（13 行），不自动串联。 -->
# 浮点与布尔

- 二进制浮点通常不能精确表示十进制小数，`0.1 + 0.2` 不要直接与 `0.3` 用 `==` 比较。
- 比较计算结果时使用与量纲、误差预算匹配的容差；单独处理 `NaN` 与无穷大。
- 金额存最小货币单位的整数（如“分”）；折扣率、比例、物理量可用 `double`，但要写清精度边界。
- 整数 `0` 转 `false`，非 `0` 转 `true`；流默认输出 `0` / `1`，需要可读文本时先写 `std::boolalpha`。
- 不要把 `bool` 当成承载多个状态的整数；互斥状态用 `enum class`。

## 依据

- ISO C++ `[basic.fundamental]`：浮点表示不保证能精确表示十进制小数。https://eel.is/c++draft/basic.fundamental
- cppreference `std::numeric_limits`：`epsilon`、`infinity`、`quiet_NaN` 与浮点分类。https://en.cppreference.com/w/cpp/types/numeric_limits
- cppreference `std::boolalpha`：流默认把 `bool` 输出为 `0`/`1`，需要可读文本时切换。https://en.cppreference.com/w/cpp/io/manip/boolalpha
