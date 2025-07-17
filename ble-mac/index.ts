interface NativeBLEDevice {
  __brand: 'NativeBLEDevice';
}

const {
  bleDeviceInit,
  bleDeviceDestroy,
  bleDeviceConnect,
  bleDeviceWrite,
  bleDeviceRead,
} = require('./prebuilds/darwin-arm64/@clevetura+ble-mac.node');

export class BleDeviceMac {
  private _device: NativeBLEDevice | null = null;

  constructor() {
    this._device = null;
  }

  init(serviceUuid: string, characteristicUuid: string): void {
    if (this._device) {
      throw new Error('BleDevice already initialized');
    }
    this._device = bleDeviceInit(serviceUuid, characteristicUuid);
    if (!this._device) {
      throw new Error('Failed to create BleDevice');
    }
  }

  destroy(): void {
    if (!this._device) {
      throw new Error('BleDevice not initialized');
    }
    bleDeviceDestroy(this._device);
    this._device = null;
  }

  connect(): boolean {
    if (!this._device) {
      throw new Error('BleDevice not initialized');
    }
    return bleDeviceConnect(this._device);
  }

  write(data: Buffer): boolean {
    if (!this._device) {
      throw new Error('BleDevice not initialized');
    }
    return bleDeviceWrite(this._device, data);
  }

  read(timeoutMs: number): Buffer | null {
    if (!this._device) {
      throw new Error('BleDevice not initialized');
    }
    return bleDeviceRead(this._device, timeoutMs);
  }
}
