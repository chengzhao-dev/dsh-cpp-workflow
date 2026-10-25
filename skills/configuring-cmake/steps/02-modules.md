# 第 2 步：定模块与函数

## 产出

一个可以重复导入的 `cmake/` 模块，或一份明确不抽函数的理由。模块只定义函数，目标目录不再复制同一段配置。

## 什么时候抽

- 同一段 CMake 在至少两个 target 或两个子目录重复出现，且语义已经稳定。
- 标准、警告、RPATH 这类横切规则需要一处升级、全仓生效。
- 逻辑有独立失败路径，需要 `message(FATAL_ERROR)` 把非法输入挡在 configure 阶段。

一次性三行属性、仍在频繁变化的实验片段、只服务一个 target 的私有设置不抽；等第二次真实复用再抽。

## 文件与命名

- 一个文件放一组语义相近的函数，不为每个函数建单独文件；文件过大或出现无关职责时再拆。
- 文件名用 UpperCamelCase，按职责命名，例如 `CompileSettings.cmake`、`LinkSettings.cmake`。
- 函数名用 `<ModuleName>_` 加 PascalCase，例如 `CompileSettings_SetCxxStandard`；前缀取模块文件名的原样大小写，复制到工程后不改名。
- 工程自己新增、不准备回流的函数才用项目前缀加 snake_case。
- 模块开头写 `include_guard(GLOBAL)`，避免重复导入时重定义函数。

## 导入

根 `CMakeLists.txt` 在 `project()` 之后、`add_subdirectory()` 之前追加一次 `CMAKE_MODULE_PATH`，再 `include()` 需要的模块。子目录只调用函数，不再次导入。

## 契约

- 公开函数上方写中文 `#` 契约：一句功能、空行、边界，再用 `:param` / `:keyword` 标参数；不写 `#[[.rst:` 与 `.. command::`。
- 完整写法见 `references/cmake.md`；签名留在 `function()` 那一行。
- 签名、警告等级与错误消息以 `assets/cmake/` 和 `references/modules.md` 为准；本步不复制第二份。
- 普通函数只改传入 target 的属性，不写全局变量、不读环境变量、不下载依赖；唯一例外是 `LinkSettings_FetchGoogleTest`，只在测试需要时调用。
- 先校验 target、可见性与标准，再调用 `target_*` 或 `set_target_properties`；失败用 `FATAL_ERROR`，消息带函数名与非法值。

## 退出

模块可被根文件导入且函数签名稳定后，进 `steps/03-check.md` 跑 configure、构建与数据库核对。排版、2 空格与注释形态按 `references/cmake.md`。
