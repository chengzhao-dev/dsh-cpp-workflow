<!-- 读取时机：设计会话入口与备用屏幕时；读完能回答：正反例：进入与退出显式配对；预算：一次只开这一份（39 行），不自动串联。 -->
# 正反例：进入与退出显式配对

**差**：在 `RunGame` 里声明局部类，把进入与退出藏进构造和析构。

```cpp
// run_game.cpp
void GameSession::RunGame() {
  class ConsoleSession {
   public:
    explicit ConsoleSession(Console& console) : console_{console} {
      console_.EnterAlternateScreen();
    }
    ~ConsoleSession() { console_.ExitAlternateScreen(); }
   private:
    Console& console_;
  } session{console_};
  // ...
}
```

问题：多了一个只为转调的局部类型，入口不再直接说明屏幕何时切换；`Console` 是会话成员，寿命比一次 `RunGame` 长，备用屏幕也不满足“对象寿命等于资源占用”。

**好**：入口直接进入，每个返回路径先退出。

```cpp
// run_game.cpp
void GameSession::RunGame() {
  console_.EnterAlternateScreen();
  const std::optional<MatchMode> mode = console_.PromptMatchMode();
  if (!mode) {
    console_.ExitAlternateScreen();
    return;
  }
  // ...
  console_.ExitAlternateScreen();
}
```

异常交给 `main`，不额外恢复屏幕；`Console` 不放进构造与析构。
