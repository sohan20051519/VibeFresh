import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GeneratedPreview } from '../types';
import { 
  Code2, 
  Eye, 
  Smartphone, 
  Tablet, 
  Monitor, 
  RotateCw, 
  FileCode, 
  FileJson, 
  FileType, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown
} from 'lucide-react';

interface CodePreviewProps {
  preview: GeneratedPreview | null;
  isGenerating: boolean;
  isMobile?: boolean;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  language?: string;
}

declare global {
  interface Window {
    Prism: any;
  }
}

const CodePreview: React.FC<CodePreviewProps> = ({ preview, isGenerating, isMobile = false }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [iframeKey, setIframeKey] = useState(0);
  const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [combinedHtml, setCombinedHtml] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root', 'src']));
  
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const codeElementRef = useRef<HTMLElement>(null);

  // Auto-switch to latest file
  useEffect(() => {
    if (isGenerating && preview?.files && preview.files.length > 0) {
       const lastFile = preview.files[preview.files.length - 1];
       if (lastFile && lastFile.name !== activeFile) {
          setActiveFile(lastFile.name);
       }
    }
  }, [preview?.files?.length, isGenerating]);

  // Auto-scroll
  useEffect(() => {
    if (!isMobile && isGenerating && activeTab === 'code' && codeContainerRef.current) {
        codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
    }
  }, [preview, isGenerating, activeTab, activeFile, isMobile]);

  // Syntax Highlight
  useEffect(() => {
    if (!isMobile && activeTab === 'code' && codeElementRef.current && window.Prism) {
      window.Prism.highlightElement(codeElementRef.current);
    }
  }, [activeFile, preview, activeTab, isMobile]);

  // Build File Tree
  const fileTree = useMemo(() => {
    if (!preview?.files) return [];
    const rootChildren: FileNode[] = [];
    const srcChildren: FileNode[] = [];
    preview.files.forEach(file => {
      const node: FileNode = { name: file.name, path: file.name, type: 'file', language: file.language };
      if (['index.html', 'package.json', 'vite.config.js'].includes(file.name)) {
        rootChildren.push(node);
      } else {
        srcChildren.push(node);
      }
    });
    const tree: FileNode[] = [];
    if (srcChildren.length > 0) tree.push({ name: 'src', path: 'src', type: 'folder', children: srcChildren });
    tree.push(...rootChildren);
    return tree;
  }, [preview?.files]);

  // Iframe Builder
  useEffect(() => {
    if (preview?.files) {
      const htmlFile = preview.files.find(f => f.name === 'index.html')?.content || '';
      const cssFile = preview.files.find(f => f.name === 'styles.css')?.content || '';
      const jsFile = preview.files.find(f => f.name === 'script.js')?.content || '';
      let fullHtml = htmlFile;
      if (cssFile) {
        fullHtml = fullHtml.includes('</head>') 
          ? fullHtml.replace('</head>', `<style>${cssFile}</style></head>`)
          : fullHtml + `<style>${cssFile}</style>`;
      }
      if (jsFile) {
        fullHtml = fullHtml.includes('</body>') 
          ? fullHtml.replace('</body>', `<script>${jsFile}</script></body>`)
          : fullHtml + `<script>${jsFile}</script>`;
      }
      setCombinedHtml(fullHtml);
      setIframeKey(prev => prev + 1);
    }
  }, [preview]);

  useEffect(() => {
    if (isMobile) {
        setActiveTab('preview');
        return;
    }
    if (isGenerating) setActiveTab('code');
    else if (preview) setActiveTab('preview');
  }, [isGenerating, preview, isMobile]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const currentFileContent = preview?.files.find(f => f.name === activeFile)?.content || '';

  const getFileIcon = (name: string) => {
    if (name.endsWith('.html')) return <FileCode className="w-4 h-4 text-vibe-200" />;
    if (name.endsWith('.css')) return <FileType className="w-4 h-4 text-vibe-200" />;
    if (name.endsWith('.js') || name.endsWith('.ts')) return <FileJson className="w-4 h-4 text-vibe-200" />;
    return <Code2 className="w-4 h-4 text-vibe-200" />;
  };

  const renderTreeItem = (node: FileNode, depth: number = 0) => {
    if (node.type === 'folder') {
      const isOpen = expandedFolders.has(node.path);
      return (
        <div key={node.path}>
          <div 
            className="flex items-center gap-1.5 py-1 px-2 hover:bg-vibe-300/30 cursor-pointer text-vibe-200 select-none transition-colors rounded-sm mx-2"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {isOpen ? <FolderOpen className="w-4 h-4 text-vibe-200" /> : <Folder className="w-4 h-4 text-vibe-200" />}
            <span className="text-xs font-medium">{node.name}</span>
          </div>
          {isOpen && node.children?.map(child => renderTreeItem(child, depth + 1))}
        </div>
      );
    }
    const isActive = activeFile === node.path;
    return (
      <div 
        key={node.path}
        className={`
          flex items-center gap-2 py-1 px-2 cursor-pointer select-none transition-all mx-2 rounded-sm
          ${isActive 
            ? 'bg-vibe-300 text-vibe-100' 
            : 'text-vibe-200 hover:bg-vibe-300/30 hover:text-vibe-100'}
        `}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        onClick={() => setActiveFile(node.path)}
      >
        {getFileIcon(node.name)}
        <span className="text-xs">{node.name}</span>
      </div>
    );
  };

  // Mobile View: Pure Preview Iframe
  if (isMobile) {
      return (
          <div className="absolute inset-0 w-full h-full bg-white z-10">
             <iframe 
                key={iframeKey}
                srcDoc={combinedHtml}
                className="w-full h-full bg-white border-0"
                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                title="Mobile Preview"
              />
          </div>
      );
  }

  // Desktop View
  return (
    <div className="flex flex-col h-full w-full bg-vibe-500">
      
      {/* Toolbar */}
      <div className="h-12 flex-none flex items-center justify-between px-4 border-b border-vibe-300 bg-vibe-500">
        <div className="flex items-center gap-4">
            {/* Tabs */}
            <div className="flex bg-vibe-400 rounded-lg p-0.5 border border-vibe-300">
              <button 
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'code' ? 'bg-vibe-300 text-vibe-100 shadow-sm' : 'text-vibe-200 hover:text-vibe-100'}`}
              >
                <Code2 className="w-3.5 h-3.5" /> Code
              </button>
              <button 
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-vibe-300 text-vibe-100 shadow-sm' : 'text-vibe-200 hover:text-vibe-100'}`}
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            </div>
            
            {activeTab === 'code' && (
              <span className="text-xs text-vibe-200 flex items-center gap-2 border-l border-vibe-300 pl-4">
                {activeFile}
              </span>
            )}
        </div>

        {activeTab === 'preview' && (
          <div className="flex items-center gap-3">
            <div className="flex bg-vibe-400 rounded-lg p-0.5 border border-vibe-300">
              <button onClick={() => setViewport('mobile')} className={`p-1.5 rounded hover:bg-vibe-300 transition-colors ${viewport === 'mobile' ? 'text-vibe-100' : 'text-vibe-200'}`} title="Mobile"><Smartphone className="w-4 h-4" /></button>
              <button onClick={() => setViewport('tablet')} className={`p-1.5 rounded hover:bg-vibe-300 transition-colors ${viewport === 'tablet' ? 'text-vibe-100' : 'text-vibe-200'}`} title="Tablet"><Tablet className="w-4 h-4" /></button>
              <button onClick={() => setViewport('desktop')} className={`p-1.5 rounded hover:bg-vibe-300 transition-colors ${viewport === 'desktop' ? 'text-vibe-100' : 'text-vibe-200'}`} title="Desktop"><Monitor className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* File Explorer - Only visible in Code tab */}
        {activeTab === 'code' && (
          <div className="w-64 flex-none bg-vibe-500 border-r border-vibe-300 flex flex-col animate-in slide-in-from-left-5 duration-200">
            <div className="h-8 flex items-center px-4 text-[10px] font-bold text-vibe-200 uppercase tracking-widest mt-2">
              Explorer
            </div>
            <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
              {preview?.files && preview.files.length > 0 ? (
                  <div className="space-y-0.5">
                      <div 
                        className="flex items-center gap-1.5 py-1 px-2 text-vibe-100 font-bold select-none mx-2 mb-1"
                        onClick={() => toggleFolder('root')}
                      >
                        {expandedFolders.has('root') ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span className="text-xs uppercase tracking-widest">PROJECT</span>
                      </div>
                      {expandedFolders.has('root') && (
                        <div className="mt-0.5">
                          {fileTree.map(node => renderTreeItem(node, 0))}
                        </div>
                      )}
                  </div>
              ) : (
                  <div className="p-4 text-xs text-vibe-200 italic text-center">Initializing...</div>
              )}
            </div>
          </div>
        )}

        {/* Editor or Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-vibe-500 h-full relative">
           {activeTab === 'code' ? (
              <div ref={codeContainerRef} className="absolute inset-0 overflow-auto custom-scrollbar bg-vibe-500 p-6">
                <pre className="!bg-transparent !m-0 !p-0 font-mono text-sm leading-relaxed">
                  <code ref={codeElementRef} className={`language-${activeFile.endsWith('html') ? 'html' : activeFile.endsWith('css') ? 'css' : 'javascript'}`}>
                    {currentFileContent}
                  </code>
                </pre>
              </div>
           ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[#121212] p-8">
                <div className={`h-full bg-white transition-all duration-500 ease-in-out shadow-2xl overflow-hidden ${
                  viewport === 'mobile' ? 'w-[375px] rounded-[2rem] border-[8px] border-[#333]' : 
                  viewport === 'tablet' ? 'w-[768px] rounded-[1.5rem] border-[8px] border-[#333]' : 
                  'w-full rounded-lg border border-[#333]'
                }`}>
                  <iframe 
                    key={iframeKey}
                    srcDoc={combinedHtml}
                    className="w-full h-full bg-white"
                    sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                  />
                </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default CodePreview;