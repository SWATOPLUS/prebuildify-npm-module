#include <napi.h>
#include "BLEDevice.h"
#include "utils.h"

Napi::Value bleDeviceInit(const Napi::CallbackInfo &info)
{
  return processArgs<Napi::String>(info, [&info](Napi::String characteristicUuidStrValue) -> Napi::Value
                                                 {
    auto characteristicUuidStr = characteristicUuidStrValue.Utf8Value();
    std::wstring wCharacteristicUuidStr(characteristicUuidStr.begin(), characteristicUuidStr.end());
    auto device = new BLEDevice(wCharacteristicUuidStr);

    return Napi::External<BLEDevice>::New(info.Env(), device); });
}

Napi::Value bleDeviceDestroy(const Napi::CallbackInfo &info)
{
  return processArgs<Napi::External<BLEDevice>>(info, [&info](Napi::External<BLEDevice> deviceValue) -> Napi::Value
                                                {
    auto device = deviceValue.Data();
    delete device;

    return info.Env().Undefined(); });
}

Napi::Value bleDeviceConnect(const Napi::CallbackInfo &info)
{
  return processArgs<Napi::External<BLEDevice>>(info, [&info](Napi::External<BLEDevice> deviceValue) -> Napi::Value
                                                {
    auto device = deviceValue.Data();
    auto result = device->connect();

    return Napi::Boolean::New(info.Env(), result); });
}

Napi::Value bleDeviceWrite(const Napi::CallbackInfo &info)
{
  return processArgs<Napi::External<BLEDevice>, Napi::Buffer<uint8_t>>(info, [&info](Napi::External<BLEDevice> deviceValue, Napi::Buffer<uint8_t> bufferValue) -> Napi::Value
                                                                       {
    auto device = deviceValue.Data();
    std::vector<uint8_t> data(bufferValue.Data(), bufferValue.Data() + bufferValue.Length());
    auto result = device->write(data);
    return Napi::Boolean::New(info.Env(), result); });
}

Napi::Value bleDeviceRead(const Napi::CallbackInfo &info)
{
  return processArgs<Napi::External<BLEDevice>, Napi::Number, Napi::Number>(info, [&info](Napi::External<BLEDevice> deviceValue, Napi::Number sizeValue, Napi::Number timeoutValue) -> Napi::Value
                                                                            {
    auto device = deviceValue.Data();
    auto result = device->read(sizeValue.Int32Value(), timeoutValue.Int32Value());
    
    if (result.has_value())
    {
      auto data = result.value();
      auto buffer = Napi::Buffer<uint8_t>::Copy(info.Env(), data.data(), data.size());
      
      return buffer;
    }
    
    return info.Env().Null(); });
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
