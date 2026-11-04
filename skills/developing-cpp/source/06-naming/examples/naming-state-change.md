# 正反例：状态变更：动作与结果枚举

**差**：

```cpp
enum class SetStateResult : std::uint8_t {
  kEmptyInput = 0,
  kOccupied = 1,
  kUpdated = 2,
};

class Cell {
 public:
  SetStateResult SetState(CellState state);
  void ResetState();
};
```

**好**：

```cpp
enum class PlaceResult : std::uint8_t {
  kRejected = 0,
  kOccupied = 1,
  kUpdated = 2,
};

class Cell {
 public:
  [[nodiscard]] bool IsEmpty() const;
  [[nodiscard]] CellState GetState() const;
  [[nodiscard]] PlaceResult Place(CellState state);
  void Clear();
};
```

`SetState` / `SetStateResult` 把存储动作写进 API；领域动作是 `Place`，结果枚举用「操作 + Result」，取值统一成「主体 + 状态」。`Clear` 比 `ResetState` 短，且和 `Place` 成对。

改名按这个顺序做，每一步都能编译：

| 旧名 | 新名 | 理由 |
| --- | --- | --- |
| `SetStateResult` | `PlaceResult` | 操作 + Result，和 `Place` 对齐 |
| `SetState` | `Place` | 领域动作，不暴露「设状态」 |
| `ResetState` | `Clear` | 领域动作，和 `Place` 成对 |
| `kEmptyInput` | `kRejected` | 失败值写原因，和 `kOccupied`/`kUpdated` 同一句式 |

更早的 `kNoInput` 只说明「没有输入」，`kEmptyInput` 进一步说明是空输入；两者都在描述输入，而不是结果，最终改成 `kRejected`。

注释也要跟着改名，但不要把「不为空」当状态：

```cpp
///< 格子状态未变更：格子不为空      // 差
///< 格子状态未变更：已经是 X 或 O 状态    // 好
```

`kOccupied` 的具体状态只有 X 或 O；写「已经是 X 或 O 状态」比「格子不为空」更容易核对。`kRejected` 写「传入的是 kEmpty 状态」、`kUpdated` 写「已经更新为传入状态」，都比描述输入或条件更直接。
