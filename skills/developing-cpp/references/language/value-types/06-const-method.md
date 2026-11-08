# 成员函数尾部的 `const`

```cpp
class TaskBoard {
 public:
  [[nodiscard]] TaskState GetTaskState(TaskId id) const;
  void SetTaskState(TaskId id, TaskState state);

 private:
  std::array<TaskState, kTaskCount> tasks_{};
};
```

- 尾部 `const` 承诺不修改实例自身；与参数上的 `const`、返回类型上的 `const`、局部变量的 `const` 各管一段。
- 查询型成员一律标尾部 `const`；修改型成员不标，误标会被编译器拒绝。
- 返回成员容器的只读视图时，返回 `const` 引用或按值返回；不要返回可变内部引用。
- `mutable` 只用于缓存、互斥量等“逻辑 const”场景，并在注释里写理由；不要用它绕过正常的 const 设计。

## 依据

- Google C++ Style, Use of `const`：成员函数不修改对象时就标 `const`。https://google.github.io/styleguide/cppguide.html#Use_of_const
- cppreference 成员函数：尾部 `const` 限定符与重载规则。https://en.cppreference.com/w/cpp/language/member_functions
