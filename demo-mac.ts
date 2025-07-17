await Bun.$`
  cd ble-macos/
  bun pack.ts
`;

await Bun.$`
  cd demo-package/
  npm i
  bun main.cts
`;