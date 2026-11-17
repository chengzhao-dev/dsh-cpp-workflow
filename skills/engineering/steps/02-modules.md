# 第 2 步：定模块与函数

## 产出

一个可以重复导入的工程根 `cmake/` 模块，或一份明确不抽函数的理由。模块只定义函数，目标目录不再复制同一段配置；技能里的 `references/cmake/` 只是模板源，不是工程落点。

## 什么时候抽

- 同一段 CMake 在至少两个 target 或两个子目录重复出现，且语义已经稳定。
- 标准、警告、RPATH 这类横切规则需要一处升级、全仓生效。
- 逻辑有独立失败路径，需要 `message(FATAL_ERROR)` 把非法输入挡在 configure 阶段。

一次性三行属性、仍在频繁变化的实验片段、只服务一个 target 的私有设置不抽；等第二次真实复用再抽。

## 文件与命名

- 文件名用 UpperCamelCase、函数名用 snake_case；命名细则、模块划分与 `include_guard(GLOBAL)` 写法见 `../references/cmake/modules/01-functions.md`「文件布局」。
- 一个文件放一组语义相近的函数，不为每个函数建单独文件；文件过大或出现无关职责时再拆。

## 导入

根 `CMakeLists.txt` 在 `project()` 之后、`add_subdirectory()` 之前追加一次 `CMAKE_MODULE_PATH`，再 `include()` 需要的模块；子目录只调用函数，不再次导入。

## 契约

- 公开函数上方写官方文档块：`#[=======================================================================[.rst:` 开头，模块名与 `---` 标题线，命令用 `.. command::`，签名用 `.. code-block:: cmake`，块内散文写中文。
- 完整写法见 `../references/cmake/targets/01-target-rules.md`；签名留在 `function()` 那一行。
- 签名、警告等级与错误消息以 `../references/cmake/assets/` 和 `../references/cmake/modules/01-functions.md` 为准；本步不复制第二份。
- 普通函数只改传入 target 的属性，不写全局变量、不读环境变量、不下载依赖；唯一例外是 `fetch_googletest`，只在测试需要时调用。
- 先校验 target、可见性与标准，再调用 `target_*` 或 `set_target_properties`；失败用 `FATAL_ERROR`，消息带函数名与非法值。

## 退出

模块可被根文件导入且函数签名稳定后，进 `03-check.md` 跑 configure、构建与数据库核对。排版、4 空格缩进、120 列与文档块形态按 `../references/cmake/targets/01-target-rules.md`。
