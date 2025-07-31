#include "BLEDevice.h"
#include <iostream>
#include <chrono>
#include <algorithm>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <winrt/Windows.Devices.Enumeration.h>
#include <winrt/Windows.Devices.Bluetooth.h>
#include <winrt/Windows.Devices.Bluetooth.GenericAttributeProfile.h>
#include <winrt/Windows.Storage.Streams.h>

using namespace winrt;
using namespace Windows::Foundation;
using namespace Windows::Foundation::Collections;
using namespace Windows::Devices::Bluetooth;
using namespace Windows::Devices::Bluetooth::GenericAttributeProfile;
using namespace Windows::Devices::Enumeration;
using namespace Windows::Storage::Streams;

BLEDevice::BLEDevice(const std::wstring& characteristicUuidStr)
    : m_charUuid(winrt::guid(characteristicUuidStr)) {
}

bool BLEDevice::connect() {
    try {
        hstring selector = BluetoothLEDevice::GetDeviceSelector();
        auto devicesOp = DeviceInformation::FindAllAsync(selector);
        DeviceInformationCollection devices = devicesOp.get();

        for (const auto& device : devices) {
            try {
                auto bleDeviceOp = BluetoothLEDevice::FromIdAsync(device.Id());
                BluetoothLEDevice bleDevice = bleDeviceOp.get();
                if (!bleDevice) continue;

                auto servicesOp = bleDevice.GetGattServicesAsync();
                GattDeviceServicesResult servicesResult = servicesOp.get();
                if (servicesResult.Status() != GattCommunicationStatus::Success)
                    continue;

                auto services = servicesResult.Services();
                for (uint32_t i = 0; i < services.Size(); i++) {
                    auto service = services.GetAt(i);
                    auto charOp = service.GetCharacteristicsForUuidAsync(m_charUuid);
                    GattCharacteristicsResult charResult = charOp.get();
                    if (charResult.Status() != GattCommunicationStatus::Success)
                        continue;

                    auto characteristics = charResult.Characteristics();
                    if (characteristics.Size() == 0)
                        continue;

                    m_device = bleDevice;
                    m_characteristic = characteristics.GetAt(0);

                    auto writeOp = m_characteristic.WriteClientCharacteristicConfigurationDescriptorAsync(
                        GattClientCharacteristicConfigurationDescriptorValue::Notify);
                    GattCommunicationStatus status = writeOp.get();

                    if (status != GattCommunicationStatus::Success)
                        return false;

                    m_characteristic.ValueChanged({ this, &BLEDevice::notificationHandler });
                    return true;
                }
            }
            catch (const winrt::hresult_error& e) {
                std::wcerr << L"WinRT Exception while connecting to device: " << e.message().c_str() 
                           << L" (HRESULT: 0x" << std::hex << e.code() << L")" << std::endl;
                // Continue to try next device
            }
            catch (const std::exception& e) {
                std::cerr << "Standard Exception while connecting to device: " << e.what() << std::endl;
                // Continue to try next device
            }
            catch (...) {
                std::cerr << "Unknown Exception while connecting to device." << std::endl;
                // Continue to try next device
            }
        }
    }
    catch (const winrt::hresult_error& e) {
        std::wcerr << L"WinRT Exception during device discovery: " << e.message().c_str() 
                   << L" (HRESULT: 0x" << std::hex << e.code() << L")" << std::endl;
        return false;
    }
    catch (const std::exception& e) {
        std::cerr << "Standard Exception during device discovery: " << e.what() << std::endl;
        return false;
    }
    catch (...) {
        std::cerr << "Unknown Exception during device discovery." << std::endl;
        return false;
    }

    return false;
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

    try {
        DataWriter writer;
        writer.WriteBytes(data);
        auto buffer = writer.DetachBuffer();
        auto writeOp = m_characteristic.WriteValueAsync(buffer);
        GattCommunicationStatus status = writeOp.get();
        
        if (status != GattCommunicationStatus::Success) {
            std::wcout << "Write failed with status: " << static_cast<int>(status) << std::endl;
            return false;
        }
        return status == GattCommunicationStatus::Success;
    }
    catch (const winrt::hresult_error& e) {
        std::cerr << "WinRT Exception during write operation: " << " (HRESULT: 0x" << std::hex << e.code() << ")" << std::endl;
        return false;
    }
    catch (const std::exception& e) {
        std::cerr << "Standard Exception during write operation: " << e.what() << std::endl;
        return false;
    }
    catch (...) {
        std::cerr << "Unknown Exception during write operation." << std::endl;
        return false;
    }
}

std::vector<uint8_t> BLEDevice::read(uint32_t timeoutMs, std::optional<uint8_t> end_byte) {
    std::unique_lock<std::mutex> lock(m_mutex);
    auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeoutMs);

    if (end_byte.has_value()) {
        m_cv.wait_until(lock, deadline, [this, end_byte]() {
            return std::find(m_notificationBuffer.begin(), m_notificationBuffer.end(), end_byte.value()) != m_notificationBuffer.end();
        });

        if (std::find(m_notificationBuffer.begin(), m_notificationBuffer.end(), end_byte.value()) != m_notificationBuffer.end()) {
            auto it = std::find(m_notificationBuffer.begin(), m_notificationBuffer.end(), end_byte.value());
            size_t pos = std::distance(m_notificationBuffer.begin(), it);
            std::vector<uint8_t> result(m_notificationBuffer.begin(), m_notificationBuffer.begin() + pos + 1);
            m_notificationBuffer.erase(m_notificationBuffer.begin(), m_notificationBuffer.begin() + pos + 1);
            return result;
        } else {
            return std::vector<uint8_t>();
        }
    } else {
        m_cv.wait_until(lock, deadline, [this]() { return !m_notificationBuffer.empty(); });

        if (!m_notificationBuffer.empty()) {
            std::vector<uint8_t> result = std::move(m_notificationBuffer);
            m_notificationBuffer.clear();
            return result;
        } else {
            return std::vector<uint8_t>();
        }
    }
}
