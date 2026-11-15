#[=======================================================================[.rst:
CompileSettings
---------------

在一个目标上设置 C++ 语言标准与警告等级。

.. code-block:: cmake

  include(CompileSettings)

Commands
^^^^^^^^

.. command:: set_target_cxx_standard

  .. code-block:: cmake

    set_target_cxx_standard(<target> <visibility> <standard>)

  让目标使用指定的 C++ 语言标准。

  ``<visibility>`` 取 ``PUBLIC``、``PRIVATE`` 或 ``INTERFACE``。
  ``INTERFACE`` 通过 compile feature 传播最低标准，纯头文件的 target
  仍需使用方自己调用一次。

  ``<standard>`` 取 ``c++11``、``c++14``、``c++17``、``c++20`` 或
  ``c++23``。

  函数先把 ``c++NN`` 的后两位转成 ``NN``，再设置两处：compile
  feature ``cxx_std_NN`` 负责传播「至少该标准」，``CXX_STANDARD``
  属性固定精确标准，``CXX_STANDARD_REQUIRED`` 防止编译器静默降级，
  ``CXX_EXTENSIONS`` 关闭编译器扩展。

.. command:: set_target_warnings

  .. code-block:: cmake

    set_target_warnings(<target> <visibility> [LEVEL <level>])

  给目标加一组编译警告。

  只改传入的目标，``PRIVATE`` 不向使用方传播。

  ``<level>`` 取 ``basic``、``standard`` 或 ``strict``，省略时按
  ``standard``。

  档位依次收紧：``strict`` 包含 ``standard``，``standard`` 包含
  ``basic``；MSVC 与 Clang/GNU 使用各自等价的开关。
#]=======================================================================]

include_guard(GLOBAL)

function(set_target_cxx_standard target visibility standard)
	set(supported_standards c++11 c++14 c++17 c++20 c++23)

	if(NOT TARGET "${target}")
		message(FATAL_ERROR
			"set_target_cxx_standard: target '${target}' does not exist")
	endif()

	if(NOT visibility MATCHES "^(PUBLIC|PRIVATE|INTERFACE)$")
		message(FATAL_ERROR
			"set_target_cxx_standard: visibility must be "
			"PUBLIC, PRIVATE, or INTERFACE")
	endif()

	if(NOT standard IN_LIST supported_standards)
		message(FATAL_ERROR
			"set_target_cxx_standard: standard must be one of "
			"${supported_standards}")
	endif()

	string(SUBSTRING "${standard}" 3 -1 number)

	target_compile_features("${target}" "${visibility}" "cxx_std_${number}")

	set_target_properties("${target}" PROPERTIES
		CXX_STANDARD "${number}"
		CXX_STANDARD_REQUIRED ON
		CXX_EXTENSIONS OFF
	)
endfunction()

function(set_target_warnings target visibility)
	cmake_parse_arguments(PARSE_ARGV 2 arg "" "LEVEL" "")

	if(arg_UNPARSED_ARGUMENTS)
		message(FATAL_ERROR
			"set_target_warnings: unexpected arguments: "
			"${arg_UNPARSED_ARGUMENTS}")
	endif()

	if(NOT TARGET "${target}")
		message(FATAL_ERROR
			"set_target_warnings: target '${target}' does not exist")
	endif()

	if(NOT visibility MATCHES "^(PRIVATE|INTERFACE)$")
		message(FATAL_ERROR
			"set_target_warnings: visibility must be PRIVATE or INTERFACE")
	endif()

	if(NOT arg_LEVEL)
		set(arg_LEVEL standard)
	endif()

	if(MSVC)
		set(basic_warnings /W4)
		set(standard_warnings ${basic_warnings} /permissive- /WX)
		set(strict_warnings
			${standard_warnings}
			/w14242 /w14254 /w14263 /w14265 /w14287 /w14296
			/w14311 /w14545 /w14546 /w14547 /w14549 /w14555
			/w14619 /w14640 /w14826
		)
	elseif(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
		set(basic_warnings -Wall -Wextra)
		set(standard_warnings
			${basic_warnings}
			-Werror
			-Wshadow
			-Wold-style-cast
			-Wpedantic
			-Wnon-virtual-dtor
			-Woverloaded-virtual
		)
		set(strict_warnings
			${standard_warnings}
			-Wcast-align
			-Wcast-qual
			-Wconversion
			-Wsign-conversion
			-Wdouble-promotion
			-Wformat=2
			-Wimplicit-fallthrough
			-Wnull-dereference
			-Wundef
		)
	else()
		message(FATAL_ERROR
			"set_target_warnings: unsupported compiler "
			"'${CMAKE_CXX_COMPILER_ID}'")
	endif()

	if(arg_LEVEL STREQUAL "basic")
		set(warnings ${basic_warnings})
	elseif(arg_LEVEL STREQUAL "standard")
		set(warnings ${standard_warnings})
	elseif(arg_LEVEL STREQUAL "strict")
		set(warnings ${strict_warnings})
	else()
		message(FATAL_ERROR
			"set_target_warnings: LEVEL must be basic, standard, or strict")
	endif()

	target_compile_options("${target}" "${visibility}" ${warnings})
endfunction()
