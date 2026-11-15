<!-- 读取时机：写或改注释的示例时；读完能回答：正反例：控制序列常量；预算：一次只开这一份（25 行），不自动串联。 -->
# 正反例：控制序列常量

**差**：

```cpp
/// 进入备用屏幕，保存光标并切到备用缓冲区。
inline constexpr std::string_view kEnterAlternateScreen = "\033[?1049h";
/// 清屏。
inline constexpr std::string_view kClearDisplay = "\033[2J";
```

前一句写成了动作，读者看不出这个值是一个控制序列；后一句只重复名字，没有交代清屏后光标位置不变。

**好**：

```cpp
/// 进入备用屏幕的控制序列：保存光标后切换到备用缓冲区。
inline constexpr std::string_view kEnterAlternateScreen = "\033[?1049h";
/// 隐藏光标的控制序列。
inline constexpr std::string_view kHideCursor = "\033[?25l";
/// 清除整屏内容的控制序列：光标位置不变。
inline constexpr std::string_view kClearDisplay = "\033[2J";
```

第一句是名词短语，先说是哪个序列，再用全角冒号补名字与转义写法看不出的事实：保存光标、切换缓冲区、光标位置不变。名字已经把效果说全、序列也没有额外语义时只写一句。注释不抄 `\033` 写法，也不写调用场景；成对序列取同一句式。
