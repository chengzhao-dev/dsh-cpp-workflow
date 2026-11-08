# 随机

- 随机数用 `<random>` 的引擎 + 分布；不要用 `rand()` / `random_shuffle`。
- 引擎只播种一次并复用；每次调用都重新播种会让序列重复。线程各自持有引擎，或加锁。
- 需要均匀整数用 `uniform_int_distribution`；不要写 `engine() % n`，取模有偏。
- `random_device` 只用于播种，不保证密码学安全；可复现实验用固定种子或 `seed_seq`。
- 洗牌用 `std::shuffle(first, last, engine)`。

## 依据

- [ISO C++ `[rand]`](https://eel.is/c++draft/rand)：引擎、分布与随机数生成要求。
- [cppreference: Pseudo-random number generation](https://en.cppreference.com/w/cpp/numeric/random)：引擎/分布对照与 `seed_seq`。
- [cppreference: `uniform_int_distribution`](https://en.cppreference.com/w/cpp/numeric/random/uniform_int_distribution)：均匀整数分布，避免取模偏差。
