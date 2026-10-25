add_library(greeting STATIC src/greeting.cpp)
target_include_directories(greeting PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/..)
target_compile_features(greeting PUBLIC cxx_std_23)
set_target_properties(greeting PROPERTIES
  CXX_STANDARD 23
  CXX_STANDARD_REQUIRED ON
  CXX_EXTENSIONS OFF
)
target_compile_options(greeting PRIVATE
  -Wall
  -Wextra
  -Werror
  -Wold-style-cast
  -Wshadow
)
