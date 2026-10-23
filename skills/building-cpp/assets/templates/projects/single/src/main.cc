#include <iostream>
#include <string>
#if __cplusplus >= 202002L
#include <format>
#endif

int main() {
  const std::string name = "C++";
#if __cplusplus >= 202002L
  std::cout << std::format("Hello, {}!\n", name);
#else
  std::cout << "Hello, " << name << "!\n";
#endif
  return 0;
}
