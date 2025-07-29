export interface ClvDeviceWrapper {
  open(): Promise<boolean>;
  close(): Promise<void>;
  request(data: Uint8Array): Promise<Uint8Array | null>;

  getKind(): string;
  getVidPid(): null;
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
