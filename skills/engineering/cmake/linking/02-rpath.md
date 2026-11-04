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
- RPATH 里的 `$ORIGIN` 要防止被 shell 展开：CMake 字符串里写 `\$ORIGIN` 或使用 `BUILD_RPATH_USE_ORIGIN`。
