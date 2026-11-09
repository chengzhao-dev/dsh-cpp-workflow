<!-- 读取时机：配 CMake 或工具链时；读完能回答：验收：file 与 ldd；预算：一次只开这一份（20 行），不自动串联。 -->
# 验收：file 与 ldd

## 验收：`file` 与 `ldd`

链接成功不等于能运行。构建后检查产物：

```bash
file build/clang/bin/app
ldd build/clang/bin/app
```

- `file` 确认架构、位数、是否动态链接。
- `ldd` 确认每个共享库都能解析到实际路径；出现 `not found` 就是加载期会失败。
- 运行 `app` 做一次最小启动；动态库缺失会在启动时暴露，而不是链接时。
- macOS 用 `otool -L` 代替 `ldd`；Windows 用 `dumpbin /dependents`。

## 依据

- [`file(1)`](https://man7.org/linux/man-pages/man1/file.1.html)：识别文件格式、架构与位数。
- [`ldd(1)`](https://man7.org/linux/man-pages/man1/ldd.1.html)：动态库依赖解析与 `not found` 的含义。
