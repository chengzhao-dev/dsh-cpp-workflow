<!-- 读取时机：设计控制台选项屏时；读完能回答：状态数得清用字符串，控件库能力用 FTXUI；预算：一次只开这一份（35 行），不自动串联。 -->
# 正反例：选项屏的字符串画面

**差**：为选项屏抽一个 `DrawMenu`，把边框、内宽与选中指针做成参数，每张屏再各传一套标题与帮助行。

```cpp
void DrawMenu(std::ostream& out, std::string_view title,
              std::span<const std::string_view> options,
              std::size_t selected) {
  constexpr std::size_t kCardInnerWidth = 48;  // 卡片内宽
  out << "╔" << std::string(kCardInnerWidth, '═') << "╗\n";
  // 标题居中、编号、`> ` 指针与整行反显都要在这里再生一遍。
}
```

问题：边框、列宽与指针成了可复用界面类型，每加一张屏就要加参数、加特例；这些能力只在需要滚动、鼠标或随窗口重排时才值得付。

**好**：每张选项屏是一份完整的 `constexpr std::string_view` 原始字符串，选中标记直接写在画面里；会话按下标取一份，清屏后写出。

```cpp
constexpr std::string_view kMenuHumanSelected = R"(
╔════════════════════════════════╗
║            井 字 棋            ║
║  ▸ 双人对战                    ║
║    人机对战                    ║
║  [W/S] 移动   [Enter] 选择     ║
║  [Q] 退出                      ║
╚════════════════════════════════╝
)";
constexpr std::array<std::string_view, 2> kMainMenuScreens{kMenuHumanSelected,
                                                           kMenuComputerSelected};
```

画面显示宽 34、内宽 32；键位、帮助行与空行都排在框内，不另分配置。注入流不是 tty 时仍按整行协议读一个字节，`Q` 或输入结束退出，测试与管道不需要伪终端。

需要滚动、鼠标或随窗口重排时，这些是控件库能力，按 [../03-third-party.md](../03-third-party.md) 接入 FTXUI 这类库。
