#include <format>
#include <iostream>
#include <string>

int main() {
  const std::string name = "C++20";
  std::cout << std::format("Hello, {}!\n", name);
  return 0;
}
