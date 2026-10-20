# 阶段表

每个阶段只写一项可观察行为：运行程序后，用户能看到或输入什么。内部重构不算阶段；行为没变就不加行。

| 阶段 | 可观察行为 | 验证方式 | 状态 |
| --- | --- | --- | --- |
| `<stage-1>` | `<one observable behavior>` | `<command or test name>` | `<planned / in-progress / done>` |
| `<stage-2>` | `<one observable behavior>` | `<command or test name>` | `<planned / in-progress / done>` |

## 写法

- 「可观察行为」用一句完整的话，包含输入与输出；例如「输入 1 到 9 的空格位置，棋盘显示对应的 X 或 O」。
- 「验证方式」写能重复执行的命令或测试名；不要写「手动看一下」。
- 状态只用 `planned` / `in-progress` / `done`，不要用百分比。
- 一行只对应一个行为；一个阶段要加两个行为就拆成两行。
