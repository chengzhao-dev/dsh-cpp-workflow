<!-- 读取时机：配 CMake 或工具链时；读完能回答：输出目录与 RPATH；预算：一次只开这一份（24 行），不自动串联。 -->
# 输出目录与 RPATH

推荐布局：

```text
build/<compiler>/
    bin/app
    lib/libgame.so
    compile_commands.json
```

- 可执行文件在 `bin/`，共享库在 `lib/`；不要把库和可执行文件混在同一层。
- 运行时动态加载器默认不搜索可执行文件旁边的 `lib/`；需要 RPATH：
  - Linux：`-Wl,-rpath,'$ORIGIN/../lib'`
  - macOS：`-Wl,-rpath,@loader_path/../lib`
- CMake 用 `BUILD_RPATH` / `INSTALL_RPATH` 设置，不要手工拼链接命令；见 [`LinkSettings.cmake`](../assets/LinkSettings.cmake)。
- `$ORIGIN` 的转义、`BUILD_RPATH_USE_ORIGIN` 与设置位置只有一份权威：`../targets/01-target-rules.md` 的「共享库运行时路径」节，本文件不重复。

## 依据

- [CMake: `BUILD_RPATH`](https://cmake.org/cmake/help/latest/prop_tgt/BUILD_RPATH.html)：构建树中的运行时搜索路径。
- [CMake: `INSTALL_RPATH`](https://cmake.org/cmake/help/latest/prop_tgt/INSTALL_RPATH.html)：安装后的运行时搜索路径。
- [CMake: `BUILD_RPATH_USE_ORIGIN`](https://cmake.org/cmake/help/latest/prop_tgt/BUILD_RPATH_USE_ORIGIN.html)：用 `$ORIGIN` 生成相对 RPATH。
- [Linux `ld.so(8)`](https://man7.org/linux/man-pages/man8/ld.so.8.html)：`$ORIGIN` 与 RPATH 的展开规则。
