<!-- 读取时机：设计会话、选着、规则与构建边界时；读完能回答：会话层和程序边界；预算：一次只开这一份（87 行），不自动串联。 -->
# 会话层与程序边界

先定接口，再写实现；实现碰到下层缺口时，回头改接口，小步迭代。本文按会话、选着、规则、构建四层说明这条原则；领域值、结果类型与函数契约仍以 [01-project-design.md](01-project-design.md) 为准，本文只补充「谁持有流、谁做决定、谁不该知道终端」以及三者的构建边界。

## 会话

会话层把一次进程的生命周期包成一个对象。它持有一个对局、一个终端与一个输入处理对象；输入、输出与诊断三个流由终端持有。构造只绑定引用，不读、不写、不打印。

- 入口只做装配：`main` 构造会话并调用一个 `RunGame`，捕获异常、打印一行诊断、返回退出码；不解析棋盘，不选难度，不写提示语。
- 会话按顺序问完开局问题（模式、难度、先手），清掉上一局，再进入一局循环；换局时只撤回上一局的落子，不重新构造会话或电脑。
- 所有提示和诊断走注入的流；会话不直接使用 `std::cout`、`std::cerr` 或全局状态，测试才能用 `std::istringstream` / `std::ostringstream` 驱动完整交互。
- 依赖只朝内：会话知道规则和电脑，规则与电脑不知道会话；把终端代码编进静态库，等于让规则依赖终端。
- 先跑通「读一步、走一步、打印一步」的骨架，再加回放、撤销、难度等分支；每加一段，回看会话接口是否仍只有一个入口、是否泄漏了本层不该知道的状态。
- 备用屏幕的进入、退出与清屏交给终端类型（如 `Terminal`）；会话在循环外进入，每条返回路径先退出，不另加只转调的 `ConsoleSession`，也不在 `RunGame` 内声明局部类。
- RAII 只覆盖对象寿命等于资源占用的情形；备用屏幕跨越多局，进入与退出不放进构造析构，边界见 [02-raii.md](02-raii.md)。异常路径交给 `main`，不额外恢复屏幕。
- 状态数得清的画面写成 `constexpr std::string_view` 原始字符串，每种状态一份完整画面。会话按当前状态选出一份，清屏后写出。由对局填格的画面（棋盘、一行状态、回放步数）用 `std::format` 拼成 `std::string`，仍然是一段文本。案例见 [09-option-menu.md](examples/09-option-menu.md)。
- 不新增边框、列宽、面板、前缀这类可复用界面类型。画面需要滚动、鼠标或随窗口重排时，按 [03-third-party.md](03-third-party.md) 接入 FTXUI 这类控件库；井字棋把界面接口放在 `terminal/`，规则库不依赖终端。
- 注入流仍走整行协议；只有连到终端时才读方向键，非 tty 不输出控制序列。

tictactoe 当前没有独立会话对象：`main` 构造 `Terminal` 并调用 `RunGame`；`Terminal` 持有 `Screen`，`Screen::ShowMainMenu`、`ShowDifficultyMenu`、`ShowGame` 分别驱动 FTXUI 全屏；主菜单由 `Menu` 持有，棋盘交互由 `BoardScreen` 持有。`Terminal` 的构造函数只取得输入输出对象，不解析规则；对局与回放画面尚未接入。

## 选择

选着层负责「从合法候选里挑一个」，不拥有对局，也不改对局。它持有自己的策略状态（难度、随机数引擎），向规则层要一个合法着法。

- 对外只暴露一个选择入口，例如 `ChoosePosition(Game&)`；随机选与搜索选留在私有函数里，调用方不需要知道难度分支怎样实现。
- 返回 `std::optional<Position>`：没有合法候选是正常结果，不返回哨兵坐标，不抛异常；终局由调用方先判断，也可以由选择入口防御性返回空。
- 选择函数在返回时保持对局与调用前一致。搜索用同一局「试走一步、递归、撤回」，不复制整局；复制把 O(1) 的撤回变成 O(n) 的拷贝，搜索树一深就被放大。
- 难度是封闭枚举（如 `Difficulty::kNormal` / `kHard`），不是 `bool` 或整数；新增一档必须同时补 `switch` 分支，让 `-Wswitch` 与 `std::unreachable()` 兜住漏档。
- 没有第二个真实实现之前不加抽象基类或策略工厂；先把一个具体类写对，调用方只依赖它的公开接口。
- 选着层不读终端、不打印、不读环境；随机源由构造函数注入或播种，测试用固定种子复现同一序列。

tictactoe 的电脑选着目前写在 `BoardScreen` 内：`kEasy` 随机、`kNormal` 胜/堵/中心/随机、`kHard` 十层 minimax；尚未抽成独立的 `Computer` 类型，阶段表把独立类型记在 `06-computer`。

## 规则

规则层只依赖标准库和领域类型，回答「这一手是否合法、这一局是否结束、终局分数是多少」。

- 不读终端、不碰 GUI/Web/Python、不读当前时间、环境变量或工作目录；这些由会话或调用方注入。
- 组合优先：`Game` 拥有 `Board`，`Board` 拥有方格；封闭取值用 `enum class`；结果跟随产生它的层（`PlaceResult`、`GameResult`）。
- 查询与变更分开；一个函数只做一件事；`Undo()` 只撤回受影响的一处，既服务「换局清盘」，也服务搜索回溯。
- 信息隐藏按「哪些决定会变」分解，不按流程图分解；接口只暴露稳定契约，私有实现留在 `.cpp` 或私有头。
- 终局评分是规则查询：`ScoreFinishedGame(const Game&)` 读 `GameResult` 与 `move_count`，X 胜为正、O 胜为负、进行中或平局为 0；不把分数塞进 `GameResult`，也不在电脑里重复判断胜负。

## 构建

构建边界让「规则库」「会话程序」「测试」各自独立编译，依赖方向与源码一致。

- 规则编成动态库 `tictactoe`，公开头文件目录是 `tictactoe/include/`；终端程序与测试目标各自独立编译，测试目标尚未重建。
- 库、程序与测试的边界见 `steps/02-boundary.md`，target 与 RPATH 写法见 `engineering` 的 `steps/01-targets.md`。
- 程序边界由 `main` 定义；库不定义 `main`。头文件自包含、每个符号由直接包含的头导出（SF.11 与 IWYU）是编译单元边界，不是链接边界，放在本节作为「库能独立编译」的旁证，不替代目标依赖规则。

两份工程文件是这条边界的实物：`games/tictactoe/tictactoe/CMakeLists.txt` 只管 `board.cpp`，`games/tictactoe/terminal/CMakeLists.txt` 只管 `main.cpp`、`menu.cpp`、`screen.cpp`、`terminal.cpp`、`board_screen.cpp` 五个终端源文件。

## 迭代记录

这条原则不是一次设计完的，而是每轮实现暴露缺口后回改接口：

- 先写 `board.h`，把棋盘状态、光标、落子与胜负判断收进 `BoardModel`；规则库不包含终端代码。
- 再写 `terminal.h`、`screen.h`、`menu.h`、`board_screen.h`，把输入输出、主菜单、难度菜单与棋盘交互分开；`main.cpp` 只构造 `Terminal` 并调用 `RunGame`。
- 当前停在简化实现：`BoardModel` 与终端对局已能运行，独立 `Game`、`Computer`、回放与测试按阶段表 03–09 重建后再接进来。

## 依据

会话与设计方法：

- Wirth, N. *Program Development by Stepwise Refinement*. CACM 14(4), 1971, doi:10.1145/362575.362577。原文页本次不可达；分解与逐步细化的转引见 Cornell 页。
- Gries, D. *Stepwise refinement*. Cornell JavaHyperText. https://www.cs.cornell.edu/courses/JavaAndDS/stepwise/stepwise.html
- Freeman, S. & Pryce, N. *Growing Object-Oriented Software Guided by Tests* 目录：Ch4 “First, Test a Walking Skeleton”、Ch5 “Develop from the Inputs to the Outputs”、Ch17 “Teasing Apart Main”。https://growing-object-oriented-software.com/toc.html （书中没有字面 “outside-in” 章节，正文不把它当章节名。）
- Cockburn, A. *Hexagonal architecture (Ports & Adapters)*. https://alistair.cockburn.us/hexagonal-architecture/
- Martin, R. C. *The Clean Architecture*. https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- Dijkstra, E. W. *Notes on Structured Programming*, EWD249, 1970. https://www.cs.utexas.edu/~EWD/transcriptions/EWD02xx/EWD249/EWD249.html
- Parnas, D. L. *On the criteria to be used in decomposing systems into modules*. CACM 15(12), 1972, doi:10.1145/361598.361623。原文页本次不可达；按「会变的决定分解」的转引使用，正文不冒充读过原文。

选着实例：

- Stockfish `src/main.cpp`、`src/uci.h`：main 装配命令行与 UCI 引擎，UCI 层持有引擎并接收 position/go 命令。https://github.com/official-stockfish/Stockfish
- python-chess engine 文档：`engine.play(board, limit)` 返回着法，调用方推进棋盘。https://python-chess.readthedocs.io/en/latest/engine.html
- OpenSpiel `spiel_bots.h`：`virtual Action Step(const State& state) = 0;`。https://github.com/google-deepmind/open_spiel
- boardgame.io `src/ai/bot.ts`：`play(state, playerID)` 返回动作，不返回新状态。https://github.com/boardgameio/boardgame.io
- cutechess-cli `projects/cli/src/main.cpp`：CLI 只装配 Engine 与赛制。https://github.com/cutechess/cutechess

规则与构建：

- C++ Core Guidelines Enum.3（优先 `enum class`）、C.4（只在需要直接访问表示时做成员）。https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
- C++ Core Guidelines SF.11（头文件自包含）与 include-what-you-use 的 “Why include what you use?”。https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rs-contained、https://github.com/include-what-you-use/include-what-you-use/blob/master/docs/WhyIWYU.md
- ISO C++ [basic.start.main]：程序只能有一个全局 `main`。https://eel.is/c++draft/basic.start.main
