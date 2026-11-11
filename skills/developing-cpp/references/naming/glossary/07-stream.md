<!-- 读取时机：统一命名术语时；读完能回答：流参数与成员写 input、output、diagnostics 还是 in、out、err；预算：一次只开这一份（20 行），不自动串联。 -->
# 流：input、output 与 diagnostics

本文件是 `references/naming/01-identifier-names.md` 的附录，只讨论输入、输出与诊断三个流的写法；词表与加词流程见 [01-naming-terms.md](01-naming-terms.md)。

流的参数与成员写完整词，不用 `in`、`out`、`err` 这类短名。

| 语义 | 写法 | 依据 |
| --- | --- | --- |
| 输入流 | `input`、`input_` | 与 `output` 成对，方向一眼可读；`in` 还常作介词，离开类型后容易误读 |
| 输出流 | `output`、`output_` | 与 `input` 对称，参数与成员使用同一个词根 |
| 诊断流 | `diagnostics`、`diagnostics_` | 项目把该流叫「诊断」；`error` 已指异常对象，`err` 会与它混读 |

- 这是 [01-identifier-names.md](../01-identifier-names.md) 中「类型已在签名里就用主流缩写」的例外：流的方向属于接口契约，不能因为类型已写出就省略词根。
- `[in]`、`[out]`、`[in,out]` 是 Doxygen 的方向标签，不是标识符，保持原样。
- 标准流仍写 `std::cin`、`std::cout`、`std::cerr`；`std::out_of_range`、`out of range` 等类型名或英文短语不适用本规则。

## 依据

- Google C++ Style Guide「General Naming Rules」：https://google.github.io/styleguide/cppguide.html#General_Naming_Rules
- 本项目 [design/session-layer.md](../../design/session-layer.md) 的会话流与 [comments/02-style.md](../../comments/02-style.md) 的「诊断」用词。
