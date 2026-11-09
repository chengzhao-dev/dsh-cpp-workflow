<!-- 读取时机：查语言细节时；读完能回答：有符号、无符号与溢出；预算：一次只开这一份（26 行），不自动串联。 -->
# 有符号、无符号与溢出

- 普通整数类型默认有符号；只有确有非负语义且理解边界时才用无符号。
- 无符号运算按模 `2^N` 回绕，这是有定义的行为；有符号整数溢出是未定义行为。
- 数组越界、空指针解引用、读取未初始化变量都属于未定义行为。编译器可以假设它们不发生，优化后的结果可能完全不符合直觉。
- 两边都是整数时，`./` 向零截断，`%` 给余数；`7 / 2` 是 `3`。整数除以零是未定义行为，不能与浮点的 `inf` / `nan` 混为一谈。
- 浮点转整数会截断小数；大整数转小整数可能丢高位或改变符号。先检查范围，再 `static_cast`。
- 禁止 C 风格强转 `(int)value`；它隐藏转换类别，`google-readability-casting` 会报。

```cpp
int CountWide(const std::vector<int>& values) {
  int count = 0;
  for (std::size_t index = 0; index < values.size(); ++index) {
    if (values[index] > 0) ++count;
  }
  return count;
}
```

循环下标与容器大小都用 `std::size_t`，避免混合比较。业务编号与坐标另按下面的约定。

## 依据

- ISO C++ `[basic.fundamental]` 与 `[expr.mul]`：无符号按模回绕，有符号溢出是未定义行为，整数除法向零截断。https://eel.is/c++draft/expr.mul
- cppreference 算术运算符：整数提升、常用算术转换与回绕规则。https://en.cppreference.com/w/cpp/language/operator_arithmetic
- Google C++ Style, Integer Types：转换与提升可能丢失信息，混用有符号/无符号要小心。https://google.github.io/styleguide/cppguide.html#Integer_Types
