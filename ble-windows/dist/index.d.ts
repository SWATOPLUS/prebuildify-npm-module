declare class BleDeviceWin {
	private _device;
	constructor();
	init(serviceUuid: string, characteristicUuidStr: string): void;
	destroy(): void;
	connect(): boolean;
	write(data: Buffer): boolean;
	read(size: number, timeoutMs: number): Buffer | null;
}
export { BleDeviceWin };
