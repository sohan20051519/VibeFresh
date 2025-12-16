import { GoogleGenAI } from "@google/genai";
import { Message, ProjectFile, GenerationStep } from "../types";

const API_KEY = process.env.API_KEY || '';

let client: GoogleGenAI | null = null;

const getClient = () => {
  if (!client) {
    client = new GoogleGenAI({ apiKey: API_KEY });
  }
  return client;
};

export const enhancePrompt = async (originalPrompt: string): Promise<string> => {
  const ai = getClient();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are an expert Prompt Engineer for an AI Coding Assistant named VibeFresh. 
      Your goal is to rewrite the user's raw prompt into a detailed, structured, and high-quality request that yields the best possible code generation results.
      
      Guidelines:
      1.  **Clarify Intent**: Ensure the core goal is clear.
      2.  **Add Specifics**: Suggest modern UI trends (Glassmorphism, Neumorphism), responsive design, and animations if vague.
      3.  **Technical Constraints**: Mention React, Tailwind CSS, and clean code practices.
      4.  **Tone**: Keep it professional but "vibey".
      5.  **Output**: Return ONLY the enhanced prompt text. Do not add conversational filler.
      
      Original Prompt: "${originalPrompt}"`
    });

    return response.text || originalPrompt;
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return originalPrompt;
  }
};

export const generateCodeStream = async (
  prompt: string,
  history: Message[],
  currentFiles: ProjectFile[],
  onStep: (step: GenerationStep) => void,
  onFileUpdate: (files: ProjectFile[]) => void
): Promise<{ files: ProjectFile[], generatedText: string }> => {
  const ai = getClient();
  const codeModel = 'gemini-3-pro-preview';

  const steps: GenerationStep[] = [];
  const addStep = (label: string) => {
    const step: GenerationStep = { id: Date.now().toString() + Math.random(), label, status: 'running' };
    steps.push(step);
    onStep(step);
    return step;
  };

  const completeStep = (step: GenerationStep) => {
    step.status = 'completed';
    onStep({ ...step });
  };

  // 1. Start initial step
  let currentStep: GenerationStep = addStep("Architecting vibe & structure...");

  const systemInstruction = `
    You are VibeFresh, an elite AI Frontend Architect.
    Your goal is to generate "Lovable.dev" quality, production-ready websites using React.
    
    OUTPUT FORMAT:
    You must generate a multi-file project.
    Wrap each file in XML tags like this:
    <file name="filename.ext">
      ... content ...
    </file>
    
    CONVERSATIONAL RESPONSE:
    You can and should provide a brief, helpful explanation or confirmation of what you built/changed.
    This text should be outside the <file> tags.
    If the user asks a question, answer it directly.

    REQUIRED FILES (For new projects):
    1. index.html (Main structure, MUST include <div id="root"></div>, and import Tailwind via CDN)
    2. styles.css (Attributes, custom animations, glass effects)
    3. main.jsx (Entry point, ReactDOM rendering)
    4. App.jsx (Main Application component)
    
    INCREMENTAL UPDATES:
    - If this is a follow-up request (history exists), you will be provided with the CURRENT FILE CONTENTS.
    - You must ONLY output the files that need to be changed.
    - If a file is not changed, DO NOT output it.
    - If you change a file, output the FULL content of that file (do not use diffs).
    - If you need to add a new file, simply output it.

    DESIGN SYSTEM (STRICT COMPLIANCE REQUIRED):
    - **Framework**: REACT IS MANDATORY. You must write modern React code (Functional Components, Hooks like useState/useEffect).
    - **Language**: JSX (JavaScript XML). Use .jsx extensions for React files.
    - **Theme**: LIGHT MODE BY DEFAULT (Unless requested otherwise). Ensure high contrast and accessibility.
    - **Base**: Modern CSS Variables & Utility Classes.
    - **Visual Style** (ULTRA-MODERN & COMPULSORY):
      - **Bento Grids**: Organize content in modular, rounded blocks (Apple-style) for at least one section.
      - **Glassmorphism 2.0**: High blur, transparency, white borders. REQUIRED for Headers and Floating Cards.
      - **Neumorphism**: Soft extruded shadows for buttons/toggles (tactile feel).
      - **Noise & Grain**: You MUST add a subtle SVG noise overlay to the background ('opacity: 0.05').
      - **Background**: Modern Mesh Gradients or Particle Animations (floating CSS dots).

    - **Styling**: Use Tailwind CSS. Mix 'backdrop-blur' utilities with subtle 'shadow-lg'.
    - **Responsiveness**: MOBILE-PERFECT.

    INTERACTION & ANIMATION IMPLEMENTATION (MANDATORY - USE ALL):
    - **Global Animations in 'styles.css'**:
      - '@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }'
      - '@keyframes reveal { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }'
      - '@keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-100%); } }'
      - '@keyframes noise { 0%, 100% { background-position: 0 0; } 10% { background-position: -5% -10%; } 20% { background-position: -15% 5%; } 30% { background-position: 7% -25%; } 40% { background-position: 20% 25%; } 50% { background-position: -25% 10%; } 60% { background-position: 15% 5%; } 70% { background-position: 0% 15%; } 80% { background-position: 25% 35%; } 90% { background-position: -10% 10%; } }'

    - **Compulsory Features (DO NOT SKIP ANY)**:
      1. **Kinetic Typography**: Giant, moving text (marquee) in Hero. Use 'animate-marquee' class.
      2. **Micro-Interactions**: Buttons MUST magnetize/scale on hover. Icons MUST morph/rotate.
      3. **Preloader Reveals**: Initial "curtain" slide-up animation covering the screen then revealing content.
      4. **3D Tilt Cards**: Interactive 3D tilt on ALL cards (CSS 'perspective: 1000px' + 'rotateX/Y').
      5. **Text Reveals**: Staggered, clipped text entry from bottom.
      6. **Scrollytelling**: Sticky background with scrolling foreground text in "How it Works".
      7. **Parallax**: Background layers moving slower than foreground.
      8. **Sticky Card Stacking**: Sections sliding up and stacking (deck effect) in Testimonials.
      9. **Horizontal Scroll**: One section MUST scroll horizontally (e.g., Timeline/Gallery).
      10. **Image Reveal**: Images unmask/grow when entering viewport.
      11. **3D Scroll Effects**: Text or objects MUST rotate/zoom in 3D based on scroll position (use 'transform: rotateX(scrollVal) scale(scrollVal)').

    - **Implementation**:
      - **SCROLL OBSERVING**: Use 'IntersectionObserver' in 'main.jsx' to toggle '.visible' on '.reveal-on-scroll' elements.
      - **Card Hover**: 'transform: translateY(-10px) scale(1.02)' + shadow increase.
      - **Base Animation**: 'animation: reveal 0.8s ease-out forwards' for Hero.

    REQUIRED PAGE (SINGLE LANDING PAGE ONLY):
    1.  **Home/Landing** (LONG SCROLLING PAGE):
        - **MUST contain 5+ distinct vertical sections** (stacked vertically).
        - **MANDATORY Sections**: Hero, Features, How it Works, Testimonials, Pricing Preview, Footer.
        - **SCROLLING IS REQUIRED**: Each section must have substantial height (e.g., 'min-h-[80vh]' or 'py-20') to ensure the page is scrollable.
        - **DO NOT** make the landing page fixed-height or hidden overflow. It must scroll naturally.
    - **DO NOT GENERATE** other pages like Dashboard, About, or Pricing. Focus entirely on a rich, SINGLE-PAGE experience.

    FILE STRUCTURE:
    - Prefer splitting code into multiple components (e.g., components/Header.jsx, components/Hero.jsx) if complex.
    - Always have a clear entry point in 'main.jsx'.
    - Use 'react-router-dom' for navigation between these 4+ pages if needed (assume strictly SPA).
    
    VISUAL GUIDELINES (CRITICAL):
    - **NO IMAGES**: Do NOT generate external image assets or use <img> tags with placeholders unless they are purely decorative SVGs or CSS shapes.
    - **ANIMATION ONLY**: Use CSS Gradients, Animations, SVGs, and Glassmorphism shapes.
    - **SECTIONS**: Ensure the Landing Page has at least 5 distinct, scrollable sections with scroll-triggered animations (fade-up, slide-in) for every element.
    - **INTERACTION**: All cards must have tilt effects and hover states.
    - The goal is to create a "living" website using only code.

    REACT IMPLEMENTATION DETAILS:
    - In 'main.jsx':
      - Import App from './App.jsx' (conceptually, though in this flat file system, just assume global access or flat structure).
      - Use ReactDOM.createRoot(document.getElementById('root')).render(<App />); to mount.
    - In 'index.html':
      - Do NOT include script tags for React/Babel manually; the environment handles injection.
      - JUST provide the container: <div id="root"></div>.

    CRITICAL:
    - Do not output markdown code blocks (triple backticks). Just the XML tags.
    - Before starting a file, output a log line on a new line: 
      [STATUS] Writing filename.ext...
    - Ensure the code is complete and functional.
  `;

  const chat = ai.chats.create({
    model: codeModel,
    config: {
      systemInstruction,
      temperature: 0.7,
    }
  });

  let fullPrompt = "";

  // Inject current files into context if they exist
  if (currentFiles.length > 0) {
    fullPrompt += "CURRENT PROJECT STATE:\n";
    currentFiles.forEach(f => {
      fullPrompt += `<file name="${f.name}">\n${f.content}\n</file>\n`;
    });
    fullPrompt += "\n";
  }

  if (history.length > 0) {
    const contextStr = history.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
    fullPrompt += `HISTORY:\n${contextStr}\n\n`;
  }

  fullPrompt += `NEW REQUEST: ${prompt}`;

  try {
    const result = await chat.sendMessageStream({ message: fullPrompt });

    let buffer = "";
    // Initialize files with current state (deep copy to avoid mutation issues during render)
    const files: ProjectFile[] = currentFiles.map(f => ({ ...f }));
    let currentFile: ProjectFile | null = null;

    for await (const chunk of result) {
      const text = chunk.text || "";
      buffer += text;

      // Check for status updates
      const statusMatches = [...buffer.matchAll(/\[STATUS\] (.*?)(?:\n|$)/g)];
      if (statusMatches.length > 0) {
        const lastMatch = statusMatches[statusMatches.length - 1];
        const statusText = lastMatch[1].trim();

        if (steps[steps.length - 1]?.label !== statusText) {
          if (currentStep && currentStep.status === 'running') {
            completeStep(currentStep);
          }
          currentStep = addStep(statusText);
        }
      }

      // Stream Parsing logic
      const startTagRegex = /<file name="(.*?)">/g;
      let match;
      while ((match = startTagRegex.exec(buffer)) !== null) {
        const fileName = match[1];

        if (currentFile?.name !== fileName) {
          const existingFileIndex = files.findIndex(f => f.name === fileName);
          if (existingFileIndex !== -1) {
            currentFile = files[existingFileIndex];
          } else {
            const language = fileName.endsWith('.html') ? 'html' : fileName.endsWith('.css') ? 'css' : 'javascript';
            currentFile = { name: fileName, language, content: '' };
            files.push(currentFile);
          }
        }
      }

      if (currentFile) {
        const fileStartTag = `<file name="${currentFile.name}">`;
        const startIndex = buffer.lastIndexOf(fileStartTag);
        if (startIndex !== -1) {
          let content = buffer.substring(startIndex + fileStartTag.length);

          const endTagIndex = content.indexOf('</file>');
          if (endTagIndex !== -1) {
            content = content.substring(0, endTagIndex);
          }

          currentFile.content = content;
          onFileUpdate([...files]);
        }
      }
    }

    // Final Parsing pass to ensure clean content
    const fileRegex = /<file name="(.*?)">([\s\S]*?)<\/file>/g;
    let fileMatch;
    while ((fileMatch = fileRegex.exec(buffer)) !== null) {
      const fileName = fileMatch[1];
      const content = fileMatch[2].trim();

      const existingIndex = files.findIndex(f => f.name === fileName);
      if (existingIndex !== -1) {
        files[existingIndex].content = content;
      } else {
        files.push({
          name: fileName,
          language: fileName.endsWith('.html') ? 'html' : fileName.endsWith('.css') ? 'css' : 'javascript',
          content: content
        });
      }
    }

    // Extract text that is NOT inside file tags or status tags
    let generatedText = buffer.replace(/<file name=".*?">[\s\S]*?<\/file>/g, '').replace(/\[STATUS\].*?(?:\n|$)/g, '').trim();
    generatedText = generatedText.replace(/\n{3,}/g, '\n\n');

    return { files, generatedText };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  } finally {
    if (currentStep && currentStep.status === 'running') {
      completeStep(currentStep);
    }
    steps.forEach(s => {
      if (s.status === 'running') completeStep(s);
    });
  }
};