<!-- 读取时机：排版或工具配置时；读完能回答：clang-tidy 与静态检查门禁；预算：一次只开这一份（58 行），不自动串联。 -->
# clang-tidy 与静态检查门禁

## clang-tidy

```bash
clang-tidy -p build/clang \
  --header-filter="^$(pwd -P)/(include|src|app|tests)/" \
  --warnings-as-errors='*' \
  src/*.cpp app/*.cpp tests/*.cpp
```

- `-p` 指向当前编译器的构建目录，读取 `compile_commands.json`。
- `--header-filter` 控制哪些头文件的诊断被显示，不改变 clang-tidy 实际解析哪些头；模板实例化可能让一条根因产生多条警告，警告条数不等于缺陷条数。按根因修，不要按条数修。
- `--header-filter` 用项目头目录的白名单，不要用 `.*` 把系统头和第三方头一并纳入。clang-tidy 按绝对路径匹配，所以上面用 `$(pwd -P)` 前缀；上面是常见目录，工程用别的顶层目录时按实际替换。`--exclude-header-filter` 到 clang-tidy 19 才加入，16/17/18 都没有，不要依赖它。
- 系统头默认被排除，不要加 `--system-headers`。
- 只扫描项目源文件；不要把 `build/` 或第三方源码传给 clang-tidy。
- `--warnings-as-errors='*'` 把警告当失败；修代码，不要新增 `NOLINT`。确需抑制时写 `// NOLINT(检查名): 理由`，理由必须具体。
- 配置在工程根 `.clang-tidy`；默认集合是 `google-*`、`portability-avoid-pragma-once` 加 `readability-identifier-naming`（第二条去掉 `#pragma once`，与路径式守卫一致）。关闭某条时逐条写理由，不整族关闭；命名规则只配项目确实统一的项，不设 `FunctionCase`。
- 没有编译数据库时先回到 `building-cpp` 的定构建生成；不要用 `--` 手工拼编译参数绕过。
- `clang-tidy` 的诊断可能指向头文件；修头文件里的声明或实现，不要只改调用点。

## 门禁分级

`--warnings-as-errors='*'` 是默认门禁。若项目必须把一组诊断先设为观察项，按检查名逐条写进项目脚本，不按 `*` 整族降级：

| 级别 | 典型检查 | 处理 |
| --- | --- | --- |
| 失败 | `google-*`、`readability-identifier-naming`、项目声明的致命集 | 修代码；不允许用 NOLINT 掩盖 |
| 失败 | 编译诊断、链接诊断、格式检查 | 直接失败 |
| 观察 | 迁移期暂时无法修完的个别 `google-*` 子项 | 在项目技能里列清单、写负责人和退出条件；不默认全仓关闭 |

- 致命集宁可小、可解释，也不要把所有检查一刀切。
- 观察项不是免死金牌：新代码不应新增观察项，已有项只能减少。
- 关闭某条检查时，在 `.clang-tidy` 里写一行理由，并在项目技能里记录退出条件。

## 版本与一致性

- `clang-format` / `clang-tidy` ≥ 16；clang 模式下与 `clang++`、`clangd` 同主版本。
- 混版本常见症状：格式化结果与 CI 不同、clangd 诊断与 tidy 不一致、选项被静默忽略。
- 检查器在 `--live` 时核对版本；不要用「能跑就行」绕过。

## 失败分诊

| 现象 | 可能原因 | 处理 |
| --- | --- | --- |
| `clang-tidy` 报找不到编译数据库 | 没 configure 或路径错 | 回到 `building-cpp` 的定构建生成 `build/<compiler>/compile_commands.json` |
| clangd 报找不到系统头 | 编译数据库里的编译器是相对路径 | 用绝对路径重新 configure，或配 `--query-driver` |
| 格式化结果与 CI 不同 | 版本不同或配置不是工程根那份 | 统一版本，确认 `.clang-format` 在工程根 |
| tidy 报系统头 | 加了 `--system-headers` 或 header-filter 过宽 | 去掉 `--system-headers`，用项目头目录白名单 |
| 大量 `readability-*` | 代码风格未统一 | 回到 `developing-cpp` 的定声明 / 定实现修声明与实现，不要批量 NOLINT |
| clangd 与 tidy 诊断不一致 | 两者读的数据库/版本不同 | 统一 `CompilationDatabase` 与工具版本 |

## 依据

- [clang-tidy](https://clang.llvm.org/extra/clang-tidy/)：命令行、`-p` 与 `--warnings-as-errors`。
- [clang-tidy Checks](https://clang.llvm.org/extra/clang-tidy/checks/list.html)：`google-*`、`bugprone-*` 与 `readability-identifier-naming` 的语义。
- [Clang-Tidy: `.clang-tidy`](https://clang.llvm.org/extra/clang-tidy/#using-clang-tidy)：配置继承、`Checks` 与 `CheckOptions`。
- [Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)：Google 检查族的规则来源。
