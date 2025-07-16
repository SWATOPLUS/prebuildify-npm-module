import { dts } from 'bun-dts';
import { basename, join } from 'path';

async function main() {
  await Bun.$`rm -rf build/`;
  await Bun.$`rm -rf dist/`;
  await Bun.$`rm -rf dist-swift/`;
  await Bun.$`rm -rf prebuilds/`;

  const distSwiftDir = 'dist-swift/';
  const outputFileMapPath = join(distSwiftDir, 'output-file-map.json');

  const srcMac = [
    'src/bindings-wrap.swift',
    'src/BLEDevice.swift',
    'src/BLEStreamBuffer.swift',
  ];

  const outputFileMap: Record<string, { object: string }> = {};

  for (const source of srcMac) {
    const objectFile = join(distSwiftDir, basename(source, ".swift") + ".o");
    outputFileMap[source] = { object: objectFile };
  }

  Bun.file(outputFileMapPath).write(JSON.stringify(outputFileMap));


  await Bun.$`
    mkdir ./dist-swift/
    swiftc -target arm64-apple-macos12 -emit-object -output-file-map ${outputFileMapPath} ${srcMac} -framework Foundation -framework CoreBluetooth
`;
  // swiftc -target x86_64-apple-macos11 -emit-object -static ${srcMac} -framework Foundation -framework CoreBluetooth -o ./dist-swift/libblemac_x64.a


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
