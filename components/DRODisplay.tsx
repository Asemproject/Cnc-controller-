
import React from 'react';
import { MachineStatus } from '../types';

interface DROProps {
  status: MachineStatus;
}

const CoordinateRow: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center justify-between py-2 px-4 bg-slate-800/50 rounded-lg mb-2">
    <span className={`text-xl font-bold ${color}`}>{label}</span>
    <span className="text-3xl font-mono font-medium tracking-tight">
      {value.toFixed(3)}
    </span>
  </div>
);

export const DRODisplay: React.FC<DROProps> = ({ status }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <CoordinateRow label="X" value={status.wpos.x} color="text-rose-500" />
      <CoordinateRow label="Y" value={status.wpos.y} color="text-emerald-500" />
      <CoordinateRow label="Z" value={status.wpos.z} color="text-blue-500" />
    </div>
  );
};
