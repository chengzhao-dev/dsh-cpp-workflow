# 正反例：名字与职责

**差**：

```cpp
class DataManager {};     // 管什么？
class StringHelper {};    // 为什么是类？
```

**好**：

```cpp
class Warehouse {};       // 持有库存，维持不变量
namespace string_utils {  // 一组自由函数
[[nodiscard]] std::string Trim(std::string_view text);
}
```

避免 `Manager`、`Helper`、`Util`；名字要能回答「它负责什么」。一组无状态函数用命名空间，不要造类。
