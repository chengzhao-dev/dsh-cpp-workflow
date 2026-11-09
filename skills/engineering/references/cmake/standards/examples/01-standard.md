<!-- 读取时机：配 CMake 或工具链时；读完能回答：正反例：标准只写一半；预算：一次只开这一份（19 行），不自动串联。 -->
# 正反例：标准只写一半

**差**：

```cmake
target_compile_features(app PRIVATE cxx_std_20)
# 没写 CXX_STANDARD_REQUIRED；编译器不支持时可能静默降级
set_target_properties(app PROPERTIES CXX_STANDARD 20)
```

问题：meta-feature 只保证“至少”，`CXX_STANDARD` 又允许静默降级，实际标准可能不是 20。

**好**：

```cmake
CompileSettings_SetCxxStandard(app PRIVATE c++20)
```

两套声明同时写；`CXX_STANDARD_REQUIRED ON` 禁止降级，`CXX_EXTENSIONS OFF` 把 `gnu++20` 收成 `c++20`。
