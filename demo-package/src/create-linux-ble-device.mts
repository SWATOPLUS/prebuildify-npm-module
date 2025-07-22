import { CommonBleDevice } from "./types.mts";

export async function createLinuxBleDevice(): Promise<CommonBleDevice> {
  throw new Error('Unsupported platform');
}
