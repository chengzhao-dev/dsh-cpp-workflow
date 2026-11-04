# 正反例：完整声明：后置条件与轴向

把上面的规则放在一起，`Board` 的声明是这样：

```cpp
/// 井字棋棋盘。
class Board {
 public:
  /// 默认构造函数：得到空棋盘，每个格子都是 kEmpty。
  Board() = default;

 private:
  /// 棋盘格子数组：外层下标是行，内层下标是列。
  std::array<std::array<CellState, kColumnCount>, kRowCount> cells_{};
};
```

类注释只说这个类型是什么；构造注释补的是 `= default` 配合 `cells_{}` 才建立的后置条件；`cells_` 的上一行先说是棋盘格子数组，再用全角冒号补轴向。行尾不写补充；`{}` 带来的空格子已经由构造注释表达。三处各说一件事，没有一句复述签名。
