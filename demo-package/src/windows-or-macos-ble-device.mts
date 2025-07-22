import { CommonBleDevice, NativeBleDevice, NativeBleApi } from './types.mts';

export class WindowsOrMacosBleDevice implements CommonBleDevice {
  private device: NativeBleDevice | null = null;

  constructor(private api: NativeBleApi) {
    this.device = null;
  }

  init(serviceUuid: string, characteristicUuid: string): void {
    if (this.device) {
      throw new Error('BleDevice already initialized');
    }
    this.device = this.api.bleDeviceInit(serviceUuid, characteristicUuid);
    
    if (!this.device) {
      throw new Error('Failed to create BleDevice');
    }
  }

  destroy(): void {
    if (!this.device) {
      throw new Error('BleDevice not initialized');
    }

    this.api.bleDeviceDestroy(this.device);
    this.device = null;
  }

  connect(): Promise<boolean> {
    if (!this.device) {
      throw new Error('BleDevice not initialized');
    }
    return this.api.bleDeviceConnect(this.device);
  }

  write(data: Buffer): Promise<boolean> {
    if (!this.device) {
      throw new Error('BleDevice not initialized');
    }
    
    return this.api.bleDeviceWrite(this.device, data);
  }

  read(timeoutMs: number): Promise<Buffer | null> {
    if (!this.device) {
      throw new Error('BleDevice not initialized');
    }
    return this.api.bleDeviceRead(this.device, timeoutMs);
  }
}
