import { dts } from 'bun-dts';

async function main() {
  await Bun.$`rm -rf build/`;
  await Bun.$`rm -rf dist/`;
  await Bun.$`rm -rf dist-swift/`;
  await Bun.$`rm -rf prebuilds/`;

  const srcMac = [
    'src/bindings-wrap.swift',
    'src/BLEDevice.swift',
    'src/BLEStreamBuffer.swift',
  ];

  await Bun.$`
    mkdir ./dist-swift/
    swiftc -target x86_64-apple-macos11 -emit-library -static ${srcMac} -framework Foundation -framework CoreBluetooth -o ./dist-swift/libblemac_x64.a
    swiftc -target arm64-apple-macos11 -emit-library -static ${srcMac} -framework Foundation -framework CoreBluetooth -o ./dist-swift/libblemac_arm64.a
`;


  await Bun.$`node_modules/.bin/prebuildify --napi --strip --tag-prefix v`;

  await Bun.build({
    entrypoints: ['index.ts'],
    minify: false,
    target: 'node',
    format: 'cjs',
    outdir: 'dist/',
    plugins: [dts()],
  });

  const { name, version } = await import('./package.json');
  const packageJson = {
    name,
    version,
    main: 'index.js',
    types: 'index.d.ts',
  };

  await Bun.file('dist/package.json').write(JSON.stringify(packageJson, undefined, 2));
}

main();
