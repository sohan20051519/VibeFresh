import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './ChatInterface';
import CodePreview from './CodePreview';
import { generateCodeStream } from '../services/geminiService';
import { Message, GeneratedPreview, ProjectFile, GenerationStep } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface WorkspaceProps {
  initialPrompt?: string;
  initialMessages?: Message[];
  shouldAutoGenerate?: boolean;
  mobileView: 'chat' | 'preview';
  setMobileView: (view: 'chat' | 'preview') => void;
  preview: GeneratedPreview | null;
  setPreview: (preview: GeneratedPreview | null) => void;
  onSuccess?: (prompt: string, files: ProjectFile[], messages: Message[]) => void;
  activeCodeTab: 'preview' | 'code';
  setActiveCodeTab: (tab: 'preview' | 'code') => void;
  previewViewport: 'mobile' | 'tablet' | 'desktop';
  setPreviewViewport: (viewport: 'mobile' | 'tablet' | 'desktop') => void;
  isPreviewFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  setIsGenerating?: (isGenerating: boolean) => void;
  previewRefreshKey?: number; // External refresh key from App
}

const Workspace: React.FC<WorkspaceProps> = ({
  initialPrompt,
  initialMessages,
  shouldAutoGenerate = true,
  mobileView,
  setMobileView,
  preview,
  setPreview,
  onSuccess,
  activeCodeTab,
  setActiveCodeTab,
  previewViewport,
  setPreviewViewport,
  isPreviewFullScreen,
  onToggleFullScreen,
  setIsGenerating: setParentIsGenerating,
  previewRefreshKey = 0
}) => {
  const { user, deductCredits, hasEnoughCredits } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);

  // Combine internal and external refresh keys
  const refreshKey = internalRefreshKey + previewRefreshKey;

  // Sync with parent state
  useEffect(() => {
    if (setParentIsGenerating) {
      setParentIsGenerating(isGenerating);
    }
  }, [isGenerating, setParentIsGenerating]);
  const [initialized, setInitialized] = useState(false);
  // Removed local activeCodeTab state in favor of props

  const initializationRef = useRef(false);

  // Sync messages if history loads later (fix for race condition on refresh)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      // Only update if we don't have messages or if we want to ensure sync
      // To avoid wiping out current typing, maybe check if we are generating?
      // But initialMessages usually comes from history.
      if (!isGenerating && messages.length === 0) {
        setMessages(initialMessages);
        setInitialized(true);
      }
    }
  }, [initialMessages]);

  // Warn on refresh if generating
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGenerating]);

  // Handle restoring history without regenerating
  useEffect(() => {
    if (initialPrompt && !shouldAutoGenerate && !initializationRef.current) {
      // ... existing logic ...
      // If we have initialMessages, we are already good (initialized in useState)
      // If NOT, then we are restoring from just a prompt (legacy)
      if (!initialMessages || initialMessages.length === 0) {
        // ... fallback ...
        // Only do fallback if we really don't have messages after a short delay? 
        // No, let's assume if it is legacy it will stay empty.
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          text: initialPrompt,
          timestamp: Date.now()
        };
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: 'Welcome back! Restored your vibe checks.',
          timestamp: Date.now() + 1
        };
        setMessages([userMsg, botMsg]);
      }
      initializationRef.current = true;
    }
  }, [initialPrompt, shouldAutoGenerate, initialMessages]);

  const getRandomIntro = () => {
    const intros = [
      "On it! Building something fresh...",
      "Vibe check passed. Architecting your vision...",
      "Cooking up some code...",
      "Initializing workspace..."
    ];
    return intros[Math.floor(Math.random() * intros.length)];
  };

  const handleSendMessage = async (text: string, attachments?: string[]) => {
    // Check if user has enough credits before proceeding
    const canGenerate = await hasEnoughCredits();

    if (!canGenerate) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: "⚠️ **Out of Credits!**\n\nYou don't have enough credits to generate or edit code. Each generation costs 25 credits.\n\nYour current credits: **" + (user?.credits || 0) + "**\n\nPlease contact support to add more credits to your account.",
        timestamp: Date.now(),
        isError: true
      };

      // Add user message and error
      const userMsg: Message = {
        id: (Date.now() - 1).toString(),
        role: 'user',
        text,
        timestamp: Date.now() - 1,
        attachments
      };

      setMessages(prev => [...prev, userMsg, errorMsg]);
      return;
    }

    // Deduct credits before starting generation
    const { success, newCredits, error } = await deductCredits();

    if (!success) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: `⚠️ **Credits Error**\n\n${error || 'Failed to process credits.'}\n\nPlease try again or contact support.`,
        timestamp: Date.now(),
        isError: true
      };

      const userMsg: Message = {
        id: (Date.now() - 1).toString(),
        role: 'user',
        text,
        timestamp: Date.now() - 1,
        attachments
      };

      setMessages(prev => [...prev, userMsg, errorMsg]);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now(),
      attachments // Store attachments
    };

    const botMsgId = (Date.now() + 1).toString();
    const botMsg: Message = {
      id: botMsgId,
      role: 'model',
      text: getRandomIntro(),
      timestamp: Date.now(),
      steps: []
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
    setIsGenerating(true);

    try {
      const { files: finalFiles, generatedText } = await generateCodeStream(
        text,
        messages,
        preview?.files || [], // Pass current files for incremental updates
        (step: GenerationStep) => {
          setMessages(prev => prev.map(msg => {
            if (msg.id === botMsgId) {
              const existingStepIndex = msg.steps?.findIndex(s => s.id === step.id);
              let newSteps = [...(msg.steps || [])];

              // Update label to past tense if completed
              if (step.status === 'completed') {
                step.label = step.label.replace('Writing', 'Created').replace('Architecting', 'Architected');
              }

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
      setPreview({
        files: finalFiles,
        version: Date.now()
      });

      // Trigger Success Callback (e.g., save to history)
      // Trigger Success Callback (e.g., save to history)
      if (onSuccess) {
        // Construct the final message state to save
        const allMessages = [...messages, userMsg, {
          ...botMsg,
          text: generatedText || "Task completed!", // Use generated text if available immediately, or fallback
          actions: ['preview', 'explorer'] as ('preview' | 'explorer')[]
        }];
        onSuccess(text, finalFiles, allMessages);
      }

      setMessages(prev => prev.map(msg => {
        if (msg.id === botMsgId) {
          // If we have conversational text, use it. Otherwise default.
          const fallbackText = "Task completed! Your vision has been architected and is ready for review. 🎨✨\n\nCheck out the preview or dive into the code explorer below.";
          const finalText = generatedText && generatedText.length > 10 ? generatedText : fallbackText;

          // Include credits remaining in final message
          return {
            ...msg,
            text: finalText,
            actions: ['preview', 'explorer'] as ('preview' | 'explorer')[],
            creditsRemaining: newCredits
          };
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
    setInternalRefreshKey(prev => prev + 1);
  };

  const handleActionClick = (action: 'preview' | 'explorer') => {
    if (action === 'preview') {
      setActiveCodeTab('preview');
      if (setMobileView) setMobileView('preview');
    } else if (action === 'explorer') {
      // Explorer only exists in "code" tab
      setActiveCodeTab('code');
      // In mobile, we don't show explorer, button shouldn't exist
    }
  };

  useEffect(() => {
    if (initialPrompt && shouldAutoGenerate && !initializationRef.current) {
      initializationRef.current = true;
      handleSendMessage(initialPrompt);
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
          onActionClick={handleActionClick}
        />
      </div>

      {/* Desktop Preview Panel */}
      <div className="hidden md:flex flex-1 flex-col min-w-0 bg-vibe-500 h-full">
        <CodePreview
          preview={preview}
          isGenerating={isGenerating}
          activeTab={activeCodeTab}
          onTabChange={setActiveCodeTab}
          viewport={previewViewport}
          isFullScreen={isPreviewFullScreen}
          onToggleFullScreen={() => onToggleFullScreen?.()}
          refreshKey={refreshKey}
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
              activeTab={activeCodeTab}
              onTabChange={setActiveCodeTab}
              isFullScreen={isPreviewFullScreen}
              refreshKey={refreshKey}
            />
          }
          onRefreshPreview={handleRefreshPreview}
          onActionClick={handleActionClick}
        />
      </div>
    </div>
  );
};

export default Workspace;