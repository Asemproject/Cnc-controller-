
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bluetooth, Usb, Wifi, Power, Settings, Terminal as TerminalIcon, Play, Square, Pause, Cpu, Activity, LayoutGrid, WifiOff, Globe, Image as ImageIcon, Send } from 'lucide-react';
import { ConnectionType, MachineStatus, ConnectionState } from './types';
import { DRODisplay } from './components/DRODisplay';
import { ControlPad } from './components/ControlPad';
import { Terminal } from './components/Terminal';
import { SpindleControl } from './components/SpindleControl';
import { ImageToGcode } from './components/ImageToGcode';
import { GcodeSender } from './components/GcodeSender';
import { ZProbeControl, AxisCalibration } from './components/ProbeCalibration';
import { cncService } from './services/ConnectionService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'controls' | 'sender' | 'converter' | 'terminal' | 'settings'>('controls');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connection, setConnection] = useState<ConnectionState>({
    type: 'USB',
    connected: false
  });
  const [status, setStatus] = useState<MachineStatus>({
    state: 'Offline',
    wpos: { x: 0, y: 0, z: 0 },
    mpos: { x: 0, y: 0, z: 0 },
    feed: 0,
    spindle: 0
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [wifiIp, setWifiIp] = useState('192.168.1.100');
  const pollInterval = useRef<any>(null);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-49), msg]);
  }, []);

  const parseStatus = useCallback((data: string) => {
    if (data.startsWith('<') && data.endsWith('>')) {
      const parts = data.slice(1, -1).split('|');
      const newState = parts[0];
      let mpos = { x: 0, y: 0, z: 0 };
      let wpos = { x: 0, y: 0, z: 0 };
      let spindle = 0;
      let feed = 0;

      parts.forEach(p => {
        if (p.startsWith('MPos:')) {
          const coords = p.slice(5).split(',').map(Number);
          mpos = { x: coords[0], y: coords[1], z: coords[2] };
        } else if (p.startsWith('WPos:')) {
          const coords = p.slice(5).split(',').map(Number);
          wpos = { x: coords[0], y: coords[1], z: coords[2] };
        } else if (p.startsWith('FS:')) {
          const fs = p.slice(3).split(',').map(Number);
          feed = fs[0];
          spindle = fs[1];
        }
      });

      setStatus(prev => ({
        ...prev,
        state: newState,
        mpos,
        wpos: parts.some(p => p.startsWith('WPos:')) ? wpos : mpos,
        spindle: spindle || prev.spindle,
        feed: feed || prev.feed
      }));
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handler = (e: any) => {
      const data = e.detail;
      addLog(data);
      parseStatus(data);
    };
    window.addEventListener('cnc-data', handler);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('cnc-data', handler);
    };
  }, [addLog, parseStatus]);

  const handleConnect = async () => {
    let success = false;
    if (connection.type === 'USB') success = await cncService.connectUSB();
    else if (connection.type === 'Bluetooth') success = await cncService.connectBluetooth();
    else if (connection.type === 'WiFi') success = await cncService.connectWiFi(wifiIp) as boolean;

    if (success) {
      setConnection(prev => ({ ...prev, connected: true }));
      addLog(`Connected via ${connection.type}`);
      pollInterval.current = setInterval(() => cncService.send('?'), 250);
    } else {
      addLog(`Failed to connect to ${connection.type}`);
    }
  };

  const handleDisconnect = () => {
    cncService.disconnect();
    clearInterval(pollInterval.current);
    setConnection(prev => ({ ...prev, connected: false }));
    setStatus(prev => ({ ...prev, state: 'Offline' }));
    addLog('Disconnected');
  };

  const sendCommand = (cmd: string) => {
    if (connection.connected) {
      cncService.send(cmd);
      addLog(`> ${cmd}`);
    }
  };

  const handleSendBatchGcode = async (lines: string[]) => {
    if (!connection.connected) return;
    setActiveTab('terminal');
    addLog(`Starting batch execution: ${lines.length} lines`);
    
    for (const line of lines) {
      if (line.trim().startsWith(';') || !line.trim()) continue;
      await cncService.send(line);
      addLog(`> ${line}`);
      await new Promise(r => setTimeout(r, 50));
    }
    addLog("Batch execution completed.");
  };

  const handleJog = (axis: string, step: number) => {
    sendCommand(`$J=G91 G21 ${axis}${step} F1500`);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[#0a0f1d] text-slate-200 font-sans">
      {/* Dynamic Header */}
      <header className="px-6 pt-10 pb-4 bg-slate-900/50 backdrop-blur-lg border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl shadow-lg ${connection.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            <Cpu size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight uppercase">CNC PRO</h1>
              {!isOnline && (
                <span className="flex items-center gap-1 bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-[8px] font-bold uppercase">
                  <WifiOff size={10} /> Offline Ready
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-500 tracking-widest block -mt-1 uppercase">
              {status.state} {connection.connected ? `• ${connection.type}` : ''}
            </span>
          </div>
        </div>

        <button 
          onClick={connection.connected ? handleDisconnect : handleConnect}
          className={`p-3 rounded-full transition-all active:scale-95 ${
            connection.connected 
              ? 'bg-rose-600 shadow-lg shadow-rose-900/30' 
              : 'bg-blue-600 shadow-lg shadow-blue-900/30'
          }`}
        >
          <Power size={20} className="text-white" />
        </button>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* Controls Tab */}
        {activeTab === 'controls' && (
          <div className="h-full overflow-y-auto p-6 space-y-6 pb-24 animate-in fade-in duration-300">
            <DRODisplay status={status} />
            
            <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800/60 p-6 shadow-2xl">
               <ControlPad onJog={handleJog} onCommand={sendCommand} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <SpindleControl currentSpeed={status.spindle} onCommand={sendCommand} />
               <ZProbeControl onCommand={sendCommand} isConnected={connection.connected} />

               <div className="space-y-4">
                 <div className="bg-slate-900/80 rounded-3xl p-5 border border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity size={14} className="text-blue-400" />
                      <span className="text-[10px] font-bold uppercase text-slate-500">Feed Overrides</span>
                    </div>
                    <div className="flex gap-2 mb-4">
                       <button onClick={() => sendCommand('0x91')} className="flex-1 py-3 bg-slate-800 rounded-xl text-xs active:bg-slate-700 font-bold">-10%</button>
                       <button onClick={() => sendCommand('0x90')} className="flex-1 py-3 bg-blue-600/20 text-blue-400 rounded-xl text-xs active:bg-blue-600/30 font-bold italic">Reset</button>
                       <button onClick={() => sendCommand('0x92')} className="flex-1 py-3 bg-slate-800 rounded-xl text-xs active:bg-slate-700 font-bold">+10%</button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold px-1">
                      <span>Feedrate</span>
                      <span className="text-white font-mono">{status.feed} mm/min</span>
                    </div>
                 </div>

                 <div className="bg-slate-900/80 rounded-3xl p-5 border border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <LayoutGrid size={14} className="text-emerald-400" />
                      <span className="text-[10px] font-bold uppercase text-slate-500">Quick Actions</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <button onClick={() => sendCommand('G92 X0 Y0 Z0')} className="py-3 bg-slate-800 rounded-xl text-xs active:bg-slate-700 font-bold">Zero All</button>
                       <button onClick={() => sendCommand('G90 G0 X0 Y0')} className="py-3 bg-slate-800 rounded-xl text-xs active:bg-slate-700 font-bold">Go To Zero</button>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Sender Tab */}
        {activeTab === 'sender' && (
          <div className="h-full overflow-y-auto p-6 pb-24 animate-in slide-in-from-right duration-300">
            <GcodeSender isConnected={connection.connected} onLog={addLog} />
          </div>
        )}

        {/* Converter Tab */}
        {activeTab === 'converter' && (
          <div className="h-full overflow-y-auto p-6 pb-24 animate-in slide-in-from-right duration-300">
            <ImageToGcode onSendGcode={handleSendBatchGcode} />
          </div>
        )}

        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <div className="h-full p-4 pb-24 animate-in slide-in-from-right duration-300">
            <Terminal logs={logs} onSend={sendCommand} />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-8 space-y-8 pb-24 animate-in slide-in-from-bottom duration-300">
            <div>
              <h2 className="text-2xl font-bold mb-2 uppercase tracking-tight">Setup</h2>
              <p className="text-slate-500 text-sm">Configure your machine connection and behavior.</p>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Connection Protocol</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800">
                {(['USB', 'Bluetooth', 'WiFi'] as ConnectionType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setConnection(prev => ({ ...prev, type: t }))}
                    className={`py-3 rounded-xl text-xs font-bold transition-all ${
                      connection.type === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {connection.type === 'WiFi' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Controller IP Address</label>
                <input 
                  type="text" 
                  value={wifiIp}
                  onChange={(e) => setWifiIp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-sm"
                  placeholder="e.g. 192.168.1.100"
                />
              </div>
            )}

            <AxisCalibration onCommand={sendCommand} isConnected={connection.connected} />

            <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-3xl p-6">
               <div className="flex items-center gap-2 mb-2">
                 <Globe size={18} className="text-emerald-400" />
                 <h4 className="text-emerald-400 font-bold text-sm uppercase">Offline Mode</h4>
               </div>
               <p className="text-slate-400 text-[11px] leading-relaxed">
                 Aplikasi ini berjalan secara mandiri. Kontrol CNC tetap dapat dilakukan melalui USB, Bluetooth, atau WiFi lokal meskipun internet tidak tersedia.
               </p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center px-6 pt-3 pb-8 z-[60]">
        <NavButton 
          active={activeTab === 'controls'} 
          onClick={() => setActiveTab('controls')} 
          icon={<LayoutGrid size={22} />} 
          label="Control" 
        />
        <NavButton 
          active={activeTab === 'sender'} 
          onClick={() => setActiveTab('sender')} 
          icon={<Send size={22} />} 
          label="Sender" 
        />
        <NavButton 
          active={activeTab === 'converter'} 
          onClick={() => setActiveTab('converter')} 
          icon={<ImageIcon size={22} />} 
          label="Art" 
        />
        <NavButton 
          active={activeTab === 'terminal'} 
          onClick={() => setActiveTab('terminal')} 
          icon={<TerminalIcon size={22} />} 
          label="Console" 
        />
        <NavButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
          icon={<Settings size={22} />} 
          label="Setup" 
        />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${active ? 'text-blue-500' : 'text-slate-400'}`}
  >
    <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-500/10' : ''}`}>
      {icon}
    </div>
    <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
  </button>
);

export default App;
