import { createLinuxBleDevice } from './create-linux-ble-device.mts';
import { createMacosBleDevice } from './create-macos-ble-device.mts';
import { createWindowsBleDevice } from './create-windows-ble-device.mts';
import { ClvDeviceWrapper } from './types.mts';

export async function createBleDevice(serviceUuid?: string, characteristicUuid?: string): Promise<ClvDeviceWrapper> {  
  const { platform } = process;

  if (platform === 'win32') {
    return createWindowsBleDevice(serviceUuid, characteristicUuid);
  }

  if (platform === 'darwin') {
    return createMacosBleDevice(serviceUuid, characteristicUuid);
  }

  if (platform === 'linux') {
    return createLinuxBleDevice(serviceUuid, characteristicUuid);
  }

  throw new Error('Unsupported platform');
}
