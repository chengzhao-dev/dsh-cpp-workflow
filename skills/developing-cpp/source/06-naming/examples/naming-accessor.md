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

查询统一 `Get` + PascalCase；修改用领域动词。只有真正需要替换值时，才考虑 `Set` 形式，并说明为什么不是动作。
