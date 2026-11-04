# RAII、所有权与移动

- 资源获取即初始化：用对象生存期管理内存、文件、锁、套接字；析构函数负责释放。
- 默认用 `std::unique_ptr<T>` 表达独占所有权；需要共享所有权时才用 `std::shared_ptr<T>`，并用 `std::weak_ptr` 打破循环。
- 不写裸 `new` / `delete`；需要动态数组时用 `std::vector`，需要单个对象时用 `std::make_unique`。
- 移动是“把资源指针转走并置空源对象”的转换；`std::move` 只是 `static_cast<T&&>`，本身不移动任何东西。
- 移动后的对象处于有效但未指定状态；只能重新赋值或销毁，不要读取它的值。
- 移动构造函数和移动赋值标记 `noexcept`，否则 `std::vector` 等容器在扩容时可能选择拷贝。
- 返回值直接 `return value;`，不要 `return std::move(value);`；后者阻止 RVO。
