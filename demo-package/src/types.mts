export interface CommonBleDevice {
  init(serviceUuid: string, characteristicUuidStr: string): void;
  destroy(): void;
  connect(): Promise<boolean>; // false, if error
  write(data: Buffer): Promise<boolean>; // false, if error
  read(timeoutMs: number): Promise<Buffer | null>; // null, if error or timeout
}

export interface NativeBleDevice {
  __brand: 'NativeBleDevice';
}

export interface NativeBleApi {
  bleDeviceInit(serviceUuid: string, characteristicUuid: string): NativeBleDevice;
  bleDeviceDestroy(handle: NativeBleDevice): void;
  bleDeviceConnect(handle: NativeBleDevice): Promise<boolean>;
  bleDeviceWrite(handle: NativeBleDevice, data: Buffer): Promise<boolean>;
  bleDeviceRead(handle: NativeBleDevice, timeout: number): Promise<Buffer | null>;
}
