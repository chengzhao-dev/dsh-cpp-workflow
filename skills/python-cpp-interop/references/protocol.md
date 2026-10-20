# 带版本的 JSON 行协议

Python 与 C++ 之间最稳的边界是“一行一个 JSON 对象”的文本协议。它不依赖 ABI、可跨平台、可被日志和测试直接读取。

## 字段

一个最小快照：

```json
{"version":1,"sequence":7,"cells":["X","O"," "," ","X"," "," "," ","O"],"player":"O","status":"in_progress"}
```

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| `version` | 整数 | 当前协议版本；不兼容变更必须升版本 |
| `sequence` | 整数 | 从 0 或 1 开始，严格递增；重复/倒退是协议错误 |
| `cells` | 数组 | 固定长度；元素属于封闭集合；空格表示空位 |
| `player` | 字符串 | 当前行动方，属于封闭集合 |
| `status` | 字符串 | `in_progress` / 某方获胜 / `draw` 等封闭集合 |
| `winner` | 字符串，可选 | 仅终局出现；与 `status` 一致 |

- 字段名、状态字符串、空位表示一旦发布就不改含义；需要改时升 `version`。
- 不把颜色、按钮文案、终端提示放进快照；这些属于适配层。
- 不把整个棋盘对象序列化成嵌套结构；扁平、固定长度更容易校验。
- 数值字段用 JSON number，不用字符串；布尔用 `true` / `false`，不用 `0` / `1`。

## 输出规则

- 每条快照单独一行，行内不换行；行尾 `\n`。
- stdout 只放快照；人类可读提示写 stderr，或写不带 `{` 前缀的独立行。
- 日志、调试输出、编译器警告都不能混进快照流；需要时写 stderr。
- 一行写完立即 flush，否则 Python 的按行读取会阻塞。
- 程序退出时输出最后一条终局快照（如果适用），然后正常退出；不要用非零退出码表示“游戏结束”。

## 输入规则

一次性模式：

```text
<命令 1>
<命令 2>
...
```

长会话模式：

```text
<命令>
<等待快照>
<命令>
<等待快照>
```

- 命令格式要显式：`move 1 2`、`new`、`quit`，不要依赖“看到提示再猜下一步”。
- 每个命令有明确回应：至少一条快照，或一条错误快照。
- 未知命令返回错误快照并保持会话可继续；不要直接崩溃。
- 输入结束（EOF）是正常关闭信号；C++ 端读到 EOF 后清理并退出。

## 错误

错误也用 JSON，不混在正常快照里：

```json
{"version":1,"sequence":8,"error":{"code":"invalid_move","message":"位置已被占用"}}
```

- `code` 是稳定的机器可读值；`message` 是给人看的文本，可以本地化。
- 可预期错误（非法输入、位置被占）用错误快照；程序缺陷导致的崩溃写 stderr 并以非零退出。
- Python 端把错误码映射为异常或返回值，不解析 `message` 做逻辑判断。

## Python 解析

```python
import json

def parse_snapshot(line: str) -> dict:
    data = json.loads(line)
    if not isinstance(data, dict):
        raise ValueError("快照必须是 JSON 对象")
    if data.get("version") != 1:
        raise ValueError(f"不支持的协议版本: {data.get('version')!r}")
    sequence = data.get("sequence")
    if not isinstance(sequence, int) or isinstance(sequence, bool):
        raise ValueError("sequence 必须是整数")
    cells = data.get("cells")
    if not isinstance(cells, list) or len(cells) != 9:
        raise ValueError("cells 必须是长度 9 的数组")
    if any(cell not in {"X", "O", " "} for cell in cells):
        raise ValueError("cells 含非法值")
    if data.get("player") not in {"X", "O"}:
        raise ValueError("player 非法")
    if data.get("status") not in {"in_progress", "x_wins", "o_wins", "draw"}:
        raise ValueError("status 非法")
    return data
```

- 先验证类型再取字段；Python 的 `bool` 是 `int` 子类，序列号要显式排除 `bool`。
- 序列号严格递增由读取循环检查，不由单条解析函数检查。
- 解析失败抛 `ValueError`，带上原始行或截断后的行，方便定位。
- 不用 `eval`、不用 `pickle` 解析外部输入。

## 版本演进

- 加可选字段：保持 `version` 不变，旧解析器忽略未知字段。
- 改字段含义、删字段、改状态集合：升 `version`，旧解析器拒绝并给出清晰错误。
- 同时支持两个版本时，解析器按 `version` 分派；不要在一个函数里堆条件。
- 协议文档与 C++ 写入端放在同一个仓库；字段变更时两边一起改，测试覆盖旧版本拒绝。

## 测试

- 正常序列：快照数量、序列号、终局状态。
- 非法版本、非法 `cells` 长度、非法状态、非递增序列。
- 空输入、只有一条命令、超长行、带 CRLF 的输入。
- 错误快照后会话仍可继续。
- 超时与进程提前退出。

测试用 `unittest`，每个测试独立启动进程；不要依赖上一个测试留下的状态。

## 检查清单

- [ ] 每条快照有 `version` 和严格递增的 `sequence`。
- [ ] stdout 只有快照或明确标记的快照行，日志在 stderr。
- [ ] 字段类型和取值集合在 Python 端完整校验。
- [ ] 错误有稳定 `code`，不只靠人类文本。
- [ ] 版本变更规则写清楚，旧版本会被拒绝而不是误读。
- [ ] 测试覆盖非法输入、非递增序列、超时和提前退出。
