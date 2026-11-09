<!-- 读取时机：查语言细节时；读完能回答：时间；预算：一次只开这一份（13 行），不自动串联。 -->
# 时间

- 测耗时用 `std::chrono::steady_clock`：单调、不受系统时间调整影响；`system_clock` 只用于日历时间，不用来算间隔。
- 两个时间点相减得到 `duration`；换算单位用 `duration_cast`，它会截断，需要舍入时用 C++20 的 `floor` / `ceil` / `round`。
- 需要毫秒、秒等具名单位时写 `std::chrono::milliseconds` 等别名，不手算 `1000`。
- `sleep_for` / `sleep_until` 至少睡到指定时长，调度可能让它更晚；不要用它做精确节拍。
- C++20 的日历与时区用 `<chrono>` 的 `year_month_day`、`zoned_time`；跨时区时间不要手工加减小时。

## 依据

- [ISO C++ `[time]`](https://eel.is/c++draft/time)：时钟、时长、时间点与日历类型。
- [cppreference: `std::chrono`](https://en.cppreference.com/w/cpp/chrono)：`steady_clock`、`duration_cast` 与 C++20 日历/时区。
- [cppreference: `steady_clock`](https://en.cppreference.com/w/cpp/chrono/steady_clock)：单调时钟的保证与用途。
