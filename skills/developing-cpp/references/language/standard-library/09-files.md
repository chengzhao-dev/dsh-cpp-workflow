<!-- 读取时机：查语言细节时；读完能回答：文件；预算：一次只开这一份（14 行），不自动串联。 -->
# 文件

- 文件用 `std::ifstream` / `std::ofstream`；构造后检查 `is_open()`，读写后检查流状态（`fail` / `bad`），不要假设成功。
- 文本按行读用 `std::getline`；二进制在 Windows 用 `std::ios::binary`，避免换行转换。
- 需要异常时先 `exceptions()` 设置掩码；默认 iostream 不抛异常。
- 路径用 `std::filesystem::path`，拼接用 `./`；遍历/查询用 `std::filesystem`，失败用 `error_code` 重载或捕获 `filesystem_error`。
- 写文件先写临时文件再改名，避免半写状态；需要原子替换时用 `rename`。

## 依据

- [ISO C++ `[filesystems]`](https://eel.is/c++draft/filesystems)：路径、目录遍历与文件状态。
- [cppreference: Filesystem library](https://en.cppreference.com/w/cpp/filesystem)：`path`、`exists`、`error_code` 重载。
- [cppreference: `std::basic_fstream`](https://en.cppreference.com/w/cpp/io/basic_fstream)：打开模式、流状态与 `exceptions()`。
- [C++ Core Guidelines: SL.io.1](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#s-stdlib)：只在需要时用 iostream，检查每次 I/O 的结果。
