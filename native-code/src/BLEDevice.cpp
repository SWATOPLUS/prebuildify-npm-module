#include "BLEDevice.h"
#include <iostream>
#include <chrono>
#include <algorithm>
#include <winrt/Windows.Devices.Enumeration.h>

using namespace winrt;
using namespace Windows::Devices::Bluetooth;
using namespace Windows::Devices::Bluetooth::GenericAttributeProfile;
using namespace Windows::Devices::Enumeration;
using namespace Windows::Storage::Streams;

BLEDevice::BLEDevice(const std::wstring& nameSubstring,
    const std::wstring& characteristicUuidStr)
    : m_nameSubstring(nameSubstring),
      m_charUuid(winrt::guid(characteristicUuidStr)) {
    winrt::init_apartment();
}

std::optional<uint64_t> BLEDevice::findDeviceAddressByNameSubstring() {
    winrt::init_apartment();  

    auto selector = BluetoothLEDevice::GetDeviceSelector();  
    auto devices = DeviceInformation::FindAllAsync(selector).get();  

    for (auto&& device : devices) {  
        const auto& name = device.Name();  
        std::wstring nameStd = name.c_str();
        if (!nameStd.empty() && nameStd.find(m_nameSubstring) != std::wstring::npos) {
            auto bleDevice = BluetoothLEDevice::FromIdAsync(device.Id()).get();  
            if (bleDevice != nullptr)  
                return bleDevice.BluetoothAddress();  
        }  
    }  
    return std::nullopt;  
}

bool BLEDevice::connect() {
    auto optAddress = findDeviceAddressByNameSubstring();
    if (!optAddress.has_value())
        return false;

    uint64_t bluetoothAddress = *optAddress;

    m_device = BluetoothLEDevice::FromBluetoothAddressAsync(bluetoothAddress).get();
    if (!m_device) return false;

    auto services = m_device.GattServices();
    for (auto&& service : services) {
        auto charResult = service.GetCharacteristicsForUuidAsync(m_charUuid).get();
        if (charResult.Status() != GattCommunicationStatus::Success)
            continue;

        auto characteristics = charResult.Characteristics();
        if (characteristics.Size() == 0)
            continue;

        m_characteristic = characteristics.GetAt(0);
        auto status = m_characteristic.WriteClientCharacteristicConfigurationDescriptorAsync(
            GattClientCharacteristicConfigurationDescriptorValue::Notify).get();

        if (status != GattCommunicationStatus::Success)
            return false;

        m_characteristic.ValueChanged({ this, &BLEDevice::notificationHandler });
        return true;
    }
    return false; // characteristic not found
}


void BLEDevice::notificationHandler(GattCharacteristic const&,
    GattValueChangedEventArgs const& args) {
    auto reader = DataReader::FromBuffer(args.CharacteristicValue());
    std::vector<uint8_t> data(reader.UnconsumedBufferLength());
    reader.ReadBytes(data);

    {
        std::lock_guard<std::mutex> lock(m_mutex);
        m_notificationBuffer.insert(m_notificationBuffer.end(), data.begin(), data.end());
    }
    m_cv.notify_one();
}

bool BLEDevice::write(const std::vector<uint8_t>& data) {
    if (!m_characteristic) {
		std::cerr << "Characteristic not initialized." << std::endl;
        return false;
    }

    DataWriter writer;
    writer.WriteBytes(data);
    auto buffer = writer.DetachBuffer();
    auto status = m_characteristic.WriteValueAsync(buffer).get();
    if (status != GattCommunicationStatus::Success) {
        std::wcout << "Write failed with status: " << static_cast<int>(status) << std::endl;
        return false;
	}
    return status == GattCommunicationStatus::Success;
}

std::optional<std::vector<uint8_t>> BLEDevice::read(size_t size, uint32_t timeoutMs) {
    std::unique_lock<std::mutex> lock(m_mutex);

    auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeoutMs);
    while (m_notificationBuffer.size() < size) {
        if (m_cv.wait_until(lock, deadline) == std::cv_status::timeout) {
            return std::nullopt; // Not enough bytes in time
        }
    }

    std::vector<uint8_t> result(m_notificationBuffer.begin(), m_notificationBuffer.begin() + size);
    m_notificationBuffer.erase(m_notificationBuffer.begin(), m_notificationBuffer.begin() + size);
    return result;
}

