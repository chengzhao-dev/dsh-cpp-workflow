#include <iostream>

#include "greeting/include/greeting.h"

int main() {
  std::cout << greeting::MakeGreeting("C++23") << '\n';
  return 0;
}
