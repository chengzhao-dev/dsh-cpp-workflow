<!-- 读取时机：查语言细节时；读完能回答：RAII、所有权与移动；预算：一次只开这一份（15 行），不自动串联。 -->
# RAII、所有权与移动

- 资源获取即初始化：用对象生存期管理内存、文件、锁、套接字；析构函数负责释放。
- 默认用 `std::unique_ptr<T>` 表达独占所有权；需要共享所有权时才用 `std::shared_ptr<T>`，并用 `std::weak_ptr` 打破循环。
- 不写裸 `new` / `delete`；需要动态数组时用 `std::vector`，需要单个对象时用 `std::make_unique`。
- 移动把资源从源对象转走；`std::move` 只是 `static_cast<T&&>`，本身不移动任何东西。标准只保证移动后的对象处于有效但未指定状态，智能指针通常为空，但不要依赖具体值。
- 移动后的对象只能重新赋值或销毁，不要读取它的值。
- 移动构造函数和移动赋值标记 `noexcept`，否则 `std::vector` 等容器在扩容时可能选择拷贝。
- 返回值直接 `return value;`，不要 `return std::move(value);`；后者阻止 RVO。

## 依据

- [ISO C++ `[class.copy.ctor]`](https://eel.is/c++draft/class.copy.ctor)：移动构造与移动赋值的语义、`noexcept` 与隐式生成。
- [cppreference: RAII](https://en.cppreference.com/w/cpp/language/raii)：资源生存期与异常安全。
- [C++ Core Guidelines: R.1](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-resource)：用 RAII 管理资源，避免裸 `new`/`delete`。
