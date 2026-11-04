# 文件

- 文件用 `std::ifstream` / `std::ofstream`，构造后检查 `is_open()`；读写失败检查流状态，不假设成功。
- 路径用 `std::filesystem::path`；拼接用 `/` 运算符，不手工拼分隔符。
