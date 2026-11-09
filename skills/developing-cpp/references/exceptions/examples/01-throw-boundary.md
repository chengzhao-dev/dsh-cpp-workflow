<!-- 读取时机：抛异常或写异常契约时；读完能回答：正反例：边界；预算：一次只开这一份（28 行），不自动串联。 -->
# 正反例：边界

**差**：库代码捕获后打印并吞掉异常。

```cpp
void AddTask(Task task) {
  try {
    tasks_.push_back(task);
  } catch (const std::exception& error) {
    std::cout << error.what() << "\n";  // 库打印，且吞掉异常
  }
}
```

**好**：库让异常向上传播，入口统一翻译成用户可读的诊断。

```cpp
int main() {
  try {
    return Run(std::cin, std::cout);
  } catch (const std::exception& error) {
    std::cerr << std::format("错误: {}\n", error.what());
    return 1;
  }
}
```

退出码由项目入口合同决定；这里只示范「捕获、打印、非零返回」。
