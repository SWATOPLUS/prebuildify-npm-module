import { BleDeviceMac } from './index.ts';

function tryConnect(name: string) {
  const ble = new BleDeviceMac();
  ble.init('c0e21400-e552-4eeb-9850-0148411a043d', 'c0e20001-e552-4eeb-9850-0148411a043d');
  console.log('inited');
  const error = ble.connect();

  if (!error) {
    console.log('Connected successfully to', name);

    return ble;
  }

  console.log('Failed to connect to', name, error);
  ble.destroy();
  console.log('BLE destroyed', name);

  return null;
}

async function main() {
  const ble = tryConnect('CLVX') ?? tryConnect('UNDEFINED');

  if (!ble) {
    return 1;
  }

  const payload = Buffer.from([0x79, 0x96, 0x25, 0xA6, 0xD9, 0xFB, 0x64, 0xCD, 0xEA]);
  if (!ble.write(payload)) {
    console.log('Write failed');
  } else {
    console.log('Write succeeded');
  }

  const result = ble.read(1, 5000);

  if (result) {
    console.log('Received:', result);
  } else {
    console.log('Read timeout');
  }

  ble.destroy();
  return 0;
}

main();
