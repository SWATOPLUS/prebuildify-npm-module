interface NativeBLEDevice {
  __brand: 'NativeBLEDevice';
}

const {
  bleDeviceInit,
  bleDeviceDestroy,
  bleDeviceConnect,
  bleDeviceWrite,
  bleDeviceRead
} = require('./prebuilds/win32-x64/@clevetura+ble-win32-x64.node');

export class BleDevice {
  private _device: NativeBLEDevice | null = null;

  constructor() {
    this._device = null;
  }

  init(characteristicUuidStr: string): void {
    if (this._device) {
      throw new Error('BleDevice already initialized');
    }
    this._device = bleDeviceInit(characteristicUuidStr);
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

  read(size: number, timeoutMs: number): Buffer | null {
    if (!this._device) {
      throw new Error('BleDevice not initialized');
    }
    return bleDeviceRead(this._device, size, timeoutMs);
  }
}
