#!/usr/bin/env bash
#===------------------------------------------------------------------------===#
# 配置、构建、测试并运行当前 C++11–C++23 工程（默认 C++23）。
#
# 用法：./running-build.sh [clang|gcc]；省略时用 clang。
# 构建目录：build/<compiler>；
# 编译数据库：build/<compiler>/compile_commands.json
# 适用于 Linux、macOS 和 Windows + WSL；
# 本版本不支持 Windows 原生壳。
#===------------------------------------------------------------------------===#

set -euo pipefail
cd "$(dirname "$0")"

readonly APP_NAME="app"
readonly BUILD_ROOT="build"

COMPILER="${1:-clang}"
case "${COMPILER}" in
  clang)
    readonly CXX="clang++"
    ;;
  gcc)
    readonly CXX="g++"
    ;;
  *)
    printf '用法: %s [clang|gcc]\n' "$0" >&2
    exit 2
    ;;
esac
readonly COMPILER CXX
readonly BUILD_DIR="${BUILD_ROOT}/${COMPILER}"

#===------------------------------------------------------------------------===#
# 输出辅助
#===------------------------------------------------------------------------===#

header() {
  printf '\n== %s ==\n' "$1"
}

err() {
  printf '错误: %s\n' "$1" >&2
}

on_error() {
  local status=$?
  printf '失败（退出码 %s）：%s\n' "${status}" "${BASH_COMMAND}" >&2
}
trap on_error ERR

#===------------------------------------------------------------------------===#
# 主流程
#===------------------------------------------------------------------------===#

main() {
  header "配置 (${COMPILER})"
  cmake -S . -B "${BUILD_DIR}" -G Ninja \
    -DCMAKE_BUILD_TYPE=Debug \
    -DCMAKE_C_COMPILER="${COMPILER}" \
    -DCMAKE_CXX_COMPILER="${CXX}" \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON

  header "构建"
  cmake --build "${BUILD_DIR}"

  header "编译数据库"
  rm -f "${BUILD_ROOT}/compile_commands.json"
  ln -s "${COMPILER}/compile_commands.json" \
    "${BUILD_ROOT}/compile_commands.json"

  header "测试"
  ctest --test-dir "${BUILD_DIR}" --output-on-failure

  header "运行 ${APP_NAME}"
  (
    cd "${BUILD_DIR}/bin"
    "./${APP_NAME}"
  )
}

main "$@"
