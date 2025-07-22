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
  module2.exports = require("./@clevetura+ble-macos-1pch8xdy.node");
});

// index.ts
var exports_ble_macos = {};
__export(exports_ble_macos, {
  getMacosApi: () => getMacosApi
});
module.exports = __toCommonJS(exports_ble_macos);
async function getMacosApi() {
  const {
    bleDeviceInit,
    bleDeviceDestroy,
    bleDeviceConnect,
    bleDeviceWrite,
    bleDeviceRead
  } = require__clevetura_ble_macos();
  return {
    bleDeviceInit,
    bleDeviceDestroy,
    bleDeviceConnect,
    bleDeviceWrite,
    bleDeviceRead
  };
}
