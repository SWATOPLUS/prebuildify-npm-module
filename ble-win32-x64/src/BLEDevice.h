#pragma once
#include <winrt/Windows.Devices.Bluetooth.h>
#include <winrt/Windows.Devices.Bluetooth.GenericAttributeProfile.h>
#include <winrt/Windows.Storage.Streams.h>
#include <mutex>
#include <condition_variable>
#include <queue>

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <functional>

class BLEDevice {
public:
    BLEDevice(const std::wstring& characteristicUuidStr);

    bool connect();
    bool write(const std::vector<uint8_t>& data);
    std::optional<std::vector<uint8_t>> read(size_t size, uint32_t timeoutMs);

private:
    void notificationHandler(winrt::Windows::Devices::Bluetooth::GenericAttributeProfile::GattCharacteristic const&,
        winrt::Windows::Devices::Bluetooth::GenericAttributeProfile::GattValueChangedEventArgs const&);

    //std::optional<uint64_t> findDeviceAddressByVidPid();

    winrt::guid m_charUuid;

    winrt::Windows::Devices::Bluetooth::BluetoothLEDevice m_device{ nullptr };
    winrt::Windows::Devices::Bluetooth::GenericAttributeProfile::GattCharacteristic m_characteristic{ nullptr };

    std::vector<uint8_t> m_notificationBuffer;
    std::mutex m_mutex;
    std::condition_variable m_cv;
};