import { CommonBleDevice, NativeBleApi } from "./types.mts";
import { WindowsOrMacosBleDevice } from "./windows-or-macos-ble-device.mts";

export async function createMacosBleDevice(): Promise<CommonBleDevice> {
  const { getMacosApi } = await import('@clevetura/ble-macos');
  const api = await getMacosApi();

  return new WindowsOrMacosBleDevice(api as unknown as NativeBleApi);
}
