{
  "targets": [
    {
      "target_name": "ble_device",
      "include_dirs": [
        "<!(node -e \"require('node-addon-api').include\")"
      ],
      "sources": [
        "src/binding22.mm"
        "dist-swift/libblemac_arm64.a",
      ],
    }
  ]
}