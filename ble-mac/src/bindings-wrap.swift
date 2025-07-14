import Foundation
import CoreBluetooth
import Darwin

typealias BLEDeviceHandle = UnsafeMutableRawPointer?

@_cdecl("bleDeviceInit")
func bleDeviceInit(serviceUUID: UnsafePointer<CChar>, characteristicUUID: UnsafePointer<CChar>) -> BLEDeviceHandle {
    let serviceStr = String(cString: serviceUUID)
    let charStr = String(cString: characteristicUUID)
    let device = BLEDevice(serviceUUID: serviceStr, characteristicUUID: charStr)
    return Unmanaged.passRetained(device).toOpaque()
}

@_cdecl("bleDeviceDestroy")
func bleDeviceDestroy(_ handle: BLEDeviceHandle) {
    guard let handle = handle else { return }
    _ = Unmanaged<BLEDevice>.fromOpaque(handle).takeRetainedValue()
}

@_cdecl("bleDeviceConnect")
func bleDeviceConnect(_ handle: BLEDeviceHandle) -> Int32 {
    guard let handle = handle else { return -1 }
    let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
    let semaphore = DispatchSemaphore(value: 0)
    var result: Int32 = -1
    Task {
        do {
            try await device.connect()
            result = 0
        } catch {
            result = -1
        }
        semaphore.signal()
    }
    _ = semaphore.wait(timeout: .distantFuture)
    return result
}

@_cdecl("bleDeviceWrite")
func bleDeviceWrite(_ handle: BLEDeviceHandle, _ data: UnsafePointer<UInt8>, _ length: Int32) -> Int32 {
    guard let handle = handle else { return -1 }
    let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
    let swiftData = Data(bytes: data, count: Int(length))
    device.write(swiftData)
    return 0 // Assume success
}

@_cdecl("bleDeviceRead")
func bleDeviceRead(_ handle: BLEDeviceHandle, _ dataPtr: UnsafeMutablePointer<UnsafeMutableRawPointer?>, _ lengthPtr: UnsafeMutablePointer<Int32>, _ timeout: Double) -> Int32 {
    guard let handle = handle else {
        dataPtr.pointee = nil
        lengthPtr.pointee = 0
        return -1
    }
    let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
    let semaphore = DispatchSemaphore(value: 0)
    var readData: Data? = nil
    var result: Int32 = -1
    Task {
        if let data = await device.read(timeout: timeout) {
            readData = data
            result = 0
        } else {
            result = -1
        }
        semaphore.signal()
    }
    _ = semaphore.wait(timeout: .distantFuture)
    if let data = readData {
        let count = data.count
        if let rawPtr = malloc(count) {
            data.copyBytes(to: rawPtr.bindMemory(to: UInt8.self, capacity: count), count: count)
            dataPtr.pointee = rawPtr
            lengthPtr.pointee = Int32(count)
        } else {
            dataPtr.pointee = nil
            lengthPtr.pointee = 0
            result = -1
        }
    } else {
        dataPtr.pointee = nil
        lengthPtr.pointee = 0
        result = -1
    }
    return result
}

@_cdecl("freeData")
func freeData(_ ptr: UnsafeMutableRawPointer) {
    free(ptr)
}