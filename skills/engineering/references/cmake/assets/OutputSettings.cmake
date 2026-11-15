#[=======================================================================[.rst:
OutputSettings
--------------

把构建产物输出到固定目录，便于脚本与文档按固定路径引用。

.. code-block:: cmake

  include(OutputSettings)

Commands
^^^^^^^^

.. command:: set_output_directories

  .. code-block:: cmake

    set_output_directories()

  在顶层 ``CMakeLists.txt`` 中调用一次，且要早于目标的创建（通常放在
  ``add_subdirectory()`` 之前）。函数把
  ``CMAKE_<TYPE>_OUTPUT_DIRECTORY`` 这类变量设为固定的输出目录；之后创建
  目标时，CMake 用这些变量初始化目标的输出目录属性：

  - ``RUNTIME`` 目标的产物输出到 ``build/bin``。
  - ``LIBRARY`` 目标的产物输出到 ``build/lib``。
  - ``ARCHIVE`` 目标的产物输出到 ``build/lib``。
#]=======================================================================]

include_guard(GLOBAL)

function(set_output_directories)
    set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin" PARENT_SCOPE)

    set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib" PARENT_SCOPE)

    set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib" PARENT_SCOPE)
endfunction()
