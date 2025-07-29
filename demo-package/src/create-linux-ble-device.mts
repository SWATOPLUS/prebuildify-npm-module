/// <reference types="node" />
import { ClvDeviceWrapper } from "./types.mts";

export async function createLinuxBleDevice(serviceUuid?: string, characteristicUuid?: string): Promise<ClvDeviceWrapper> {
  const { LinuxNodeBLEInterface } = await import('@clevetura/ble-linux');

  return new LinuxBleDevice((characteristicUuidStr: string) => new LinuxNodeBLEInterface(characteristicUuidStr), serviceUuid, characteristicUuid);
}

const SEND_REPORT_ID = 0x23;
const RECEIVE_REPORT_ID = 0x24;
const END_OF_PACKET_SYMBOL = 0x0A;
const BUFFER_SIZE = 64;

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export class LinuxBleDevice implements ClvDeviceWrapper {
  private serviceUuid: string;
  private characteristicUuid: string;
  private linuxInterface: any | null = null;
  private isInitialized = false;

  constructor(private linuxInterfaceBuilder: (characteristicUuidStr: string) => any, serviceUuid?: string, characteristicUuid?: string) {
    this.serviceUuid = serviceUuid || '';
    this.characteristicUuid = characteristicUuid || '';
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
        this.linuxInterface = this.linuxInterfaceBuilder(this.characteristicUuid);
        this.isInitialized = true;
      }

      if (this.linuxInterface) {
        await this.linuxInterface.open();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('LinuxBleDevice.open error', error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.linuxInterface && this.isInitialized) {
        this.linuxInterface.close().catch((err: any) => console.error('Error closing BLE device:', err));
        this.linuxInterface = null;
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('LinuxBleDevice.close error', error);
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
      console.error('LinuxBleDevice.request error', error);
      return null;
    }
  }

  private async write(data: Uint8Array): Promise<boolean> {
    try {
      const base64String = Buffer.from(data).toString('base64');
      const byteArrayConvertedToBase64Array = Buffer.from(base64String);

      // split array by 64 bytes chunks
      const chunks = chunk(Array.from(byteArrayConvertedToBase64Array), BUFFER_SIZE - 2);

      if (chunks.length > 1) {
        for (let index = 0; index < chunks.length; index++) {
          const chunk = chunks[index];
          const isLastChunk = index === chunks.length - 1;
          let request = Buffer.from([SEND_REPORT_ID, ...chunk]);

          if (isLastChunk) {
            request = Buffer.from([...Array.from(request), END_OF_PACKET_SYMBOL]);
          }

          request = Buffer.concat([request, Buffer.alloc(BUFFER_SIZE - request.length)]);
          await this.linuxInterface.send(request, request.length);
        }
      } else {
        let request = Buffer.from([SEND_REPORT_ID, ...Array.from(byteArrayConvertedToBase64Array), END_OF_PACKET_SYMBOL]);
        request = Buffer.concat([request, Buffer.alloc(BUFFER_SIZE - request.length)]);
        await this.linuxInterface.send(request, request.length);
      }

      return true;
    } catch (e) {
      console.error('LinuxBleDevice.write error', e);
      return false;
    }
  }

  private async read(): Promise<Uint8Array | null> {
    try {
      let response: number[] | null = null;
      let fullResponse: number[] = [];
      let hexString = '';
      let isEndOfBufferFound = false;
      let retryCount = 200;
      
      while (!isEndOfBufferFound && retryCount-- > 0) {
        response = await this.linuxInterface.receive(1, 100, BUFFER_SIZE);
        
        if (!response || !Array.isArray(response)) {
          retryCount--;
          continue;
        }
        
        isEndOfBufferFound = response.find((d: number) => d === END_OF_PACKET_SYMBOL) >= 0;
        const reportType = response[0];
        
        if (reportType !== RECEIVE_REPORT_ID) {
          console.error('[sendReport] Invalid report type', reportType);
          retryCount--;
          continue;
        }
        
        // removing first byte (report type) and zeros
        const filteredResponse = response.slice(1, response.length).filter((d: number) => d !== 0);
        fullResponse = fullResponse.concat(filteredResponse);
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
