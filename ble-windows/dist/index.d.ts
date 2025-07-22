interface WindowsBleDevice {
	__brand: "WindowsBleDevice";
}
interface WindowsBleApi {
	bleDeviceInit(serviceUuid: string, characteristicUuid: string): WindowsBleDevice;
	bleDeviceDestroy(handle: WindowsBleDevice): void;
	bleDeviceConnect(handle: WindowsBleDevice): Promise<boolean>;
	bleDeviceWrite(handle: WindowsBleDevice, data: Buffer): Promise<boolean>;
	bleDeviceRead(handle: WindowsBleDevice, timeout: number): Promise<Buffer | null>;
}
declare function getWindowsApi(): Promise<WindowsBleApi>;
export { getWindowsApi, WindowsBleDevice, WindowsBleApi };
