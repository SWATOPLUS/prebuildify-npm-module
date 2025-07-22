declare class LinuxNodeBLEInterface {
	private characteristicUUID;
	private bus;
	private notificationEmitter;
	private charPath?;
	private serialNumber?;
	private inputBuffer;
	constructor(characteristicUUID: string);
	private getManagedObjects;
	private findDevicePathByAddress;
	private findCharacteristicPath;
	private subscribeToNotifications;
	open(serialNumber?: string): Promise<void>;
	close(): Promise<void>;
	getSerialNumber(): string | undefined;
	send(data: Buffer, _outputReportId: number): Promise<void>;
	receive(inputReportId: number, timeout?: number, size?: number): Promise<Buffer>;
	pushToInputBuffer(data: Buffer): void;
	popFromInputBuffer(size: number): Buffer;
	flushReceiver(): Promise<void>;
}
export { LinuxNodeBLEInterface };
