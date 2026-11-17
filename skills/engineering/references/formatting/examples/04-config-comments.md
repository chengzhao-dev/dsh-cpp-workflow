<!-- 读取时机：写或改配置文件注释、判注释句式时；读完能回答：正反例：配置文件注释；预算：一次只开这一份（42 行），不自动串联。 -->
# 正反例：配置文件注释

`config.toml` 这类运行时配置一个键一项：注释紧贴键的上一行，键与注释之间不插空行，也不写行尾注释。句式与语言无关，下面用 TOML 举例；`.clang-format`、`.clang-tidy`、`.clangd` 与 `.vscode/` 的固定值配置按 `developing-cpp` 的 `references/comments/02-style.md` 写。

## 键注释

**好**（完整文件）：

```toml
# 本仓 Python 与 Quarto 的运行时配置。

# Python 解释器的完整路径：解释器不存在或不可执行时，检查脚本报错退出。
python_path = "D:/ProgramData/miniforge3/python.exe"
# Python 解释器的最低版本：解释器版本低于此值时，检查脚本报错退出。
python_min_version = "3.12"

# Quarto 渲染 Python 代码块所需的 Python 包：缺包或版本过低时，渲染报错退出。
quarto_python_packages = [
  "ipykernel>=6.29",
  "jupyter>=1.0",
  "nbclient>=0.10",
]
# Quarto 的最低版本：已安装的 Quarto 低于此值时，检查脚本报错退出。
quarto_min_version = "1.10.19"
```

句式「对象：条件时，后果。」：对象与键名对得上，条件写清比较对象，后果写清谁报错、报什么；同类键取同一句式，便于并排核对。

**差**：

```toml
# python 路径
python_path = "D:/ProgramData/miniforge3/python.exe"
# 版本低于此值时报错退出
quarto_min_version = "1.10.19"
```

第一条复述键名；第二条没有比较对象与执行者。`sed` 取值、CI 步骤这类实现细节同样不写进注释：注释给的是读者要遵守的契约与违反后的后果。

## 抬头

标题不是必需：需要交代文件整体用途时写一行标题，`#` 与一行用途按需补（本技能的 `.clang-format` 资产就是此形）；本例的 `config.toml` 只写一行标题，其后空一行。同一组键之间不空行，不同组之间空一行。
