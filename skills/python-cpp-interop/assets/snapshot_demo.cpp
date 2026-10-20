// 最小协议示例：三乘三落子程序，每读一行坐标输出一条快照。
//
// 编译：clang++ -std=c++20 snapshot_demo.cpp -o snapshot_demo
// 输入：每行 "row col"，行列为 0..2；空行忽略。
// 输出：每行一个 JSON 对象，字段与 Python 端 replay.py 的约定一致。
#include <array>
#include <cstddef>
#include <iostream>
#include <sstream>
#include <string>
#include <string_view>

namespace {

constexpr int kSize = 3;
constexpr std::size_t kCellCount = 9;

enum class Mark { kEmpty, kX, kO };

using Cells = std::array<Mark, kCellCount>;

char ToChar(Mark mark) {
  switch (mark) {
    case Mark::kX:
      return 'X';
    case Mark::kO:
      return 'O';
    case Mark::kEmpty:
      return ' ';
  }
  return ' ';
}

std::string StatusOf(const Cells& cells) {
  constexpr std::array<std::array<int, 3>, 8> kLines{{
      {{0, 1, 2}}, {{3, 4, 5}}, {{6, 7, 8}},
      {{0, 3, 6}}, {{1, 4, 7}}, {{2, 5, 8}},
      {{0, 4, 8}}, {{2, 4, 6}},
  }};
  for (const auto& line : kLines) {
    Mark first = cells[static_cast<std::size_t>(line[0])];
    if (first == Mark::kEmpty) continue;
    if (first == cells[static_cast<std::size_t>(line[1])] &&
        first == cells[static_cast<std::size_t>(line[2])]) {
      return first == Mark::kX ? "x_wins" : "o_wins";
    }
  }
  for (Mark cell : cells) {
    if (cell == Mark::kEmpty) return "in_progress";
  }
  return "draw";
}

void WriteSnapshot(int sequence, const Cells& cells, Mark player) {
  const std::string status = StatusOf(cells);
  std::cout << "{\"version\":1,\"sequence\":" << sequence << ",\"cells\":[";
  for (std::size_t index = 0; index < cells.size(); ++index) {
    if (index != 0) std::cout << ',';
    std::cout << '"' << ToChar(cells[index]) << '"';
  }
  std::cout << "],\"player\":\"" << (player == Mark::kX ? "X" : "O")
            << "\",\"status\":\"" << status << '"';
  if (status == "x_wins") std::cout << ",\"winner\":\"X\"";
  if (status == "o_wins") std::cout << ",\"winner\":\"O\"";
  std::cout << "}\n";
}

}  // namespace

int main() {
  Cells cells{};
  Mark player = Mark::kX;
  int sequence = 1;
  WriteSnapshot(sequence, cells, player);

  std::string line;
  while (std::getline(std::cin, line)) {
    std::istringstream input(line);
    int row = 0;
    int col = 0;
    if (!(input >> row >> col)) continue;
    if (row < 0 || row >= kSize || col < 0 || col >= kSize) {
      std::cout << "{\"version\":1,\"sequence\":" << sequence
                << ",\"error\":{\"code\":\"invalid_move\",\"message\":\"坐标超出棋盘\"}}\n";
      continue;
    }
    const std::size_t index = static_cast<std::size_t>(row) * kSize +
                              static_cast<std::size_t>(col);
    if (cells[index] != Mark::kEmpty) {
      std::cout << "{\"version\":1,\"sequence\":" << sequence
                << ",\"error\":{\"code\":\"occupied\",\"message\":\"位置已被占用\"}}\n";
      continue;
    }
    cells[index] = player;
    player = player == Mark::kX ? Mark::kO : Mark::kX;
    ++sequence;
    WriteSnapshot(sequence, cells, player);
    if (StatusOf(cells) != "in_progress") break;
  }
  return 0;
}
