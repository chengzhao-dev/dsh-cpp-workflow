<!-- 读取时机：查语言细节时；读完能回答：`std::format` 与输出；预算：一次只开这一份（87 行），不自动串联。 -->
# `std::format` 与输出

- 组合消息优先 `std::format`；它返回 `std::string`，不直接写流。
- 写到已有的 `std::ostream` 用 `<<`；没有流对象时，默认用 `std::print` 与 `std::println`，它们只在 C++23 且标准库支持时可用。
- 格式串里的 `{}` 按顺序取参数；需要位置时写 `{0}`、`{1}`。
- 自定义类型要格式化时，特化 `std::formatter<T>`；写法与边界见下面的「自定义类型的格式化」。
- 浮点默认格式可能与预期不同；需要固定精度时写 `{:.2f}`，需要科学计数时写 `{:e}`。
- 异常消息、日志、用户界面文本都通过 `std::format` 组合，不手工拼接数字和字符串。异常消息的组织方式见 `references/exceptions/01-exception-rules.md` 的「消息」节；面向用户的中文只留在程序入口的前缀里。

## 自定义类型的格式化

- 在类型所在的头文件里特化 `std::formatter<T>`，与类型声明放在一起；输出属于类型合同，不散落在调用点的 `operator<<` 或手工拼接里。
- 特化必须在首次使用前可见。`std::formatter<T>` 默认是 disabled；没有特化时 `std::format("{}", value)` 不能编译，不是运行时回退。
- `parse` 只接受默认格式：从 `ctx.begin()` 读到 `}` 或格式串结束；其他说明符抛 `std::format_error`，消息写清只支持默认格式。需要字段对齐、宽度等语法时再实现，不预埋。
- `format` 用 `std::format_to(ctx.out(), ...)` 输出；内部复用已有类型的 formatter，不重复拼接坐标或枚举文本。`Move` 只组合 `Player` 与 `Position`，不重新拼 `(row, col)`。
- 枚举的非法值要有稳定回退，例如 `Player(9)`；不要输出空串，也不要让调用方从越界里猜原因。
- 输出形态短且稳定，例如 `X(1, 2)`；异常消息与测试都用 `std::format("{}", value)` 直接断言。

### formatter 的四个部分

| 部分 | 契约 |
| --- | --- |
| 特化 | `template <> struct std::formatter<T>`；满足 BasicFormatter：可默认构造、拷贝、赋值、析构、交换；在首次使用前可见 |
| `parse` | 参数 `std::format_parse_context&`；从 `ctx.begin()` 解析到 `}` 或末尾；只接受默认格式时检查首字符，其他抛 `std::format_error`；返回指向 `}` 的迭代器 |
| `format` | `template <typename FormatContext> auto format(const T&, FormatContext&) const`；写入 `ctx.out()`，返回输出末尾迭代器 |
| 失败路径 | 非法枚举值给稳定回退；`parse` 的错误用 `std::format_error` |

- 空格式说明符有两种合法形态：`ctx.begin() == ctx.end()`，或 `*ctx.begin() == '}'`；两者都表示没有额外说明符。
- `format` 的 `const` 与模板参数都是契约的一部分：`std::format` 与 `std::format_to` 传入不同的 `FormatContext`；写死 `std::format_context` 只能配合返回 `std::string` 的 `std::format`。
- 输出只依赖值、`ctx.locale()`、`ctx.arg(n)` 和上次 `parse` 保存的说明符；不要在 `format` 里读全局状态或修改 formatter。
- 标准不要求继承任何 formatter。只有输出本质是字符串、并且确实要支持 `{:>10}`、`{:.3}` 这类字符串语法时，才继承或组合 `std::formatter<std::string_view>`；枚举、坐标与记录不继承，自己拼文本。
- `parse` 直接返回 `ctx.begin()` 只适用于「只接受默认格式」；要拒绝并给出消息时，先检查首字符是不是 `}`。
- `format_to(ctx.out(), ...)` 直接写入调用方的输出迭代器，避免为每个字段构造临时 `std::string`；需要在函数边界得到完整字符串时才用 `std::format`。

```cpp
template <>
struct std::formatter<game::Player> {
    constexpr auto parse(std::format_parse_context& ctx) {
        if (ctx.begin() != ctx.end() && *ctx.begin() != '}') {
            throw std::format_error("Player: format specifier is not supported, use {} instead");
        }
        return ctx.begin();
    }

    template <typename FormatContext>
    auto format(game::Player player, FormatContext& ctx) const {
        switch (player) {
            case game::Player::kX:
                return std::format_to(ctx.out(), "X");
            case game::Player::kO:
                return std::format_to(ctx.out(), "O");
        }
        return std::format_to(ctx.out(), "Player({})", static_cast<int>(player));
    }
};
```

这是在报告非法值，不是 `std::unreachable()`；全覆盖且范围外算程序错误时仍按 `references/language/language-basics/05-expressions.md`。

## 枚举值与整数输出

`std::format` 没有为枚举提供内建 formatter；没有特化时 `std::format("{}", Player::kX)` 不能编译。枚举的数值回退要先把值转成整数，再按整数的格式说明输出；转换目标不同，`{}` 的结果可能不同。

| 写法 | 转换后的类型 | `"{}"` | `"{:d}"` | 说明 |
| --- | --- | --- | --- | --- |
| `static_cast<int>(player)` | `int` | `9` | `9` | 值在 `int` 范围时最简；底层是 `char`/`bool` 也不会变成字符或 `true` |
| `static_cast<std::underlying_type_t<Player>>(player)` | `std::uint8_t` | `9` | `9` | `uint8_t` 是 `unsigned char`，默认按十进制；底层是 `char`/`bool` 时 `{}` 会变成字符或 `true` |
| `std::to_underlying(player)` | `std::uint8_t` | `9` | `9` | C++23，等价于 underlying 转换 |
| `static_cast<char>(player)` | `char` | 字符 | 数字 | 不要用 `{}` 输出数字 |
| `static_cast<bool>(player)` | `bool` | `true`/`false` | `1`/`0` | 不要把枚举转 `bool` 输出数字 |

- 标准格式说明：`char`/`wchar_t` 的默认 presentation 是复制字符；`bool` 的默认 presentation 是 `true`/`false`；其他整数默认是 `d`。`{:d}` 对 `char`/`bool` 也按整数输出，`char` 先转 `unsigned char`。
- 所以 `static_cast<std::underlying_type_t<Player>>` 只在底层是普通整数时安全；底层可能是 `char`/`bool` 时，要用 `{:d}` 才能保证十进制。
- `static_cast<int>` 的边界是值域：枚举值超过 `int`（例如底层为 `std::uint64_t`）时可能窄化。此时用 `std::to_underlying(player)` 配 `{:d}`，或转 `long long`。
- `Player` 的取值只有 `kX`/`kO` 和少量非法值，`static_cast<int>` 足够；本项目保留这种写法，不为通用性加模板或分支。回退格式串写成 `Player({})`，只输出裸数字会和普通计数混淆。
- 不用 C 风格转换；Google 的 Casting 规则要求 `static_cast` 或花括号初始化，值转换用 `static_cast`。

如果底层类型可能变化，回退写成强制十进制的通用形式：

```cpp
// C++23
return std::format_to(ctx.out(), "Player({:d})", std::to_underlying(player));

// C++20
return std::format_to(ctx.out(), "Player({:d})",
                                            static_cast<std::underlying_type_t<game::Player>>(player));
```
