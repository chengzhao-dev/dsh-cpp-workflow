<!-- 读取时机：统一命名术语时；读完能回答：position 的写法；预算：一次只开这一份（23 行），不自动串联。 -->
# position 的写法

本文件是 `references/naming/01-identifier-names.md` 的附录，只讨论 `position` 这个词的写法；词表与加词流程见 [01-naming-terms.md](01-naming-terms.md)。

坐标参数、局部变量与公开数据成员都写完整名词，不按长短取舍。

| 语义 | 写法 | 依据 |
| --- | --- | --- |
| 标量下标或偏移 | 按语义写 `index` 或 `offset` | ISO C++ 草案 `basic_string::find` 的 `size_type pos` 是标准库历史写法，本项目按语义取名 |
| 坐标值 | 参数、局部变量与公开数据成员都写 `position` | 本项目统一 `const Position& position`、`Move::position` |
| 迭代器式位置对象 | `position` | ISO C++ 草案 `vector::insert(const_iterator position, const T& x)`、`vector::erase(const_iterator position)` |

- `Position` 是坐标值，不是迭代器；参数与局部变量的写法见 [01-identifier-names.md](../01-identifier-names.md) 的参数条。
- 完整词是主流：SFML 写 `setPosition(const Vector2f& position)`，Godot 与 Unity 的属性叫 `position`，Unreal 用 `Location`；本项目统一采用完整词。
- 不采用的缩写：`pos`（`position` 的截短）、`pt`（point 是类型）、`loc`（编译器语境指 `source_location`）、`coord`（偏数学分量）、`idx`（index 语义不同）。

## 依据

- ISO C++ `[string.find]`：https://eel.is/c++draft/string.find
- ISO C++ `[vector.modifiers]`：https://eel.is/c++draft/vector.modifiers
- libstdc++ `basic_string.h`：https://github.com/gcc-mirror/gcc/blob/master/libstdc%2B%2B-v3/include/bits/basic_string.h
- Google C++ Style 命名规则：https://google.github.io/styleguide/cppguide.html#General_Naming_Rules
- SFML `Transformable`：https://github.com/SFML/SFML/blob/master/include/SFML/Graphics/Transformable.hpp
