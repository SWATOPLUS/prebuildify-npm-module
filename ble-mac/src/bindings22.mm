#include <node_addon_api.h>
#include <stdint.h>

// Declare C-compatible functions from bindings.swift
extern "C" {
    void* bleDeviceInit(const char* serviceUUID, const char* characteristicUUID);
    void bleDeviceDestroy(void* handle);
    void bleDeviceConnect(void* handle, void (*callback)(int32_t));
    void bleDeviceWrite(void* handle, const uint8_t* data, int length, void (*callback)(int32_t));
    void bleDeviceRead(void* handle, double timeout, void (*callback)(const uint8_t*, int, int32_t));
    void freeData(void* ptr);
}

using namespace Napi;

// Initialize a BLEDevice instance
Napi::Value bleDeviceInit(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected serviceUUID and characteristicUUID strings").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::string serviceUUID = info[0].As<Napi::String>().Utf8Value();
    std::string charUUID = info[1].As<Napi::String>().Utf8Value();
    void* handle = bleDeviceInit(serviceUUID.c_str(), charUUID.c_str());
    if (!handle) {
        Napi::Error::New(env, "Failed to create BLEDevice").ThrowAsJavaScriptException();
        return env.Null();
    }

    return Napi::External<void>::New(env, handle);
}

// Destroy a BLEDevice instance
void bleDeviceDestroy(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsExternal()) {
        Napi::TypeError::New(env, "Expected handle").ThrowAsJavaScriptException();
        return;
    }

    Napi::External<void> external = info[0].As<Napi::External<void>>();
    bleDeviceDestroy(external.Data());
}

// Connect to a BLE device
void bleDeviceConnect(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsExternal() || !info[1].IsFunction()) {
        Napi::TypeError::New(env, "Expected handle and callback").ThrowAsJavaScriptException();
        return;
    }

    Napi::External<void> external = info[0].As<Napi::External<void>>();
    Napi::Function callback = info[1].As<Napi::Function>();

    bleDeviceConnect(external.Data(), [](int32_t result) {
        Napi::Env env = Napi::Function::CurrentEnv();
        Napi::HandleScope scope(env);
        if (result == 0) {
            callback.Call({env.Null()});
        } else {
            callback.Call({Napi::Error::New(env, "Connection failed").Value()});
        }
    });
}

// Write data to a BLE device
void bleDeviceWrite(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 3 || !info[0].IsExternal() || !info[1].IsBuffer() || !info[2].IsFunction()) {
        Napi::TypeError::New(env, "Expected handle, buffer, and callback").ThrowAsJavaScriptException();
        return;
    }

    Napi::External<void> external = info[0].As<Napi::External<void>>();
    Napi::Buffer<uint8_t> buffer = info[1].As<Napi::Buffer<uint8_t>>();
    Napi::Function callback = info[2].As<Napi::Function>();

    bleDeviceWrite(external.Data(), buffer.Data(), buffer.Length(), [](int32_t result) {
        Napi::Env env = Napi::Function::CurrentEnv();
        Napi::HandleScope scope(env);
        if (result == 0) {
            callback.Call({env.Null()});
        } else {
            callback.Call({Napi::Error::New(env, "Write failed").Value()});
        }
    });
}

// Read data from a BLE device
void bleDeviceRead(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 3 || !info[0].IsExternal() || !info[1].IsNumber() || !info[2].IsFunction()) {
        Napi::TypeError::New(env, "Expected handle, timeout, and callback").ThrowAsJavaScriptException();
        return;
    }

    Napi::External<void> external = info[0].As<Napi::External<void>>();
    double timeout = info[1].As<Napi::Number>().DoubleValue();
    Napi::Function callback = info[2].As<Napi::Function>();

    bleDeviceRead(external.Data(), timeout, [](const uint8_t* data, int length, int32_t result) {
        Napi::Env env = Napi::Function::CurrentEnv();
        Napi::HandleScope scope(env);
        if (result == 0) {
            Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(env, data, length);
            callback.Call({env.Null(), buffer});
            freeData((void*)data);
        } else {
            callback.Call({Napi::Error::New(env, "Read failed").Value(), env.Null()});
        }
    });
}

// Initialize the module
Napi::Object initBinding(Napi::Env env, Napi::Object exports) {
    exports.Set("bleDeviceInit", Napi::Function::New(env, bleDeviceInit));
    exports.Set("bleDeviceDestroy", Napi::Function::New(env, bleDeviceDestroy));
    exports.Set("bleDeviceConnect", Napi::Function::New(env, bleDeviceConnect));
    exports.Set("bleDeviceWrite", Napi::Function::New(env, bleDeviceWrite));
    exports.Set("bleDeviceRead", Napi::Function::New(env, bleDeviceRead));
    return exports;
}

NODE_API_MODULE(ble_device, initBinding)