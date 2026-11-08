# 正反例：访问器

**差**：

```cpp
Order current_order() const;   // 成员名直接当函数名
void set_current_order(Order order);
```

**好**：

```cpp
[[nodiscard]] Order GetCurrentOrder() const;
void AdvanceOrder();             // 领域动作，不是 setter
```

Google 允许访问器与成员同名（`int count()`、`void set_count(int)`），本项目统一 `Get` + PascalCase，示例按本项目规则判为差。

查询统一 `Get` + PascalCase；修改用领域动词。只有真正需要替换值时，才考虑 `Set` 形式，并说明为什么不是动作。

返回集合时给只读视图，接口不绑定内部容器：

```cpp
/// 获取落子历史。
///
/// @return 只读视图，按落子先后排列，不复制落子记录。
[[nodiscard]] std::span<const Move> GetHistory() const;   // 不写 const std::vector<Move>&
```
