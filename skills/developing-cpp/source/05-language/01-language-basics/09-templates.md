# 模板、概念与 CTAD

- 模板定义放头文件；`.cpp` 里的模板实例化只对当前翻译单元可见。
- C++20 用概念约束模板参数，把错误从实例化深处提前到调用点：

```cpp
template <typename T>
concept Numeric = std::is_arithmetic_v<T>;

template <Numeric T>
T Clamp(T value, T low, T high) {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}
```

- 概念只表达语法和语义约束，不替代文档；错误消息要能让调用者知道违反了哪条约束。
- CTAD（类模板实参推导）用于局部变量和明显场景：`std::pair pair{1, 2.0};`；公共接口写显式模板实参，避免推导规则变化影响契约。
- 不用模板做运行期分支；需要运行期多态时用虚函数或 `std::variant`。
