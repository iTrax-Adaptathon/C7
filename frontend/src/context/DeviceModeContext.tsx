import { createContext, useContext } from 'react';

export type DeviceMode = 'phone' | 'laptop';

export const DeviceModeContext = createContext<DeviceMode>('phone');

export function useDeviceMode(): DeviceMode {
  return useContext(DeviceModeContext);
}
