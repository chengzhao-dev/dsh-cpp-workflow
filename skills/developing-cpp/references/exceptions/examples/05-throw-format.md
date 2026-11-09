<!-- 读取时机：抛异常或写异常契约时；读完能回答：正反例：`std::format` 与 `std::print`；预算：一次只开这一份（13 行），不自动串联。 -->
# 正反例：`std::format` 与 `std::print`

C++23 且标准库支持 `std::print` 时，程序入口或 CLI 可以写：

```cpp
std::print("任务: {}\n", task.name);
```

库代码、以及需要兼容 C++11–C++20 的代码仍写：

```cpp
std::cout << std::format("任务: {}\n", task.name);
```
