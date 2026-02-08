
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Square, Upload, FileText, ChevronRight, Hash, CheckCircle, AlertCircle, Maximize2 } from 'lucide-react';
import { cncService } from '../services/ConnectionService';

interface GcodeSenderProps {
  onLog: (msg: string) => void;
  isConnected: boolean;
}

interface PathSegment {
  type: 'move' | 'cut';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineIndex: number;
}

export const GcodeSender: React.FC<GcodeSenderProps> = ({ onLog, isConnected }) => {
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lineListRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const isRunningRef = useRef(isRunning);
  const currentIndexRef = useRef(currentLineIndex);

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { currentIndexRef.current = currentLineIndex; }, [currentLineIndex]);

  // Parse paths for visualization
  const paths = useMemo(() => {
    const segments: PathSegment[] = [];
    let curX = 0;
    let curY = 0;
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    fileContent.forEach((line, index) => {
      const gCodeMatch = line.match(/[Gg]([01])/);
      if (gCodeMatch) {
        const type = gCodeMatch[1] === '0' ? 'move' : 'cut';
        const xMatch = line.match(/[Xx](-?\d+\.?\d*)/);
        const yMatch = line.match(/[Yy](-?\d+\.?\d*)/);
        
        const nextX = xMatch ? parseFloat(xMatch[1]) : curX;
        const nextY = yMatch ? parseFloat(yMatch[1]) : curY;

        segments.push({
          type,
          x1: curX,
          y1: curY,
          x2: nextX,
          y2: nextY,
          lineIndex: index
        });

        curX = nextX;
        curY = nextY;

        minX = Math.min(minX, curX);
        maxX = Math.max(maxX, curX);
        minY = Math.min(minY, curY);
        maxY = Math.max(maxY, curY);
      }
    });

    return { segments, bounds: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY } };
  }, [fileContent]);

  // Draw the preview
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas internal size to match display size for crispness
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (paths.segments.length === 0) return;

    const padding = 20;
    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2;
    
    const scale = Math.min(
      availableWidth / (paths.bounds.width || 1),
      availableHeight / (paths.bounds.height || 1)
    );

    const offsetX = padding + (availableWidth - paths.bounds.width * scale) / 2 - paths.bounds.minX * scale;
    const offsetY = padding + (availableHeight - paths.bounds.height * scale) / 2 + paths.bounds.maxY * scale;

    const transformX = (x: number) => offsetX + x * scale;
    const transformY = (y: number) => offsetY - y * scale; // Invert Y for screen coordinates

    // Draw grid (optional visual aid)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = -100; i <= 500; i += 50) {
      ctx.moveTo(transformX(i), 0);
      ctx.lineTo(transformX(i), rect.height);
      ctx.moveTo(0, transformY(i));
      ctx.lineTo(rect.width, transformY(i));
    }
    ctx.stroke();

    // Draw original paths (gray)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw all remaining paths
    ctx.beginPath();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    paths.segments.forEach(seg => {
      if (seg.lineIndex > currentLineIndex) {
        ctx.moveTo(transformX(seg.x1), transformY(seg.y1));
        ctx.lineTo(transformX(seg.x2), transformY(seg.y2));
      }
    });
    ctx.stroke();

    // Draw processed paths (blue)
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    paths.segments.forEach(seg => {
      if (seg.lineIndex <= currentLineIndex) {
        ctx.moveTo(transformX(seg.x1), transformY(seg.y1));
        ctx.lineTo(transformX(seg.x2), transformY(seg.y2));
      }
    });
    ctx.stroke();

    // Draw current tool position
    if (currentLineIndex >= 0 && currentLineIndex < fileContent.length) {
      const currentSeg = paths.segments.find(s => s.lineIndex === currentLineIndex);
      if (currentSeg) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(transformX(currentSeg.x2), transformY(currentSeg.y2), 4, 0, Math.PI * 2);
        ctx.fill();
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ef4444';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }, [paths, currentLineIndex, fileContent.length]);

  useEffect(() => {
    drawPreview();
    window.addEventListener('resize', drawPreview);
    return () => window.removeEventListener('resize', drawPreview);
  }, [drawPreview]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0 && !line.startsWith(';'));
        setFileContent(lines);
        setCurrentLineIndex(-1);
        setIsRunning(false);
        setIsPaused(false);
      };
      reader.readAsText(file);
    }
  };

  const sendNextLine = useCallback(async () => {
    if (!isRunningRef.current || isPaused || currentIndexRef.current >= fileContent.length - 1) {
      if (currentIndexRef.current >= fileContent.length - 1 && isRunningRef.current) {
        setIsRunning(false);
        onLog("Execution completed.");
      }
      return;
    }

    const nextIndex = currentIndexRef.current + 1;
    const line = fileContent[nextIndex];
    
    setCurrentLineIndex(nextIndex);
    cncService.send(line);
  }, [fileContent, isPaused, onLog]);

  useEffect(() => {
    const handleData = (e: any) => {
      const data = e.detail.toLowerCase();
      if (data.includes('ok') && isRunningRef.current && !isPaused) {
        sendNextLine();
      }
    };
    window.addEventListener('cnc-data', handleData);
    return () => window.removeEventListener('cnc-data', handleData);
  }, [sendNextLine, isPaused]);

  useEffect(() => {
    if (lineListRef.current && currentLineIndex >= 0) {
      const activeLine = lineListRef.current.children[currentLineIndex] as HTMLElement;
      if (activeLine) {
        activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentLineIndex]);

  const startJob = () => {
    if (!isConnected) {
      onLog("Error: Not connected to controller.");
      return;
    }
    if (fileContent.length === 0) return;
    setIsRunning(true);
    setIsPaused(false);
    if (currentLineIndex === -1) {
      setTimeout(() => sendNextLine(), 100);
    } else {
      sendNextLine();
    }
  };

  const pauseJob = () => setIsPaused(true);
  const stopJob = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);
    cncService.send('!'); 
    onLog("Job stopped by user.");
  };

  const progress = fileContent.length > 0 
    ? Math.max(0, ((currentLineIndex + 1) / fileContent.length) * 100) 
    : 0;

  return (
    <div className="flex flex-col h-full gap-4 pb-10">
      {/* Visual Preview Card */}
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl relative h-64 md:h-80 shrink-0">
        <div className="absolute top-4 left-6 z-10 flex items-center gap-2 pointer-events-none">
          <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
            <Maximize2 size={14} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Path Preview</span>
        </div>
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* File Info & Progress */}
        <div className="lg:col-span-1 space-y-4 flex flex-col">
          <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                  <FileText size={20} />
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-white font-bold text-sm leading-tight truncate w-32 md:w-full">
                    {fileName || 'No File Loaded'}
                  </h3>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                    G-Code Project
                  </p>
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-colors"
              >
                <Upload size={18} className="text-slate-300" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".nc,.gcode,.txt" className="hidden" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/50">
                <span className="text-[8px] font-bold uppercase text-slate-500 block mb-1">Total Lines</span>
                <div className="text-lg font-mono text-white">{fileContent.length}</div>
              </div>
              <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/50">
                <span className="text-[8px] font-bold uppercase text-slate-500 block mb-1">Current</span>
                <div className="text-lg font-mono text-blue-400">{currentLineIndex + 1}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                <span>Progress</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {!isRunning || isPaused ? (
              <button onClick={startJob} className="col-span-2 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                <Play size={18} fill="currentColor" /> {isPaused ? 'Resume' : 'Start'}
              </button>
            ) : (
              <button onClick={pauseJob} className="col-span-2 py-4 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                <Pause size={18} fill="currentColor" /> Pause
              </button>
            )}
            <button onClick={stopJob} className="py-4 bg-rose-600/20 text-rose-500 border border-rose-500/20 rounded-2xl font-black active:scale-95 transition-all flex items-center justify-center">
              <Square size={18} fill="currentColor" />
            </button>
          </div>
        </div>

        {/* Code List */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col min-h-[200px]">
          <div className="bg-slate-800/50 px-6 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ChevronRight size={14} className="text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Command Stream</span>
            </div>
            <span className="text-[8px] font-mono text-slate-500 uppercase">G-Code Buffer</span>
          </div>
          
          <div ref={lineListRef} className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-0.5 bg-[#0a0f1a]">
            {fileContent.length > 0 ? (
              fileContent.map((line, i) => (
                <div key={i} className={`px-2 py-1 rounded transition-colors flex gap-4 ${
                  i === currentLineIndex 
                    ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500' 
                    : i < currentLineIndex ? 'text-slate-700 opacity-40' : 'text-slate-500'
                }`}>
                  <span className="w-6 text-right shrink-0 select-none opacity-30">{i + 1}</span>
                  <span className="truncate">{line}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-2 opacity-30">
                <FileText size={32} />
                <p className="text-[8px] uppercase font-black tracking-[0.2em]">Idle - Upload to start</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="bg-rose-600/10 border border-rose-500/20 rounded-2xl p-3 flex items-center gap-3 animate-pulse">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <p className="text-rose-500 text-[10px] font-bold uppercase">Controller disconnected</p>
        </div>
      )}
    </div>
  );
};
