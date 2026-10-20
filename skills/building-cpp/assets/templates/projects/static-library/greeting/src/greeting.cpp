#include "greeting.h"

#include <format>
#include <string>
#include <string_view>

namespace greeting {

std::string MakeGreeting(std::string_view name) {
  return std::format("Hello, {}!", name);
}

}  // namespace greeting
