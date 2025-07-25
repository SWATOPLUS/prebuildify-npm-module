import Foundation
import CoreBluetooth
import Darwin

typealias BLEDeviceHandle = UnsafeMutableRawPointer?

@_cdecl("swiftBleDeviceInit")
func swiftBleDeviceInit(serviceUUID: UnsafePointer<CChar>, characteristicUUID: UnsafePointer<CChar>) -> BLEDeviceHandle {
    guard serviceUUID != nil else { return nil }
    guard characteristicUUID != nil else { return nil }
    let serviceStr = String(cString: serviceUUID)
    let charStr = String(cString: characteristicUUID)
    let device = BLEDevice(serviceUUID: serviceStr, characteristicUUID: charStr)
    let handle = Unmanaged.passRetained(device).toOpaque()
    return handle
}

@_cdecl("swiftBleDeviceDestroy")
func swiftBleDeviceDestroy(_ handle: BLEDeviceHandle) {
    guard let handle = handle else { return }
    Unmanaged<BLEDevice>.fromOpaque(handle).release()
}

typealias ConnectCallback = @convention(c) (UnsafeMutableRawPointer?, Int32) -> Void

@_cdecl("swiftBleDeviceConnect")
func swiftBleDeviceConnect(_ handle: UnsafeMutableRawPointer?, _ context: UnsafeMutableRawPointer?, _ callback: ConnectCallback?) {
    guard let handle = handle else { return }
    guard let context = context else { return }
    guard let callback = callback else { return }
    
    Task {
        do {
            let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
            try await device.connect()
            callback(context, 0)
        } catch {
            callback(context, -1)
        }
    }
}

@_cdecl("swiftBleDeviceWrite")
func swiftBleDeviceWrite(_ handle: BLEDeviceHandle, _ data: UnsafePointer<UInt8>, _ length: Int32) -> Int32 {
    guard let handle = handle else { return -1 }
    guard data != nil else { return -4 }
    let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
    let swiftData = Data(bytes: data, count: Int(length))
    device.write(swiftData)
    return 0
}

@_cdecl("swiftBleDeviceRead")
func swiftBleDeviceRead(_ handle: BLEDeviceHandle, _ dataPtr: UnsafeMutablePointer<UnsafeMutableRawPointer?>, _ length: Int32, _ timeout: Double) -> Int32 {
    guard let handle = handle else { return -1 }
    let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
    let semaphore = DispatchSemaphore(value: 0)
    var result: Data?

    Task {
        result = await device.read(timeout: timeout)
        semaphore.signal()
    }

    let timeoutTime = DispatchTime.now() + timeout
    let waitResult = semaphore.wait(timeout: timeoutTime)

    if waitResult == .success {
        if let data = result {
            let available = data.count
            let toRead = min(available, Int(length))
            if toRead > 0 {
                let subdata = data.subdata(in: 0..<toRead)
                let ptr = malloc(toRead)
                if let p = ptr {
                    subdata.copyBytes(to: p.assumingMemoryBound(to: UInt8.self), count: toRead)
                    dataPtr.pointee = p
                    return Int32(toRead)
                } else {
                    dataPtr.pointee = nil
                    return -5 // memory allocation failed
                }
            } else {
                dataPtr.pointee = nil
                return 0 // no data
            }
        } else {
            dataPtr.pointee = nil
            return 0 // no data
        }
    } else {
        dataPtr.pointee = nil
        return -6 // read timeout
    }
}

@_cdecl("swiftFreeData")
func swiftFreeData(_ ptr: UnsafeMutableRawPointer) {
    free(ptr)
}