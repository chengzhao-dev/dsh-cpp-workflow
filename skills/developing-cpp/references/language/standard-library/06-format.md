<!-- 读取时机：查语言细节时；读完能回答：`std::format` 与输出；预算：一次只开这一份（116 行），不自动串联。 -->
# `std::format` 与输出

- 组合消息优先 `std::format`；它返回 `std::string`，不直接写流。
- 输出仍走 `std::cout` / `std::cerr` / 项目传入的 `std::ostream&`；C++23 且库支持时程序边界可用 `std::print`，C++20 及更早没有。
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

## 标准、提案与生态

- C++20 引入 `std::format` 与 `std::formatter`；标准库为字符、字符串、整数、浮点、指针与 `nullptr` 等提供 enabled 特化，没有枚举。`formatter<T>` 默认 disabled；自定义类型必须特化。
- C++23 增加 `std::to_underlying`（`<utility>`，等价 `static_cast<std::underlying_type_t<Enum>>`）；字符串与字符的格式说明增加 `?` 调试表示；仍然没有枚举的内建 formatter。
- P3070R2 提议 `format_as` 作为枚举的 ADL 扩展点：`auto format_as(film f) { return std::to_underlying(f); }`，也可返回 `std::string_view`；在 type erasure 前转换，提案给出的测量约为 2× 快。尚未进入标准；fmt 已支持。
- P4267R0 用 C++26 reflection/annotations 提议 `[[=std::format_as_underlying]]` 与 `[[=std::format_as_identifier]]`，替代 `format_as`；尚未进入标准。
- fmt：`format_as` 或特化 `formatter`；`fmt::underlying(enum)`；推荐复用已有 formatter（继承/组合）。
- Abseil `StrFormat`：`%d`/`%i` 直接接受枚举，`%v` 用 `AbslStringify`。
- LLVM `formatv`：自定义用 `format_provider<T>` 特化；文档没有给出枚举专用入口。
- 结论：C++23 项目继续用 `std::formatter` 特化；数值回退优先 `static_cast<int>`（值域小）或 `std::to_underlying` + `{:d}`（值域大或底层不定）；不要为枚举继承 `formatter<std::string_view>`。

## fmt 与 `std::format` 的关系

- `std::format` 的接口来自 fmt 作者主导的 P0645，格式串语法与格式化语义同源；读 fmt 文档能直接解释标准库的行为。
- fmt 是超集：C++23 之前就提供 `print`/`println`、`memory_buffer`、命名参数与运行期格式串；标准库到 C++23 才补上 `std::print`，其余仍没有。
- 本项目是 C++23，clang 21 与 libc++ 21 的 `std::format` 已可用，不引入第三方依赖；fmt 只作为参考实现出现在阅读清单里。
- 只有工具链停在 C++20 及更早、或确实要用 fmt 专有接口时才换成 `fmt::format`。
- 换 fmt 要同时改构建（`target_link_libraries` 或 FetchContent）与编译数据库；只放头文件不接构建，clangd 仍会报未声明。

## 是否继承 `std::formatter<std::string_view>`

- 不需要。启用的特化只要满足 BasicFormatter：本身可默认构造、拷贝、赋值、析构、交换，并提供 `parse` 与 `format`；标准不要求继承任何 formatter。
- 继承或组合标准 formatter 的用途是复用格式说明符的解析。输出本质是字符串、并且确实要支持 `{:>10}`、`{:.3}` 这类字符串语法时才值得；`Position` 是最底层的坐标类型，把两个整数拼成 `(row, col)`，输出不是字符串值，继承 `formatter<std::string_view>` 只会让字符串说明符被接受，而 `format` 仍要自己拼文本。
- `Player` 与 `Move` 也不需要继承：`Player` 输出 `X`/`O` 符号，继承 `formatter<int>` 只会放宽可接受的说明符，输出仍由本类的 `format` 决定；`Move` 用 `"{}{}"` 组合 `Player` 与 `Position` 的 formatter。
- 现实中继承也确实在用：fmt 文档的 `formatter<color> : formatter<string_view>` 让 `parse` 转调基类、`format` 复用基类输出，只用于「输出是字符串」的类型，不是通用模板。
- 需要复用时，组合与继承都能工作。组合把 `std::formatter<std::string_view> base;` 作为成员，`parse` 转调 `base.parse(ctx)`，`format` 先拼临时字符串再 `base.format(temp, ctx)`，不改变本类型的继承关系；标准草案 [format.formatter.spec] 的示例则直接继承 `formatter<const char*>`。继承标准库类型只当薄适配层，不把它当多态基类。
- `format` 写成 `const`；LWG 3636 之后这是要求。

依据：[cppreference: 标准格式说明](https://en.cppreference.com/w/cpp/utility/format/spec)、[cppreference: std::formatter](https://en.cppreference.com/w/cpp/utility/format/formatter)、[cppreference: BasicFormatter](https://en.cppreference.com/w/cpp/named_req/BasicFormatter)、[formatter.requirements](https://eel.is/c++draft/formatter.requirements)、[format.parse.ctx](https://eel.is/c++draft/format.parse.ctx)、[format.context](https://eel.is/c++draft/format.context)、[format.formatter.spec](https://eel.is/c++draft/format.formatter.spec)、[std::to_underlying](https://en.cppreference.com/w/cpp/utility/to_underlying)、[Google Casting](https://google.github.io/styleguide/cppguide.html#Casting)、[P3070R2](https://wg21.link/P3070R2)、[P4267R0](https://wg21.link/P4267R0)、[fmt API](https://fmt.dev/latest/api/#formatting-user-defined-types)、[Abseil StrFormat](https://abseil.io/docs/cpp/guides/format)、[LLVM formatv](https://llvm.org/docs/ProgrammersManual.html#formatting-strings)、[std::basic_format_string](https://en.cppreference.com/w/cpp/utility/format/basic_format_string)、[LWG 3636](https://cplusplus.github.io/LWG/issue3636)。
