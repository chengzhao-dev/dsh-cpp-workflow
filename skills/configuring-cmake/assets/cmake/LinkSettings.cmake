# LinkSettings
#
# 设置构建期运行时路径，并为测试取回 GoogleTest。
#
# 用 include(LinkSettings) 载入。LinkSettings_FetchGoogleTest 是本文件
# 唯一会下载的函数，只在测试需要时调用。
include_guard(GLOBAL)

#-------------------------------------------------------------------------------
# 让 build/bin 里的程序找到同级 build/lib 下的库。
#
# 只改构建树，不改安装后的 RPATH。
#
# :param target: 已经存在的 CMake 目标。
function(LinkSettings_SetBuildRpath target)
  if(NOT TARGET "${target}")
    message(FATAL_ERROR
      "LinkSettings_SetBuildRpath: target '${target}' does not exist")
  endif()

  if(APPLE)
    set_target_properties("${target}" PROPERTIES
      BUILD_RPATH "@loader_path/../lib")
  else()
    set_target_properties("${target}" PROPERTIES BUILD_RPATH "$ORIGIN/../lib")
  endif()
endfunction()

#-------------------------------------------------------------------------------
# 取回 GoogleTest 并让其 target 可用。
#
# 固定 v1.17.0 与 SHA-256；只在 tests 目录调用，库与程序代码不调用。
function(LinkSettings_FetchGoogleTest)
  include(FetchContent)

  if(POLICY CMP0135)
    cmake_policy(SET CMP0135 NEW)
  endif()

  FetchContent_Declare(
    googletest
    URL https://codeload.github.com/google/googletest/tar.gz/refs/tags/v1.17.0
    URL_HASH
      SHA256=65fab701d9829d38cb77c14acdc431d2108bfdbf8979e40eb8ae567edf10b27c
  )
  set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
  FetchContent_MakeAvailable(googletest)
endfunction()
