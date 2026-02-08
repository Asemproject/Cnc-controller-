
export type ConnectionType = 'USB' | 'Bluetooth' | 'WiFi';

export interface MachineStatus {
  state: string;
  wpos: { x: number; y: number; z: number };
  mpos: { x: number; y: number; z: number };
  feed: number;
  spindle: number;
}

export interface ConnectionState {
  type: ConnectionType;
  connected: boolean;
  address?: string; // IP or Device Name
}

export enum GrblState {
  IDLE = 'Idle',
  RUN = 'Run',
  HOLD = 'Hold',
  JOG = 'Jog',
  ALARM = 'Alarm',
  DOOR = 'Door',
  CHECK = 'Check',
  HOME = 'Home',
  SLEEP = 'Sleep'
}
