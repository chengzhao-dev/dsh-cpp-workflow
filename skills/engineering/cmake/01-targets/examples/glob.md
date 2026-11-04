# 正反例：GLOB

**差**：

```cmake
file(GLOB SOURCES "src/*.cpp")
add_executable(app ${SOURCES})
```

新增文件不触发重新配置；不同机器上的文件集合可能不同。

**好**：

```cmake
add_executable(app
  src/main.cpp
  src/task_list.cpp
  src/task_parser.cpp
)
```

显式列表，新增文件时改 CMake；diff 能看出变化。
