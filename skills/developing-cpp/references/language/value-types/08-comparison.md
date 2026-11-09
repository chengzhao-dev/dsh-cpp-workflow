<!-- 读取时机：查语言细节时；读完能回答：比较运算符；预算：一次只开这一份（10 行），不自动串联。 -->
# 比较运算符

- 默认比较只给调用方真的会比较的值类型：`Position`、`Move` 这类坐标与记录可以默认比较；`Board` 这类实体在正常流程里不比较，不因为成员可比较就提供 `operator==`。测试要比较实体时，逐格或逐字段比较它的可观察状态，不把比较运算符加进生产接口。
- 签名与 `[[nodiscard]]` 规则见上一节。

## 标准与推荐

- ISO C++ `[class.compare.default]`：默认 `operator==` 与 `operator<=>` 的逐成员语义。https://eel.is/c++draft/class.compare.default
- ISO C++ `[expr.eq]`：相等比较的类型与结果规则。https://eel.is/c++draft/expr.eq
- 需要排序或三路比较时写 `auto operator<=>(const T&) const = default;`，不要手写四个关系运算符；默认的 `<=>` 会同时隐式声明默认的 `==`（`!=` 再由 `==` 改写），只有自己手写 `<=>` 时才要单独提供 `==`。默认 `<=>` 的推导类型 `std::strong_ordering` 来自 `<compare>`，使用前先包含它。只给真正会比较的值类型提供比较，实体类不因成员可比较就获得比较运算符。https://en.cppreference.com/w/cpp/language/operator_comparison
