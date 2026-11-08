# position 与 pos

本文件是 `references/naming/identifier-names.md` 的附录，只讨论 `position` 这个词的写法；词表与加词流程见 [naming-terms.md](naming-terms.md)。

同一个词按语义分三种写法，不按长短取舍。

| 语义 | 写法 | 依据 |
| --- | --- | --- |
| 标量下标或偏移 | `pos` | ISO C++ 草案 `basic_string::find(const T& t, size_type pos = 0)`；libstdc++ 的 `basic_string` 内部统一用 `__pos` |
| 坐标值 | 参数、局部变量用 `pos`；公开数据成员用 `position` | Qt 的 `QPoint pos()` 与 `QWidget::move(const QPoint& pos)`；本项目 `Position pos`、`Move::position` |
| 迭代器式位置对象 | `position` | ISO C++ 草案 `vector::insert(const_iterator position, const T& x)`、`vector::erase(const_iterator position)` |

- `Position` 是坐标值，不是迭代器，所以参数写 `pos`；`Move::position` 是公开 API 的成员，作用域最大，写完整词。两者是同一条作用域原则（NL.7）的两端。
- 完整词同样是主流：SFML 写 `setPosition(const Vector2f& position)`，Godot 与 Unity 的属性叫 `position`，Unreal 用 `Location`。本项目按作用域取舍，不把它们当反例。
- 不采用的缩写：`pt`（point 是类型）、`loc`（编译器语境指 `source_location`）、`coord`（偏数学分量）、`idx`（index 语义不同）。

## 依据

- ISO C++ `[string.find]`：https://eel.is/c++draft/string.find
- ISO C++ `[vector.modifiers]`：https://eel.is/c++draft/vector.modifiers
- libstdc++ `basic_string.h`：https://github.com/gcc-mirror/gcc/blob/master/libstdc%2B%2B-v3/include/bits/basic_string.h
- Qt `QWidget`：https://code.qt.io/cgit/qt/qtbase.git/tree/src/widgets/kernel/qwidget.h
- SFML `Transformable`：https://github.com/SFML/SFML/blob/master/include/SFML/Graphics/Transformable.hpp
