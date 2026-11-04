# `std::format` 与输出

- 组合消息优先 `std::format`；它返回 `std::string`，不直接写流。
- 输出仍走 `std::cout` / `std::cerr` / 项目传入的 `std::ostream&`；C++23 且库支持时程序边界可用 `std::print`，C++20 及更早没有。
- 格式串里的 `{}` 按顺序取参数；需要位置时写 `{0}`、`{1}`。
- 自定义类型要格式化时，特化 `std::formatter<T>`；写法与边界见下面的「自定义类型的格式化」。
- 浮点默认格式可能与预期不同；需要固定精度时写 `{:.2f}`，需要科学计数时写 `{:e}`。
- 异常消息、日志、用户界面文本都通过 `std::format` 组合，不手工拼接数字和字符串。异常消息的组织方式见 `source/08-exceptions/01-throw-rules.md` 的「消息」节；面向用户的中文只留在程序入口的前缀里。

## 自定义类型的格式化

- 在类型所在的头文件里特化 `std::formatter<T>`，与类型声明放在一起；输出属于类型合同，不散落在调用点的 `operator<<` 或手工拼接里。
- `parse` 只接受默认格式：读到 `}` 或格式串结束时返回迭代器；其他说明符抛 `std::format_error`，消息写清只支持默认格式。需要字段对齐、宽度等语法时再实现，不预埋。
- `format` 用 `std::format_to(ctx.out(), ...)` 输出；内部复用已有类型的 formatter，不重复拼接坐标或枚举文本。`Move` 只组合 `Player` 与 `Position`，不重新拼 `(row, col)`。
- 枚举的非法值要有稳定回退，例如 `Player(9)`；不要输出空串，也不要让调用方从越界里猜原因。
- 输出形态短且稳定，例如 `X(1, 2)`；异常消息与测试都用 `std::format("{}", value)` 直接断言。

```cpp
template <>
struct std::formatter<tictactoe::Player> {
  /// 只接受默认格式；其他说明符抛出 std::format_error。
  auto parse(std::format_parse_context& ctx) {
    if (ctx.begin() != ctx.end() && *ctx.begin() != '}') {
      throw std::format_error("Player only supports the default format");
    }
    return ctx.begin();
  }

  /// 把玩家格式化后写入输出上下文。
  auto format(tictactoe::Player player, std::format_context& ctx) const {
    switch (player) {
      case tictactoe::Player::kX:
        return std::format_to(ctx.out(), "X");
      case tictactoe::Player::kO:
        return std::format_to(ctx.out(), "O");
    }
    return std::format_to(ctx.out(), "Player({})", static_cast<int>(player));
  }
};
```

`parse` 直接返回 `ctx.begin()` 只适用于「只接受默认格式」；要自定义拒绝消息时先检查第一个字符是不是 `}`。`format` 的返回类型由 `std::format_to` 推导，不写死 `char*`。

依据：[cppreference: std::formatter](https://en.cppreference.com/w/cpp/utility/format/formatter) 与 [P3070R2: Formatting enums](https://open-std.org/JTC1/SC22/WG21/docs/papers/2025/p3070r2.html)。
