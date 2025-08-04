import { createBleDevice, formatRequest, parseResponse } from "./src/common-ble-device.mts";

const initDate = Date.now();



async function doRequest(payload: Uint8Array) {
  const ble = await createBleDevice('d0bf1500-c402-424a-80b0-bc7aeced077e', 'd0bf0001-c402-424a-80b0-bc7aeced077e');
  console.log('Opening...');
  const openResult = await ble.open();

  if (!openResult) {
    console.log('Open failed');
    return;
  }

  console.log('Open succeeded');

  console.log('Requesting...');
  const requestStart = Date.now();
  const response = await ble.request(formatRequest(payload));
  const parsedResponse = parseResponse(response ?? new Uint8Array());
  const requestEnd = Date.now();
  console.log('Request time', requestEnd - requestStart);

  console.log({ payload, parsedResponse });

  console.log('Closing...');
  ble.close();
  console.log('Close succeeded');
}

async function main() {
  const asyncInterval = setInterval(() => console.log(Date.now() - initDate), 1);

  const payload1 = Uint8Array.from([8, 2, 42, 0]);
  const payload2 = Uint8Array.from([8, 9, 90, 0]);
  const payload3 = Uint8Array.from([8,4,34,218,4,10,215,4,8,5,18,52,26,24,10,16,10,2,10,0,18,2,10,0,26,2,10,0,34,2,10,0,18,4,10,2,10,0,34,24,10,16,10,2,10,0,18,2,10,0,26,2,10,0,34,2,10,0,18,4,10,2,10,0,26,76,10,6,8,1,16,1,24,1,18,66,26,4,16,3,96,0,34,58,16,3,122,54,10,25,10,5,8,1,16,233,1,18,4,8,0,16,0,26,4,8,0,16,0,34,4,8,0,16,0,18,25,10,5,8,1,16,234,1,18,4,8,0,16,0,26,4,8,0,16,0,34,4,8,0,16,0,34,99,10,28,10,9,10,7,8,0,16,100,24,255,1,18,13,18,7,8,0,16,0,24,255,1,24,1,32,3,24,1,18,28,10,9,10,7,8,255,1,16,17,24,0,18,13,18,7,8,0,16,255,1,24,0,24,1,32,2,24,1,26,18,10,10,10,8,8,255,1,16,255,1,24,0,18,2,24,1,24,1,34,17,10,9,10,7,8,100,16,0,24,255,1,18,2,24,1,24,1,42,233,2,10,230,2,106,27,42,25,10,5,8,0,16,227,1,18,4,8,0,16,25,26,4,8,0,16,0,34,4,8,0,16,0,114,27,42,25,10,5,8,0,16,227,1,18,4,8,0,16,55,26,4,8,0,16,0,34,4,8,0,16,0,122,27,42,25,10,5,8,0,16,227,1,18,4,8,0,16,8,26,4,8,0,16,0,34,4,8,0,16,0,130,1,27,42,25,10,5,8,0,16,227,1,18,4,8,0,16,11,26,4,8,0,16,0,34,4,8,0,16,0,138,1,27,42,25,10,5,8,0,16,227,1,18,4,8,0,16,19,26,4,8,0,16,0,34,4,8,0,16,0,146,1,28,42,26,10,5,8,0,16,227,1,18,5,8,0,16,225,1,26,4,8,0,16,22,34,4,8,0,16,0,154,1,27,42,25,10,5,8,0,16,227,1,18,4,8,0,16,4,26,4,8,0,16,0,34,4,8,0,16,0,162,1,27,42,25,10,5,8,1,16,182,1,18,4,8,0,16,0,26,4,8,0,16,0,34,4,8,0,16,0,170,1,27,42,25,10,5,8,1,16,205,1,18,4,8,0,16,0,26,4,8,0,16,0,34,4,8,0,16,0,178,1,27,42,25,10,5,8,1,16,181,1,18,4,8,0,16,0,26,4,8,0,16,0,34,4,8,0,16,0,186,1,27,42,25,10,5,8,1,16,226,1,18,4,8,0,16,0,26,4,8,0,16,0,34,4,8,0,16,0,194,1,27,42,25,10,5,8,1,16,146,3,18,4,8,0,16,0,26,4,8,0,16,0,34,4,8,0,16,0]);

  await doRequest(payload1);
  await doRequest(payload2);
  await doRequest(payload3);

  clearInterval(asyncInterval);
}

main();
