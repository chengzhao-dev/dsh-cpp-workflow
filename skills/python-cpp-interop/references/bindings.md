# 绑定：ctypes 与 pybind11

绑定不是默认选项。进程边界能解决问题时，不要为了“少一次进程启动”引入 ABI 兼容、构建和调试成本。

## 什么时候值得绑定

- 需要高频调用（每秒数千次以上），进程启动或管道序列化成为瓶颈。
- 需要传递复杂对象（大数组、回调、C++ 类实例），JSON 转换成本高于调用本身。
- 需要 Python 嵌入 C++ 应用，而不是 C++ 作为独立进程。
- 团队能维护跨语言构建、异常映射和生命周期规则。

不值得的情况：一次性脚本、教学演示、每分钟几次调用、只需要读取最终结果。这些用进程模式更简单。

## 先设计 C ABI

`ctypes` 只能调用 C 函数，不能直接调用 C++ 类。稳定边界是一组 `extern "C"` 函数：

```cpp
extern "C" {

struct Session;
using SessionHandle = Session*;

SessionHandle SessionCreate();
void SessionDestroy(SessionHandle session);
int SessionApplyMove(SessionHandle session, int row, int col, char* buffer, int size);
int SessionSnapshot(SessionHandle session, char* buffer, int size);

}
```

- 句柄用不透明指针；Python 不关心 `Session` 的布局。
- 返回码用 `int` 枚举；`0` 成功，负数是错误码，正数是写入字节数。
- 字符串用调用方提供的缓冲区 + 长度，避免跨分配器释放。
- 数组用指针 + 长度；不要让 Python 猜容量。
- 导出函数不抛 C++ 异常穿过 C 边界；在函数内 `catch` 并转成错误码。
- 头文件加 `extern "C"` 和导出宏（Windows `__declspec(dllexport)`，GCC 可见性）。

## ctypes 骨架

```python
import ctypes

lib = ctypes.CDLL(str(library_path))
lib.SessionCreate.restype = ctypes.c_void_p
lib.SessionDestroy.argtypes = [ctypes.c_void_p]
lib.SessionApplyMove.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int,
                                 ctypes.c_char_p, ctypes.c_int]
lib.SessionApplyMove.restype = ctypes.c_int

session = lib.SessionCreate()
if not session:
    raise RuntimeError("SessionCreate 失败")
try:
    buffer = ctypes.create_string_buffer(4096)
    code = lib.SessionApplyMove(session, 1, 2, buffer, len(buffer))
    if code < 0:
        raise RuntimeError(f"应用落子失败: {code}")
    snapshot = buffer.value.decode("utf-8")
finally:
    lib.SessionDestroy(session)
```

- 每个函数声明 `argtypes` 和 `restype`；默认 `int` 会截断指针。
- 句柄用 `c_void_p`；不要用 `c_int` 存指针。
- 缓冲区由 Python 分配，C++ 只写不越界；传入容量。
- 在 `finally` 销毁句柄；异常路径也不能泄漏。
- 库路径从构建目录推导；加载失败时报告实际路径和 `OSError` 文本。

## pybind11

需要暴露类、STL 容器、异常和回调时，pybind11 比 ctypes 自然：

```cpp
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

PYBIND11_MODULE(engine, module) {
  pybind11::class_<Session>(module, "Session")
      .def(pybind11::init<>())
      .def("apply_move", &Session::ApplyMove)
      .def("snapshot", &Session::Snapshot);
}
```

- 绑定层只做类型转换和异常翻译，不复制业务规则。
- C++ 异常默认转成 Python 异常；需要稳定类型时注册 `pybind11::register_exception`。
- 返回引用时注意生命周期；`return_value_policy::reference_internal` 只在对象确实拥有子对象时用。
- 释放 GIL：长计算用 `pybind11::gil_scoped_release`；但不要在其中调用 Python API。
- 构建用 CMake 的 `pybind11_add_module`，不要手工拼编译命令。
- 每个 Python 版本 ABI 不同；为每个目标版本构建，或使用稳定 ABI（`Py_LIMITED_API`）并确认 pybind11 支持。

## 异常与错误

- C ABI：错误码 + `const char*` 错误消息（生命周期由库或调用方管理）。
- pybind11：C++ 异常转 Python 异常；不要在绑定层吞掉异常。
- 不让异常穿过 `extern "C"`；C++ 异常穿越 C 栈是未定义行为。
- Python 端把错误码映射成异常，保留原始码和消息。
- 错误消息用 `std::format` 组合，返回 UTF-8。

## 生命周期与线程

- 句柄的创建/销毁成对出现；Python 的 `__del__` 不可靠，显式 `close()` 优先。
- C++ 对象被 Python 持有期间，不要在其他线程销毁。
- 回调从 C++ 进 Python 时，确保 GIL 被持有；从 Python 进 C++ 的长调用释放 GIL。
- 多线程调用同一个句柄需要 C++ 端加锁；Python 的 GIL 不保护 C++ 内部状态。

## 测试

- C ABI：用 C 或 Python 直接调用每个导出函数，覆盖成功、错误码、缓冲区不足、空句柄。
- pybind11：覆盖构造/方法/异常映射/容器转换/生命周期。
- 用 `pytest` 或 `unittest` 都可以；项目已有 `unittest` 时不要引入第二套。
- 测试加载真实构建产物；不要 mock 掉 ABI 层，否则测不到布局和导出问题。

## 检查清单

- [ ] 进程模式确实不够，绑定有明确理由。
- [ ] C ABI 不透明、错误码稳定、异常不穿越 C 边界。
- [ ] 缓冲区有容量，句柄有显式销毁。
- [ ] pybind11 只做转换，不复制规则。
- [ ] GIL 与线程责任写清楚。
- [ ] 测试覆盖导出符号、错误码、生命周期和异常映射。
