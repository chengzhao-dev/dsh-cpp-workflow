# 正反例：Debug 与 Release 的三层合同

**差**：同一个函数在 Debug 抛异常、在 Release 返回 false；调用方被迫按构建模式写两套分支。

```cpp
#ifdef NDEBUG
return false;
#else
throw std::out_of_range{std::format("position ({}, {}) is out of range", row, col)};
#endif
```

**好**：返回值在两种模式完全一致；需要异常时两种模式都抛，只有 `what()` 的详略不同。

```cpp
// 返回值：失败是可恢复结果，两种模式都返回 false。
[[nodiscard]] bool TryPlace(Position pos, Player player) noexcept;

// 越界：两种模式都抛 std::out_of_range；Debug 消息可带 file:line。
void Place(Position pos, Player player);
```

越界用标准库已有的 `std::out_of_range`，调用方不需要认识项目私有类型；只有调用方必须把它和其它 `out_of_range` 区分开时，才定义派生类并在 `what()` 里补位置信息。

**差**：用 `assert` 承担 Release 也必须执行的 invariant 检查；`NDEBUG` 后检查消失。

```cpp
assert(game.GetResult() == GameResult::kInProgress);
```

**好**：两种模式都必须检查的 invariant 用 `Check`（项目保留时），失败时打印诊断并终止；只在开发期值得做、Release 可以省掉的自检用 `DebugCheck`。没有这两个宏时，两种模式都必须执行的检查用 `std::terminate`（失败前先打印诊断），只在开发期做的自检用 `assert`。

```cpp
Check(game.GetResult() == GameResult::kInProgress, "Ai::Choose: game is already over");
DebugCheck(index < history_.size(), "history index out of range");
```

`Check` 不是 `[[noreturn]]`：条件成立时正常返回。`DebugCheck` 在 `NDEBUG` 后展开为空，参数不能带副作用。
