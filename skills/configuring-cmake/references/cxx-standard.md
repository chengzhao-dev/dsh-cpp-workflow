# C++ 标准与 CMake

目标：一个 target 只声明一个标准，声明在 target 上，编译数据库里的实际参数与声明一致。

## 两层声明

CMake 有两套相关机制，必须同时写：

- `target_compile_features(target visibility cxx_std_NN)`：声明目标至少需要该标准。它是 meta-feature，编译器默认标准更高时可能不产生 `-std=`；只写这一项，不能保证实际使用哪个标准。
- `CXX_STANDARD NN` + `CXX_STANDARD_REQUIRED ON` + `CXX_EXTENSIONS OFF`：把请求标准写死，禁止不可用时静默降级，并关闭 `gnu++NN` 扩展。

| `standard` | meta-feature | `CXX_STANDARD` | `__cplusplus` | CMake 最低版本 |
| --- | --- | --- | --- | --- |
| `c++11` | `cxx_std_11` | `11` | `201103L` | 3.1 |
| `c++14` | `cxx_std_14` | `14` | `201402L` | 3.1 |
| `c++17` | `cxx_std_17` | `17` | `201703L` | 3.8 |
| `c++20` | `cxx_std_20` | `20` | `202002L` | 3.12 |
| `c++23` | `cxx_std_23` | `23` | `202302L` | 3.20 |

`cxx_std_23` 与 `CXX_STANDARD 23` 都要求 CMake 3.20；工程 `cmake_minimum_required` 低于该版本时先升最低版本，不要悄悄降到 C++20。

## 通用函数

`assets/cmake/CompileSettings.cmake` 提供：

```cmake
CompileSettings_SetCxxStandard(app PRIVATE c++23)
CompileSettings_SetCxxStandard(greeting PUBLIC c++20)
```

第一个参数是已由 `add_library` 或 `add_executable` 创建的目标，第二个是 `PUBLIC` / `PRIVATE` / `INTERFACE`，第三个是 `c++11`–`c++23`。函数内部做三步：校验目标与参数，调用 `target_compile_features`，再设置 `CXX_STANDARD` 三属性。

扩展新标准时改函数里的 `supported_standards` 与错误提示；不要在目标目录复制第二份三属性。

## 可见性

- 库的公共接口需要该标准时用 `PUBLIC`，链接者自动继承。
- 程序、测试、实现文件用 `PRIVATE`。
- `INTERFACE` 只用于纯头文件 target；不要用它绕过「标准应写在有源文件的目标上」。
- `target_compile_features` 重复调用会追加特性；同一目标不要同时写两个不同标准。

## 常见错误

| 写法 | 问题 |
| --- | --- |
| 只写 `target_compile_features(... cxx_std_23)` | 编译器默认更高时可能不加 `-std`，实际标准不可见 |
| 只写 `CXX_STANDARD 23`，不写 `CXX_STANDARD_REQUIRED` | 编译器不支持时静默降级 |
| 不写 `CXX_EXTENSIONS OFF` | 得到 `-std=gnu++23`，用了非标准扩展 |
| 用 `CMAKE_CXX_STANDARD` 全局设一次 | 所有 target 被同一个值绑住，无法按组件降档 |
| 在 `CMAKE_CXX_FLAGS` 里手写 `-std=c++23` | 与 target 属性冲突，数据库不可信 |
| 把 `cxx_std_23` 写成 `cxx_std_2023` | meta-feature 名字错误，configure 失败 |

## 验证

configure 后读 `build/<compiler>/compile_commands.json`，取最后一条 `-std=`：

```bash
grep -o -- '-std=[^ ]*' build/clang/compile_commands.json | sort -u
```

输出必须只有一条，且等于 `-std=c++NN`；出现 `gnu++NN`、两条不同值或没有 `-std=` 都回第 1 步。`CXX_STANDARD_REQUIRED ON` 与 `CXX_EXTENSIONS OFF` 同时存在时，主流编译器会给出精确的 `-std=c++NN`；仍以数据库为准，不靠猜。

## 官方依据

- [`target_compile_features`](https://cmake.org/cmake/help/latest/command/target_compile_features.html)：meta-feature、scope 与追加语义。
- [`CXX_STANDARD`](https://cmake.org/cmake/help/latest/prop_tgt/CXX_STANDARD.html)：支持值、3.20 起支持 23、`CXX_STANDARD_REQUIRED` 与 `CXX_EXTENSIONS`。
- [`cmake-compile-features(7)`](https://cmake.org/cmake/help/latest/manual/cmake-compile-features.7.html)：meta-feature 的「至少」语义与编译器默认标准。
