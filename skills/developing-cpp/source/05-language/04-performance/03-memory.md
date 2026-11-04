# 内存与缓存

- 连续存储对缓存友好；`vector<struct>` 比 `vector<unique_ptr<struct>>` 更容易预取。
- 只遍历部分字段时，AoS（数组的结构）可能浪费带宽；数据量大且按列访问时考虑 SoA（结构的数组），但先用 profiler 证明。
- 小对象按值传递通常比堆分配快；不要为了“避免拷贝”给所有参数加指针。
- `reserve` 减少 `vector` 扩容和搬移；只有已知上界或能准确估算时才用。
- 移动大对象比拷贝便宜，但移动不是免费；不要把 `std::move` 当成优化开关。
- 返回局部对象直接 `return value;`，依赖 RVO / NRVO；`return std::move(value);` 会阻止优化。
