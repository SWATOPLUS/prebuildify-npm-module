#include "../node_modules/node-addon-api/napi.h"
#include "BLEDevice.h"
#include <memory>
#include <thread>
#include <functional>
#include <iostream>
#include <iomanip>
#include <winrt/Windows.Foundation.h>

using AsyncCallback = std::function<void(int32_t)>;

struct AsyncResult
{
  AsyncCallback callback;
  Napi::Promise promise;
};

AsyncResult buildAsyncResult(Napi::Env env)
{
  auto deferred = Napi::Promise::Deferred::New(env);
  auto resolveFn = Napi::Function::New(env, [deferred](const Napi::CallbackInfo &cbInfo)
                                       {
    int32_t result = cbInfo[0].As<Napi::Number>().Int32Value();
    deferred.Resolve(Napi::Boolean::New(cbInfo.Env(), result == 0)); });

  auto tsf = Napi::ThreadSafeFunction::New(env, resolveFn, "AsyncCallback", 0, 1);

  // Define the async callback
  AsyncCallback callback = [tsf](int32_t result) mutable
  {
    struct CallbackData {
      int32_t result;
      Napi::ThreadSafeFunction tsf;
    };
    
    auto* data = new CallbackData{result, tsf};
    
    tsf.NonBlockingCall(data, [](Napi::Env env, Napi::Function jsCallback, CallbackData* data) {
      jsCallback.Call({Napi::Number::New(env, data->result)});
      data->tsf.Release();
      delete data;
    });
  };

  return {callback, deferred.Promise()};
}

void asyncConnect(std::shared_ptr<BLEDevice> device, AsyncCallback callback)
{
  std::thread([device, callback]()
              {
                try {
                  bool success = device->connect();
                  int32_t result = success ? 0 : -1;
                  callback(result);
                }
                catch (const winrt::hresult_error& e) {
                  std::wcerr << L"WinRT Exception in asyncConnect: " << e.message().c_str() 
                             << L" (HRESULT: 0x" << std::hex << e.code() << L")" << std::endl;
                  callback(-1);
                }
                catch (const std::exception& e) {
                  std::cerr << "Standard Exception in asyncConnect: " << e.what() << std::endl;
                  callback(-1);
                }
                catch (...) {
                  std::cerr << "Unknown Exception in asyncConnect." << std::endl;
                  callback(-1);
                }
              })
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
  auto asyncResult = buildAsyncResult(env);

  asyncConnect(*device, asyncResult.callback);

  return asyncResult.promise;
}

Napi::Value bleDeviceWrite(const Napi::CallbackInfo &info)
{
  auto device = info[0].As<Napi::External<std::shared_ptr<BLEDevice>>>().Data();
  auto buffer = info[1].As<Napi::Uint8Array>();
  auto data = std::vector<uint8_t>(buffer.Data(), buffer.Data() + buffer.ElementLength());

  auto result = (*device)->write(data);

  auto env = info.Env();
  auto deferred = Napi::Promise::Deferred::New(env);
  deferred.Resolve(Napi::Boolean::New(env, result));

  return deferred.Promise();
}

Napi::Value bleDeviceRead(const Napi::CallbackInfo &info)
{
  auto device = info[0].As<Napi::External<std::shared_ptr<BLEDevice>>>().Data();
  auto timeoutMs = info[1].As<Napi::Number>().Uint32Value();
  auto endByte = std::optional<uint8_t>();

  // info[2] can be undefined
  if (info[2].IsNumber())
  {
    endByte = static_cast<uint8_t>(info[2].As<Napi::Number>().DoubleValue());
  }

  auto result = (*device)->read(timeoutMs, endByte);
  auto env = info.Env();
  auto deferred = Napi::Promise::Deferred::New(env);

  deferred.Resolve(Napi::Buffer<uint8_t>::Copy(env, result.data(), result.size()));

  return deferred.Promise();
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
