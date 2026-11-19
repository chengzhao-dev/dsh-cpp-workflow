<!-- 读取时机：统一命名术语时；读完能回答：电脑难度与对局模式的命名；预算：一次只开这一份（25 行），不自动串联。 -->
# difficulty：电脑难度与对局模式

`Difficulty` 是电脑策略的封闭档位，每档对应一种选择策略；档位数量与各档做法由项目决定。它与「双人还是人机」的 `GameMode` 分层：模式决定谁走，难度只决定电脑怎样走。

## 语义对照

| 语义 | 写法 | 例子 |
| --- | --- | --- |
| 电脑策略档位 | `Difficulty` + 档位枚举子 | `Difficulty::kNormal`、`Difficulty::kHard` |
| 对局模式 | `GameMode` + 模式枚举子 | `GameMode::kHumanVersusHuman`、`GameMode::kHumanVersusComputer` |
| 切换已有电脑的难度 | `Set` + 属性 | `SetDifficulty` |
| 按难度选择 | `Choose` + 对象 | `ChooseRandomPosition`、`ChooseBestPosition` |

## 取舍

- 有几档就写几个枚举子，不用 `bool`、整数或字符串；新增一档时补一个枚举子，并让 `switch` 覆盖全部值，不写 `default`。
- 不用把 `Computer` 与 `Strength` 拼起来的名字，也不用 `Level`、`Mode`：`Strength` 暗示连续强度，`Level` 暗示关卡，`Mode` 与 `GameMode` 撞词。
- 难度在电脑对象里，不写进 `Game`；规则层不知道电脑怎样选，换难度只改 `difficulty_`，不重新构造对象。
- 模式与难度分成两个枚举，不合并成 `Mode`；一个回答「谁走」，一个回答「电脑怎样走」，合并后调用点要猜。

## 依据

- 档位数、各档策略与枚举所在头文件是项目事实，写在项目技能里；本文件只约定类型名与分层。
- 选择类函数用 `Choose` 的规则见 [03-selection.md](03-selection.md)。
- 会话、选择与规则的边界见 [session-layer.md](../../design/session-layer.md)。
