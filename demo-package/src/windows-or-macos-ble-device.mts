import { ClvDeviceWrapper, NativeBleDevice, NativeBleApi } from './types.mts';

const END_OF_PACKET_SYMBOL = 0x0A;
const READ_RETRY_COUNT = 100;
const READ_TIMEOUT = 10;
const WRITE_PACKET_SIZE = 244;

export class WindowsOrMacosBleDevice implements ClvDeviceWrapper {
  private device: NativeBleDevice | null = null;

  constructor(private api: NativeBleApi, private serviceUuid: string, private characteristicUuid: string) {
  }

  public getKind(): string {
    return 'ble';
  }

  public getVidPid(): null {
    return null;
  }

  public async open(): Promise<boolean> {
    try {
      if (this.device) {
        return true;
      }

      this.device = this.api.bleDeviceInit(this.serviceUuid, this.characteristicUuid);

      if (!this.device) {
        console.error('[WindowsOrMacosBleDevice.open] Failed to create native device');
        return false;
      }

      const connectResult = await this.api.bleDeviceConnect(this.device);

      if (!connectResult) {
        console.error('[WindowsOrMacosBleDevice.open] Failed to connect to native device');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[WindowsOrMacosBleDevice.open] Unexpected error', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.device) {
        this.api.bleDeviceDestroy(this.device);
        this.device = null;
      }
    } catch (error) {
      console.error('[WindowsOrMacosBleDevice.close] Unexpected error', error);
    }
  }

  public async request(data: Uint8Array): Promise<Uint8Array | null> {
    const writeStart = Date.now();    
    const writeResult = await this.write(data);
    const witeEnd = Date.now();

    if (!writeResult) {
      return null;
    }
    const readStart = Date.now(); 
    const response = await this.read();
    const readEnd = Date.now();

    console.log('[WindowsOrMacosBleDevice.request] Write speed', (data?.length || 1) / (witeEnd - writeStart) * 1000);
    console.log('[WindowsOrMacosBleDevice.request] Read speed',  (response?.length || 1)  / (readEnd - readStart) * 1000);

    return response;
  }

  private async write(request: Uint8Array): Promise<boolean> {
    try {
      const data = [...request, END_OF_PACKET_SYMBOL];
      const chunks = splitArray(data, WRITE_PACKET_SIZE);

      for (const chunk of chunks) {
        const writeResult = await this.api.bleDeviceWrite(this.device!, new Uint8Array(chunk));
        
        if (!writeResult) {
          console.error('[WindowsOrMacosBleDevice.write] Write failed!');
          return false;
        }
      }

      return true;      
    } catch (e) {
      console.error('[WindowsOrMacosBleDevice.write] Unexpected error', e);
      return false;
    }
  }

  private async read(): Promise<Uint8Array | null> {
    try {
      let response: number[] = [];
      let retryCount = READ_RETRY_COUNT;
      while (retryCount > 0) {
        retryCount--;
        const data = await this.api.bleDeviceRead(this.device!, READ_TIMEOUT, END_OF_PACKET_SYMBOL);

        console.log('Data recived length:', data?.length);

        if (!data?.length) {
          continue;
        }

        const endIndex = data.findIndex(x => x === END_OF_PACKET_SYMBOL);

        if (endIndex === -1) {
          const chunk = Array.from(data);
          response.push(...chunk);
        } else {
          const chunk = Array.from(data).slice(0, endIndex - 1);
          response.push(...chunk);
          retryCount = -1;
        }
      }

      if (retryCount === -1) {
        return Buffer.from(response);
      }

      console.error('[WindowsOrMacosBleDevice.read] No end of packet found. Retry count:', READ_RETRY_COUNT);
      return null;
    } catch (e) {
      console.error('[WindowsOrMacosBleDevice.read] Unexpected error:', e);
      return null;
    }
  }
}

function splitArray<T>(arr: T[], x: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += x) {
    chunks.push(arr.slice(i, i + x));
  }
  return chunks;
}