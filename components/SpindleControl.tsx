
import React, { useState } from 'react';
import { RotateCw, CircleStop, Zap } from 'lucide-react';

interface SpindleControlProps {
  currentSpeed: number;
  onCommand: (cmd: string) => void;
}

export const SpindleControl: React.FC<SpindleControlProps> = ({ currentSpeed, onCommand }) => {
  const [targetSpeed, setTargetSpeed] = useState(1000);
  const maxSpeed = 24000; // Common default for many spindles

  const handleStart = () => {
    onCommand(`M3 S${targetSpeed}`);
  };

  const handleStop = () => {
    onCommand('M5');
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseInt(e.target.value);
    setTargetSpeed(newSpeed);
    // If spindle is running, optionally update speed immediately
    // onCommand(`S${newSpeed}`); 
  };

  return (
    <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-amber-400" />
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Spindle Control</h3>
        </div>
        <div className="flex items-center gap-2">
           <span className={`text-xs font-mono px-2 py-0.5 rounded ${currentSpeed > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
             {currentSpeed > 0 ? `${currentSpeed} RPM` : 'STOPPED'}
           </span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Speed Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
            <span>Target Speed</span>
            <span className="text-white font-mono">{targetSpeed} RPM</span>
          </div>
          <input
            type="range"
            min="0"
            max={maxSpeed}
            step="100"
            value={targetSpeed}
            onChange={handleSpeedChange}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleStart}
            className="flex items-center justify-center gap-2 py-3 bg-emerald-600/20 text-emerald-400 rounded-xl hover:bg-emerald-600/30 transition-all active:scale-95 font-bold text-sm"
          >
            <RotateCw size={18} /> START (M3)
          </button>
          <button
            onClick={handleStop}
            className="flex items-center justify-center gap-2 py-3 bg-rose-600/20 text-rose-400 rounded-xl hover:bg-rose-600/30 transition-all active:scale-95 font-bold text-sm"
          >
            <CircleStop size={18} /> STOP (M5)
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-2">
          {[5000, 10000, 18000, 24000].map(speed => (
            <button
              key={speed}
              onClick={() => {
                setTargetSpeed(speed);
                if (currentSpeed > 0) onCommand(`S${speed}`);
              }}
              className="flex-1 py-2 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:bg-slate-700 transition-colors"
            >
              {speed / 1000}k
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
