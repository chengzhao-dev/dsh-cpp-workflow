<!-- 读取时机：查语言细节时；读完能回答：std::format 的生态、提案与 fmt 关系；预算：一次只开这一份（31 行），不自动串联。 -->
# 格式化的标准与生态

## 标准与提案

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
- 环境声明的标准是 C++23、工具链的 `std::format` 可用时，不引入第三方依赖；fmt 只作为参考实现出现在阅读清单里。
- 只有工具链停在 C++20 及更早、或确实要用 fmt 专有接口时才换成 `fmt::format`。
- 换 fmt 要同时改构建（`target_link_libraries` 或 FetchContent）与编译数据库；只放头文件不接构建，clangd 仍会报未声明。

## 是否继承 `std::formatter<std::string_view>`

- 不需要。启用的特化只要满足 BasicFormatter：本身可默认构造、拷贝、赋值、析构、交换，并提供 `parse` 与 `format`；标准不要求继承任何 formatter。
- 继承或组合标准 formatter 的用途是复用格式说明符的解析。输出本质是字符串、并且确实要支持 `{:>10}`、`{:.3}` 这类字符串语法时才值得；`Position` 是最底层的坐标类型，把两个整数拼成 `(row, col)`，输出不是字符串值，继承 `formatter<std::string_view>` 只会让字符串说明符被接受，而 `format` 仍要自己拼文本。
- `Player` 与 `Move` 也不需要继承：`Player` 输出 `X`/`O` 符号，继承 `formatter<int>` 只会放宽可接受的说明符，输出仍由本类的 `format` 决定；`Move` 用 `"{}{}"` 组合 `Player` 与 `Position` 的 formatter。
- 现实中继承也确实在用：fmt 文档的 `formatter<color> : formatter<string_view>` 让 `parse` 转调基类、`format` 复用基类输出，只用于「输出是字符串」的类型，不是通用模板。
- 需要复用时，组合与继承都能工作。组合把 `std::formatter<std::string_view> base;` 作为成员，`parse` 转调 `base.parse(ctx)`，`format` 先拼临时字符串再 `base.format(temp, ctx)`，不改变本类型的继承关系；标准草案 [format.formatter.spec] 的示例则直接继承 `formatter<const char*>`。继承标准库类型只当薄适配层，不把它当多态基类。
- `format` 写成 `const`；LWG 3636 之后这是要求。

依据：[P3070R2](https://wg21.link/P3070R2)、[P4267R0](https://wg21.link/P4267R0)、[fmt API](https://fmt.dev/latest/api/#formatting-user-defined-types)、[Abseil StrFormat](https://abseil.io/docs/cpp/guides/format)、[LLVM formatv](https://llvm.org/docs/ProgrammersManual.html#formatting-strings)。
