import { createBleDevice } from "./src/common-ble-device.mts";

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

const initDate = Date.now();
const asyncInterval = setInterval(() => console.log(Date.now() - initDate), 1);

async function main() {
  const ble = await tryConnect();

  if (!ble) {
    clearInterval(asyncInterval);
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

  clearInterval(asyncInterval);

  return 0;
}

main();
