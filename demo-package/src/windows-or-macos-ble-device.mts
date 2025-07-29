/// <reference types="node" />
import { ClvDeviceWrapper, NativeBleDevice, NativeBleApi } from './types.mts';

const END_OF_PACKET_SYMBOL = 0x0A;

export class WindowsOrMacosBleDevice implements ClvDeviceWrapper {
  private serviceUuid: string;
  private characteristicUuid: string;
  private device: NativeBleDevice | null = null;
  private isInitialized = false;

  constructor(private api: NativeBleApi, serviceUuid?: string, characteristicUuid?: string) {
    this.serviceUuid = serviceUuid || '';
    this.characteristicUuid = characteristicUuid || '';
    this.device = null;
  }

  getKind(): string {
    return 'ble';
  }

  getVidPid(): null {
    return null;
  }

  async open(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        this.device = this.api.bleDeviceInit(this.serviceUuid, this.characteristicUuid);
        this.isInitialized = true;

        if (!this.device) {
          console.error('Failed to create BleDevice');
          return false;
        }
      }

      if (this.device) {
        return await this.api.bleDeviceConnect(this.device);
      }

      return false;
    } catch (error) {
      console.error('WindowsOrMacosBleDevice.open error', error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.device && this.isInitialized) {
        this.api.bleDeviceDestroy(this.device);
        this.device = null;
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('WindowsOrMacosBleDevice.close error', error);
    }
  }

  async request(data: Uint8Array): Promise<Uint8Array | null> {
    try {
      const writeSuccess = await this.write(data);
      if (!writeSuccess) {
        return null;
      }

      return await this.read();
    } catch (error) {
      console.error('WindowsOrMacosBleDevice.request error', error);
      return null;
    }
  }

  private async write(data: Uint8Array): Promise<boolean> {
    try {
      const base64String = Buffer.from(data).toString('base64');
      const byteArrayConvertedToBase64Array = Buffer.from(base64String);
      const request = Buffer.from([...byteArrayConvertedToBase64Array, END_OF_PACKET_SYMBOL]);

      console.log({request});

      await this.api.bleDeviceWrite(this.device!, request);

      return true;
    } catch (e) {
      console.error('WindowsOrMacosBleDevice.write error', e);
      return false;
    }
  }

  private async read(): Promise<Uint8Array | null> {
    try {
      let response: Buffer | null = null;
      let fullResponse: number[] = [];
      let hexString = '';
      let isEndOfBufferFound = false;
      let retryCount = 200;

      while (!isEndOfBufferFound && retryCount-- > 0) {
        response = await this.api.bleDeviceRead(this.device!, 100);

        if (!response) {
          retryCount--;
          continue;
        }


        isEndOfBufferFound = response.some((d) => d === END_OF_PACKET_SYMBOL);


 
        fullResponse = fullResponse.concat(Array.from(response));
      }

      if (fullResponse.length === 0) {
        return null;
      }

      fullResponse = fullResponse.slice(0, fullResponse.length - 1);

      hexString = Buffer.from(fullResponse).toString('ascii');
      return new Uint8Array(Buffer.from(hexString, 'base64'));
    } catch (error) {
      console.error('[sendReport] read error', error);
      return null;
    }
  }
}
