#pragma once
#include <winrt/Windows.Devices.Bluetooth.h>
#include <winrt/Windows.Devices.Bluetooth.GenericAttributeProfile.h>
#include <winrt/Windows.Storage.Streams.h>
#include <mutex>
#include <condition_variable>
#include <queue>
#include <optional>
#include <vector>

class BLEDevice {
public:
    BLEDevice(const std::wstring& characteristicUuidStr);

    bool connect();
    bool write(const std::vector<uint8_t>& data);
    std::vector<uint8_t> read(uint32_t timeoutMs, std::optional<uint8_t> end_byte);

private:
    void notificationHandler(winrt::Windows::Devices::Bluetooth::GenericAttributeProfile::GattCharacteristic const&,
                             winrt::Windows::Devices::Bluetooth::GenericAttributeProfile::GattValueChangedEventArgs const&);

    winrt::guid m_charUuid;
    winrt::Windows::Devices::Bluetooth::BluetoothLEDevice m_device{ nullptr };
    winrt::Windows::Devices::Bluetooth::GenericAttributeProfile::GattCharacteristic m_characteristic{ nullptr };

    std::vector<uint8_t> m_notificationBuffer;
    std::mutex m_mutex;
    std::condition_variable m_cv;
};
