#include <cstdint>
#include <functional>
#include <napi.h>
#include <cstdlib>
#include <iostream>

struct InteropContext;
using InteropCallback = void(InteropContext*, int32_t);

struct InteropContext {
    Napi::Promise::Deferred deferred;
    Napi::ThreadSafeFunction tsf;
    int32_t exitCode = -2000000000;
};

// Function to build interop data (context and callback)
struct InteropData {
    InteropContext* context;
    InteropCallback* callback;
};

using ResolveValueFn = std::function<Napi::Value(Napi::Env, int32_t)>;

InteropData buildInteropData(Napi::Env env, ResolveValueFn resolveValue) {
    auto deferred = Napi::Promise::Deferred::New(env);

    auto resolveFn = Napi::Function::New(env, [deferred, resolveValue](const Napi::CallbackInfo& cbInfo) {
        int32_t result = cbInfo[0].As<Napi::Number>().Int32Value();
        Napi::Value value = resolveValue(cbInfo.Env(), result);
        deferred.Resolve(value);
    });

    auto tsf = Napi::ThreadSafeFunction::New(env, resolveFn, "InteropCallback", 0, 1);
    auto context = new InteropContext{ deferred, tsf, -2000000000 };

    auto callback = [](InteropContext* c, int32_t result) {
        c->exitCode = result;
        c->tsf.NonBlockingCall(c, [](Napi::Env env, Napi::Function jsCallback, InteropContext* ctx) {
            jsCallback.Call({Napi::Number::New(env, ctx->exitCode)});
            ctx->tsf.Release();
            delete ctx;
        });
    };

    return {context, callback};
}

extern "C" {
    void* swiftBleDeviceInit(const char* serviceUUID, const char* characteristicUUID);
    void swiftBleDeviceDestroy(void* handle);
    void swiftBleDeviceConnect(void* handle, InteropContext* context, InteropCallback callback);
    int32_t swiftBleDeviceWrite(void* handle, const uint8_t* data, int32_t length);
    int32_t swiftBleDeviceRead(void* handle, void** data, double timeout);
    void swiftFreeData(void* ptr);
}

Napi::Value wrap_bleDeviceInit(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
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
    auto env = info.Env();
    if (info.Length() < 1 || !info[0].IsExternal()) {
        Napi::TypeError::New(env, "Expected handle").ThrowAsJavaScriptException();
        return env.Null();
    }
    auto handle = info[0].As<Napi::External<void>>();

    auto data = buildInteropData(env, [](Napi::Env env, int32_t result) {
        return Napi::Boolean::New(env, result == 0);
    });

    swiftBleDeviceConnect(handle.Data(), data.context, data.callback);

    return data.context->deferred.Promise();
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
    
    auto deferred = Napi::Promise::Deferred::New(env);
    deferred.Resolve(Napi::Boolean::New(env, result == 0));
    return deferred.Promise();
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
    int32_t result = swiftBleDeviceRead(external.Data(), &data, timeout / 1000.0);

    auto deferred = Napi::Promise::Deferred::New(env);
    if (result > 0 && data != nullptr) {
        Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, static_cast<uint8_t*>(data), result);
        swiftFreeData(data);
        deferred.Resolve(buffer);
    } else {
        deferred.Resolve(Napi::Buffer<uint8_t>::New(env, 0));
    }
    return deferred.Promise();
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
