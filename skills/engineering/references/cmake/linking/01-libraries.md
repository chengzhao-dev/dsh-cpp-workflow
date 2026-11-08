# 链接与库边界

## 四个阶段

```text
预处理  ->  编译  ->  汇编  ->  链接  ->  加载运行
.i         .s / .o             可执行文件 / 库
```

- 预处理：展开 `#include`、宏和条件编译，得到翻译单元。头文件找不到在这一步失败。
- 编译：把翻译单元变成目标文件，做语法、类型和模板检查。函数体错误在这一步失败。
- 汇编：把汇编文本变成目标文件；通常由编译器驱动。
- 链接：把多个目标文件和库合并，解析符号引用。`undefined reference` 在这一步失败。
- 加载：程序启动时由动态加载器找到共享库；`error while loading shared libraries` 在这一步失败。

`g++ -c file.cpp` 只编译不链接；`g++ file.o -o app` 只链接。`-E` 只看预处理，`-S` 只看汇编。

## 头文件、声明与定义

- `#include` 是文本替换，不是模块导入；头文件只放声明、`inline` 定义、模板和 `constexpr` 定义。
- 普通函数的定义放 `.cpp`；在头文件里写非 `inline` 函数定义，多个翻译单元包含时会重复定义。
- 类定义放头文件；成员函数在类外定义时写 `ClassName::`，定义放 `.cpp`。
- 只用到声明时不要包含完整定义；前置声明可以减少编译依赖，但不能替代需要完整类型的场景（继承、成员对象、按值返回）。
- 每个头文件自包含：单独编译一个只包含该头文件的 `.cpp` 应通过。用路径式 `#define` 守卫防止重复包含，不用 `#pragma once`。

## 静态库与共享库

| 形式 | 产物 | 链接时机 | 运行期依赖 | 适用 |
| --- | --- | --- | --- | --- |
| 静态库 | `libname.a` | 链接时复制所需目标文件 | 无 | 分发简单、启动快、库小 |
| 共享库 | `libname.so` / `.dylib` / `.dll` | 链接时只记录依赖 | 运行时要能找到库 | 多程序共享、插件、独立升级 |

- 静态库不是“把源码打包”；它仍是多个目标文件的归档，链接器按需取用。
- 共享库的符号默认可能被导出；需要隐藏内部符号时设置可见性（`-fvisibility=hidden` + 显式导出）。
- 共享库的 ABI 包括类布局、虚表、标准库类型和编译器选项；不同编译器或 `-stdlib` 混用可能链接成功但运行崩溃。
- 一个项目里不要同时链接两套标准库（libstdc++ 与 libc++）；编译器、clangd、库和可执行文件必须一致。

## 构建脚本里的顺序

1. 配置：CMake 生成构建系统，导出编译数据库。
2. 编译 + 链接：构建所有 target。
3. 产物检查：确认 `bin/app`、`lib/`、编译数据库存在。
4. 运行：用项目入口命令启动，检查退出码和输出。
5. 测试：`ctest` 跑注册的测试。

不要用“链接成功”代替“运行成功”；也不要用“测试通过”代替“产物存在”。

## 检查清单

- [ ] 头文件自包含，普通函数定义不在头文件。
- [ ] 每个声明都有定义，且定义所在源文件加入 target。
- [ ] 静态库/共享库选择有理由，没有混用两套标准库。
- [ ] 产物在 `bin/` 与 `lib/`，RPATH 指向相对位置。
- [ ] `file` 与 `ldd` 检查过，程序能最小启动。

## 依据

- [CMake: `target_link_libraries`](https://cmake.org/cmake/help/latest/command/target_link_libraries.html)：链接依赖的传递与顺序。
- [CMake: `BUILD_SHARED_LIBS`](https://cmake.org/cmake/help/latest/variable/BUILD_SHARED_LIBS.html)：`add_library` 未写类型时的默认库类型。
- [CMake: `POSITION_INDEPENDENT_CODE`](https://cmake.org/cmake/help/latest/prop_tgt/POSITION_INDEPENDENT_CODE.html)：共享库与 PIE 的编译要求。
