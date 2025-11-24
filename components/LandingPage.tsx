
import React, { useState, useRef } from 'react';
import { Sparkles, ArrowRight, Wand2, Terminal, Paperclip, Loader2, Clock, RotateCcw } from 'lucide-react';
import { enhancePrompt } from '../services/geminiService';
import { HistoryItem } from '../types';

interface LandingPageProps {
  onStart: (initialPrompt?: string) => void;
  history?: HistoryItem[];
  onHistoryClick?: (item: HistoryItem) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, history = [], onHistoryClick }) => {
  const [input, setInput] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onStart(input);
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInput((prev) => `${prev}\n\n[Attached File: ${file.name}]\n${content}\n`);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleEnhance = async () => {
    if (!input.trim() || isEnhancing) return;
    
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(input);
      setInput(enhanced);
    } catch (err) {
      console.error("Failed to enhance", err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return 'Yesterday';
  };

  const suggestions = [
    "Glassmorphism Dashboard",
    "Minimal Portfolio", 
    "Landing Page",
    "E-commerce Shop"
  ];

  return (
    <div className="flex-1 flex flex-col relative overflow-y-auto w-full h-full scrollbar-thin scrollbar-thumb-vibe-300 scrollbar-track-transparent">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
        accept=".txt,.js,.ts,.tsx,.css,.html,.json,.md,.py"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center flex-1 px-4 max-w-5xl mx-auto w-full pt-12 md:pt-24 pb-12">
        
        {/* Badge */}
        <div className="mb-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-vibe-300 bg-vibe-400/50 text-vibe-200 text-xs font-bold uppercase tracking-widest animate-fade-in backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          VibeFresh <span className="text-vibe-300">|</span> By Sohan
        </div>

        {/* Hero Text */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-12 text-vibe-100 drop-shadow-2xl text-center">
          Build pure websites <br />
          <span className="text-vibe-200/60">
            just by vibing.
          </span>
        </h1>

        {/* Input Area */}
        <div className="w-full max-w-2xl relative group">
           <form 
            onSubmit={handleSubmit} 
            className={`
              relative bg-[#0a0a0a] rounded-2xl p-4 shadow-2xl flex flex-col gap-3 transition-all duration-300
              border-2 border-blue-500/30 ring-1 ring-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]
              focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:shadow-[0_0_30px_rgba(59,130,246,0.3)] focus-within:scale-[1.01]
            `}
          >
             <div className="relative flex items-start">
               <textarea
                 ref={textareaRef}
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSubmit(e);
                   }
                 }}
                 placeholder="Describe your dream website..."
                 className="w-full bg-transparent text-lg text-vibe-100 placeholder-vibe-200/50 px-2 py-2 min-h-[60px] max-h-[200px] resize-none focus:outline-none selection:bg-vibe-300"
                 rows={1}
               />
             </div>
             
             <div className="flex items-center justify-between px-1 pb-1">
               <div className="flex gap-2">
                 <button 
                  type="button" 
                  onClick={handleAttachClick}
                  className="p-2 rounded-lg text-vibe-200 hover:text-white hover:bg-white/10 transition-colors"
                  title="Attach file"
                 >
                   <Paperclip className="w-5 h-5" />
                 </button>
                 <button 
                  type="button" 
                  onClick={handleEnhance}
                  disabled={isEnhancing || !input.trim()}
                  className={`p-2 rounded-lg text-vibe-200 hover:text-white hover:bg-white/10 transition-colors ${isEnhancing ? 'opacity-50 cursor-wait' : ''}`}
                  title="Enhance prompt"
                 >
                   {isEnhancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                 </button>
               </div>
               
               <button 
                 type="submit"
                 disabled={!input.trim()}
                 className="flex items-center gap-2 px-6 py-2.5 bg-vibe-100 hover:bg-white text-vibe-500 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-vibe-100/5 hover:shadow-vibe-100/20"
               >
                 Generate
                 <ArrowRight className="w-4 h-4" />
               </button>
             </div>
           </form>
        </div>

        {/* Suggestion Chips */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-vibe-300 bg-vibe-400/30 text-sm font-medium text-vibe-200 hover:text-vibe-100 hover:border-vibe-200 hover:bg-vibe-400 transition-all"
            >
              {suggestion === "Glassmorphism Dashboard" && <Terminal className="w-3.5 h-3.5" />}
              {suggestion}
            </button>
          ))}
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="mt-16 w-full max-w-4xl animate-fade-in pb-10">
             <div className="flex items-center gap-2 mb-4 px-2">
                <Clock className="w-4 h-4 text-vibe-200" />
                <h2 className="text-sm font-bold text-vibe-200 uppercase tracking-widest">Recent Vibes (24h)</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onHistoryClick && onHistoryClick(item)}
                    className="group relative flex flex-col gap-3 p-4 rounded-xl bg-vibe-400/20 border border-vibe-300 hover:bg-vibe-400/40 hover:border-vibe-200 transition-all text-left backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between w-full">
                       <span className="text-[10px] font-mono text-vibe-200 bg-vibe-500/50 px-1.5 py-0.5 rounded border border-vibe-300/50">
                         {formatTimeAgo(item.timestamp)}
                       </span>
                       <RotateCcw className="w-3.5 h-3.5 text-vibe-300 group-hover:text-vibe-100 transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-vibe-100 line-clamp-2 leading-relaxed">
                      {item.prompt}
                    </p>
                    <div className="mt-auto pt-2 flex items-center gap-2 text-xs text-vibe-200 group-hover:text-vibe-100 transition-colors">
                       <Terminal className="w-3 h-3" />
                       <span>{item.files.length} files generated</span>
                    </div>
                  </button>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
