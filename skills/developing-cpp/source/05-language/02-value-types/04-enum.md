# 枚举类

`enum class` 定义封闭取值集合：

- 枚举值只在类型作用域内可见：`TaskState::kPending`，不写 `kPending`。
- 与整数之间不发生隐式转换；需要编号时写 `static_cast<int>(state)`，只用于输出或既有接口。
- 同类型值可以比较和赋值；不能参与算术。
- 需要固定布局时写底层类型。编号要在头文件里直接读到，就逐个写出来，不靠第一项默认为 0：`enum class TaskState : std::uint8_t { kPending = 0, kActive = 1, kDone = 2 };`

约定：

- 新代码用 `enum class`；unscoped `enum` 只用于兼容 C 接口，不作为默认写法。
- 封闭状态码默认写 `: std::uint8_t`；普通枚举用默认底层类型。
- 枚举值的行尾注释要么全写要么全不写；两种句式与禁止项见 `source/07-comments/01-comment-rules.md`「枚举项与 `struct` 短字段：两种句式」。
- 需要“编号”与“名字”两套表示时，写显式映射函数，例如 `TaskStateToName` / `TaskStateFromName`，不要在枚举和整数之间来回隐式转换。
- 编号按“失败优先”排：空状态或前置条件失败为 0，业务失败随后，成功放在最后。读取端因此可以先判 0，再决定是否继续。
- 编号只用于输出和既有接口；要从编号找回名字，仍走显式映射函数，不拿编号做算术。
