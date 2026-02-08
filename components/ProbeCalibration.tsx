
import React, { useState } from 'react';
import { Target, Ruler, Save, Play, Layers } from 'lucide-react';

interface ZProbeControlProps {
  onCommand: (cmd: string) => void;
  isConnected: boolean;
}

export const ZProbeControl: React.FC<ZProbeControlProps> = ({ onCommand, isConnected }) => {
  const [plateThickness, setPlateThickness] = useState(10.0);

  const handleProbe = () => {
    const cmds = [
      `G38.2 Z-25 F100`, 
      `G92 Z${plateThickness}`,
      `G0 Z5 F500`
    ];
    cmds.forEach(cmd => onCommand(cmd));
  };

  return (
    <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
          <Target size={18} />
        </div>
        <div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Z-Axis Probe</h3>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase px-1">
            <span>Thickness</span>
            <span className="text-blue-400 font-mono">{plateThickness}mm</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="20"
            step="0.01"
            value={plateThickness}
            onChange={(e) => setPlateThickness(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <button
          disabled={!isConnected}
          onClick={handleProbe}
          className="w-full py-4 bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <Layers size={18} /> Start Probe
        </button>
      </div>
    </div>
  );
};

interface AxisCalibrationProps {
  onCommand: (cmd: string) => void;
  isConnected: boolean;
}

export const AxisCalibration: React.FC<AxisCalibrationProps> = ({ onCommand, isConnected }) => {
  const [calibration, setCalibration] = useState({
    axis: 'X',
    target: 100,
    actual: 100,
    currentSteps: 80
  });

  const calculateNewSteps = () => {
    const newSteps = (calibration.currentSteps * calibration.target) / (calibration.actual || 1);
    return newSteps.toFixed(3);
  };

  const saveCalibration = () => {
    const newSteps = calculateNewSteps();
    const axisMap: Record<string, string> = { 'X': '$100', 'Y': '$101', 'Z': '$102' };
    onCommand(`${axisMap[calibration.axis]}=${newSteps}`);
  };

  return (
    <div className="bg-slate-900/80 rounded-[2rem] p-6 border border-slate-800 shadow-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl">
          <Ruler size={20} />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">Axis Calibration</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Steps per MM Tuning</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
        {['X', 'Y', 'Z'].map(a => (
          <button
            key={a}
            onClick={() => setCalibration(c => ({ ...c, axis: a }))}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
              calibration.axis === a ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'
            }`}
          >
            {a} Axis
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Target (mm)</label>
          <input
            type="number"
            value={calibration.target}
            onChange={(e) => setCalibration(c => ({ ...c, target: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Actual (mm)</label>
          <input
            type="number"
            value={calibration.actual}
            onChange={(e) => setCalibration(c => ({ ...c, actual: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Current Steps</label>
        <input
          type="number"
          value={calibration.currentSteps}
          onChange={(e) => setCalibration(c => ({ ...c, currentSteps: parseFloat(e.target.value) || 0 }))}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
      </div>

      <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-emerald-500/60 uppercase">Calculated Value</span>
          <span className="text-xl font-mono text-emerald-400 font-bold">{calculateNewSteps()}</span>
        </div>
        <div className="flex gap-2">
          <button 
            disabled={!isConnected}
            onClick={() => onCommand(`G91 G0 ${calibration.axis}${calibration.target} F500 G90`)}
            className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all"
          >
            <Play size={16} />
          </button>
          <button 
            disabled={!isConnected}
            onClick={saveCalibration}
            className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg active:scale-95 transition-all"
          >
            <Save size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
