import Foundation
import CoreBluetooth
import Darwin

typealias BLEDeviceHandle = UnsafeMutableRawPointer?

@_cdecl("bleDeviceInit")
func bleDeviceInit(serviceUUID: UnsafePointer<CChar>, characteristicUUID: UnsafePointer<CChar>) -> BLEDeviceHandle {
    guard serviceUUID != nil else { return nil }
    guard characteristicUUID != nil else { return nil }
    let serviceStr = String(cString: serviceUUID)
    let charStr = String(cString: characteristicUUID)
    let device = BLEDevice(serviceUUID: serviceStr, characteristicUUID: charStr)
    let handle = Unmanaged.passRetained(device).toOpaque()
    return handle
}

@_cdecl("bleDeviceDestroy")
func bleDeviceDestroy(_ handle: BLEDeviceHandle) {
    guard let handle = handle else { return }
    Unmanaged<BLEDevice>.fromOpaque(handle).release()
}

@_cdecl("bleDeviceConnect")
func bleDeviceConnect(_ handle: BLEDeviceHandle) -> Int32 {
    guard let handle = handle else { return -1 }
    let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
    let semaphore = DispatchSemaphore(value: 0)
    var connectionError: Error?
    
    Task {
        do {
            try await device.connect()
            semaphore.signal()
        } catch {
            connectionError = error
            semaphore.signal()
        }
    }
    
    let result = semaphore.wait(timeout: .now() + 10.0)
    if result == .success {
        if connectionError != nil {
            return -2
        } else {
            return 0
        }
    } else {
        return -3
    }
}

@_cdecl("bleDeviceWrite")
func bleDeviceWrite(_ handle: BLEDeviceHandle, _ data: UnsafePointer<UInt8>, _ length: Int32) -> Int32 {
    guard let handle = handle else { return -1 }
    guard data != nil else { return -4 }
    let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
    let swiftData = Data(bytes: data, count: Int(length))
    device.write(swiftData)
    return 0
}

@_cdecl("bleDeviceRead")
func bleDeviceRead(_ handle: BLEDeviceHandle, _ dataPtr: UnsafeMutablePointer<UnsafeMutableRawPointer?>, _ length: Int32, _ timeout: Double) -> Int32 {
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

@_cdecl("freeData")
func freeData(_ ptr: UnsafeMutableRawPointer) {
    free(ptr)
}