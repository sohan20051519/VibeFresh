import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './ChatInterface';
import CodePreview from './CodePreview';
import { generateCodeStream } from '../services/geminiService';
import { Message, GeneratedPreview, ProjectFile, GenerationStep } from '../types';

interface WorkspaceProps {
  initialPrompt?: string;
  shouldAutoGenerate?: boolean;
  mobileView: 'chat' | 'preview';
  setMobileView: (view: 'chat' | 'preview') => void;
  preview: GeneratedPreview | null;
  setPreview: (preview: GeneratedPreview | null) => void;
  onSuccess?: (prompt: string, files: ProjectFile[]) => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ 
  initialPrompt, 
  shouldAutoGenerate = true,
  mobileView, 
  setMobileView, 
  preview, 
  setPreview,
  onSuccess
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Handle restoring history without regenerating
  useEffect(() => {
    if (initialPrompt && !shouldAutoGenerate && !initialized) {
        // We are restoring history
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: initialPrompt,
            timestamp: Date.now()
        };
        const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: 'Project restored from history.',
            timestamp: Date.now() + 1
        };
        setMessages([userMsg, botMsg]);
        setInitialized(true);
    }
  }, [initialPrompt, shouldAutoGenerate, initialized]);
  
  const handleSendMessage = async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now()
    };
    
    const botMsgId = (Date.now() + 1).toString();
    const botMsg: Message = {
      id: botMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      steps: []
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
    setIsGenerating(true);

    try {
        const responseJson = await generateCodeStream(
          text, 
          messages,
          preview?.files || [], // Pass current files for incremental updates
          (step: GenerationStep) => {
             setMessages(prev => prev.map(msg => {
                 if (msg.id === botMsgId) {
                     const existingStepIndex = msg.steps?.findIndex(s => s.id === step.id);
                     let newSteps = [...(msg.steps || [])];
                     
                     if (existingStepIndex !== undefined && existingStepIndex !== -1) {
                         newSteps[existingStepIndex] = step;
                     } else {
                         newSteps.push(step);
                     }
                     return { ...msg, steps: newSteps };
                 }
                 return msg;
             }));
          },
          (files: ProjectFile[]) => {
              setPreview({
                  files,
                  version: Date.now()
              });
          }
        );

        const finalFiles: ProjectFile[] = JSON.parse(responseJson);
        setPreview({
          files: finalFiles,
          version: Date.now()
        });

        // Trigger Success Callback (e.g., save to history)
        if (onSuccess) {
            onSuccess(text, finalFiles);
        }

        setMessages(prev => prev.map(msg => {
            if (msg.id === botMsgId) {
                return { ...msg, text: "Project updated successfully!" };
            }
            return msg;
        }));

    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'model',
        text: error instanceof Error ? error.message : "Sorry, I encountered an error.",
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefreshPreview = () => {
    // Always bump preview version to force consumers (CodePreview iframe) to reload.
    // This performs a soft refresh of the preview tab without re-running generation.
    setPreview(prev => prev ? { ...prev, version: Date.now() } : prev);
  };

  useEffect(() => {
    if (initialPrompt && shouldAutoGenerate && !initialized) {
      handleSendMessage(initialPrompt);
      setInitialized(true);
    }
  }, [initialPrompt, shouldAutoGenerate]);

  return (
    <div className="flex h-full overflow-hidden bg-vibe-500 w-full">
      {/* 
        Desktop Layout: Side-by-side
        Mobile Layout: ChatInterface manages the view (rendering messages or preview internally)
      */}

      {/* Desktop Chat Panel */}
      <div className="hidden md:flex w-[400px] border-r border-vibe-300 flex-col bg-vibe-400 z-10 h-full">
        <ChatInterface 
          messages={messages} 
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onRefreshPreview={handleRefreshPreview}
        />
      </div>

      {/* Desktop Preview Panel */}
      <div className="hidden md:flex flex-1 flex-col min-w-0 bg-vibe-500 h-full">
        <CodePreview 
          preview={preview} 
          isGenerating={isGenerating}
        />
      </div>

      {/* Mobile Unified Interface */}
      <div className="flex md:hidden flex-1 flex-col h-full w-full">
         <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
            mobileView={mobileView}
            setMobileView={setMobileView}
            mobilePreviewComponent={
              <CodePreview 
                preview={preview} 
                isGenerating={isGenerating} 
                isMobile={true} 
              />
            }
            onRefreshPreview={handleRefreshPreview}
         />
      </div>
    </div>
  );
};

export default Workspace;