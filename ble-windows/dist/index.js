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

// prebuilds/win32-x64/@clevetura+ble-windows.node
var require__clevetura_ble_windows = __commonJS((exports2, module2) => {
  module2.exports = require("./@clevetura+ble-windows-xk1mpdsn.node");
});

// index.ts
var exports_ble_windows = {};
__export(exports_ble_windows, {
  getWindowsApi: () => getWindowsApi
});
module.exports = __toCommonJS(exports_ble_windows);
async function getWindowsApi() {
  const {
    bleDeviceInit,
    bleDeviceDestroy,
    bleDeviceConnect,
    bleDeviceWrite,
    bleDeviceRead
  } = require__clevetura_ble_windows();
  return {
    bleDeviceInit,
    bleDeviceDestroy,
    bleDeviceConnect,
    bleDeviceWrite,
    bleDeviceRead
  };
}
