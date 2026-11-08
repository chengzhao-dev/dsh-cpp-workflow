# 正反例：完整声明：后置条件与轴向

把上面的规则放在一起，`Board` 的声明是这样：

```cpp
/// 棋盘。
class Board {
 public:
  /// 默认构造函数：初始化为空棋盘。
  Board() = default;

 private:
  /// 方格数组：按行优先排列。
  std::array<Square, kSquareCount> squares_{};
};
```

类注释只说这个类型是什么；构造注释补的是 `= default` 配合 `squares_{}` 才建立的后置条件；`squares_` 的上一行先说是方格数组，再用全角冒号补排列方向。行尾不写补充；`{}` 把每个 `Square` 初始化成空方格，这件事由构造注释表达。三处各说一件事，没有一句复述签名。
