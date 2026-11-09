<!-- 读取时机：命名示例时；读完能回答：正反例：`current_` 前缀；预算：一次只开这一份（19 行），不自动串联。 -->
# 正反例：`current_` 前缀

**差**：

```cpp
Order current_order_;   // 只有一个订单时，current 是噪音
```

**好**：

```cpp
Order order_;
```

**该用**：

```cpp
Order current_order_;   // 有 current_order_ 与 next_order_，不写会混
```
