# Python 协作资产

两个脚本都只依赖 Python 标准库，不导入项目代码：

- `replay.py`：解析并校验带版本的 JSON 行快照，按序重放走子。
- `web_bridge.py`：本地回环 HTTP 适配器，持有一个 C++ 子进程。
- `snapshot_demo.cpp`：最小 C++ 协议端，用来手工验证两个 Python 脚本。

## 手工验证

在支持 C++20 的编译器中构建：

```bash
clang++ -std=c++20 snapshot_demo.cpp -o snapshot_demo
```

重放一组走子：

```bash
printf '1 1\n0 0\n2 2\n0 2\n1 0\n' | ./snapshot_demo
```

用 Python 端读取同一个程序：

```bash
python replay.py --app ./snapshot_demo --moves 1 1 0 0 2 2 0 2 1 0
```

再把程序交给本地 Web 适配器：

```bash
python web_bridge.py --app ./snapshot_demo --port 8765
```

`web_bridge.py` 只绑定 `127.0.0.1`。生产项目应把 `snapshot_demo.cpp` 换成语义完整的
C++ 程序，Python 端只做编排、验证和展示，不复制规则。
