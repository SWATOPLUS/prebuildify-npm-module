#ifndef UTILS_H
#define UTILS_H

#include <napi.h>
#include <optional>
#include <tuple>
#include <type_traits>

template <typename... Args>
std::optional<std::tuple<Args...>> validateArgs(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  size_t expectedLength = sizeof...(Args);
  if (info.Length() < expectedLength)
  {
    Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
    return std::nullopt;
  }

  bool valid = true;
  size_t index = 0;
  auto validateType = [&info, &index, &valid, env](auto dummy)
  {
    using T = decltype(dummy);
    if constexpr (std::is_same_v<T, Napi::String>)
    {
      if (!info[index].IsString())
      {
        Napi::TypeError::New(env, "Expected argument " + std::to_string(index) + " to be a string").ThrowAsJavaScriptException();
        valid = false;
      }
    }
    else if constexpr (std::is_same_v<T, Napi::Number>)
    {
      if (!info[index].IsNumber())
      {
        Napi::TypeError::New(env, "Expected argument " + std::to_string(index) + " to be a number").ThrowAsJavaScriptException();
        valid = false;
      }
    }
    else if constexpr (std::is_same_v<T, Napi::Buffer<uint8_t>>)
    {
      if (!info[index].IsBuffer())
      {
        Napi::TypeError::New(env, "Expected argument " + std::to_string(index) + " to be a Buffer").ThrowAsJavaScriptException();
        valid = false;
      }
    }
    else if constexpr (std::is_pointer_v<T> || std::is_same_v<T, Napi::External<typename std::remove_pointer_t<T>>>)
    {
      if (!info[index].IsExternal())
      {
        Napi::TypeError::New(env, "Expected argument " + std::to_string(index) + " to be an external object").ThrowAsJavaScriptException();
        valid = false;
      }
    }
    index++;
  };
  (validateType(Args{}), ...);

  if (!valid)
  {
    return std::nullopt;
  }

  return buildTuple<Args...>(info, std::index_sequence_for<Args...>{});
}

template <typename... Args, size_t... Is>
std::tuple<Args...> buildTuple(const Napi::CallbackInfo &info, std::index_sequence<Is...>)
{
  return std::make_tuple(info[Is].As<Args>()...);
}

template <typename... Args, typename Func>
Napi::Value processArgs(const Napi::CallbackInfo &info, Func lambda)
{
  auto args = validateArgs<Args...>(info);
  if (!args)
  {
    return info.Env().Null();
  }
  return callLambda(lambda, *args, std::index_sequence_for<Args...>{});
}

template <typename Func, typename Tuple, size_t... Is>
Napi::Value callLambda(Func& lambda, Tuple& args, std::index_sequence<Is...>)
{
  return lambda(std::get<Is>(args)...);
}

#endif // UTILS_H
