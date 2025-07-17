async function getBleWrapper() {
  if (process.platform === 'darwin') {
    return (await import('@clevetura/ble-macos')).BleDeviceMac;
  }

  return (await import('@clevetura/ble-windows')).BleDeviceWin;
}

const BleDevice = await getBleWrapper();

function tryConnect() {
  const ble = new BleDevice();
  console.log('Initing...');
  ble.init('c0e21400-e552-4eeb-9850-0148411a043d', 'c0e20001-e552-4eeb-9850-0148411a043d');
  console.log('Inited');
  console.log('Connecting...');
  const result = ble.connect();

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

async function main() {
  const ble = tryConnect();

  if (!ble) {
    return 1;
  }

  const payload = Buffer.from([0x79, 0x96, 0x25, 0xA6, 0xD9, 0xFB, 0x64, 0xCD, 0xEA]);
  console.log('Writing...');

  if (!ble.write(payload)) {
    console.log('Write failed');
  } else {
    console.log('Write succeeded');
  }

  console.log('Reading...');
  const result = ble.read(1, 5000);

  if (result) {
    console.log('Received:', result);
  } else {
    console.log('Read timeout');
  }

  console.log('Destroying...');
  ble.destroy();
  console.log('Destroy succeeded');
  return 0;
}

main();
