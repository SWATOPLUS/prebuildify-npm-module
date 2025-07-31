#include "../node_modules/node-addon-api/napi.h"
#include "BLEDevice.h"
#include <memory>
#include <thread>
#include <functional>
#include <iostream>
#include <iomanip>
#include <winrt/Windows.Foundation.h>
#include <type_traits>

// Generic AsyncResult structure
template <typename T>
struct AsyncResult
{
  std::function<void(T)> callback;
  Napi::Promise promise;
};

// Generic buildAsyncResult function
template <typename T>
AsyncResult<T> buildAsyncResult(Napi::Env env)
{
  auto deferred = Napi::Promise::Deferred::New(env);
  auto resolveFn = Napi::Function::New(env, [deferred](const Napi::CallbackInfo &cbInfo)
                                       { deferred.Resolve(cbInfo[0]); });

  auto tsf = Napi::ThreadSafeFunction::New(env, resolveFn, "AsyncCallback", 0, 1);

  std::function<void(T)> callback = [tsf](T result) mutable
  {
    struct CallbackData
    {
      T result;
      Napi::ThreadSafeFunction tsf;
    };

    auto *data = new CallbackData{result, tsf};

    tsf.NonBlockingCall(data, [](Napi::Env env, Napi::Function jsCallback, CallbackData *data)
                        {
      Napi::Value value;
      if constexpr (std::is_same_v<T, bool>) {
        value = Napi::Boolean::New(env, data->result);
      } else if constexpr (std::is_same_v<T, std::vector<uint8_t>>) {
        value = Napi::Buffer<uint8_t>::Copy(env, data->result.data(), data->result.size());
      } else {
        value = env.Null();
      }
      jsCallback.Call({value});
      data->tsf.Release();
      delete data; });
  };

  return {callback, deferred.Promise()};
}

void asyncConnect(std::shared_ptr<BLEDevice> device, std::function<void(bool)> callback)
{
  std::thread([device, callback]()
              {
    try {
      bool success = device->connect();
      callback(success);
    } catch (...) {
      callback(false);
    } })
      .detach();
}

void asyncWrite(std::shared_ptr<BLEDevice> device, const std::vector<uint8_t> &data, std::function<void(bool)> callback)
{
  std::thread([device, data, callback]()
              {
    try {
      bool success = device->write(data);
      callback(success);
    } catch (...) {
      callback(false);
    } })
      .detach();
}

void asyncRead(std::shared_ptr<BLEDevice> device, uint32_t timeoutMs, std::optional<uint8_t> end_byte, std::function<void(std::vector<uint8_t>)> callback)
{
  std::thread([device, timeoutMs, end_byte, callback]()
              {
    try {
      auto result = device->read(timeoutMs, end_byte);
      callback(result);
    } catch (...) {
      callback(std::vector<uint8_t>());
    } })
      .detach();
}

Napi::Value bleDeviceInit(const Napi::CallbackInfo &info)
{
  auto characteristicUuid = info[1].As<Napi::String>().Utf8Value();
  auto characteristicUuidWide = std::wstring(characteristicUuid.begin(), characteristicUuid.end());
  auto device = std::make_shared<BLEDevice>(characteristicUuidWide);
  auto shared_ptr_on_heap = new std::shared_ptr<BLEDevice>(device);
  return Napi::External<std::shared_ptr<BLEDevice>>::New(info.Env(), shared_ptr_on_heap);
}

Napi::Value bleDeviceDestroy(const Napi::CallbackInfo &info)
{
  auto device = info[0].As<Napi::External<std::shared_ptr<BLEDevice>>>().Data();
  delete device;

  return info.Env().Undefined();
}

Napi::Value bleDeviceConnect(const Napi::CallbackInfo &info)
{
  auto env = info.Env();
  auto device = info[0].As<Napi::External<std::shared_ptr<BLEDevice>>>().Data();
  auto asyncResult = buildAsyncResult<bool>(env);

  asyncConnect(*device, asyncResult.callback);

  return asyncResult.promise;
}

Napi::Value bleDeviceWrite(const Napi::CallbackInfo &info)
{
  auto env = info.Env();
  auto device = info[0].As<Napi::External<std::shared_ptr<BLEDevice>>>().Data();
  auto buffer = info[1].As<Napi::Uint8Array>();
  auto data = std::vector<uint8_t>(buffer.Data(), buffer.Data() + buffer.ElementLength());
  auto asyncResult = buildAsyncResult<bool>(env);
  asyncWrite(*device, data, asyncResult.callback);

  return asyncResult.promise;
}

Napi::Value bleDeviceRead(const Napi::CallbackInfo &info)
{
  auto env = info.Env();
  auto device = info[0].As<Napi::External<std::shared_ptr<BLEDevice>>>().Data();
  auto timeoutMs = info[1].As<Napi::Number>().Uint32Value();
  auto endByte = std::optional<uint8_t>();

  // info[2] can be undefined
  if (info[2].IsNumber())
  {
    endByte = static_cast<uint8_t>(info[2].As<Napi::Number>().DoubleValue());
  }
  auto asyncResult = buildAsyncResult<std::vector<uint8_t>>(env);
  asyncRead(*device, timeoutMs, endByte, asyncResult.callback);

  return asyncResult.promise;
}

Napi::Object initBinding(Napi::Env env, Napi::Object exports)
{
  winrt::init_apartment(winrt::apartment_type::multi_threaded); // Initialize main thread as MTA
  exports.Set("bleDeviceInit", Napi::Function::New(env, bleDeviceInit));
  exports.Set("bleDeviceDestroy", Napi::Function::New(env, bleDeviceDestroy));
  exports.Set("bleDeviceConnect", Napi::Function::New(env, bleDeviceConnect));
  exports.Set("bleDeviceWrite", Napi::Function::New(env, bleDeviceWrite));
  exports.Set("bleDeviceRead", Napi::Function::New(env, bleDeviceRead));
  return exports;
}

NODE_API_MODULE(ble_device, initBinding)
