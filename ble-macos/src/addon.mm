#include <cstdint>
#include <napi.h>
#include <cstdlib>
#include <iostream>

using ContextAndCodeCallback = void(void*, int32_t);

struct CallbackContext {
    Napi::ThreadSafeFunction tsf;
    int32_t result;
};

extern "C" {
    void* swiftBleDeviceInit(const char* serviceUUID, const char* characteristicUUID);
    void swiftBleDeviceDestroy(void* handle);
    void swiftBleDeviceConnect(void* handle, void* context, ContextAndCodeCallback callback);
    int32_t swiftBleDeviceWrite(void* handle, const uint8_t* data, int32_t length);
    int32_t swiftBleDeviceRead(void* handle, void** data, int32_t* length, double timeout);
    void swiftFreeData(void* ptr);
}

Napi::Value wrap_bleDeviceInit(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected serviceUUID and characteristicUUID strings").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::string serviceUUID = info[0].As<Napi::String>().Utf8Value();
    std::string charUUID = info[1].As<Napi::String>().Utf8Value();
    void* handle = swiftBleDeviceInit(serviceUUID.c_str(), charUUID.c_str());
    if (!handle) {
        Napi::Error::New(env, "Failed to create BLEDevice").ThrowAsJavaScriptException();
        return env.Null();
    }
    return Napi::External<void>::New(env, handle);
}

Napi::Value wrap_bleDeviceDestroy(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsExternal()) {
        Napi::TypeError::New(env, "Expected handle").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::External<void> external = info[0].As<Napi::External<void>>();
    swiftBleDeviceDestroy(external.Data());
    return env.Undefined();
}

Napi::Value wrap_bleDeviceConnect(const Napi::CallbackInfo& info) {
    auto handle = info[0].As<Napi::External<void>>(); 

    auto deferred = Napi::Promise::Deferred::New(info.Env());

    auto resolveFn = Napi::Function::New(info.Env(), [deferred](const Napi::CallbackInfo& cbInfo) {
        int32_t result = cbInfo[0].As<Napi::Number>().Int32Value();
        deferred.Resolve(Napi::Boolean::New(cbInfo.Env(), result == 0));
    });

    auto tsf = Napi::ThreadSafeFunction::New(
        info.Env(),
        resolveFn,
        "BridgeCallback",
        0,
        1
    );

    auto context = new CallbackContext{ tsf, -1000000 };

    auto callback = [](void * ctx, int32_t result) {
        auto c = (CallbackContext*)ctx;
        c -> result = result;

        c->tsf.NonBlockingCall(c, [](Napi::Env env, Napi::Function jsCallback, CallbackContext* ctx) {
            jsCallback.Call({Napi::Number::New(env, ctx -> result)});
            ctx->tsf.Release();
            delete ctx;
        });
    };

    swiftBleDeviceConnect(handle.Data(), context, callback);

    return deferred.Promise();
}

Napi::Value wrap_bleDeviceWrite(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsExternal() || !info[1].IsBuffer()) {
        Napi::TypeError::New(env, "Expected handle and buffer").ThrowAsJavaScriptException();
        return env.Null();
    }
    Napi::External<void> external = info[0].As<Napi::External<void>>();
    Napi::Buffer<uint8_t> buffer = info[1].As<Napi::Buffer<uint8_t>>();
    int32_t result = swiftBleDeviceWrite(external.Data(), buffer.Data(), buffer.Length());
    return Napi::Boolean::New(env, result == 0);
}

Napi::Value wrap_bleDeviceRead(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsExternal() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Expected handle and timeout").ThrowAsJavaScriptException();
        return env.Null();
    }
    Napi::External<void> external = info[0].As<Napi::External<void>>();
    double timeout = info[1].As<Napi::Number>().DoubleValue();
    void* data;
    int32_t length;
    int32_t result = swiftBleDeviceRead(external.Data(), &data, &length, timeout);

    if (result > 0 && data != nullptr) {
        Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, static_cast<uint8_t*>(data), length);
        swiftFreeData(data);
        return buffer;
    } else {
        return env.Null();
    }
}

Napi::Object initBinding(Napi::Env env, Napi::Object exports) {
    exports.Set("bleDeviceInit", Napi::Function::New(env, wrap_bleDeviceInit));
    exports.Set("bleDeviceDestroy", Napi::Function::New(env, wrap_bleDeviceDestroy));
    exports.Set("bleDeviceConnect", Napi::Function::New(env, wrap_bleDeviceConnect));
    exports.Set("bleDeviceWrite", Napi::Function::New(env, wrap_bleDeviceWrite));
    exports.Set("bleDeviceRead", Napi::Function::New(env, wrap_bleDeviceRead));
    return exports;
}

NODE_API_MODULE(ble_device, initBinding)