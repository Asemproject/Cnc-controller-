
import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps {
  logs: string[];
  onSend: (cmd: string) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ logs, onSend }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
      <div className="bg-slate-800/50 px-4 py-3 flex items-center gap-2 border-b border-slate-800">
        <TerminalIcon size={16} className="text-slate-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Console Output</span>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 p-4 font-mono text-sm overflow-y-auto space-y-1 bg-[#0a0f1a]"
      >
        {logs.map((log, i) => {
          const isSent = log.startsWith('>');
          return (
            <div key={i} className={isSent ? 'text-blue-400' : 'text-slate-300'}>
              {log}
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="text-slate-600 italic">No connection established...</div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-slate-800/50 flex gap-2 border-t border-slate-800">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter G-Code command..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
        <button 
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
