cmake_minimum_required(VERSION 3.20)
project({{PROJECT_NAME}} VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")

enable_testing()

add_executable(app
  src/main.cpp
  src/greeting.cpp
)
target_include_directories(app PRIVATE include)
target_compile_features(app PRIVATE cxx_std_20)
set_target_properties(app PROPERTIES CXX_EXTENSIONS OFF)
target_compile_options(app PRIVATE -Wall -Wextra -Werror)

add_test(NAME app_smoke COMMAND app)
