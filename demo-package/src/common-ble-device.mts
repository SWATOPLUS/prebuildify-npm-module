import { createLinuxBleDevice } from './create-linux-ble-device.mts';
import { createMacosBleDevice } from './create-macos-ble-device.mts';
import { createWindowsBleDevice } from './create-windows-ble-device.mts';
import { CommonBleDevice } from './types.mts';

export async function createBleDevice(): Promise<CommonBleDevice> {  
  const { platform } = process;

  if (platform === 'win32') {
    return createWindowsBleDevice();
  }

  if (platform === 'darwin') {
    return createMacosBleDevice();
  }

  if (platform === 'linux') {
    return createLinuxBleDevice();
  }

  throw new Error('Unsupported platform');
}