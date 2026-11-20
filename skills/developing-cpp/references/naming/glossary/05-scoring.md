<!-- 读取时机：统一命名术语时；读完能回答：终局评分与搜索分的命名；预算：一次只开这一份（26 行），不自动串联。 -->
# scoring：终局评分与搜索分

终局评分若作为规则查询单独提供，写成 `ScoreFinishedGame(const Game&)`，返回 `int`；分数怎么定、读哪些字段、放在哪一层见 [session-layer.md](../../design/session-layer.md) 的终局评分条。独立评分查询是否提供由项目决定；不提供时就在搜索里按终局分支就地评分。

## 语义对照

| 语义 | 写法 | 例子 |
| --- | --- | --- |
| 已结束对局的分数 | `Score` + 终局对象 | `ScoreFinishedGame` |
| 叶节点估值 | `Score` + 状态 | `ScorePosition` |
| 搜索主函数 | 算法专名 | `Minimax` |
| 胜负本身 | 结果枚举 | `GameResult` |

## 取舍

- 名字以 `Score` 开头，说明返回分数而不是胜负；对象写 `FinishedGame`，与 `PlaceResult::kFinishedGame` 同词。
- 分数是搜索量，不保存进对局；同一局重复查询必须得到同一结果，函数不修改游戏。
- 不用把 `GameSession` 与 `Score` 拼起来的名字，也不用 `Evaluate`、`Heuristic`：前者把会话层词带进规则层，后两者不说明评的是终局还是中间状态。
- 对外接口只暴露结果与着法；评分函数可以是私有静态成员，测试通过公开着法间接验证。
- 搜索需要更大分数时，X 为正、O 为负；调用方按当前玩家取最大或最小，不另建两套评分。

## 依据

- 搜索内的评分是项目实现事实，写在项目技能里；本文件只约定名字与签名形状。
- 领域结果与查询的命名规则见 [01-identifier-names.md](../01-identifier-names.md)。
- 终局结果类型与落子结果的约定见 [06-move-result.md](../../design/examples/06-move-result.md)。
