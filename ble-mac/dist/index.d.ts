declare class BleDevice {
	private _device;
	constructor();
	init(serviceUuid: string, characteristicUuid: string): void;
	destroy(): void;
	connect(): boolean;
	write(data: Buffer): boolean;
	read(timeoutMs: number): Buffer | null;
}
export { BleDevice };
