export interface WindowsBleDevice {
  __brand: 'WindowsBleDevice';
}

export interface WindowsBleApi {
  bleDeviceInit(serviceUuid: string, characteristicUuid: string): WindowsBleDevice;
  bleDeviceDestroy(handle: WindowsBleDevice): void;
  bleDeviceConnect(handle: WindowsBleDevice): Promise<boolean>;
  bleDeviceWrite(handle: WindowsBleDevice, data: Buffer): Promise<boolean>;
  bleDeviceRead(handle: WindowsBleDevice, timeout: number): Promise<Buffer | null>;
}

export async function getWindowsApi(): Promise<WindowsBleApi> {
  // todo: add arch dependent load

  const {
    bleDeviceInit,
    bleDeviceDestroy,
    bleDeviceConnect,
    bleDeviceWrite,
    bleDeviceRead,
  } = require('./prebuilds/win32-x64/@clevetura+ble-windows.node');

  return {
    bleDeviceInit,
    bleDeviceDestroy,
    bleDeviceConnect,
    bleDeviceWrite,
    bleDeviceRead,
  };
}
