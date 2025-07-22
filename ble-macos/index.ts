export interface MacosBleDevice {
  __brand: 'MacosBleDevice';
}

export interface MacosBleApi {
  bleDeviceInit(serviceUuid: string, characteristicUuid: string): MacosBleDevice;
  bleDeviceDestroy(handle: MacosBleDevice): void;
  bleDeviceConnect(handle: MacosBleDevice): Promise<boolean>;
  bleDeviceWrite(handle: MacosBleDevice, data: Buffer): Promise<boolean>;
  bleDeviceRead(handle: MacosBleDevice, timeout: number): Promise<Buffer | null>;
}

export async function getMacosApi(): Promise<MacosBleApi> {
  // todo: add arch dependent load

  const {
    bleDeviceInit,
    bleDeviceDestroy,
    bleDeviceConnect,
    bleDeviceWrite,
    bleDeviceRead,
  } = require('./prebuilds/darwin-arm64/@clevetura+ble-macos.node');

  return {
    bleDeviceInit,
    bleDeviceDestroy,
    bleDeviceConnect,
    bleDeviceWrite,
    bleDeviceRead,
  };
}
