# CMake 模块与函数

目标：同一段构建逻辑只有一份权威，函数可导入、可校验、可测试，目标目录只表达差异。

## 何时抽

抽函数的条件是「已经真实复用」或「需要统一校验」，不是「看起来可以复用」：

- 至少两个 target 或两个子目录重复同一段语义，并且这段语义已经稳定。
- 标准、警告、RPATH 这类横切规则需要一处升级、全仓生效。
- 逻辑有独立失败路径，需要 `message(FATAL_ERROR)` 把输入错误挡在 configure 阶段。

一次性三行属性、仍在频繁变化的实验代码、只服务一个 target 的私有设置不抽；等第二次复用出现再抽。

## 文件布局

```text
project/
  CMakeLists.txt
  cmake/
    CompileSettings.cmake
    LinkSettings.cmake
  component/
    CMakeLists.txt
  apps/
    CMakeLists.txt
```

- 一个文件放一组语义相近的函数，不为每个函数建单独文件；文件过大或出现无关职责时再拆。
- 文件名用 UpperCamelCase，与 CMake 官方 `Modules/` 一致；按职责命名，例如 `CompileSettings.cmake`、`LinkSettings.cmake`。不用 kebab-case，也不用现在分词。
- 函数名用 `<ModuleName>_` 加 PascalCase：`CompileSettings_SetCxxStandard`、`LinkSettings_FetchGoogleTest`。前缀取模块文件名的原样大小写，复制到工程后不改名。
- 工程自己新增、不准备回流的函数才用项目前缀加 snake_case，例如 `my_project_do_something`。
- 只有项目真的需要时才建 `cmake/`；一个函数都没有时不建空目录。

## 导入

根 `CMakeLists.txt` 在 `project()` 之后、`add_subdirectory()` 之前：

```cmake
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
include(CompileSettings)
```

- `CMAKE_MODULE_PATH` 只在根追加一次。
- 子目录只调用函数，不重复 `include()`；重复导入靠模块里的 `include_guard(GLOBAL)` 兜底。
- 模块名与文件名一致；改名时全仓搜索旧 `include()` 与旧函数名。
- 不使用 `include()` 执行有副作用的脚本；模块只定义函数。

## 函数契约

```cmake
include_guard(GLOBAL)

function(CompileSettings_SetCxxStandard target visibility standard)
  if(NOT TARGET ${target})
    message(FATAL_ERROR "目标 ${target} 尚未创建")
  endif()
  # 校验 visibility 与 standard，再设置 target 属性。
endfunction()

# 同一文件的第二组函数前再放一条 #--- 分隔线。
function(CompileSettings_SetWarnings target visibility level)
  # 校验 LEVEL，再调用 target_compile_options。
endfunction()
```

规则：

- 参数顺序稳定，调用处不靠位置猜；参数多时在注释里列出类型与取值范围。
- 先校验目标存在、可见性合法、标准在支持列表内，再调用 `target_*`。
- 失败用 `FATAL_ERROR`，消息带函数名与非法值；不要 `WARNING` 后继续。
- 只改传入 target 的属性；不写全局变量，不读环境变量，不下载依赖。`LinkSettings_FetchGoogleTest` 是唯一例外，调用点限制在测试需要它的时候。
- 函数体保持幂等：同一目标重复调用不产生两份冲突属性。

## 契约注释

公开函数上方写中文 `#` 契约：一句功能、空行、边界，再用 `:param` 标位置参数、`:keyword` 标关键字参数；不写 `#[[.rst:` 与 `.. command::`，那是进 CMake 手册的模块才用的标记。同一文件的函数组之间用一条 `#---` 分隔，行注释只写原因，不画 `#===...===#` 方框。完整写法见 `references/cmake.md`。

## 测试

模块不能只在真实工程里碰运气。建一个临时最小工程，复制模块并覆盖：

1. 合法目标 + 合法可见性 + 每个支持的标准，configure 与构建成功。
2. 未创建的目标，configure 失败且消息可读。
3. 非法可见性、非法标准，configure 失败。
4. 重复 `include()` 不报函数重定义。
5. `compile_commands.json` 出现对应 `-std=`。

测试完删除临时工程；不把测试用 `CMakeLists.txt` 留在仓库。真实工程里的验证由 `steps/03-check.md` 完成。

## 迁移旧模块

1. 先在新位置建立函数与文件，保留旧入口一个提交周期（如果项目要求兼容）。
2. 全仓搜索旧函数名与旧 `include()`，逐个替换。
3. 删除旧文件，更新 `docs/architecture.md` 的职责表与结构检查。
4. 重新 configure；缓存里残留的旧模块不会自动消失，必要时删构建目录。

## 官方依据

- [`function()`](https://cmake.org/cmake/help/latest/command/function.html)：函数在调用时执行，拥有自己的作用域。
- [`include_guard()`](https://cmake.org/cmake/help/latest/command/include_guard.html)：按目录或全局防止重复导入。
- [`CMAKE_MODULE_PATH`](https://cmake.org/cmake/help/latest/variable/CMAKE_MODULE_PATH.html)：`include()` 的模块搜索路径。
- [CMake Source Code Guide](https://github.com/Kitware/CMake/blob/master/Help/dev/source.rst)：只规定 C++ 风格，没有 CMake 语言风格章节。
- [Modules/GoogleTest.cmake](https://github.com/Kitware/CMake/blob/master/Modules/GoogleTest.cmake)：官方模块的括号文档块、行注释与 `#---` 函数分隔实例。
- [cpp-best-practices CompilerWarnings.cmake](https://github.com/cpp-best-practices/cmake_template/blob/main/cmake/CompilerWarnings.cmake)：社区警告模块的注释与命名参数写法。
