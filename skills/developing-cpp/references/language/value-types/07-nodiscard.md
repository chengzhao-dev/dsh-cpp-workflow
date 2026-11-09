<!-- 读取时机：查语言细节时；读完能回答：`[[nodiscard]]`；预算：一次只开这一份（15 行），不自动串联。 -->
# `[[nodiscard]]`

- 只给“结果携带信息、忽略会出错”的函数：查询型 `const` 成员与返回结果对象的 API。
- 不给所有非 `void` 函数机械添加；标注的价值来自稀缺。
- 写法位置：`[[nodiscard]]` 在返回类型前面，然后才是 `static` 或 `constexpr`；参数列表之后才是 `const`、`override`、`noexcept`。
- 类内 `friend` 不加 `[[nodiscard]]`：Clang 拒绝 `[[nodiscard]] friend`、`friend [[nodiscard]]` 和参数列表后的 `[[nodiscard]]`。不要再猜下一种写法。
- 运算符不加 `[[nodiscard]]`，成员与 `friend` 都一样。比较的参数不具名：成员写 `bool operator==(const T&) const = default`，`friend` 写 `friend bool operator==(const T&, const T&);`；注释不给这个不具名参数写 `@param`。
- 不要用 `static_cast<void>` 丢弃 `[[nodiscard]]` 的结果：先接住返回值并分支，把失败分支写出来；不能处理的失败说明接口或合同有问题，不是转换能解决的。测试里验证抛异常时，用 `[[maybe_unused]]` 的局部变量接住，不要用 `static_cast<void>` 跳过约定。
- 测试里验证“必须处理结果”时，同时验证忽略能被编译器发现。

## 依据

- ISO C++ `[dcl.attr.nodiscard]`：`[[nodiscard]]` 的位置与可应用的对象。https://eel.is/c++draft/dcl.attr.nodiscard
- cppreference `[[nodiscard]]`：函数、类与枚举上的用法。https://en.cppreference.com/w/cpp/language/attributes/nodiscard
- 本项目的 Clang 验证（C++23）：类内 `[[nodiscard]] friend`、`friend [[nodiscard]]`、参数列表后的写法都会被拒绝；类内只有返回类型前的普通函数声明可加。类声明本身在 C++17 起可标 `[[nodiscard]]`，构造函数在 C++20 起可标。不要把“能编译”当成标准保证。
