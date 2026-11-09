<!-- 读取时机：命名示例时；读完能回答：正反例：局部名字；预算：一次只开这一份（45 行），不自动串联。 -->
# 正反例：局部名字

**差**：

```cpp
int moves = 0;
bool x_to_move = true;
int best = 0;
int value = 0;
bool undone = false;
bool better = false;
Game work = game;
```

**好**：

```cpp
int move_count = 0;
bool is_x_to_move = true;
int best_score = 0;
int score = 0;
bool is_undone = false;
bool is_better = false;
Game search_game = game;
```

局部名字先说明它是什么，再说明它在函数里扮什么角色：

| 差 | 好 | 理由 |
| --- | --- | --- |
| `moves` | `move_count` | 计数用单数名词加 `_count`，不用复数冒充容器 |
| `x_to_move` | `is_x_to_move` | 布尔用 `is_` / `has_` / `can_` 开头 |
| `best` | `best_score` | 同一份分数用同一个词，`best_score` 与 `score` 分工 |
| `value` | `score` | 泛名 `value` 看不出是哪一份值 |
| `undone` | `is_undone` | 布尔用 `is_` |
| `better` | `is_better` | 布尔用 `is_` |
| `work` | `search_game` | 副本写明用途，不写 `work` |
| `marks` | `line_values` | 容器按内容命名；这是一条线上的三个方格的值 |
| `target_mark` | `target_square_value` | 角色与类型都写进名字 |
| `frames` | `boards` | 容器里装的是 `Board` |
| `rule` | `separator` | 字符串的用途是分隔线，不是规则 |
| `LineResult` | `ReadResult` | 结果名跟读入动作，`Line` 已表示成线 |
| `OutcomeText` | `ResultText` | 跟 `GameResult` 用同一个词 |
| `human_moves` | `human_move_count` | 计数用 `_count`，不用复数 |
| `against_cpu` | `is_against_computer` | 布尔用 `is_`，对象写完整 `computer` |
