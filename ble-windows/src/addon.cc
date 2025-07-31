#include "../node_modules/node-addon-api/napi.h"
#include "BLEDevice.h"
#include "utils.h"

Napi::Value bleDeviceInit(const Napi::CallbackInfo &info)
{
  // we don't need info[0] which represents serviceUuid
  auto characteristicUuid = info[1].As<Napi::String>().Utf8Value();
  auto characteristicUuidWide = std::wstring(characteristicUuid.begin(), characteristicUuid.end());
  auto device = new BLEDevice(characteristicUuidWide);

  return Napi::External<BLEDevice>::New(info.Env(), device);
}

Napi::Value bleDeviceDestroy(const Napi::CallbackInfo &info)
{
  auto device = info[0].As<Napi::External<BLEDevice>>().Data();
  delete device;

  return info.Env().Undefined();
}

Napi::Value bleDeviceConnect(const Napi::CallbackInfo &info)
{
  auto device = info[0].As<Napi::External<BLEDevice>>().Data();
  auto result = device->connect();

  auto env = info.Env();
  auto deferred = Napi::Promise::Deferred::New(env);
  deferred.Resolve(Napi::Boolean::New(env, result));

  return deferred.Promise();
}

Napi::Value bleDeviceWrite(const Napi::CallbackInfo &info)
{
  auto device = info[0].As<Napi::External<BLEDevice>>().Data();
  auto buffer = info[1].As<Napi::Uint8Array>();
  auto data = std::vector<uint8_t>(buffer.Data(), buffer.Data() + buffer.ElementLength());

  auto result = device->write(data);

  auto env = info.Env();
  auto deferred = Napi::Promise::Deferred::New(env);
  deferred.Resolve(Napi::Boolean::New(env, result));

  return deferred.Promise();
}

Napi::Value bleDeviceRead(const Napi::CallbackInfo &info)
{
  auto device = info[0].As<Napi::External<BLEDevice>>().Data();
  auto timeoutMs = info[1].As<Napi::Number>().Uint32Value();
  auto endByte = std::optional<uint8_t>();

  // info[2] can be undefined
  if (info[2].IsNumber())
  {
    endByte = static_cast<uint8_t>(info[2].As<Napi::Number>().DoubleValue());
  }

  auto result = device->read(timeoutMs, endByte);
  auto env = info.Env();
  auto deferred = Napi::Promise::Deferred::New(env);

  deferred.Resolve(Napi::Buffer<uint8_t>::Copy(env, result.data(), result.size()));

  return deferred.Promise();
}

Napi::Object initBinding(Napi::Env env, Napi::Object exports)
{
  exports.Set("bleDeviceInit", Napi::Function::New(env, bleDeviceInit));
  exports.Set("bleDeviceDestroy", Napi::Function::New(env, bleDeviceDestroy));
  exports.Set("bleDeviceConnect", Napi::Function::New(env, bleDeviceConnect));
  exports.Set("bleDeviceWrite", Napi::Function::New(env, bleDeviceWrite));
  exports.Set("bleDeviceRead", Napi::Function::New(env, bleDeviceRead));
  return exports;
}

NODE_API_MODULE(ble_device, initBinding)
