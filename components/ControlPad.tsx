
import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Home, RotateCcw, Play, Square, AlertCircle, RefreshCw } from 'lucide-react';

interface ControlPadProps {
  onJog: (axis: string, step: number) => void;
  onCommand: (cmd: string) => void;
}

export const ControlPad: React.FC<ControlPadProps> = ({ onJog, onCommand }) => {
  const [step, setStep] = useState(1);

  const steps = [0.1, 1, 10, 50, 100];

  return (
    <div className="flex flex-col gap-6">
      {/* Step Selection */}
      <div className="flex flex-wrap gap-2 justify-center">
        {steps.map(s => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              step === s ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {s}mm
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Jog Pad */}
        <div className="flex flex-col items-center">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">XY Axis</h3>
            <div className="grid grid-cols-3 gap-2">
                <div />
                <button onClick={() => onJog('Y', step)} className="p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><ChevronUp /></button>
                <div />
                <button onClick={() => onJog('X', -step)} className="p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><ChevronLeft /></button>
                <button onClick={() => onCommand('G28')} className="p-4 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-colors"><Home size={20}/></button>
                <button onClick={() => onJog('X', step)} className="p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><ChevronRight /></button>
                <div />
                <button onClick={() => onJog('Y', -step)} className="p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><ChevronDown /></button>
                <div />
            </div>
        </div>

        {/* Z Axis */}
        <div className="flex flex-col items-center">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Z Axis</h3>
            <div className="flex flex-col gap-2">
                <button onClick={() => onJog('Z', step)} className="p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><ChevronUp /></button>
                <button onClick={() => onCommand('G92 Z0')} className="p-4 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-colors">Z0</button>
                <button onClick={() => onJog('Z', -step)} className="p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><ChevronDown /></button>
            </div>
        </div>

        {/* Macros / System */}
        <div className="flex flex-col items-center col-span-2 lg:col-span-1">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">System</h3>
            <div className="grid grid-cols-2 gap-3 w-full max-w-[200px]">
                <button onClick={() => onCommand('$H')} className="flex items-center justify-center gap-2 p-3 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors">
                    <Home size={16}/> Home
                </button>
                <button onClick={() => onCommand('$X')} className="flex items-center justify-center gap-2 p-3 bg-amber-600/20 text-amber-400 rounded-lg hover:bg-amber-600/30 transition-colors">
                    <AlertCircle size={16}/> Unlock
                </button>
                <button onClick={() => onCommand('0x18')} className="flex items-center justify-center gap-2 p-3 bg-rose-600/20 text-rose-400 rounded-lg hover:bg-rose-600/30 transition-colors">
                    <RotateCcw size={16}/> Reset
                </button>
                <button onClick={() => onCommand('?')} className="flex items-center justify-center gap-2 p-3 bg-slate-600/20 text-slate-400 rounded-lg hover:bg-slate-600/30 transition-colors">
                    <RefreshCw size={16}/> Status
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
