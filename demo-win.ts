await Bun.$`
  cd ble-windows/
  bun pack.ts
`;

await Bun.$`
  cd demo-package/
  npm i
  bun main.cts
`;