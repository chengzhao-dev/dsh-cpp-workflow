# 给一个 target 施加团队警告；不污染全局 CMAKE_CXX_FLAGS。
function(cpp_workflow_apply_warnings target)
  target_compile_options(${target} PRIVATE
    -Wall
    -Wextra
    -Werror
    -Wold-style-cast
    -Wshadow
  )
endfunction()
