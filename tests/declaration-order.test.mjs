// 定义顺序检查器锁定 references/layout/03-declaration-order.md 的定义顺序与签名规则。
// 只比较配对头文件中能找到声明的类成员；自由函数、匿名命名空间与注释不参与。
import assert from 'node:assert/strict'
import test from 'node:test'

import { checkHeaderOrder, checkPair, cppDefinitions, findClasses } from '../skills/developing-cpp/scripts/checking-declaration-order.mjs'

const HEADER = `class Board {
 public:
  static constexpr int kRowCount = 3;
  static bool IsInRange(Position position) noexcept;
  Board() = default;
  Square GetSquare(Position position) const;
  BoardStatus GetStatus() const;
  void SetStatus(BoardStatus status);
  Square::PlaceResult Place(Position position, SquareValue value);
  void ClearSquare(Position position);
  void Clear();
 private:
  static void CheckInRange(Position position);
  static std::size_t ToIndex(Position position) noexcept;
  std::array<Square, kSquareCount> squares_{};
};`

const CPP = `bool Board::IsInRange(Position position) noexcept { return true; }
Board::Board() = default;
Square Board::GetSquare(Position position) const { return squares_[0]; }
BoardStatus Board::GetStatus() const { return BoardStatus::kInProgress; }
void Board::SetStatus(BoardStatus status) {}
Square::PlaceResult Board::Place(Position position, SquareValue value) { return {}; }
void Board::ClearSquare(Position position) {}
void Board::Clear() {}
void Board::CheckInRange(Position position) {}
std::size_t Board::ToIndex(Position position) noexcept { return 0; }`

test('定义顺序与头文件声明一致时通过', () => {
  assert.deepEqual(checkPair(HEADER, CPP), [])
})

test('谓词放在 Get/Set 成对之后时通过', () => {
  const good = HEADER.replace(
    '  Square::PlaceResult Place(Position position, SquareValue value);\n',
    '  bool IsFull() const noexcept;\n  Square::PlaceResult Place(Position position, SquareValue value);\n',
  )
  assert.deepEqual(checkPair(good, CPP), [])
})

test('谓词插在 Get/Set 之间时报错', () => {
  const bad = HEADER.replace(
    '  void SetStatus(BoardStatus status);\n',
    '  bool IsFull() const noexcept;\n  void SetStatus(BoardStatus status);\n',
  )
  const issues = checkPair(bad, CPP)
  assert.ok(issues.some((issue) => issue.rule === 'header-order' && /IsFull/.test(issue.message)))
})

test('谓词排在读取接口之前时报错', () => {
  const bad = HEADER.replace(
    '  Square GetSquare(Position position) const;\n',
    '  bool IsFull() const noexcept;\n  Square GetSquare(Position position) const;\n',
  )
  const issues = checkPair(bad, CPP)
  assert.ok(issues.some((issue) => issue.rule === 'header-order' && /IsFull/.test(issue.message)))
})

test('没有 Set 配对时谓词在读取接口之后通过', () => {
  const header = `class Selector {
 public:
  int GetCount() const;
  bool IsSelected(int index) const;
  void Select(int index);
};`
  assert.deepEqual(checkHeaderOrder(header), [])
})

test('没有 Set 配对时谓词排在修改接口之后报错', () => {
  const header = `class Selector {
 public:
  int GetCount() const;
  void Select(int index);
  bool IsSelected(int index) const;
};`
  const issues = checkHeaderOrder(header)
  assert.ok(issues.some((issue) => issue.rule === 'header-order' && /IsSelected/.test(issue.message)))
})

test('成员定义乱序时报出被跳过的成员', () => {
  const reversed = CPP.replace(
    'Square Board::GetSquare(Position position) const { return squares_[0]; }\nBoardStatus Board::GetStatus() const { return BoardStatus::kInProgress; }',
    'BoardStatus Board::GetStatus() const { return BoardStatus::kInProgress; }\nSquare Board::GetSquare(Position position) const { return squares_[0]; }',
  )
  const issues = checkPair(HEADER, reversed)
  assert.equal(issues.length, 1)
  assert.match(issues[0].message, /Board::GetSquare 出现在 Board::GetStatus 之后/)
  assert.match(issues[0].message, /IsInRange → Board → GetSquare/)
})

test('构造函数提前于头文件声明时报错', () => {
  const reordered = CPP.replace(
    'bool Board::IsInRange(Position position) noexcept { return true; }\nBoard::Board() = default;',
    'Board::Board() = default;\nbool Board::IsInRange(Position position) noexcept { return true; }',
  )
  assert.equal(checkPair(HEADER, reordered).length, 1)
})

test('注释与字符串里的类名不参与定义顺序', () => {
  const withComments = `// Board::Clear();
const char* text = "Board::Clear()";
${CPP}`
  assert.deepEqual(checkPair(HEADER, withComments), [])
})

test('自由函数与匿名命名空间不计入类成员', () => {
  const definitions = cppDefinitions(`namespace {
void Helper() {}
}
void Free() {}
bool Board::IsInRange(Position position) noexcept { return true; }`)
  assert.deepEqual(definitions.map((item) => `${item.className}::${item.name}`), ['Board::IsInRange'])
})

test('头文件里没有声明的类成员定义被跳过', () => {
  assert.deepEqual(checkPair(HEADER, 'void Other::Run() {}'), [])
})

test('解析类体时会忽略 enum class 与前置声明', () => {
  const classes = findClasses(`enum class Color { kRed }; class Board; class Game { public: void Run(); };`)
  assert.deepEqual(classes.map((item) => item.name), ['Game'])
})

test('参数类型与声明不一致时报定义签名问题', () => {
  const changed = CPP.replace(
    'Square::PlaceResult Board::Place(Position position, SquareValue value)',
    'Square::PlaceResult Board::Place(Position position, DisplayRenderer value)',
  )
  const issues = checkPair(HEADER, changed)
  assert.ok(issues.some((issue) => issue.rule === 'definition-signature' && /Board::Place/.test(issue.message)))
})

test('返回类型与声明不一致时报定义签名问题', () => {
  const changed = CPP.replace('Square Board::GetSquare', 'SquareValue Board::GetSquare')
  const issues = checkPair(HEADER, changed)
  assert.ok(issues.some((issue) => issue.rule === 'definition-signature' && /Board::GetSquare/.test(issue.message)))
})

test('缺 const 与 noexcept 时报定义签名问题', () => {
  const changed = CPP
    .replace('Square Board::GetSquare(Position position) const', 'Square Board::GetSquare(Position position)')
    .replace('bool Board::IsInRange(Position position) noexcept', 'bool Board::IsInRange(Position position)')
  const issues = checkPair(HEADER, changed)
  assert.equal(issues.filter((issue) => issue.rule === 'definition-signature').length, 2)
})

test('只改参数名或多行签名时通过', () => {
  const renamed = CPP
    .replace('Square Board::GetSquare(Position position) const', 'Square Board::GetSquare(Position pos) const')
    .replace('void Board::ClearSquare(Position position) {}', 'void Board::ClearSquare(Position pos) {}')
  assert.deepEqual(checkPair(HEADER, renamed), [])

  const multiline = CPP.replace(
    'Square Board::GetSquare(Position position) const { return squares_[0]; }',
    'Square Board::GetSquare(Position position) const {\n  return squares_[0];\n}',
  )
  assert.deepEqual(checkPair(HEADER, multiline), [])
})

test('构造函数参数类型与声明不一致时报定义签名问题', () => {
  const header = `class Session {
 public:
  Session(Game& game, Display& display, Input& input);
};`
  const cpp = `Session::Session(Game& game, DisplayRenderer& renderer, Input& input)
    : game_{game}, display_{renderer}, input_{input} {}`
  const issues = checkPair(header, cpp)
  assert.ok(issues.some((issue) => issue.rule === 'definition-signature' && /Session::Session/.test(issue.message)))
})

test('多行构造函数参数类型与声明不一致时报定义签名问题', () => {
  const header = `class GameSession {
 public:
  GameSession(Game& game, Screen& screen, InputHandler& input_handler);
};`
  const cpp = `GameSession::GameSession(Game& game, DisplayRenderer& renderer,
                         InputHandler& input_handler)
    : game_{game}, renderer_{renderer}, input_handler_{input_handler} {}`
  const issues = checkPair(header, cpp)
  assert.ok(issues.some((issue) => issue.rule === 'definition-signature' && /GameSession::GameSession/.test(issue.message)))
})

test('模板成员声明按保守规则跳过', () => {
  const header = `class Box {
 public:
  template <typename T>
  void Put(T value);
};`
  const cpp = `template <typename T>
void Box::Put(T value) {}`
  assert.deepEqual(checkPair(header, cpp), [])
})

test('头文件类内没有声明的定义报 definition-undeclared', () => {
  const issues = checkPair(HEADER, 'void Board::Missing() {}')
  assert.equal(issues.length, 1)
  assert.equal(issues[0].rule, 'definition-undeclared')
  assert.match(issues[0].message, /Board::Missing/)
})
