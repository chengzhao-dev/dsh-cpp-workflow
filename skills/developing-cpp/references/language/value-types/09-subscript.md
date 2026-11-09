<!-- 读取时机：查语言细节时；读完能回答：下标与 `at`；预算：一次只开这一份（15 行），不自动串联。 -->
# 下标与 `at`

同一容器上，`operator[]` 与 `at` 的失败方式不同：

| 族 | 容器 | `[]` 越界 | `at` 越界 |
| --- | --- | --- | --- |
| 按下标 | `array`、`vector`、`deque`、`string`、`string_view` | 未定义行为 | 抛 `std::out_of_range` |
| 按键 | `map`、`unordered_map` | 缺键则插入默认值 | 缺键则抛 `std::out_of_range` |
| 无下标 | `set`、`unordered_set`、`multimap` | 无 `operator[]` / `at` | — |

- 默认用 `at()`，越界时抛出 `std::out_of_range`，而不是未定义行为；只有调用点已经证明下标合法、并且这条路径对性能敏感时，才用 `[]`，同时保留证明依据。坐标类型不拥有容器区间；区间判断属于持有尺寸的类型（如 `Board::IsInRange`）。`std::span` 在 C++20 没有 `at`，`span::at` 到 C++26 才进入标准。
- 已经证明非负的坐标在 `[]` 前收成 `std::size_t`：写 `static_cast<std::size_t>(index)`，不要先转成 `int`；默认仍用 `at()`，只有选择 `[]` 时才做这一步。
- 行列下标是乘加结果时，先把各操作数拓宽再乘加，不要先乘加再转换；见 `references/language/value-types/03-integer-roles.md`。
- `map::operator[]` 会插入，不是“读取可能缺失的键”；只读查询用 `find` / `contains` / `at`。
- 契约失败的消息用 `std::format`，见 `references/exceptions/01-exception-rules.md`。
