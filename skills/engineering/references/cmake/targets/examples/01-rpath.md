<!-- 读取时机：配 CMake 或工具链时；读完能回答：正反例：共享库运行时路径；预算：一次只开这一份（24 行），不自动串联。 -->
# 正反例：共享库运行时路径

**差**：

```bash
LD_LIBRARY_PATH=build/clang/lib ./build/clang/bin/app   # 每次运行都要包一层
```

**好**：

```cmake
# LinkSettings.cmake 提供 RPATH 与 GoogleTest 依赖函数。
include(LinkSettings)

add_library(greeting SHARED greeting/src/greeting.cpp)
set_target_properties(greeting PROPERTIES
  LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")

add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE greeting)
LinkSettings_SetBuildRpath(app)
```

从 `build/<compiler>/bin/app` 直接启动即可找到同级 `../lib` 下的共享库；安装场景另配 RPATH。
