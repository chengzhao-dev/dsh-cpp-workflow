#!/usr/bin/env bash
#===--------------------------------------------------------------------------------------------===#
# 配置、构建、格式化、静态检查、测试并运行当前 C++20 工程。
#
# 用法：./running-build.sh <clang|gcc>
# 构建目录：build/<compiler>；编译数据库：build/<compiler>/compile_commands.json
# 适用于 Linux、macOS 和 Windows + WSL；Windows 原生组合需要另写 PowerShell 版本。
#===--------------------------------------------------------------------------------------------===#

set -euo pipefail
cd "$(dirname "$0")"

readonly APP_NAME="app"
readonly BUILD_ROOT="build"

COMPILER="${1:-}"
if [[ -z "${COMPILER}" ]]; then
  printf '用法: %s <clang|gcc>\n' "$0" >&2
  exit 2
fi
case "${COMPILER}" in
  clang)
    readonly CXX="clang++"
    ;;
  gcc)
    readonly CXX="g++"
    ;;
  *)
    printf '用法: %s <clang|gcc>\n' "$0" >&2
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
    \( -path ./build -o -path ./.git -o -path ./.cache -o -path ./node_modules \
       -o -path ./third_party -o -path ./external -o -path ./vendor \
       -o -path '*/_deps' \) -prune -o \
    -type f \( -name '*.cpp' -o -name '*.h' -o -name '*.hpp' \) -print0
}

#===--------------------------------------------------------------------------------------------===#
# 主流程
#===--------------------------------------------------------------------------------------------===#

main() {
  header "配置 (${COMPILER})"
  cmake -S . -B "${BUILD_DIR}" -G Ninja \
    -DCMAKE_BUILD_TYPE=Debug \
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
      *.cpp) tidy_sources+=("${file}") ;;
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
    # 没有 .clang-format 时回退 Google 基线，避免 LLVM 默认风格误报。
    clang-format --dry-run --Werror --fallback-style=Google "${format_sources[@]}"
  else
    err "没有找到项目源码，跳过 clang-format"
  fi

  header "静态检查"
  if [[ ${#tidy_sources[@]} -gt 0 ]]; then
    clang-tidy -p "${BUILD_DIR}" --header-filter='.*' \
      --warnings-as-errors='*' "${tidy_sources[@]}"
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
