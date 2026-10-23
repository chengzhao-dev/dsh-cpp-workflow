# 编码与行尾

默认组合是 UTF-8 无 BOM、LF。机器规则以仓库根 `.gitattributes` 与 `.editorconfig` 为准，本文件只记决定、MSVC 例外与检查方法。

## 规则

- 文本文件用 UTF-8，不带 BOM。JSON 按 RFC 8259；YAML 按 YAML 1.2.2；不要 GBK、UTF-16 或 Latin-1。
- 所有文本文件用 LF，包括 `.sh`、Python、C++、Markdown、YAML、CMake 和配置文件。
- `.sh` 必须 LF：内核会把 shebang 末尾的 CR 当作解释器路径的一部分，导致 `bad interpreter`。
- `.bat` / `.cmd` 必须 CRLF：`cmd.exe` 对纯 LF 批处理不稳定。
- 每个文本文件末尾一个换行；文件中间不混用 LF 和 CRLF。
- 二进制文件（字体、图片）不转码，按 `binary` 处理。

## MSVC 原生

MSVC 默认按 BOM 判断源码编码。源码没有 BOM 时，它按当前用户代码页解释，除非显式传入 `/utf-8` 或 `/source-charset:utf-8`。因此 BOM 不是 MSVC 的硬要求。

- 首选做法是加编译选项：在目标上写 `target_compile_options(<target> PRIVATE $<$<CXX_COMPILER_ID:MSVC>:/utf-8>)`，源码继续 UTF-8 无 BOM、LF。
- 只有在无法改编译选项时，才把 MSVC 编译的 C/C++ 源文件保存为 UTF-8 BOM。BOM 只允许出现在这类源文件里。
- `.sh`、`.bat`、`.cmd`、`.json`、`.yml`、`.gitattributes`、`.editorconfig` 和 CMake 文件不要加 BOM。
- MSVC 接受 LF 源码；CRLF 不是必需项。只有 `.bat` / `.cmd` 固定 CRLF。
- WSL 与 Linux 构建按默认组合，不要把源码转成 CRLF 来迁就 Windows。

## 工具

- `.gitattributes` 决定 Git 入库和检出；它覆盖贡献者自己的 `core.autocrlf`。
- `.editorconfig` 决定编辑器保存；`charset` 与 `end_of_line` 必须和 `.gitattributes` 同一档。
- `.clang-format` 写 `LineEnding: LF`，避免格式化把行尾改回 CRLF。

## 检查

在仓库根运行：

```bash
node "<skill-dir>/scripts/checking-encoding.mjs" --profile portable
```

- `portable`（默认）要求所有文本文件 UTF-8 无 BOM、LF、末尾换行。
- `msvc` 只放宽 MSVC 编译的 C/C++ 源文件：允许 UTF-8 BOM 与 CRLF；Markdown、配置与脚本仍按 `portable` 检查。
- 退出码：0 无问题，1 有问题，2 参数或 Git 错误。加 `--json` 输出机器可读结果。

再跑 `git diff --check`，确认没有空白错误。不要用 `git add --renormalize` 把行尾改动混进功能改动；确需规范化时单独提交并说明。

## 依据

- MSVC `/utf-8`：<https://learn.microsoft.com/en-us/cpp/build/reference/utf-8-set-source-and-executable-character-sets-to-utf-8?view=msvc-170>
- MSVC `/source-charset`：<https://learn.microsoft.com/en-us/cpp/build/reference/source-charset-set-source-character-set?view=msvc-170>
- Unicode UTF-8 BOM FAQ：<https://www.unicode.org/faq/utf_bom.html>
- Git `.gitattributes`：<https://git-scm.com/docs/gitattributes>
