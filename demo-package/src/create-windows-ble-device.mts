import { CommonBleDevice, NativeBleApi } from "./types.mts";
import { WindowsOrMacosBleDevice } from "./windows-or-macos-ble-device.mts";

export async function createWindowsBleDevice(): Promise<CommonBleDevice> {
  const { getWindowsApi } = await import('@clevetura/ble-windows');
  const api = await getWindowsApi();

  return new WindowsOrMacosBleDevice(api as unknown as NativeBleApi);
}
