import Foundation
import CoreBluetooth

class BLEDevice: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var centralManager: CBCentralManager!
    private var peripheral: CBPeripheral?
    private var characteristic: CBCharacteristic?

    private var targetServiceUUID: CBUUID
    private var targetCharUUID: CBUUID

    private var onReadyContinuation: CheckedContinuation<Void, Error>?

    private let streamBuffer = BLEStreamBuffer()

    init(serviceUUID: String, characteristicUUID: String) {
        self.targetServiceUUID = CBUUID(string: serviceUUID)
        self.targetCharUUID = CBUUID(string: characteristicUUID)
        super.init()
        self.centralManager = CBCentralManager(delegate: self, queue: nil)
    }

    func connect() async throws {
        try await withCheckedThrowingContinuation { continuation in
            self.onReadyContinuation = continuation
        }
    }

    func read(timeout: TimeInterval = 5.0) async -> Data? {
        await streamBuffer.waitForData(timeout: timeout)
    }

    func write(_ data: Data) {
        guard let char = characteristic else {
            print("Characteristic not ready.")
            return
        }
        peripheral?.writeValue(data, for: char, type: .withResponse)
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        guard central.state == .poweredOn else {
            onReadyContinuation?.resume(throwing: NSError(domain: "Bluetooth", code: 1))
            return
        }

        let peripherals = central.retrieveConnectedPeripherals(withServices: [targetServiceUUID])
        guard let device = peripherals.first else {
            onReadyContinuation?.resume(throwing: NSError(domain: "No device", code: 2))
            return
        }

        self.peripheral = device
        device.delegate = self
        centralManager.connect(device, options: nil)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        peripheral.discoverServices([targetServiceUUID])
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }
        for service in services where service.uuid == targetServiceUUID {
            peripheral.discoverCharacteristics([targetCharUUID], for: service)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let chars = service.characteristics else { return }
        for char in chars where char.uuid == targetCharUUID {
            self.characteristic = char
            if char.properties.contains(.notify) {
                peripheral.setNotifyValue(true, for: char)
            }
            onReadyContinuation?.resume()
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard let data = characteristic.value else { return }
        Task {
            await streamBuffer.append(data)
        }
    }
}
