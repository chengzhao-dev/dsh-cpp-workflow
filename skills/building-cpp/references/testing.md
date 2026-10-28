# 测试与 CTest

测试属于构建域：测试 target 由 `configuring-cmake` 写进 CMake，测试代码与 CTest 运行由本技能核对。条文依据 GoogleTest Primer、CMake 的 `add_test` / `gtest_discover_tests` 文档与 CTest 手册，访问日期 2026-10-27。

## 先决定测什么

- 一个公开入口至少一条成功用例、一条拒绝用例；拒绝路径核对返回值、异常类型与状态没有被改坏。
- 一条测试只核对一件事。用例名写行为，不写实现：`PlaceCellRejectsOccupiedCell`，不是 `TestPlaceCell2`。
- 测试直接链接库、包含公共头，不经过 `main()`、终端或文件系统；要进程、端口、临时目录的用例归集成测试，单列标签。
- 不测私有成员与内部调用次数；测试锁定可观察行为，重构不该改测试。

## 断言

- `ASSERT_*` 失败立即结束当前用例，只用于后续断言依赖的前提；`EXPECT_*` 失败继续执行，用于并列核对。
- 浮点比较用 `EXPECT_NEAR` / `EXPECT_DOUBLE_EQ`；容器整体比较优先 `EXPECT_EQ`，不要手写循环逐元素打印。
- 异常用 `EXPECT_THROW` / `EXPECT_NO_THROW`；`[[nodiscard]]` 函数在只测异常时写 `(void)`。
- 一条用例只留一个逻辑主题；用例之间不共享可变状态，需要固定数据时用 fixture 的 `SetUp`。

## 注册给 CTest

```cmake
include(GoogleTest)
gtest_discover_tests(tictactoe_test
  DISCOVERY_TIMEOUT 30
  PROPERTIES LABELS unit TIMEOUT 10)
```

- `gtest_discover_tests` 在构建后枚举用例，一条 `TEST` 对应一个 CTest 测试；不要再用 `add_test(NAME all COMMAND ...)` 包住整个可执行文件。
- 每个测试 target 设 `TIMEOUT`；慢测试单独 `LABELS slow`，CI 快层用 `ctest -L unit --output-on-failure --no-tests=error`。
- 需要独占端口、固定文件或数据库的用例用 `RESOURCE_LOCK`；有准备/清理步骤时用 `FIXTURES_SETUP` / `FIXTURES_REQUIRED`。
- `--no-tests=error` 防止「0 个测试也算通过」；`--output-on-failure` 只在失败时打印输出，避免日志淹没。

## 运行顺序

1. 构建通过后跑 `ctest --test-dir build/<compiler> --output-on-failure --no-tests=error`。
2. 先跑失败用例的单条：`ctest -R <用例名> --output-on-failure`，确认失败可复现。
3. 修完后跑全量；回归失败先判断是行为变了还是测试过期，不直接改断言迁就实现。
4. Debug 一轮加 `-fsanitize=address,undefined -fno-omit-frame-pointer` 重跑测试；sanitizer 报告按第一条栈帧定位，不靠猜。

## 失败分诊

| 现象 | 先看 | 转到 |
| --- | --- | --- |
| 找不到测试 target 或 `gtest` | CMake 的 `enable_testing()`、`add_subdirectory(tests)`、链接目标 | `configuring-cmake` |
| 断言失败但行为符合预期 | 测试期望是否写错、是否依赖未初始化状态 | 本文件 |
| 断言失败且行为不对 | 被测函数的实现与契约 | `developing-cpp` |
| 用例数比预期少 | `gtest_discover_tests` 的发现超时、测试是否在正确 target | 本文件与 `steps/03-check.md` |
| 偶发失败 | 共享临时文件、固定端口、执行顺序依赖 | 本文件 |

## 不做什么

- 不为凑覆盖率写没有断言的测试；不用 `sleep` 等待异步结果。
- 不在测试里复制一份被测实现来对照。
- 不把测试输出、`Testing/` 目录或生成的可执行文件入库。
