{
  "targets": [
    {
      "target_name": "ble_device_binding",
      "sources": [
        "src/binding.cc",
        "src/BLEDevice.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include.replace(/\\\\/g, '/')\")",
        "<!(node -p \"require('path').join(process.cwd(), 'src').replace(/\\\\/g, '/')\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp.replace(/\\\\/g, '/')\")"
      ],
      "defines": [],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1
        }
      },
      "cflags": ["/EHsc"]
    }
  ]
}
