interface MacosBleDevice {
	__brand: "MacosBleDevice";
}
interface MacosBleApi {
	bleDeviceInit(serviceUuid: string, characteristicUuid: string): MacosBleDevice;
	bleDeviceDestroy(handle: MacosBleDevice): void;
	bleDeviceConnect(handle: MacosBleDevice): Promise<boolean>;
	bleDeviceWrite(handle: MacosBleDevice, data: Buffer): Promise<boolean>;
	bleDeviceRead(handle: MacosBleDevice, timeout: number): Promise<Buffer | null>;
}
declare function getMacosApi(): Promise<MacosBleApi>;
export { getMacosApi, MacosBleDevice, MacosBleApi };
