interface CommonBleDevice {
	init(serviceUuid: string, characteristicUuidStr: string): void;
	destroy(): void;
	connect(): Promise<boolean>;
	write(data: Buffer): Promise<boolean>;
	read(size: number, timeoutMs: number): Promise<Buffer | null>;
}
declare class BleDeviceWin implements CommonBleDevice {
	private _device;
	constructor();
	init(serviceUuid: string, characteristicUuidStr: string): void;
	destroy(): void;
	connect(): Promise<boolean>;
	write(data: Buffer): Promise<boolean>;
	read(size: number, timeoutMs: number): Promise<Buffer | null>;
}
export { BleDeviceWin };
