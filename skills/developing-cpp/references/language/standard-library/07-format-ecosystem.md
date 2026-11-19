<!-- 读取时机：查语言细节时；读完能回答：std::format 的生态、提案与 fmt 关系；预算：一次只开这一份（22 行），不自动串联。 -->
# 格式化的标准与生态

## 标准与提案

- C++20 引入 `std::format` 与 `std::formatter`；标准库为字符、字符串、整数、浮点、指针与 `nullptr` 等提供 enabled 特化，没有枚举。`formatter<T>` 默认 disabled；自定义类型必须特化。
- C++23 增加 `std::to_underlying`（`<utility>`，等价 `static_cast<std::underlying_type_t<Enum>>`）；字符串与字符的格式说明增加 `?` 调试表示；仍然没有枚举的内建 formatter。
- P3070R2 提议 `format_as` 作为枚举的 ADL 扩展点：`auto format_as(film f) { return std::to_underlying(f); }`，也可返回 `std::string_view`；在 type erasure 前转换，提案给出的测量约为 2× 快。尚未进入标准；fmt 已支持。
- P4267R0 用 C++26 reflection/annotations 提议 `[[=std::format_as_underlying]]` 与 `[[=std::format_as_identifier]]`，替代 `format_as`；尚未进入标准。
- fmt：`format_as` 或特化 `formatter`；`fmt::underlying(enum)`；推荐复用已有 formatter（继承/组合）。
- Abseil `StrFormat`：`%d`/`%i` 直接接受枚举，`%v` 用 `AbslStringify`。
- LLVM `formatv`：自定义用 `format_provider<T>` 特化；文档没有给出枚举专用入口。
- 结论：C++23 项目继续用 `std::formatter` 特化；数值回退与是否继承 `formatter<std::string_view>` 的写法见 `06-format.md`。

## fmt 与 `std::format` 的关系

- `std::format` 的接口来自 fmt 作者主导的 P0645，格式串语法与格式化语义同源；读 fmt 文档能直接解释标准库的行为。
- fmt 是超集：C++23 之前就提供 `print`/`println`、`memory_buffer`、命名参数与运行期格式串；标准库到 C++23 才补上 `std::print`，其余仍没有。
- 环境声明的标准是 C++23、工具链的 `std::format` 可用时，不引入第三方依赖；fmt 只作为参考实现出现在阅读清单里。
- 只有工具链停在 C++20 及更早、或确实要用 fmt 专有接口时才换成 `fmt::format`。
- 换 fmt 要同时改构建（`target_link_libraries` 或 FetchContent）与编译数据库；只放头文件不接构建，clangd 仍会报未声明。

依据：[P3070R2](https://wg21.link/P3070R2)、[P4267R0](https://wg21.link/P4267R0)、[fmt API](https://fmt.dev/latest/api/#formatting-user-defined-types)、[Abseil StrFormat](https://abseil.io/docs/cpp/guides/format)、[LLVM formatv](https://llvm.org/docs/ProgrammersManual.html#formatting-strings)。
