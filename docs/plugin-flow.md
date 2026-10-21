# 插件流程

这个包只做一件事：在已经声明 C++ 工作流的仓库里，提供 `developing-cpp` 与 `building-cpp` 两个技能。它不注册工具，不编译，不写项目文件，也不改系统提示词。

## 第一层：安装

npm 安装钉死版本：

```bash
dsh plugin --profile web add npm:@chengzhao-dev/dsh-cpp-workflow@0.1.0
```

同一版本的 Git 标签：

```bash
dsh plugin --profile web add github:chengzhao-dev/dsh-cpp-workflow#v0.1.0
```

桌面应用独占 `desktop` profile。命令行 `add` 被拒绝时，在应用设置里添加插件，地址填同一个 npm 版本。Git 标签安装使用仓库内已构建的 `lib/`，不在目标机器上重新构建；包内没有需要授权执行的安装脚本。npm 安装同样使用包内预构建的 `lib/`。

安装后不会立刻出现在所有会话里。每次技能列表查询都会重新判断当前工作区。

## 第二层：门禁

`list({ cwd })` 同时检查两件事：

1. 从 `cwd` 向上、停在 git 根，沿途存在 `.agents/skills/cpp-workflow-project/SKILL.md`。
2. 这份标记所在的 git 仓库里，至少有一个第一方 `CMakeLists.txt` 或 C++ 源文件。

缺一件就返回空列表。`get()` 带 `cwd` 时重新判断；不带 `cwd` 时只服务已经加载的 candidate。八类边界情形和扫描上限见 [plugin-boundaries.md](plugin-boundaries.md)。

## 第三层：分流

| 改动 | 打开 |
| --- | --- |
| `.h`、`.cpp`、命名、异常、源码注释 | `developing-cpp` |
| `CMakeLists.txt`、`cmake/`、`running-build.sh`、`.clang-*`、`.vscode/`、`environment.json` | `building-cpp` |
| 同时越过库与程序的边界，或同时动源码和构建 | 先做完定边界，再开 `building-cpp` |
| `.qmd`、仓库 README、Python、非 C++ 文档 | 两个都不开 |

编译失败先分因：诊断指向函数体，回到定实现；指向声明或类型，回到定声明；诊断是找不到头、链接失败、没有编译数据库、工具不在 PATH，留在定构建或定工具配置。

## 第四层：检查

源码四步不依赖环境组合。构建三步先读项目声明，再在构建宿主上运行环境脚本。`<skill-dir>` 是安装后的 `building-cpp` 目录：

```bash
node "<skill-dir>/scripts/checking-environment.mjs" --project .
node "<skill-dir>/scripts/checking-environment.mjs" --project . --live
```

第一条只验证三个轴的组合，任何机器都能跑。第二条在当前 PATH 上核对构建宿主、命令和版本。通过后才运行项目入口命令；入口内部依次 configure、build、format、tidy、ctest、run。

环境脚本不安装、不下载、不改 PATH。缺命令时打印缺的名字并非零退出。
