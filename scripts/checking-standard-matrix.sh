#!/usr/bin/env bash

# 逐个语言标准验证每个工程模板。
#
# 用法：./scripts/checking-standard-matrix.sh
# 依赖：cmake、ninja、perl、node 与 C++ 编译器；在 Linux、macOS 或 WSL 上运行。

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
templates="$root/skills/building-cpp/assets/templates/projects"
cmake_bin="${CMAKE:-cmake}"
cxx="${CXX:-clang++}"
standards=(11 14 17 20 23)
shapes=(single multi static-library shared-library)
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# 缺少依赖命令时直接报错退出。
for command in "$cmake_bin" ninja perl "$cxx" ctest node; do
    if ! command -v "$command" >/dev/null 2>&1; then
        echo "missing command: $command" >&2
        exit 1
    fi
done

# 统计失败用例，跑完后统一退出。
failures=0

# 四种模板 × 五个标准逐一配置、构建、测试，再核对实际编译选项。
for shape in "${shapes[@]}"; do
    for std in "${standards[@]}"; do
        dest="$work/$shape-$std"
        cp -R "$templates/$shape" "$dest"

        while IFS= read -r file; do
            perl -0pi -e \
                "s/cxx_std_23/cxx_std_$std/g; s/CXX_STANDARD 23/CXX_STANDARD $std/g;" \
                -e "s/\\{\\{PROJECT_NAME\\}\\}/matrix_${shape}_${std}/g" \
                "$file"
        done < <(find "$dest" -name CMakeLists.txt -type f)

        if ! "$cmake_bin" -S "$dest" -B "$dest/build" -G Ninja \
            -DCMAKE_BUILD_TYPE=Debug -DCMAKE_CXX_COMPILER="$cxx" \
            >"$dest/configure.log" 2>&1; then
            echo "FAIL configure $shape c++$std (log: $dest/configure.log)" >&2
            failures=$((failures + 1))
            continue
        fi

        if ! "$cmake_bin" --build "$dest/build" >"$dest/build.log" 2>&1; then
            echo "FAIL build $shape c++$std (log: $dest/build.log)" >&2
            failures=$((failures + 1))
            continue
        fi

        if ! ctest --test-dir "$dest/build" --output-on-failure >"$dest/test.log" 2>&1; then
            echo "FAIL test $shape c++$std (log: $dest/test.log)" >&2
            failures=$((failures + 1))
            continue
        fi

        # 逐条编译命令核对：每条恰好一个 -std，值等于本档期望（C++23 也接受旧驱动的 c++2b 拼写），且不落 gnu++NN。
        if ! DB="$dest/build/compile_commands.json" STD="$std" node -e '
const fs = require("fs");
const db = JSON.parse(fs.readFileSync(process.env.DB, "utf8"));
const expected = ["-std=c++" + process.env.STD];
if (process.env.STD === "23") expected.push("-std=c++2b");
const bad = [];
for (const entry of db) {
  const args = entry.arguments || String(entry.command || "").split(/\s+/);
  const stds = args.filter((arg) => arg.startsWith("-std="));
  if (stds.length !== 1 || !expected.includes(stds[0])) bad.push(`${entry.file || "?"}: ${stds.join(",") || "none"}`);
}
if (db.length === 0) bad.push("compile_commands.json 为空");
if (bad.length) { console.error(`std 不符: ${bad.slice(0, 3).join("; ")}`); process.exit(1); }
'; then
            echo "FAIL flags $shape c++$std" >&2
            failures=$((failures + 1))
            continue
        fi

        printf 'PASS %-15s c++%s\n' "$shape" "$std"
    done
done

if ((failures != 0)); then
    echo "$failures matrix case(s) failed" >&2
    exit 1
fi

echo "all ${#shapes[@]} x ${#standards[@]} template-standard cases passed"
