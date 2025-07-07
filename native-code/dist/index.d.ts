declare class BleDevice {
	private _device;
	constructor();
	init(nameSubstring: string, characteristicUuidStr: string): void;
	destroy(): void;
	connect(): boolean;
	write(data: Buffer): boolean;
	read(size: number, timeoutMs: number): Buffer | null;
}
export { BleDevice };
