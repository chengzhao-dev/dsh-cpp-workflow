# 注释与命名资料检索流程

> 维护者文档：只记录检索与保留方法，不随 npm 包发布，运行时也不需要读取。

本页说明怎样为 `skills/developing-cpp/references/comments/01-comment-rules.md` 与 `skills/developing-cpp/references/naming/01-identifier-names.md` 找依据、怎样筛、保留多少、放在哪里。它不是书目：具体来源写在两份规则文件末尾的「依据」节，正文只列流程与口径。

## 一、检索量

2026-11-08 实际检索 510 个独立页面，分五个方向：

| 方向 | 页面数 | 内容 |
| --- | --- | --- |
| C++ | 100 | ISO C++、GCC、LLVM、Chromium、WebKit、Qt、MS C++、Abseil、Fuchsia、clang-tidy、Doxygen、Sphinx、工程实践 |
| 命名工具 | 110 | Google、LLVM、clang-tidy、Ruff、Pylint、isort、Black、flake8、Sonar、Uncrustify 等 |
| Python | 100 | PEP 8/257/287/484、Google Python Style、Ruff、Pylint、numpydoc、Sphinx、pydocstyle、企业规范 |
| Rust | 100 | Rust API Guidelines、Rust Style Guide、rustdoc、RFC 430/344/505/1574、Clippy、rustfmt |
| AI | 100 | Google 各语言风格、TensorFlow/PyTorch/JAX/HF、OpenAI/Anthropic、Copilot/Cursor、注释可读性论文 |

原始清单 510 行，按 URL 去重后 466 个唯一页面；另补 34 个官方或工具页面（Go、Oracle、Python、Rust、Doxygen 等），合计 500。只按独立页面计数：同一页面的不同章节算一页，镜像、转载与同一译文不算新页。

原始 URL 清单是临时材料，放在 `temp/`，不入库：`cpp_urls.txt`、`naming_urls.txt`、`python_urls.txt`、`rust_urls.txt`、`ai_urls.txt`、`supplement_urls.txt`。

## 二、怎样筛

- 官方文档优先，其次是企业规范，最后才是社区文章。社区文章只用来发现问题与对照写法，不单独作为规则依据。
- 只收讨论注释写法、文档句式、命名约定或 API 摘要的页面。语言语法、安装、配置、工具下载页不计入。
- 404 页面直接剔除；403、超时或需要登录的页面标「未核实」，不单独作为规则依据。
- 每条至少能回答两件事：它约束哪一层（文件头、类型、函数、实现、命名），采信点是什么。

## 三、保留多少、放在哪里

- 每个规则只保留最重要的 12 份来源，写在对应规则文件的「依据」节。500 条检索结果不抄进仓库。
- 注释规则 12 份写在 `skills/developing-cpp/references/comments/01-comment-rules.md` 末尾。
- 命名规则 12 份写在 `skills/developing-cpp/references/naming/01-identifier-names.md` 末尾。
- 其余检索结果不落盘；需要复查时按本页口径重新检索，或看 `temp/` 的临时清单。
- 依据只写标题、URL 与一句采信点，不复制正文。

## 四、维护

- 新增或替换来源时，先改规则文件的「依据」，再核对本页口径与规则文件的预算。
- 访问日期写进规则文件的依据条目；本页只记检索日期与总量。
- 规则文件的首行预算与 `references/index.md` 的数字要同步，避免结构检查报错。
