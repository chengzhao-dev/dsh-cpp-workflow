# 正反例：环境组合

声明规则、合法组合、各轴取值与校验命令见 `../references/02-environment.md`。本文件只保留三处判不准的期望输出。

## 轴为空

```json
{
    "host": "linux",
    "build_host": "",
    "compiler": "gcc"
}
```

不带 `--live` 时以退出码 2 失败，`issues` 指名 `build_host` 为空；此时不查找 `g++`，先让用户把轴填上。

## compiler 写成数组

```json
{
    "host": "linux",
    "build_host": "native",
    "compiler": ["clang", "gcc"]
}
```

同样退出码 2，说明一个 configure 只允许一个编译器；拆成两次声明或两个工程，不要指望检查器替你选。

## 四工具版本不一致

```text
clang++ 18.1.8
clang-format 16.0.6
clang-tidy 16.0.6
clangd 16.0.6
```

`--live` 以退出码 3 失败，`issues` 报四者不在同一 LLVM 主版本；统一到同一发行版，不要只升级编译器。不带 `--live` 时只读声明、不探测 PATH，这条不报。
