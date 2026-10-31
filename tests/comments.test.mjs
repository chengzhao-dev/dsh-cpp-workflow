// 注释检查器锁定 references/comments.md 的硬规则：文件头、标签、注释与声明的贴合、
// 成员清单、设计论证、跨类分工、类型系统复述、否定式边界、领域尺寸、谓词首句、
// @param 完整性与枚举行尾注释。规则改动时必须同步这里的用例。
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { checkText, displayWidth, functionParams, EXIT } from '../skills/developing-cpp/scripts/checking-comments.mjs'

const SCRIPT = fileURLToPath(new URL('../skills/developing-cpp/scripts/checking-comments.mjs', import.meta.url))

function rules(text, options = {}) {
  return checkText(text, options).map((issue) => issue.rule)
}

function file(...lines) {
  return ['/// @file board.h', '/// @brief 定义棋盘。', '', ...lines, ''].join('\n')
}

test('注释行超过 80 列时报错', () => {
  assert.deepEqual(rules(file()), [])
  const wide = `/// ${'中'.repeat(40)}
int f();
`
  assert.deepEqual(rules(file(wide), { width: 80 }), ['comment-width'])
})

test('缺少文件头时报错', () => {
  assert.deepEqual(rules('class Board {};\n'), ['header-missing'])
  assert.deepEqual(rules('class Board {};\n', { requireHeader: false }), [])
})

test('文件头用 /// @file 与 @brief 收口', () => {
  const doxy = ['/// @file board.h', '/// @brief 定义棋盘。', '', 'class Board {};', ''].join('\n')
  assert.deepEqual(rules(doxy), [])
  assert.deepEqual(rules('/// @file board.h\n\nclass Board {};\n'), ['header-brief'])
  assert.ok(rules('/// @brief 定义棋盘。\n\nclass Board {};\n').includes('header-missing'))
  const cross = ['/// @file board.h', '/// @brief 定义棋盘。', '///', '/// 对局在 game.h。', '', 'class Board {};', ''].join('\n')
  assert.ok(rules(cross, { fileName: 'board.h' }).includes('header-cross-file'))
})

test('块注释在 --comment-style block 下收口', () => {
  const block = [
    '/**',
    ' * @file board.h',
    ' * @brief 定义棋盘。',
    ' *',
    ' * 棋盘状态。',
    ' */',
    '',
    '/**',
    ' * 棋盘。',
    ' */',
    'class Board {};',
    '',
  ].join('\n')
  assert.deepEqual(rules(block, { commentStyle: 'block', fileName: 'board.h' }), [])
  assert.ok(rules(block, { fileName: 'board.h' }).includes('header-missing'))
  const wrong = block.replace('@file board.h', '@file game.h')
  assert.ok(rules(wrong, { commentStyle: 'block', fileName: 'board.h' }).includes('header-file-name'))
  const missingBrief = block.replace(' * @brief 定义棋盘。\n', '')
  assert.ok(rules(missingBrief, { commentStyle: 'block' }).includes('header-brief'))
})

test('块注释同样检查禁止标签与行宽', () => {
  const block = ['/**', ' * @file board.h', ' * @brief 定义棋盘。', ' */', '', '/**', ' * 函数。', ' * @returns 结果', ' */', 'int F();', ''].join('\n')
  assert.ok(rules(block, { commentStyle: 'block' }).includes('forbidden-tag'))
  const wide = ['/**', ` * @file board.h`, ` * @brief ${'中'.repeat(45)}`, ' */', ''].join('\n')
  assert.ok(rules(wide, { commentStyle: 'block' }).includes('comment-width'))
})

test('文件头提到别的源文件或目录时报错', () => {
  const cross = ['/// @file board.h', '/// @brief 定义棋盘。', '///', '/// 对局流程在 game.h。', '', 'class Board {};', ''].join('\n')
  assert.ok(rules(cross, { fileName: 'board.h' }).includes('header-cross-file'))
  const own = ['/// @file board.h', '/// @brief 定义棋盘。', '///', '/// 棋盘状态。', '', 'class Board {};', ''].join('\n')
  assert.ok(!rules(own, { fileName: 'board.h' }).includes('header-cross-file'))
  const apps = ['/// @file board.h', '/// @brief 定义棋盘。', '///', '/// 输入输出在 apps/。', '', 'class Board {};', ''].join('\n')
  assert.ok(rules(apps, { fileName: 'board.h' }).includes('header-cross-file'))
})

test('禁止的 Doxygen 标签', () => {
  for (const tag of ['@returns 结果', '@author 某人', '@details 细节']) {
    assert.deepEqual(rules(file(`/// 函数。`, `///`, `/// ${tag}`, `int F();`)), ['forbidden-tag'], tag)
  }
})

test('注释与声明之间不能有空行', () => {
  assert.deepEqual(rules(file('/// 函数。', '', 'int F();')), ['doc-gap'])
})

test('类型注释不许罗列成员功能', () => {
  const text = file(
    '/// 棋盘。',
    '///',
    '/// 提供检查坐标、放置棋子和判定终局的功能。',
    'class Board {};',
  )
  assert.deepEqual(rules(text), ['member-list'])
})

test('接口注释不许写方案对比', () => {
  const text = file(
    '/// 棋盘。',
    '///',
    '/// 用大括号按名字初始化，比位置参数更难写反。',
    'class Board {};',
  )
  assert.deepEqual(rules(text), ['rationale'])
  const contract = file('/// 棋盘。', '///', '/// 越界、已占或要写空格子都返回 false，不抛异常。', 'class Board {};')
  assert.deepEqual(rules(contract), [])
})

test('类型注释不许交代别的类型负责什么', () => {
  const text = file(
    '/// 井字棋棋盘。',
    '///',
    '/// 不含回合推进：谁该落子留在 Game。',
    'class Board {};',
  )
  assert.deepEqual(rules(text), ['forward-ref', 'negated-boundary'])
  const contract = file('/// 井字棋棋盘。', '///', '/// 每格取空、X 或 O；越界坐标不会写入棋盘。', 'class Board {};')
  assert.deepEqual(rules(contract), [])
})

test('类型注释不写否定式边界', () => {
  const text = file('/// 棋盘坐标。', '///', '/// 只保存位置，不拥有棋盘区间。', 'struct CellPosition {};')
  assert.deepEqual(rules(text), ['negated-boundary'])
  const ok = file('/// 棋盘坐标。', 'struct CellPosition {};')
  assert.deepEqual(rules(ok), [])
})

test('类型注释不写领域尺寸', () => {
  const text = file('/// 井字棋棋盘。', '///', '/// 3×3 个格子。', 'class Board {};')
  assert.deepEqual(rules(text), ['domain-size'])
  const ok = file('/// 井字棋棋盘。', 'class Board {};')
  assert.deepEqual(rules(ok), [])
})

test('谓词首句写检查是否', () => {
  const bad = file('/// 坐标在棋盘内时返回 true。', 'bool IsInRange(CellPosition position) const;')
  assert.deepEqual(rules(bad), ['predicate-first'])
  const opBad = file('/// 比较两个坐标。', 'bool operator==(const CellPosition& other) const;')
  assert.deepEqual(rules(opBad), ['predicate-first'])
  const ok = file('/// 检查坐标是否在棋盘内。', 'bool IsInRange(CellPosition position) const;')
  assert.deepEqual(rules(ok), [])
})

test('类型注释不许复述类型系统已表达的性质', () => {
  const text = file(
    '/// 井字棋棋盘。',
    '///',
    '/// 棋盘是值语义，可以自由拷贝。',
    'class Board {};',
  )
  assert.deepEqual(rules(text), ['type-system'])
})

test('@param 必须与声明参数一一对应', () => {
  const missing = file('/// 放置。', '/// @param position 坐标。', 'bool Place(CellPosition position, CellType type);')
  assert.deepEqual(rules(missing), ['param-missing'])
  const extra = file('/// 放置。', '/// @param position 坐标。', '/// @param type 类型。', '/// @param mode 模式。', 'bool Place(CellPosition position, CellType type);')
  assert.deepEqual(rules(extra), ['param-extra'])
  const ok = file('/// 放置。', '/// @param position 坐标。', '/// @param type 类型。', 'bool Place(CellPosition position, CellType type);')
  assert.deepEqual(rules(ok), [])
})

test('没有 @param 的短注释不触发完整性检查', () => {
  assert.deepEqual(rules(file('/// 清空棋盘。', 'void Clear();')), [])
})

test('@param 支持 [out] 说明', () => {
  const text = file('/// 查询。', '/// @param[out] result 写入结果。', '/// @param cells 格子。', 'void Query(std::vector<Cell>& result, int cells);')
  assert.deepEqual(rules(text), [])
})

test('枚举成员注释全写或全不写', () => {
  const partial = file('/// 玩家。', 'enum class Player : std::uint8_t {', '  kCross = 0,  ///< 先手。', '  kNought = 1,', '};')
  assert.deepEqual(rules(partial), ['enum-partial'])
  const full = file('/// 玩家。', 'enum class Player : std::uint8_t {', '  kCross = 0,   ///< 先手。', '  kNought = 1,  ///< 后手。', '};')
  assert.deepEqual(rules(full), [])
})

test('枚举行尾两种句式与冒号约束', () => {
  const ok = file(
    '/// 落子结果。',
    'enum class PlaceResult {',
    '  kSuccess = 0,  ///< 落子成功。',
    '  kEmptyType = 2,  ///< 非法参数：传入空棋盘格子类型。',
    '};',
  )
  assert.deepEqual(rules(ok), [])
  const noColonComma = file(
    '/// 落子结果。',
    'enum class PlaceResult {',
    '  kEmptyType = 2,  ///< 传入空棋盘格子类型，非法参数。',
    '};',
  )
  assert.deepEqual(rules(noColonComma), [])
  const empty = file(
    '/// 落子结果。',
    'enum class PlaceResult {',
    '  kSuccess = 0,  ///< 落子成功：。',
    '};',
  )
  assert.ok(rules(empty).includes('enum-trailing-empty'))
  const field = file(
    'struct CellPosition {',
    '  std::int32_t row{};  ///< 行坐标，0 表示最上面一行。',
    '};',
  )
  assert.deepEqual(rules(field), [])
  const final = file(
    '/// 格子的状态。',
    'enum class CellState : std::uint8_t {',
    '  kEmpty = 0,  ///< 状态为空，尚未设置',
    '  kX = 1,      ///< 状态为 X',
    '  kO = 2,      ///< 状态为 O',
    '};',
    '',
    '/// 格子。',
    'class Cell {',
    ' public:',
    '  /// 表示格子状态的变更结果。',
    '  enum class PlaceResult : std::uint8_t {',
    '    kEmptyState = 0,  ///< 未变更：传入状态为 `kEmpty`，格子状态保持不变',
    '    kOccupied = 1,    ///< 未变更：格子已有状态，格子状态保持不变',
    '    kPlaced = 2,      ///< 已变更：状态成功更新空白格子',
    '  };',
    '};',
  )
  assert.deepEqual(rules(final), [])
})

test('声明宽度与注释行宽按中文两列计算', () => {
  assert.equal(displayWidth('/// 中文'), 8)
  assert.equal(displayWidth('/// abc'), 7)
  const long = `/// ${'中文'.repeat(30)}`
  assert.ok(rules(file(long, 'int F();'), { width: 40 }).includes('comment-width'))
})

test('函数声明解析不把类型别名或类当成函数', () => {
  assert.deepEqual(functionParams('using Handler = void (*)(int);'), undefined)
  assert.deepEqual(functionParams('class Board;'), undefined)
  assert.deepEqual(functionParams('int Compute(int a, int b);'), ['a', 'b'])
  assert.deepEqual(functionParams('template <typename T> void Sort(std::vector<T>& items, bool stable);'), ['items', 'stable'])
  assert.deepEqual(functionParams('void Run(int x = 3, const std::string& name = "a");'), ['x', 'name'])
  assert.deepEqual(functionParams('void Run();'), [])
})

test('CLI 在临时仓库上返回 1 并输出 JSON', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'comments-'))
  try {
    writeFileSync(path.join(dir, 'bad.h'), 'class Board {};\n')
    const proc = runCli(['--root', dir, '--json'])
    assert.equal(proc.status, 1)
    const report = JSON.parse(proc.stdout)
    assert.equal(report.files, 1)
    assert.ok(report.issues.some((issue) => issue.rule === 'header-missing'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI 在干净目录上返回 0', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'comments-'))
  try {
    mkdirSync(path.join(dir, 'src'))
    writeFileSync(path.join(dir, 'src', 'main.cpp'), '/// @file main.cpp\n/// @brief 入口。\n\n#include <iostream>\nint main() { return 0; }\n')
    const proc = runCli(['--root', dir, '--quiet'])
    assert.equal(proc.status, 0)
    assert.equal(proc.stdout, '')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI 跳过构建目录', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'comments-'))
  try {
    mkdirSync(path.join(dir, 'build'))
    writeFileSync(path.join(dir, 'build', 'generated.h'), 'class Generated {};\n')
    const proc = runCli(['--root', dir, '--json'])
    assert.equal(proc.status, 0)
    assert.equal(JSON.parse(proc.stdout).files, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('紧贴声明的存储注释会复述下一行', () => {
  const text = file(
    'class Board {',
    '  // cells_ 存储棋盘格子。',
    '  std::array<std::array<Cell, 3>, 3> cells_{};',
    '};',
  )
  assert.ok(rules(text).includes('restates-next'))
  const axis = file(
    'class Board {',
    '  /// 井字棋棋盘格子数组，外层是行，内层是列。',
    '  std::array<std::array<Cell, 3>, 3> cells_{};',
    '};',
  )
  assert.ok(!rules(axis).includes('restates-next'))
  const ok = file(
    'class Board {',
    '  /// 棋盘。',
    '  std::array<std::array<Cell, 3>, 3> cells_{};',
    '};',
  )
  assert.ok(!rules(ok).includes('restates-next'))
})

test('数据成员只有行尾注释时报主注释缺失', () => {
  const bad = file(
    'class Board {',
    ' private:',
    '  std::array<std::array<Cell, 3>, 3> cells_{};  // 值初始化后每个棋盘格子都是空格子。',
    '};',
  )
  assert.ok(rules(bad).includes('member-comment-missing'))
  const good = file(
    'class Board {',
    ' private:',
    '  /// 井字棋棋盘格子数组，外层是行，内层是列。',
    '  std::array<std::array<Cell, 3>, 3> cells_{};',
    '};',
  )
  assert.ok(!rules(good).includes('member-comment-missing'))
  assert.ok(!rules(good).includes('member-comment-trailing'))
  assert.ok(!rules(good).includes('member-comment-slash'))
  const trailing = file(
    'class Board {',
    ' private:',
    '  /// 井字棋棋盘格子数组，外层是行，内层是列。',
    '  std::array<std::array<Cell, 3>, 3> cells_{};  // 值初始化后每个棋盘格子都是空格子。',
    '};',
  )
  assert.ok(rules(trailing).includes('member-comment-trailing'))
  const slash = file(
    'class Board {',
    ' private:',
    '  // 井字棋棋盘格子数组，外层是行，内层是列。',
    '  std::array<std::array<Cell, 3>, 3> cells_{};',
    '};',
  )
  assert.ok(rules(slash).includes('member-comment-slash'))
  const enumLine = file(
    'enum class CellType {',
    '  kEmpty,  ///< 空格子。',
    '};',
  )
  assert.ok(!rules(enumLine).includes('member-comment-missing'))
  const publicField = file(
    'struct Stats {',
    '  int count_{};  ///< 已落子数。',
    '};',
  )
  assert.ok(!rules(publicField).includes('member-comment-missing'))
})

test('CLI 从 .clang-format 读取 ColumnLimit', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'comments-'))
  try {
    writeFileSync(path.join(dir, '.clang-format'), 'ColumnLimit: 120\n')
    writeFileSync(path.join(dir, 'note.h'), '// ' + 'a'.repeat(100) + '\nint f();\n')
    const wide = runCli(['--root', dir, '--no-header', '--json'])
    assert.equal(wide.status, 0, wide.stdout)
    const strict = runCli(['--root', dir, '--no-header', '--json', '--width', '80'])
    assert.equal(strict.status, 1)
    assert.ok(JSON.parse(strict.stdout).issues.some((issue) => issue.rule === 'comment-width'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('不存在的根目录返回用法错误而不是堆栈', () => {
  const missing = path.join(tmpdir(), `comments-missing-${process.pid}-${Date.now()}`)
  const result = runCli(['--root', missing])
  assert.equal(result.status, EXIT.usage)
  assert.match(result.stdout + result.stderr, /根目录不存在或无法读取/)
  assert.doesNotMatch(result.stdout + result.stderr, /ENOENT|readColumnLimit/)
})

test('@file 必须等于实际文件名', () => {
  const text = ['/// @file board.h', '/// @brief 定义棋盘。', '', 'class Board {};', ''].join('\n')
  assert.deepEqual(rules(text, { fileName: 'board.h' }), [])
  assert.ok(rules(text, { fileName: 'game.h' }).includes('header-file-name'))
})

test('@brief 可以按配置关掉', () => {
  const text = ['/// @file board.h', '', 'class Board {};', ''].join('\n')
  assert.ok(rules(text, { fileName: 'board.h' }).includes('header-brief'))
  assert.ok(!rules(text, { fileName: 'board.h', requireBrief: false }).includes('header-brief'))
})

test('隐私标签只有显式放行才通过', () => {
  const text = ['/// @file board.h', '/// @brief 定义棋盘。', '/// @author chengzhao-dev', '', 'class Board {};', ''].join('\n')
  assert.ok(rules(text, { fileName: 'board.h' }).includes('forbidden-tag'))
  assert.ok(!rules(text, { fileName: 'board.h', allowTags: new Set(['author']) }).includes('forbidden-tag'))
  const dir = mkdtempSync(path.join(tmpdir(), 'comments-'))
  try {
    writeFileSync(path.join(dir, 'board.h'), text)
    assert.equal(runCli(['--root', dir]).status, 1)
    assert.equal(runCli(['--root', dir, '--allow-tag', 'author']).status, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('--allow-tag 缺值时返回用法错误', () => {
  const result = runCli(['--root', '.', '--allow-tag'])
  assert.equal(result.status, EXIT.usage)
  assert.match(result.stderr, /--allow-tag 需要标签名/)
})

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { status: 0, stdout }
  } catch (error) {
    return { status: error.status ?? EXIT.issues, stdout: error.stdout ?? '', stderr: error.stderr ?? '' }
  }
}
