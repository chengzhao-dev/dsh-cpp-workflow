// 注释检查器锁定 references/comments.md 的硬规则：横幅、标签、注释与声明的贴合、
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

const BANNER = `//===${'-'.repeat(70)}===//`

function rules(text, options = {}) {
  return checkText(text, options).map((issue) => issue.rule)
}

function file(...lines) {
  return [`${BANNER}`, ...lines, ''].join('\n')
}

test('横幅宽度默认 80 列', () => {
  assert.deepEqual(rules(file()), [])
  const wide = `//===${'-'.repeat(100)}===//\nclass Board {};\n`
  assert.deepEqual(rules(wide, { requireHeader: false }), ['banner-width'])
})

test('缺少文件头横幅时报错', () => {
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

test('文件头提到别的源文件或目录时报错', () => {
  const cross = file(
    '// board.h - 定义棋盘。',
    '//',
    '// 对局流程在 game.h。',
    'class Board {};',
  )
  assert.ok(rules(cross, { fileName: 'board.h' }).includes('header-cross-file'))
  const own = file(
    '// board.h - 定义棋盘。',
    'class Board {};',
  )
  assert.ok(!rules(own, { fileName: 'board.h' }).includes('header-cross-file'))
  const apps = file('// board.h - 定义棋盘。', '//', '// 输入输出在 apps/。', 'class Board {};')
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
    writeFileSync(path.join(dir, 'src', 'main.cpp'), file('#include <iostream>', 'int main() { return 0; }'))
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

function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return { status: 0, stdout }
  } catch (error) {
    return { status: error.status ?? EXIT.issues, stdout: error.stdout ?? '', stderr: error.stderr ?? '' }
  }
}
