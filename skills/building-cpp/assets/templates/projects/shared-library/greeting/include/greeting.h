#pragma once

#include <string>
#include <string_view>

namespace greeting {

[[nodiscard]] std::string MakeGreeting(std::string_view name);

}  // namespace greeting
