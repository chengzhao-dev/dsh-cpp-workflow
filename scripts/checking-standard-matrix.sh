#!/usr/bin/env bash
# 逐个语言标准验证每个工程模板。
# 在 POSIX 主机（Linux、macOS 或 WSL）上运行，需要 cmake、ninja、perl 与 C++ 编译器。
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
templates="$root/skills/building-cpp/assets/templates/projects"
cmake_bin="${CMAKE:-cmake}"
cxx="${CXX:-clang++}"
standards=(11 14 17 20 23)
shapes=(single multi static-library shared-library)
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

for command in "$cmake_bin" ninja perl "$cxx"; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "missing command: $command" >&2
    exit 1
  fi
done

failures=0

for shape in "${shapes[@]}"; do
  for std in "${standards[@]}"; do
    dest="$work/$shape-$std"
    cp -R "$templates/$shape" "$dest"

    while IFS= read -r file; do
      perl -0pi -e \
        "s/cxx_std_23/cxx_std_$std/g; s/CXX_STANDARD 23/CXX_STANDARD $std/g; s/\\{\\{PROJECT_NAME\\}\\}/matrix_${shape}_${std}/g" \
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

    flags="$(grep -o -- '-std=c++[0-9][0-9]' "$dest/build/compile_commands.json" | sort -u | tr '\n' ' ')"
    expected="-std=c++$std"
    if [[ "$flags" != *"$expected"* ]] || grep -q -- 'gnu++' "$dest/build/compile_commands.json"; then
      echo "FAIL flags $shape c++$std: $flags" >&2
      failures=$((failures + 1))
      continue
    fi

    printf 'PASS %-15s c++%s  %s\n' "$shape" "$std" "$flags"
  done
done

if ((failures != 0)); then
  echo "$failures matrix case(s) failed" >&2
  exit 1
fi

echo "all ${#shapes[@]} x ${#standards[@]} template-standard cases passed"
