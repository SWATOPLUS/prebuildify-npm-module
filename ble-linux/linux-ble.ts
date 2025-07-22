import dbus, { Variant } from 'dbus-next';
import { EventEmitter } from 'events';

const BLUEZ_SERVICE_NAME = 'org.bluez';

type VariantDict = { [key: string]: Variant };

export class LinuxNodeBLEInterface {
  private bus = dbus.systemBus();
  private notificationEmitter = new EventEmitter();
  private charPath?: string;
  private serialNumber?: string;
  private inputBuffer: Buffer = Buffer.alloc(0);

  constructor(
    private characteristicUUID: string,
  ){}

  private async getManagedObjects() {
    const objManager = await this.bus.getProxyObject(BLUEZ_SERVICE_NAME, '/');
    const objectManagerIface = objManager.getInterface('org.freedesktop.DBus.ObjectManager');
    return await objectManagerIface.GetManagedObjects();
  }

  private async findDevicePathByAddress(managedObjects: Record<string, any>, address: string): Promise<string> {
    for (const path in managedObjects) {
      const interfaces = managedObjects[path];
      if ('org.bluez.Device1' in interfaces) {
        try {
          const deviceObj = await this.bus.getProxyObject(BLUEZ_SERVICE_NAME, path);
          const props = deviceObj.getInterface('org.freedesktop.DBus.Properties');
          const addrVar = await props.Get('org.bluez.Device1', 'Address') as Variant;
          if (addrVar.value.toLowerCase() === address.toLowerCase()) {
            return path;
          }
        } catch {
          // Ignore errors
        }
      }
    }
    throw new CommunicationError(CommunicationErrorType.DeviceNotFound);
  }
  
  private async findCharacteristicPath(managedObjects: Record<string, any>, devicePath?: string): Promise<string> {
    for (const path in managedObjects) {
      if (!devicePath || path.startsWith(devicePath)) {
        const interfaces = managedObjects[path];
        if ('org.bluez.GattCharacteristic1' in interfaces) {
          const charObj = await this.bus.getProxyObject(BLUEZ_SERVICE_NAME, path);
          const props = charObj.getInterface('org.freedesktop.DBus.Properties');
          const uuidVar = await props.Get('org.bluez.GattCharacteristic1', 'UUID') as Variant;
          if (uuidVar.value.toLowerCase() === this.characteristicUUID.toLowerCase()) {
            return path;
          }
        }
      }
    }
    throw new CommunicationError(CommunicationErrorType.DeviceNotFound);
  }
  
  private async subscribeToNotifications(charPath: string): Promise<void> {
    const charObj = await this.bus.getProxyObject(BLUEZ_SERVICE_NAME, charPath);
    const char = charObj.getInterface('org.bluez.GattCharacteristic1');
    const props = charObj.getInterface('org.freedesktop.DBus.Properties');
  
    await char.StartNotify();
  
    props.on('PropertiesChanged', (_iface: string, changed: VariantDict) => {
      const value = changed['Value'];
      if (value) {
        this.notificationEmitter.emit('notification', Buffer.from(value.value));
      }
    });
  }
  
  async open(serialNumber?: string): Promise<void> {
    const managedObjects = await this.getManagedObjects();
    let devicePath: string | undefined = undefined;
    if (serialNumber) {
      devicePath = await this.findDevicePathByAddress(managedObjects, serialNumber);
    }

    this.charPath = await this.findCharacteristicPath(managedObjects, devicePath);
    await this.subscribeToNotifications(this.charPath);
    this.inputBuffer = Buffer.alloc(0);
  }

  async close(): Promise<void> {
    if (this.charPath) {
      try {
        const charObj = await this.bus.getProxyObject(BLUEZ_SERVICE_NAME, this.charPath);
        const char = charObj.getInterface('org.bluez.GattCharacteristic1');
        await char.StopNotify();
      } catch (e) {
        // Device might already be disconnected
      }
    }
  
    try {
      this.notificationEmitter.removeAllListeners('notification');
      this.bus.disconnect(); // <- Close DBus connection
    } catch (e) {
      // Ignore disconnect errors
    }
  }

  
  getSerialNumber(): string | undefined {
    return this.serialNumber;
  }

  async send(data: Buffer, _outputReportId: number): Promise<void> {
    if (!this.charPath) throw new CommunicationError(CommunicationErrorType.DeviceNotOpened);

    const charObj = await this.bus.getProxyObject(BLUEZ_SERVICE_NAME, this.charPath);
    const char = charObj.getInterface('org.bluez.GattCharacteristic1');

    // Write without response
    await char.WriteValue([...data], { type: new Variant('s', 'command') });
  }

  async receive(inputReportId: number, timeout = 3000, size?: number): Promise<Buffer> {
    if (size !== undefined) {
      if (this.inputBuffer.length >= size) {
          return this.popFromInputBuffer(size);
      }
    }
    else {
        this.flushReceiver();
    }

    return new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.notificationEmitter.removeAllListeners('notification');
        reject(new CommunicationError(CommunicationErrorType.TimeoutError));
      }, timeout);

      this.notificationEmitter.once('notification', (data: Buffer) => {
        clearTimeout(timer);
        this.pushToInputBuffer(Buffer.from(data));
        if (size === undefined) {
          resolve(this.inputBuffer);
        } else {
          if (this.inputBuffer.length < size)
            reject(new CommunicationError(CommunicationErrorType.DataReceiveError));

          resolve(this.popFromInputBuffer(size));
        } 
      });
    });
  }

    pushToInputBuffer(data: Buffer): void {
        this.inputBuffer = Buffer.concat([this.inputBuffer, data]);
    }

    popFromInputBuffer(size: number): Buffer {
        const data = this.inputBuffer.slice(0, size);
        this.inputBuffer = this.inputBuffer.slice(size);
        return data;
    }

    async flushReceiver(): Promise<void> {
        this.inputBuffer = Buffer.alloc(0);
    }
}
