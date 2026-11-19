<!-- 读取时机：抛异常或写异常契约时；读完能回答：正反例：边界；预算：一次只开这一份（15 行），不自动串联。 -->
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

**好**：库让异常向上传播，入口统一翻译成用户可读的诊断：`main` 调 `Run`，捕获 `std::exception` 后打印一行、返回非零；退出码由项目入口合同决定。完整代码见 `references/exceptions/01-exception-rules.md` 的「程序入口」，这里只示范职责边界。
