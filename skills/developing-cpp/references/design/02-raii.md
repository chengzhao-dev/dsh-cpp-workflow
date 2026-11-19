<!-- 读取时机：设计资源所有权、析构或作用域保护时；读完能回答：RAII 的适用边界；预算：一次只开这一份（42 行），不自动串联。 -->
# RAII 与资源寿命

语言机制（所有权、移动、`noexcept`、标准 RAII 类型）见 `references/language/language-basics/08-raii.md`；本页只判什么时候适用、什么时候不适用。

RAII 把资源的取得放进构造函数，把释放放进析构函数：对象活着，资源就归它；对象销毁，资源一定释放。它解决的是“每条退出路径都要释放”，不是“少写一个 Exit 调用”。

## 适用条件

- 资源占用与对象寿命完全重合：锁、文件、堆内存、终端模式。
- 所有退出路径都要释放，包括异常；析构函数必须 `noexcept`。
- 资源只有一个所有者；转移所有权显式 `std::move`，禁止复制。
- 需要自己写时，构造后置条件写“资源已取得”，析构释放；删除复制，按需要实现移动。

## 不适用条件

- 资源跨多个对象或多个操作，对象寿命长于一次占用。
- 进入、退出必须在明确的控制流位置发生，调用方需要看见。
- 同一对象会多次进入、退出，或退出顺序依赖运行状态。
- 为了省掉一行 `Exit()`，把成对调用塞进局部类的构造和析构；控制流被藏起来，异常路径也未必恢复。

## 备用屏幕

`Terminal` 提供 `EnterAlternateScreen` / `ExitAlternateScreen`；`Console`、`Screen` 的生命周期长于一次对局，进入和退出属于一次 `RunGame` 的作用域。tictactoe 让入口显式调用、每条返回路径先退出，不把这两个动作放进 `Screen` 的构造或析构，也不在 `RunGame` 里声明只转调的局部类；案例见 [examples/08-screen-enter-exit.md](examples/08-screen-enter-exit.md)。

只有在一次 `RunGame` 内确实存在独立作用域、退出必须在所有返回路径自动发生时，才考虑局部 `AlternateScreenGuard`：持有 `Terminal&`，构造进入、析构退出，删除复制与移动。当前项目只有一个场景，也没有异常路径设计，所以不先抽通用 `ScopeGuard`；出现第二个真实使用方再抽象。

## 检查清单

- [ ] 对象寿命与资源占用完全重合，而不是只为了方便。
- [ ] 构造成功后资源一定可用，失败不会留下半初始化对象。
- [ ] 析构函数 `noexcept`，不抛异常，不依赖可能已销毁的对象。
- [ ] 复制/移动语义明确：独占资源删除复制，转移所有权用移动。
- [ ] 每条退出路径（含异常）都释放，且只释放一次。
- [ ] 没有为一次调用引入通用 `ScopeGuard` 或只转调的局部类。

## 依据

- cppreference: RAII. https://en.cppreference.com/w/cpp/language/raii
- C++ Core Guidelines R.1: Manage resources automatically using resource handles and RAII. https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-raii
- C++ Core Guidelines C.30/C.31: 析构函数释放资源. https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rc-dtor
- cppreference: `std::lock_guard`. https://en.cppreference.com/w/cpp/thread/lock_guard
- cppreference: `std::unique_ptr`. https://en.cppreference.com/w/cpp/memory/unique_ptr
