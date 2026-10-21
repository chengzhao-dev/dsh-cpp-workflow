#!/usr/bin/env bash
#===--------------------------------------------------------------------------------------------===#
# 配置、构建、格式化、静态检查、测试并运行当前 C++20 工程。
#
# 用法：./running-build.sh [clang|gcc]；省略时用 clang。
# 构建目录：build/<compiler>；编译数据库：build/<compiler>/compile_commands.json
# 适用于 Linux、macOS 和 Windows + WSL；Windows 原生组合需要另写 PowerShell 版本。
#===--------------------------------------------------------------------------------------------===#

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

#===--------------------------------------------------------------------------------------------===#
# 输出辅助
#===--------------------------------------------------------------------------------------------===#

header() {
  printf '\n== %s ==\n' "$1"
}

err() {
  printf '错误: %s\n' "$1" >&2
}

trap 'status=$?; printf "失败（退出码 %s）：%s\n" "${status}" "${BASH_COMMAND}" >&2' ERR

#===--------------------------------------------------------------------------------------------===#
# 项目源码
#===--------------------------------------------------------------------------------------------===#

collect_sources() {
  find . \
    \( -type d \( -name .git -o -name .cache -o -name node_modules \
       -o -name third_party -o -name external -o -name vendor \
       -o -name build -o -name temp -o -name templates \) -prune \) -o \
    -type f \( -name '*.c' -o -name '*.cc' -o -name '*.cpp' -o -name '*.cxx' \
       -o -name '*.h' -o -name '*.hh' -o -name '*.hpp' -o -name '*.hxx' \) -print0
}

# 只让项目自身目录的头文件诊断进入结果。顶层目录从项目文件推导，
# 不硬编码 include/src；项目根同时覆盖 clang-tidy 输出的绝对路径。
# 第三方头即使被包含，也不在项目根 + 顶层目录的白名单里。
header_filter_for() {
  local tops=()
  local file rel top
  for file in "$@"; do
    rel="${file#./}"
    case "${rel}" in
      */*)
        top="${rel%%/*}"
        tops+=("${top}")
        ;;
    esac
  done
  local root
  root="$(pwd -P)"
  if [[ ${#tops[@]} -eq 0 ]]; then
    printf '^(%s/)?[^/]+$' "${root}"
    return 0
  fi
  printf '^(%s/)?((%s)/|[^/]+$)' "${root}" "$(printf '%s\n' "${tops[@]}" | sort -u | paste -sd '|' -)"
}

#===--------------------------------------------------------------------------------------------===#
# 主流程
#===--------------------------------------------------------------------------------------------===#

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
  ln -s "${COMPILER}/compile_commands.json" "${BUILD_ROOT}/compile_commands.json"

  local format_sources=()
  local tidy_sources=()
  local file
  while IFS= read -r -d '' file; do
    format_sources+=("${file}")
    case "${file}" in
      *.c|*.cc|*.cpp|*.cxx) tidy_sources+=("${file}") ;;
    esac
  done < <(collect_sources)

  header "换行检查"
  if [[ ${#format_sources[@]} -gt 0 ]]; then
    local crlf
    crlf=$(grep -Il $'\r' "${format_sources[@]}" || true)
    if [[ -n "${crlf}" ]]; then
      err "以下文件含 CRLF，请改成 LF：${crlf}"
      return 1
    fi
  fi

  header "格式检查"
  if [[ ${#format_sources[@]} -gt 0 ]]; then
    clang-format --dry-run --Werror "${format_sources[@]}"
  else
    err "没有找到项目源码，跳过 clang-format"
  fi

  header "静态检查"
  if [[ ${#tidy_sources[@]} -gt 0 ]]; then
    local header_filter
    local tidy_args=(--warnings-as-errors='*')
    header_filter="$(header_filter_for "${format_sources[@]}")"
    if [[ -n "${header_filter}" ]]; then
      tidy_args+=(--header-filter="${header_filter}")
    fi
    clang-tidy -p "${BUILD_DIR}" "${tidy_args[@]}" "${tidy_sources[@]}"
  else
    err "没有找到 C++ 源文件，跳过 clang-tidy"
  fi

  header "测试"
  ctest --test-dir "${BUILD_DIR}" --output-on-failure

  header "运行 ${APP_NAME}"
  (
    cd "${BUILD_DIR}/bin"
    "./${APP_NAME}"
  )
}

main "$@"
