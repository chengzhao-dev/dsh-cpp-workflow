<!-- 读取时机：查语言细节时；读完能回答：检查清单；预算：一次只开这一份（11 行），不自动串联。 -->
# 检查清单

- [ ] 初始化方式统一，窄化转换被编译器拦住（`02-initialization.md`）。
- [ ] `auto` 只出现在类型显然的局部变量；公共接口有显式类型（`03-deduction.md`）。
- [ ] 共享常量用 `inline constexpr`，没有宏常量（`04-const.md`）。
- [ ] 局部变量不加 `const`；`const` 用在参数、成员函数与只读视图上（`04-const.md`）。
- [ ] 比较不是 Yoda 形式；成员与参数比较时成员状态在左、参数在右；混合优先级有括号（`05-expressions.md`、`../value-types/08-comparison.md`）。
- [ ] 枚举全覆盖的 `switch` 不写 `default`，单行 `case` 无花括号，出口在 `switch` 后（`../value-types/04-enum.md`）。
- [ ] 资源由 RAII 管理，没有裸 `new` / `delete`（`08-raii.md`）。
- [ ] 特殊成员声明与定义位置正确，移动操作 `noexcept`（`07-classes.md`）。
- [ ] 模板约束用概念表达，定义在头文件（`09-templates.md`）。
