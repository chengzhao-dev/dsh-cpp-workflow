#[=======================================================================[.rst:
LinkSettings
------------

设置构建期运行时路径，并为测试取回 GoogleTest。

.. code-block:: cmake

  include(LinkSettings)

Commands
^^^^^^^^

.. command:: set_target_build_rpath

  .. code-block:: cmake

    set_target_build_rpath(<target>)

  让 ``build/bin`` 里的程序找到同级 ``build/lib`` 下的库。

  只改构建树，不改安装后的 ``RPATH``。

.. command:: fetch_googletest

  .. code-block:: cmake

    fetch_googletest()

  取回 GoogleTest 并让其 target 可用。

  固定 v1.17.0 与 SHA-256；只在测试目录调用，库与程序代码不调用。
  这是本文件唯一会下载的函数。
#]=======================================================================]

include_guard(GLOBAL)

function(set_target_build_rpath target)
    if(NOT TARGET "${target}")
        message(FATAL_ERROR
            "set_target_build_rpath: target '${target}' does not exist")
    endif()

    if(APPLE)
        set_target_properties("${target}" PROPERTIES
            BUILD_RPATH "@loader_path/../lib")
    else()
        set_target_properties("${target}" PROPERTIES BUILD_RPATH "$ORIGIN/../lib")
    endif()
endfunction()

function(fetch_googletest)
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
