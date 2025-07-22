await Bun.$`
  cd ble-linux/
  bun pack.ts
`;

await Bun.$`
  cd demo-package/
  npm i
  bun demo.cts
`;