<!-- 读取时机：抛异常或写异常契约时；读完能回答：正反例：Debug 与 Release 的三层合同；预算：一次只开这一份（36 行），不自动串联。 -->
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

越界用标准库已有的 `std::out_of_range`；何时新增派生类型见 `references/exceptions/01-exception-rules.md` 的「异常类型」。

**差**：用 `assert` 承担 Release 也必须执行的 invariant 检查；`NDEBUG` 后检查消失。

```cpp
assert(game.IsInProgress());
```

**好**：两种模式都必须检查的 invariant 与只在开发期做的自检分开写；分工见 `references/exceptions/01-exception-rules.md` 的「两种构建模式的三层合同」，这里只演示写法。

```cpp
Check(game.IsInProgress(), "Computer::ChoosePosition: game is already over");
DebugCheck(index < history_.size(), "history index out of range");
```
