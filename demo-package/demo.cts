import { createBleDevice, formatRequest, parseResponse } from "./src/common-ble-device.mts";

const initDate = Date.now();
const asyncInterval = setInterval(() => console.log(Date.now() - initDate), 1);

async function main() {
  const ble = await createBleDevice('d0bf1500-c402-424a-80b0-bc7aeced077e', 'd0bf0001-c402-424a-80b0-bc7aeced077e');
  console.log('Opening...');
  const openResult = await ble.open();

  if (!openResult) {
    console.log('Open failed');
    clearInterval(asyncInterval);
    return 1;
  }

  console.log('Open succeeded');

  //const payload = Uint8Array.from([8, 2, 42, 0]);
  const payload = Uint8Array.from([8, 9, 90, 0]);
  console.log('Requesting...');
  const response = await ble.request(formatRequest(payload));
  const parsedResponse = parseResponse(response ?? new Uint8Array());

  console.log({ response, parsedResponse });

  console.log('Closing...');
  ble.close();
  console.log('Close succeeded');

  clearInterval(asyncInterval);

  return 0;
}

main();
