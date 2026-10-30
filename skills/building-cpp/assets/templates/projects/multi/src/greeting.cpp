#include "greeting.h"

#include <string>
#if __cplusplus >= 202002L
#include <format>
#endif

namespace greeting {

std::string MakeGreeting(const std::string& name) {
#if __cplusplus >= 202002L
  return std::format("Hello, {}!", name);
#else
  return "Hello, " + name + "!";
#endif
}

}  // namespace greeting
