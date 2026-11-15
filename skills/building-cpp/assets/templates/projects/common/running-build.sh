#!/usr/bin/env bash

# 配置、构建、测试并运行当前 C++11–C++23 工程（默认 C++23）。
#
# 用法：./running-build.sh [clang|gcc]；省略时用 clang。
# 程序名与构建目录可用 APP_NAME、BUILD_DIR 覆盖；默认 app 与 build/<compiler>。
# 编译数据库：build/<compiler>/compile_commands.json。
# 适用于 Linux、macOS 和 Windows + WSL，不支持 Windows 原生壳。

set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="${APP_NAME:-app}"
BUILD_ROOT="${BUILD_ROOT:-build}"

# 解析编译器参数，只接受 clang 与 gcc。
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
BUILD_DIR="${BUILD_DIR:-${BUILD_ROOT}/${COMPILER}}"

# 打印阶段标题。
header() {
    printf '\n== %s ==\n' "$1"
}

# 打印错误。
err() {
    printf '错误: %s\n' "$1" >&2
}

# 命令失败时打印退出码与命令。
on_error() {
    local status=$?
    printf '失败（退出码 %s）：%s\n' "${status}" "${BASH_COMMAND}" >&2
}
trap on_error ERR

# 入口：配置、构建、导出编译数据库、测试并运行。
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
    if [ -d tests ]; then
        ctest --test-dir "${BUILD_DIR}" --output-on-failure --no-tests=error
    else
        ctest --test-dir "${BUILD_DIR}" --output-on-failure
    fi

    header "运行 ${APP_NAME}"
    (
        cd "${BUILD_DIR}/bin"
        "./${APP_NAME}"
    )
}

main "$@"
