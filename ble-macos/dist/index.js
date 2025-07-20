var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __moduleCache = /* @__PURE__ */ new WeakMap;
var __toCommonJS = (from) => {
  var entry = __moduleCache.get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function")
    __getOwnPropNames(from).map((key) => !__hasOwnProp.call(entry, key) && __defProp(entry, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    }));
  __moduleCache.set(from, entry);
  return entry;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// prebuilds/darwin-arm64/@clevetura+ble-macos.node
var require__clevetura_ble_macos = __commonJS((exports2, module2) => {
  module2.exports = require("./@clevetura+ble-macos-mr9r2gkq.node");
});

// index.ts
var exports_ble_macos = {};
__export(exports_ble_macos, {
  BleDeviceMac: () => BleDeviceMac
});
module.exports = __toCommonJS(exports_ble_macos);
var {
  bleDeviceInit,
  bleDeviceDestroy,
  bleDeviceConnect,
  bleDeviceWrite,
  bleDeviceRead
} = require__clevetura_ble_macos();

class BleDeviceMac {
  _device = null;
  constructor() {
    this._device = null;
  }
  init(serviceUuid, characteristicUuid) {
    if (this._device) {
      throw new Error("BleDevice already initialized");
    }
    this._device = bleDeviceInit(serviceUuid, characteristicUuid);
    if (!this._device) {
      throw new Error("Failed to create BleDevice");
    }
  }
  destroy() {
    if (!this._device) {
      throw new Error("BleDevice not initialized");
    }
    bleDeviceDestroy(this._device);
    this._device = null;
  }
  connect() {
    if (!this._device) {
      throw new Error("BleDevice not initialized");
    }
    return bleDeviceConnect(this._device);
  }
  write(data) {
    if (!this._device) {
      throw new Error("BleDevice not initialized");
    }
    return bleDeviceWrite(this._device, data);
  }
  read(timeoutMs) {
    if (!this._device) {
      throw new Error("BleDevice not initialized");
    }
    return bleDeviceRead(this._device, timeoutMs);
  }
}
