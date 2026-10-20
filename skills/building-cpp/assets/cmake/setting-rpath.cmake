# 让构建目录里的程序直接找到同目录的共享库；安装规则另配。
function(cpp_workflow_set_build_rpath target)
  if(APPLE)
    set_target_properties(${target} PROPERTIES BUILD_RPATH "@loader_path/../lib")
  else()
    set_target_properties(${target} PROPERTIES BUILD_RPATH "$ORIGIN/../lib")
  endif()
endfunction()
