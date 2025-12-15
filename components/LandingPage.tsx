
import React, { useState, useRef } from 'react';
import { Sparkles, ArrowRight, Wand2, Paperclip, Loader2, Layout, Database, Code2, Cpu, Globe, Share2, X } from 'lucide-react';
import { enhancePrompt } from '../services/geminiService';
import LightRays from './LightRays';

interface LandingPageProps {
  onStart: (prompt: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const [input, setInput] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    "E-commerce Dashboard with Dark Mode",
    "Portfolio for a 3D Artist",
    "SaaS Landing Page with Pricing",
    "Real Estate Listing Platform",
    "Fitness Tracker App UI",
    "Crypto Trading Interface"
  ];

  // Rotate suggestions
  React.useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
    }, 6000); // Change every 6 seconds
    return () => clearInterval(interval);
  }, [suggestions.length]);

  const currentSuggestions = [
    suggestions[suggestionIndex],
    suggestions[(suggestionIndex + 1) % suggestions.length],
    suggestions[(suggestionIndex + 2) % suggestions.length]
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || attachedImages.length > 0) {
      // Pass both text and images (images would need to be handled by onStart, currently just string. 
      // We will append image info to prompt string if not natively supported by onStart yet)
      let finalPrompt = input;
      if (attachedImages.length > 0) {
        finalPrompt += `\n\n[User attached ${attachedImages.length} images for context]`;
      }
      onStart(finalPrompt);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files: File[] = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    processFiles(files);
    e.target.value = ''; // Reset
  };

  const processFiles = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();

      if (file.type.startsWith('image/')) {
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            setAttachedImages(prev => [...prev, result]);
            // We don't append to text immediately to avoid huge base64 strings in the visible input, 
            // but we keep visual preview.
          }
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content) {
            setInput((prev) => `${prev} \n\n[Attached File: ${file.name}]\n${content} \n`);
          }
        };
        reader.readAsText(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
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

  return (
    <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden bg-vibe-500 text-vibe-100 selection:bg-vibe-300 selection:text-white">

      {/* Background with LightRays */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        <div className="absolute inset-0 w-full h-full opacity-60">
          <LightRays
            raysOrigin="top-center"
            raysColor="#57B9FF"
            raysSpeed={1.5}
            lightSpread={0.8}
            rayLength={1.2}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
            className="w-full h-full"
          />
        </div>
        {/* Subtle base gradient underneath - Soft Blue aligned */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(87,185,255,0.15),transparent_50%)] pointer-events-none"></div>
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-vibe-300 scrollbar-track-transparent">
        <div className="flex flex-col items-center justify-center min-h-[100dvh] px-4 pt-0 md:pt-48 pb-12 max-w-6xl mx-auto w-full">

          {/* Hero Title */}
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold tracking-tighter mb-8 md:mb-12 text-center drop-shadow-2xl px-4">
            <span className="text-vibe-100">Think it. </span>
            <span className="text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white">Vibe it!</span>
          </h1>

          {/* Main Input - Optimized & Highlighted */}
          <div
            className={`w-full max-w-3xl relative group transition-all duration-300 ${isDragging ? 'scale-105' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Soft Blue Glow Background - Intensified to match rays */}
            <div className={`absolute -inset-1 bg-[#57B9FF] rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition duration-500 ${isDragging ? 'opacity-90' : ''}`}></div>

            <form
              onSubmit={handleSubmit}
              className="relative z-10 bg-black/80 backdrop-blur-md rounded-2xl p-2 border border-[#57B9FF]/50 shadow-[0_0_30px_rgba(87,185,255,0.2)] group-hover:shadow-[0_0_40px_rgba(87,185,255,0.4)] transition-all duration-300"
            >
              {/* Image Previews */}
              {attachedImages.length > 0 && (
                <div className="flex gap-3 p-3 flex-wrap border-b border-white/5">
                  {attachedImages.map((img, idx) => (
                    <div key={idx} className="relative group/image">
                      <img src={img} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-white/20" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover/image:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start">
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
                  placeholder={isDragging ? "Drop images or files here..." : "Describe your idea..."}
                  className="w-full bg-transparent text-base md:text-xl text-white placeholder-white/40 px-4 py-4 md:px-6 md:py-6 min-h-[60px] md:min-h-[80px] max-h-[200px] resize-none focus:outline-none leading-relaxed selection:bg-blue-500/30 font-medium"
                  rows={1}
                />
              </div>

              {/* Input Actions */}
              <div className="flex items-center justify-between px-4 pb-2 mt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    className="p-2 rounded-xl text-vibe-200 hover:text-white hover:bg-white/10 transition-all tooltip-trigger relative group/btn"
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleEnhance}
                    disabled={isEnhancing || !input.trim()}
                    className={`p-2 rounded-xl text-vibe-200 hover:text-white hover:bg-white/10 transition-all group/btn ${isEnhancing ? 'animate-pulse text-blue-400' : ''}`}
                    title="Enhance with AI"
                  >
                    {isEnhancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />
                </div>

                <button
                  type="submit"
                  className="p-3 rounded-xl bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-white/20"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>

          {/* Suggestions - Rotating 3 items */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 animate-fade-in">
            {currentSuggestions.map((suggestion, idx) => (
              <button
                key={`${suggestion} -${idx} `}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 text-sm font-medium text-vibe-200 hover:text-white transition-all hover:scale-105 hover:border-white/20 shadow-lg backdrop-blur-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept="image/*,.txt,.js,.ts,.tsx,.css,.html,.json,.md,.py" // Added image support
        multiple
      />
    </div>
  );
};

export default LandingPage;
