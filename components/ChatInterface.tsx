import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Message, GenerationStep } from '../types';
import { Send, Bot, Loader2, Sparkles, Paperclip, Wand2, RotateCcw, Eye, FolderOpen, X } from 'lucide-react';
import { enhancePrompt } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, attachments?: string[]) => void; // Updated signature
  isGenerating: boolean;
  mobileView?: 'chat' | 'preview';
  setMobileView?: (view: 'chat' | 'preview') => void;
  mobilePreviewComponent?: ReactNode;
  onRefreshPreview?: () => void;
  onActionClick?: (action: 'preview' | 'explorer') => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isGenerating,
  mobileView,
  setMobileView,
  mobilePreviewComponent,
  onRefreshPreview,
  onActionClick
}) => {
  const [input, setInput] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]); // Base64 images
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevIsGeneratingRef = useRef<boolean>(false);
  const prevMessagesLenRef = useRef<number>(0);

  // Auto-scroll logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Adjust max height slightly if we have attachments? No, keep standard.
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || attachments.length > 0) && !isGenerating) {
      onSendMessage(input, attachments);
      setInput('');
      setAttachments([]);
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
        // If it's an image, add to attachments.
        // If it's text, append to input (legacy behavior for code/text files)
        if (file.type.startsWith('image/')) {
          setAttachments(prev => [...prev, content]);
        } else {
          // Text file
          setInput((prev) => {
            const newInput = `${prev}\n\n[Attached File: ${file.name}]\n${content}\n`;
            return newInput;
          });
        }
      }
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file); // Read images as Base64 Data URL
    } else {
      reader.readAsText(file); // Read text files as text
    }

    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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
            <div className={`shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded-full transition-colors duration-300 ${step.status === 'completed'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-[#57B9FF]/10 text-[#57B9FF]'
              }`}>
              {step.status === 'completed' ? <div className="w-1.5 h-1.5 bg-current rounded-full" /> : <Loader2 className="w-2.5 h-2.5 animate-spin" />}
            </div>
            <span className={`truncate transition-opacity duration-300 ${step.status === 'completed'
              ? 'text-vibe-100 opacity-80'
              : 'text-[#57B9FF]/70 font-medium'
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
      {/* Mobile Header with Rollback Versions */}
      {
        isMobile && (
          <div className="flex-none p-3 border-b border-vibe-300 flex items-center justify-between bg-vibe-400">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-vibe-100 uppercase tracking-widest hidden sm:block">Vibe Architect</span>
            </div>

            {/* Rollback button removed */}
          </div>
        )
      }

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative w-full">
        {/* Messages List */}
        <div className={`
          absolute inset-0 overflow-y-auto ${isMobile ? 'p-4 pb-32' : 'p-4'} space-y-6 custom-scrollbar bg-vibe-400 transition-opacity duration-300
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
                max-w-[95%] p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-sm
                ${msg.role === 'user'
                  ? 'bg-[#57B9FF]/10 text-blue-50 border border-[#57B9FF]/30 rounded-br-none shadow-[0_4px_20px_rgba(87,185,255,0.1)]'
                  : 'bg-white/5 text-vibe-100 border border-white/5 rounded-bl-none shadow-[0_4px_20px_rgba(0,0,0,0.2)]'}
               `}>
                {msg.text && (
                  <div className="markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                        a: ({ node, ...props }) => <a className="text-[#57B9FF] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                        li: ({ node, ...props }) => <li className="ml-2" {...props} />,
                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mb-2 mt-4 first:mt-0" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-white mb-2 mt-3" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-md font-bold text-white mb-1 mt-2" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-[#57B9FF]" {...props} />,
                        code: ({ node, inline, className, children, ...props }: any) => {
                          return inline ? (
                            <code className="bg-black/30 px-1 py-0.5 rounded text-[#57B9FF] font-mono text-xs" {...props}>{children}</code>
                          ) : (
                            <div className="bg-black/30 p-3 rounded-lg my-2 overflow-x-auto border border-white/10">
                              <code className="font-mono text-xs text-zinc-300 block min-w-full" {...props}>{children}</code>
                            </div>
                          );
                        },
                        blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-[#57B9FF]/50 pl-3 italic text-zinc-400 my-2" {...props} />,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
                {msg.role === 'model' && msg.steps && renderSteps(msg.steps)}

                {/* Action Buttons */}
                {msg.role === 'model' && msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-white/5">
                    {/* Credits Remaining Info */}
                    {(msg.creditsRemaining !== undefined && msg.creditsRemaining !== null) && (
                      <div className="text-xs font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                        <span>💰</span>
                        <span>{msg.creditsRemaining} credits remaining</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {msg.actions.map(action => {
                        // Skip explorer in mobile view
                        if (action === 'explorer' && isMobile) return null;

                        return (
                          <button
                            key={action}
                            onClick={() => onActionClick && onActionClick(action)}
                            disabled={isGenerating && action === 'preview'}
                            className={`
                              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg
                              ${action === 'preview'
                                ? 'bg-[#57B9FF]/10 text-[#57B9FF] border border-[#57B9FF]/30 hover:bg-[#57B9FF]/20 shadow-[0_0_15px_rgba(87,185,255,0.1)]'
                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'}
                              ${isGenerating && action === 'preview' ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                            `}
                          >
                            {action === 'preview' && <Eye className="w-3.5 h-3.5" />}
                            {action === 'explorer' && <FolderOpen className="w-3.5 h-3.5" />}
                            {action === 'preview' ? 'Show Preview' : 'File Explorer'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex items-center gap-2 pl-0 animate-pulse mt-2">
              <div className="w-4 h-4 rounded-full border-2 border-[#57B9FF] border-t-transparent animate-spin"></div>
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
      <div className={`flex-none bg-vibe-400 border-t border-vibe-300/30 z-30 ${isMobile ? 'fixed bottom-0 left-0 right-0 p-2' : 'p-4'}`}>
        <div className="relative group">

          {/* Mobile Toggle - Floating Above Input */}
          {isMobile && setMobileView && (
            <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 mb-4 z-50">
              <div className="flex bg-vibe-300/80 backdrop-blur-md rounded-full p-1 border border-vibe-300/50 shadow-lg">
                <button
                  onClick={() => setMobileView('chat')}
                  className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 flex items-center gap-1.5 ${mobileView === 'chat'
                    ? 'bg-vibe-100 text-vibe-500 shadow-sm'
                    : 'text-vibe-100 hover:text-white'
                    }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setMobileView('preview')}
                  className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 flex items-center gap-1.5 ${mobileView === 'preview'
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
            border-2 border-[#57B9FF]/40 ring-1 ring-[#57B9FF]/20 shadow-[0_0_20px_rgba(87,185,255,0.2)]
            focus-within:border-[#57B9FF] focus-within:ring-2 focus-within:ring-[#57B9FF]/30 focus-within:shadow-[0_0_35px_rgba(87,185,255,0.4)]
            ${isMobile ? 'p-2' : 'p-3'}
          `}>
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {attachments.map((img, i) => (
                  <div key={i} className="relative shrink-0 group/img">
                    <img src={img} alt="Attachment" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                    <button
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachments.length > 0 ? "Describe these images..." : "Describe changes..."}
              rows={1}
              className="w-full bg-transparent border-none text-sm text-vibe-100 placeholder-vibe-200/50 focus:ring-0 focus:outline-none resize-none min-h-[24px] max-h-[120px]"
              disabled={isGenerating}
            />

            <div className="flex items-center justify-between pt-2 relative h-8">
              {/* Left Tools */}
              <div className="flex gap-1 z-10">
                <button
                  className="p-1.5 rounded-lg text-vibe-200 hover:text-white hover:bg-white/10 transition-colors"
                  title="Attach file or image"
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
                  disabled={(!input.trim() && attachments.length === 0) || isGenerating}
                  className="p-1.5 rounded-lg bg-vibe-100 text-vibe-500 hover:bg-white disabled:opacity-50 disabled:bg-vibe-300 disabled:text-vibe-200 transition-all duration-200 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default ChatInterface;