<!-- 读取时机：查语言细节时；读完能回答：未定义行为与安全；预算：一次只开这一份（28 行），不自动串联。 -->
# 未定义行为与安全

以下行为没有标准结果，优化后可能表现为“有时对”；编译器可以假设它们不发生，把整段分支删掉。

- 数组/容器越界访问（`operator[]`、指针算术）。
- 解引用空指针或已释放对象（use-after-free、double free）。
- 读取未初始化变量。
- 有符号整数溢出。
- 数据竞争：多个线程无同步地读写同一对象。
- 用 `reinterpret_cast` 把对象当无关类型访问，违反严格别名规则。
- 对象生存期结束后继续使用指针或引用。

工具：

- AddressSanitizer（ASan）查越界、use-after-free、double free。
- UndefinedBehaviorSanitizer（UBSan）查有符号溢出、空指针、对齐等问题。
- ThreadSanitizer（TSan）查数据竞争。
- `-Wall -Wextra -Wpedantic` 打开常用警告；不要靠关闭警告“修复”问题。

ASan/UBSan 有运行期开销，只在测试和排查时开；发布构建仍要保留编译器警告。

## 依据

- [ISO C++ `[intro.abstract]`](https://eel.is/c++draft/intro.abstract)：编译器只需模拟可观察行为，UB 不受约束。
- [cppreference: Undefined behavior](https://en.cppreference.com/w/cpp/language/ub)：常见 UB 与优化后果。
- [Clang AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)：越界、use-after-free、double free 的检测。
- [Clang UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)：有符号溢出、空指针、对齐等检查。
- [Clang ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html)：数据竞争检测。
