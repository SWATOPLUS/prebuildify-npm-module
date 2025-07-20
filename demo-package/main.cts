interface CommonBleDevice {
  init(serviceUuid: string, characteristicUuidStr: string): void;
  destroy(): void;
  connect(): Promise<boolean>; // false, if error
  write(data: Buffer): Promise<boolean>; // false, if error
  read(size: number, timeoutMs: number): Promise<Buffer | null>; // null, if error or timeout
}

async function createBleDevice(): Promise<CommonBleDevice> {
  if (process.platform === 'darwin') {
    return new (await import('@clevetura/ble-macos')).BleDeviceMac() as any;
  }

  return new (await import('@clevetura/ble-windows')).BleDeviceWin();
}

async function tryConnect() {
  const ble = await createBleDevice();
  console.log('Initing...');
  ble.init('c0e21400-e552-4eeb-9850-0148411a043d', 'c0e20001-e552-4eeb-9850-0148411a043d');
  console.log('Inited');
  console.log('Connecting...');
  const result = await ble.connect();

  if (result) {
    console.log('Connect succeeded');
    return ble;
  }

  console.log('Connect failed');
  console.log('Destroying...');
  ble.destroy();
  console.log('Destroy succeeded');

  return null;
}

setInterval(() => console.log('async'), 0);

async function main() {
  const ble = await tryConnect();

  if (!ble) {
    return 1;
  }

  const payload = Buffer.from([0x79, 0x96, 0x25, 0xA6, 0xD9, 0xFB, 0x64, 0xCD, 0xEA]);
  console.log('Writing...');
  const writeResult = await ble.write(payload);

  if (!writeResult) {
    console.log('Write failed');
  } else {
    console.log('Write succeeded');
  }

  console.log('Reading...');
  const readResult = await ble.read(1, 5000);

  if (readResult) {
    console.log('Received:', readResult);
  } else {
    console.log('Read timeout');
  }

  console.log('Destroying...');
  ble.destroy();
  console.log('Destroy succeeded');

  process.exit(2);

  return 0;
}

main();
