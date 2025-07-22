import { CommonBleDevice } from "./types.mts";

export async function createLinuxBleDevice(): Promise<CommonBleDevice> {
  const { LinuxNodeBLEInterface } = await import('@clevetura/ble-linux');

  return new LinuxBleDevice((characteristicUuidStr: string) => new LinuxNodeBLEInterface(characteristicUuidStr));
}

export class LinuxBleDevice implements CommonBleDevice {
  private linuxInterface: any | null = null;

  constructor(private linuxInterfaceBuilder: (characteristicUuidStr: string) => any) {
  }

  init(serviceUuid: string, characteristicUuidStr: string): void {
    if (this.linuxInterface) {
      throw new Error('LinuxBleDevice already initialized');
    }

    this.linuxInterface = this.linuxInterfaceBuilder(characteristicUuidStr);
  }

  destroy(): void {
    if (!this.linuxInterface) {
      throw new Error('LinuxBleDevice not initialized');
    }
    this.linuxInterface.close().catch((err) => console.error('Error closing BLE device:', err));
    this.linuxInterface = null;
  }

  async connect(): Promise<boolean> {
    if (!this.linuxInterface) {
      throw new Error('LinuxBleDevice not initialized');
    }
    try {
      await this.linuxInterface.open();
      return true;
    } catch (error) {
      console.error('Error connecting to BLE device:', error);
      return false;
    }
  }

  async write(data: Buffer): Promise<boolean> {
    if (!this.linuxInterface) {
      throw new Error('LinuxBleDevice not initialized');
    }
    try {
      await this.linuxInterface.send(data, data.length);
      return true;
    } catch (error) {
      console.error('Error writing to BLE device:', error);
      return false;
    }
  }

  async read(size: number, timeoutMs: number): Promise<Buffer | null> {
    if (!this.linuxInterface) {
      throw new Error('LinuxBleDevice not initialized');
    }
    try {
      const buffer = await this.linuxInterface.receive(1, timeoutMs, size);
      return buffer;
    } catch (error) {
      console.error('Error reading from BLE device:', error);
      return null;
    }
  }
}
