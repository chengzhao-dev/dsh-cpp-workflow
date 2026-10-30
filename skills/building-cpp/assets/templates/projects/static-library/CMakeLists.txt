cmake_minimum_required(VERSION 3.20)
project({{PROJECT_NAME}} VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")

enable_testing()

add_subdirectory(greeting)

add_executable(app src/main.cpp)
target_compile_features(app PRIVATE cxx_std_23)
set_target_properties(app PROPERTIES
  CXX_STANDARD 23
  CXX_STANDARD_REQUIRED ON
  CXX_EXTENSIONS OFF
)
target_link_libraries(app PRIVATE greeting)
target_compile_options(app PRIVATE -Wall -Wextra -Werror)

add_test(NAME app_smoke COMMAND app)
