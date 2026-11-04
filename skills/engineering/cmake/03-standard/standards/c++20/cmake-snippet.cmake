# c++20：把 target 名换成实际 target；与 environment.json 的 standard 一致。
target_compile_features(app PRIVATE cxx_std_20)
set_target_properties(app PROPERTIES
  CXX_STANDARD 20
  CXX_STANDARD_REQUIRED ON
  CXX_EXTENSIONS OFF
)
