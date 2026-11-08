# 正反例：异常类型与消息

**差**：抛字符串，或把来源、条件和值揉成一句口语；调用方接到的 `what()` 既不稳定，也无法定位是哪一步失败。

```cpp
throw "bad index";
throw std::out_of_range{std::format("GetTask: 下标 {} 越界", index)};
```

**好**：语义已经由标准类型给出时直接用标准类型；消息按「标签: 完整句」组织，句子主语是失败的值，实际值直接插进句子，限度用 `for` 接在后面；语言由项目约定，入口需要面向用户的前缀时只加前缀。

```cpp
throw std::out_of_range{std::format("GetTask: index {} is out of range", index)};
```

消息需要跨行时，先存进变量再抛出：

```cpp
const std::string message =
    std::format("GetTask: index {} is out of range for list of size {}", index, size);
throw std::out_of_range{message};
```

消息写操作和关键值；英文消息小写开头、句末不加句号，中文消息按中文标点，句式不变；实际值用 `{}` 直接放进句子，不要写成 `(index={})`。`std::format` 只是构造消息的方式，句式见 `references/exceptions/throw-rules.md` 的「消息」节。项目若定义 `Error` 基类，按该文件先定基类再派生，调用方捕获基类接住整族。
