import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Message, GenerationStep } from '../types';
import { Send, Bot, Loader2, Sparkles, Paperclip, Wand2 } from 'lucide-react';
import { enhancePrompt } from '../services/geminiService';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
  mobileView?: 'chat' | 'preview';
  setMobileView?: (view: 'chat' | 'preview') => void;
  mobilePreviewComponent?: ReactNode;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  isGenerating,
  mobileView,
  setMobileView,
  mobilePreviewComponent
}) => {
  const [input, setInput] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevIsGeneratingRef = useRef<boolean>(false);
  const prevMessagesLenRef = useRef<number>(0);

  // Prefer instant scroll on touch devices to avoid viewport/keyboard jumps
  const isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));

  const scrollToBottom = (options?: ScrollIntoViewOptions) => {
    try {
      const behavior = isTouchDevice ? 'auto' : 'smooth';
      messagesEndRef.current?.scrollIntoView({ behavior: behavior as ScrollBehavior, block: 'nearest' });
    } catch (err) {
      // Fallback in case scrollIntoView options aren't supported
      messagesEndRef.current?.scrollIntoView();
    }
  };

  useEffect(() => {
    if (mobilePreviewComponent && mobileView !== 'chat') return;

    const prevIsGenerating = prevIsGeneratingRef.current;
    const prevMessagesLen = prevMessagesLenRef.current;

    // Compute whether we should auto-scroll:
    // - Scroll when the user just sent a message (so they see their message)
    // - Scroll when generation finished (so final output is visible)
    const lastMsg = messages[messages.length - 1];
    const lastRole = lastMsg?.role;

    const userSentMsg = messages.length > prevMessagesLen && lastRole === 'user';
    const generationFinished = prevIsGenerating && !isGenerating;

    if (userSentMsg || generationFinished) {
      // Avoid jumping if the user is actively typing in an input/textarea
      const active = typeof document !== 'undefined' ? document.activeElement : null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) {
        // If the user is typing, don't force-scroll
      } else {
        scrollToBottom();
      }
    }

    prevIsGeneratingRef.current = isGenerating;
    prevMessagesLenRef.current = messages.length;
  }, [messages, isGenerating, mobileView, mobilePreviewComponent]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isGenerating) {
      onSendMessage(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
        setInput((prev) => {
           const newInput = `${prev}\n\n[Attached File: ${file.name}]\n${content}\n`;
           setTimeout(() => {
             if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
             }
           }, 0);
           return newInput;
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleEnhance = async () => {
    if (!input.trim() || isEnhancing) return;
    
    setIsEnhancing(true);
    try {
      const enhanced = await enhancePrompt(input);
      setInput(enhanced);
      setTimeout(() => {
        if (textareaRef.current) {
           textareaRef.current.style.height = 'auto';
           textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
      }, 0);
    } catch (err) {
      console.error("Failed to enhance", err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const renderSteps = (steps?: GenerationStep[]) => {
    if (!steps || steps.length === 0) return null;
    return (
      <div className="mt-3 space-y-2 w-full">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2.5 text-xs font-mono transition-all duration-300">
             <div className={`shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded-full transition-colors duration-300 ${
               step.status === 'completed' 
                 ? 'bg-green-500/20 text-green-400' 
                 : 'bg-blue-500/20 text-blue-400'
             }`}>
               {step.status === 'completed' ? <div className="w-1.5 h-1.5 bg-current rounded-full" /> : <Loader2 className="w-2.5 h-2.5 animate-spin" />}
             </div>
             <span className={`truncate transition-opacity duration-300 ${
               step.status === 'completed' 
                 ? 'text-vibe-100 opacity-80' 
                 : 'text-blue-200 font-medium'
             }`}>
               {step.label}
             </span>
          </div>
        ))}
      </div>
    );
  };

  const isMobile = !!mobilePreviewComponent;
  const showPreview = isMobile && mobileView === 'preview';

  return (
    <div className="flex flex-col h-full bg-vibe-400 w-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
        accept=".txt,.js,.ts,.tsx,.css,.html,.json,.md,.py"
      />

      {/* Header - Only show on Desktop */}
      {!isMobile && (
        <div className="flex-none p-4 border-b border-vibe-300 flex items-center justify-between bg-vibe-400">
          <div className="flex items-center gap-2 text-xs font-bold text-vibe-100 uppercase tracking-widest">
            <Bot className="w-3.5 h-3.5 text-blue-400" />
            Vibe Architect
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative w-full">
        {/* Messages List */}
        <div className={`
          absolute inset-0 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-vibe-400 transition-opacity duration-300
          ${showPreview ? 'opacity-0 pointer-events-none z-0' : 'opacity-100 z-10'}
        `}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-40 select-none">
              <Sparkles className="w-8 h-8 text-vibe-200 mb-2" />
              <p className="text-sm font-medium text-center text-vibe-200">Ready to architect</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`
                max-w-[95%] p-3.5 rounded-xl text-sm leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-vibe-300 text-vibe-100 rounded-br-none shadow-sm border border-vibe-300' 
                  : 'bg-transparent text-vibe-100 pl-0'}
              `}>
                 {msg.text && <div className="whitespace-pre-wrap">{msg.text}</div>}
                 {msg.role === 'model' && msg.steps && renderSteps(msg.steps)}
              </div>
            </div>
          ))}
          
          {isGenerating && (
            <div className="flex items-center gap-2 pl-0 animate-pulse mt-2">
               <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
               <span className="text-xs text-white/80 font-mono tracking-wide">Thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Mobile Preview Area */}
        {isMobile && (
          <div className={`
            absolute inset-0 bg-vibe-500 transition-transform duration-300 z-20 flex flex-col
            ${showPreview ? 'translate-x-0' : 'translate-x-full'}
          `}>
             {mobilePreviewComponent}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={`flex-none bg-vibe-400 border-t border-vibe-300/30 z-30 ${isMobile ? 'p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]' : 'p-4'}`}>
        <div className="relative group">
          
          {/* Mobile Toggle - Floating Above Input */}
          {isMobile && setMobileView && (
             <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 mb-4 z-50">
               <div className="flex bg-vibe-300/80 backdrop-blur-md rounded-full p-1 border border-vibe-300/50 shadow-lg">
                  <button 
                    onClick={() => setMobileView('chat')}
                    className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                      mobileView === 'chat' 
                        ? 'bg-vibe-100 text-vibe-500 shadow-sm' 
                        : 'text-vibe-100 hover:text-white'
                    }`}
                  >
                    Chat
                  </button>
                  <button 
                    onClick={() => setMobileView('preview')}
                    className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 flex items-center gap-1.5 ${
                      mobileView === 'preview' 
                        ? 'bg-vibe-100 text-vibe-500 shadow-sm' 
                        : 'text-vibe-100 hover:text-white'
                    }`}
                  >
                    Preview
                  </button>
               </div>
             </div>
          )}

          <div className={`
            relative flex flex-col gap-2 bg-[#0a0a0a] rounded-xl shadow-xl transition-all duration-300
            border-2 border-blue-500/30 ring-1 ring-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.1)]
            focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.25)]
            ${isMobile ? 'p-2' : 'p-3'}
          `}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe changes..."
              rows={1}
              className="w-full bg-transparent border-none text-sm text-vibe-100 placeholder-vibe-200/50 focus:ring-0 focus:outline-none resize-none min-h-[24px] max-h-[120px]"
              disabled={isGenerating}
            />
            
            <div className="flex items-center justify-between pt-2 relative h-8">
               {/* Left Tools */}
               <div className="flex gap-1 z-10">
                 <button 
                  className="p-1.5 rounded-lg text-vibe-200 hover:text-white hover:bg-white/10 transition-colors"
                  title="Attach file"
                  onClick={handleAttachClick}
                 >
                   <Paperclip className="w-4 h-4" />
                 </button>
                 <button 
                  className={`p-1.5 rounded-lg text-vibe-200 hover:text-white hover:bg-white/10 transition-colors ${isEnhancing ? 'opacity-50 cursor-wait' : ''}`}
                  title="Enhance prompt"
                  onClick={handleEnhance}
                  disabled={isEnhancing || !input.trim()}
                 >
                   {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                 </button>
               </div>

               {/* Right Send Button */}
               <div className="z-10">
                 <button
                    onClick={() => handleSubmit()}
                    disabled={!input.trim() || isGenerating}
                    className="p-1.5 rounded-lg bg-vibe-100 text-vibe-500 hover:bg-white disabled:opacity-50 disabled:bg-vibe-300 disabled:text-vibe-200 transition-all duration-200 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;