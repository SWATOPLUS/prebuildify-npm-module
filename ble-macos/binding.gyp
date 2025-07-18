{
  "targets": [
    {
      "target_name": "ble_device",
      "sources": [
        "src/addon.mm",
        "<!@(bun -p import.meta.dir)/dist-swift/*.o",
      ],
      "include_dirs": [
        "<!@(bun -p \"require('node-addon-api').include\")"
      ],
      "cflags_cc": [ "-fexceptions" ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "xcode_settings": {
        "OTHER_LDFLAGS": ["-Xlinker", "-export_dynamic", "-Xlinker", "-rpath", "-Xlinker", "/usr/lib/swift"],
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "14"
      }
    }
  ]
}