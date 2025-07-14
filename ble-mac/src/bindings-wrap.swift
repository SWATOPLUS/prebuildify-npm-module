import Foundation
import CoreBluetooth

typealias BLEDeviceHandle = UnsafeMutableRawPointer
typealias ConnectCallback = @convention(c) (Int32) -> Void
typealias WriteCallback = @convention(c) (Int32) -> Void
typealias ReadCallback = @convention(c) (UnsafeMutableRawPointer?, Int, Int32) -> Void

@_cdecl("bleDeviceInit")
func bleDeviceInit(serviceUUID: UnsafePointer<CChar>, characteristicUUID: UnsafePointer<CChar>) -> BLEDeviceHandle {
    let serviceStr = String(cString: serviceUUID)
    let charStr = String(cString: characteristicUUID)
    let device = BLEDevice(serviceUUID: serviceStr, characteristicUUID: charStr)
    return Unmanaged.passRetained(device).toOpaque()
}

@_cdecl("bleDeviceDestroy")
func bleDeviceDestroy(_ handle: BLEDeviceHandle) {
    if handle == nil {
        return
    }
    let _ = Unmanaged<BLEDevice>.fromOpaque(handle).takeRetainedValue()
}

@_cdecl("bleDeviceConnect")
func bleDeviceConnect(_ handle: BLEDeviceHandle, callback: ConnectCallback) {
    let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
    Task {
        do {
            try await device.connect()
            callback(0) // Success
        } catch {
            callback(-1) // Failure
        }
    }
}

@_cdecl("bleDeviceWrite")
func bleDeviceWrite(_ handle: BLEDeviceHandle, data: UnsafePointer<UInt8>, length: Int, callback: WriteCallback) {
    let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
    let swiftData = Data(bytes: data, count: length)
    device.write(swiftData)
    callback(0) // Assume success immediately
}

@_cdecl("bleDeviceRead")
func bleDeviceRead(_ handle: BLEDeviceHandle, timeout: Double, callback: ReadCallback) {
    let device = Unmanaged<BLEDevice>.fromOpaque(handle).takeUnretainedValue()
    Task {
        if let data = await device.read(timeout: timeout) {
            let count = data.count           
            // Allocate raw memory
            let rawPtr = UnsafeMutableRawPointer.allocate(byteCount: count, alignment: MemoryLayout<UInt8>.alignment)
            
            // Initialize memory from Data bytes
            data.withUnsafeBytes { buffer in
                rawPtr.copyMemory(from: buffer.baseAddress!, byteCount: count)
            }
            
            callback(rawPtr, count, 0)
            
            // Document: caller is responsible for `deallocate()` to free memory
        } else {
            callback(nil, 0, -1)
        }
    }
}

@_cdecl("freeData")
func freeData(_ ptr: UnsafeMutableRawPointer) {
    if ptr != nil {
        free(ptr)
    }
}
