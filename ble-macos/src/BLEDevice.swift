import Foundation
import CoreBluetooth

class BLEDevice: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var centralManager: CBCentralManager!
    private var peripheral: CBPeripheral?
    private var characteristic: CBCharacteristic?

    private var targetServiceUUID: CBUUID
    private var targetCharUUID: CBUUID

    // Continuations for managing async state
    private var onPowerOnContinuation: CheckedContinuation<Void, Error>?
    private var onReadyContinuation: CheckedContinuation<Void, Error>?
    
    // Dedicated queue to prevent deadlocks
    private let centralQueue = DispatchQueue(label: "com.ble-device.central")

    private let streamBuffer = BLEStreamBuffer()

    init(serviceUUID: String, characteristicUUID: String) {
        self.targetServiceUUID = CBUUID(string: serviceUUID)
        self.targetCharUUID = CBUUID(string: characteristicUUID)
        super.init()
        // IMPORTANT: Use the dedicated queue for Core Bluetooth events
        self.centralManager = CBCentralManager(delegate: self, queue: centralQueue)
    }

    /// Waits for the CBCentralManager to be in the .poweredOn state.
    private func waitForPowerOn() async throws {
        if centralManager.state == .poweredOn {
            return
        }
        
        try await withCheckedThrowingContinuation { continuation in
            self.onPowerOnContinuation = continuation
        }
    }

    /// Asynchronously connects to the peripheral and discovers services/characteristics.
    func connect() async throws {
        // First, ensure Bluetooth is powered on.
        try await waitForPowerOn()

        // Now, proceed with the connection logic, waiting for it to complete.
        try await withCheckedThrowingContinuation { continuation in
            self.onReadyContinuation = continuation

            // The original logic assumed the device was already connected at the OS level.
            let peripherals = centralManager.retrieveConnectedPeripherals(withServices: [targetServiceUUID])
            
            guard let device = peripherals.first else {
                let error = NSError(domain: "BLEDeviceError", code: 2, userInfo: [NSLocalizedDescriptionKey: "No pre-connected peripheral found with service UUID \(self.targetServiceUUID)."])
                continuation.resume(throwing: error)
                return
            }

            self.peripheral = device
            device.delegate = self
            centralManager.connect(device, options: nil)
        }
    }

    func read(timeout: TimeInterval = 5.0) async -> Data? {
        await streamBuffer.waitForData(timeout: timeout)
    }

    func write(_ data: Data) {
        guard let char = characteristic, let p = peripheral else {
            print("Characteristic or peripheral not ready for writing.")
            return
        }
        p.writeValue(data, for: char, type: .withResponse)
    }

    // MARK: - CBCentralManagerDelegate Methods

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            // If a task is waiting for power-on, resume it.
            onPowerOnContinuation?.resume()
            onPowerOnContinuation = nil
        default:
            // If the state is anything other than poweredOn, notify any waiting task of the error.
            let error = NSError(domain: "BLEDeviceError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Bluetooth is not powered on. State: \(central.state)"])
            onPowerOnContinuation?.resume(throwing: error)
            onPowerOnContinuation = nil
            onReadyContinuation?.resume(throwing: error)
            onReadyContinuation = nil
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.discoverServices([targetServiceUUID])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        let err = error ?? NSError(domain: "BLEDeviceError", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to connect to peripheral."])
        onReadyContinuation?.resume(throwing: err)
        onReadyContinuation = nil
    }

    // MARK: - CBPeripheralDelegate Methods

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            onReadyContinuation?.resume(throwing: error)
            onReadyContinuation = nil
            return
        }
        guard let services = peripheral.services else { return }
        for service in services where service.uuid == targetServiceUUID {
            peripheral.discoverCharacteristics([targetCharUUID], for: service)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error {
            onReadyContinuation?.resume(throwing: error)
            onReadyContinuation = nil
            return
        }
        
        guard let chars = service.characteristics, let targetChar = chars.first(where: { $0.uuid == targetCharUUID }) else {
            let err = NSError(domain: "BLEDeviceError", code: 4, userInfo: [NSLocalizedDescriptionKey: "Characteristic \(targetCharUUID) not found."])
            onReadyContinuation?.resume(throwing: err)
            onReadyContinuation = nil
            return
        }

        self.characteristic = targetChar
        if targetChar.properties.contains(.notify) {
            peripheral.setNotifyValue(true, for: targetChar)
        }
        
        // This is the final success point.
        onReadyContinuation?.resume()
        onReadyContinuation = nil
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard let data = characteristic.value, error == nil else {
            print("Failed to update value for characteristic: \(error?.localizedDescription ?? "Unknown error")")
            return
        }
        Task {
            await streamBuffer.append(data)
        }
    }
}