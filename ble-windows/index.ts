interface CommonBleDevice {
  init(serviceUuid: string, characteristicUuidStr: string): void;
  destroy(): void;
  connect(): Promise<boolean>;
  write(data: Buffer): Promise<boolean>;
  read(size: number, timeoutMs: number): Promise<Buffer | null>;
}

interface NativeBLEDevice {
  __brand: 'NativeBLEDevice';
}

const {
  bleDeviceInit,
  bleDeviceDestroy,
  bleDeviceConnect,
  bleDeviceWrite,
  bleDeviceRead
} = require('./prebuilds/win32-x64/@clevetura+ble-windows.node');

export class BleDeviceWin implements CommonBleDevice {
  private _device: NativeBLEDevice | null = null;

  constructor() {
    this._device = null;
  }

  init(serviceUuid: string, characteristicUuidStr: string): void {
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

  connect(): Promise<boolean> {
    if (!this._device) {
      return Promise.reject(new Error('BleDevice not initialized'));
    }
    return bleDeviceConnect(this._device);
  }

  write(data: Buffer): Promise<boolean> {
    if (!this._device) {
      return Promise.reject(new Error('BleDevice not initialized'));
    }
    return bleDeviceWrite(this._device, data);
  }

  read(size: number, timeoutMs: number): Promise<Buffer | null> {
    if (!this._device) {
      return Promise.reject(new Error('BleDevice not initialized'));
    }
    return bleDeviceRead(this._device, size, timeoutMs);
  }
}