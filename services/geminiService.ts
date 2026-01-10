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
      model: 'gemini-3-flash-preview',
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
  const codeModel = 'gemini-3-flash-preview';

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
    You are VibeFresh, a multiple Awwwards-winning Creative Frontend Architect.
    Your goal is to generate "World-Class", "Award-Winning", and "Visually Stunning" production-ready websites using React.
    
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
    1. index.html (Main structure, MUST include <meta name="viewport" content="width=device-width, initial-scale=1.0">, <div id="root"></div>, and import Tailwind via CDN)
    2. styles.css (Attributes, custom animations, glass effects)
    3. main.jsx (Entry point, ReactDOM rendering)
    4. App.jsx (Main Application component)
    
    INCREMENTAL UPDATES & FOLLOW-UP REQUESTS:
    - You will be provided with the "CURRENT PROJECT STATE".
    - You must ACTUALLY MODIFY these files based on the user's request.
    - **CRITICAL**: Do not just acknowledge the request. OUTPUT THE MODIFIED CODE.
    - You must ONLY output the files that need to be changed.
    - If a file is not changed, DO NOT output it.
    - If you change a file, output the FULL content of that file (do not use diffs or placeholders).
    - If you are adding a new file, output it normally.

    DESIGN SYSTEM (STRICT COMPLIANCE REQUIRED):
    - **Framework**: REACT IS MANDATORY. You must write modern React code (Functional Components, Hooks like useState/useEffect).
    - **Language**: JSX (JavaScript XML). Use .jsx extensions for React files.
    - **Theme**: DYNAMIC & ADAPTIVE (CRITICAL).
      - **Analyze Intent**: You MUST analyze the user's prompt to determine the color palette. 
        - "Nature/Eco" -> Earthy greens, browns, soft beige.
        - "Tech/SaaS" -> Deep blues, purples, or clean monochrome.
        - "Energy/Gym" -> Vibrant oranges, reds, electric yellow.
        - "Luxury" -> Black, gold, white, serif fonts.
      - **Default**: Only use "Clean Light Mode" if the prompt is neutral.
      - **Accessibility**: Ensure high contrast regardless of the chosen palette.
    - **Base**: Modern CSS Variables & Utility Classes.
    
    - **Responsiveness**: MOBILE-FIRST STRATEGY (CRITICAL).
      - **Mobile First**: Write classes for mobile FIRST (e.g., 'flex-col'), then add overrides for larger screens (e.g., 'md:flex-row'). Do NOT work backwards.
      - **Typography**: Do NOT use oversized fonts on mobile. Use 'text-base' or 'text-lg' for body. Use 'text-3xl' to 'text-5xl' for headings, but scale effectively (e.g., 'text-3xl md:text-5xl').
      - **Layout (NO TEMPLATES)**: Avoid generic "Bootstrap-style" or boring "Center-Title-Three-Cards" layouts. 
        - **Creative Freedom**: Use asymmetrical grids, staggered layouts, magazine-style typography, and overlapping elements.
        - **Uniqueness**: Every section should feel distinct and custom-designed for the specific user prompt.
        - **Density**: Ensure content density is appropriate. Use 'max-w-7xl mx-auto' containers.
      - **Spacing**: Use responsive padding (e.g., 'p-4 md:p-8'). Avoid excessive whitespace on smaller screens.
      - **Grid/Flex**: Use 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' patterns. Always stack flex containers vertically on mobile ('flex-col md:flex-row').
      - **Margins vs Padding**: Use PADDING for container internal spacing ('p-4') to prevent horizontal scrollbars (overflow).
      - **Images/Video**: Ensure all media has 'max-w-full h-auto' to prevent overflow.

    - **Visual Style** (MINIMAL, SLEEK & COMPACT - CRITICAL - AWARD-WINNING AESTHETICS):
      - **UNIQUE & NON-TEMPLATE**: The design must NOT look like a generic template. It must have a unique "soul" and "vibe".
      - **Premium Feel**: Every pixel must feel polished. Use subtle purposeful animations, not random movement.
      - **Minimalism**: Design must be clean, spacious, and sophisticated. Avoid clutter and "loud" elements.
      - **Proportions**: DO NOT use oversized elements. Cards, fonts, and grids must have standard, professional web proportions. 
        - Bad: A card taking up 90vh. 
        - Good: A card taking up 400px height.
      - **Sleek UI**: Use thin borders, subtle shadows, and refined typography (Inter, SF Pro).
      - **Bento Grids**: Organize content in modular, rounded blocks (Apple-style) for at least one section.
      - **Glassmorphism 2.0**: High blur, transparency, white borders. REQUIRED for Headers and Floating Cards.
      - **Neumorphism**: Soft extruded shadows for buttons/toggles (tactile feel).
      - **Noise & Grain**: You MUST add a subtle SVG noise overlay to the background ('opacity: 0.05').
      - **Background**: Modern Mesh Gradients or Particle Animations using the *ADAPTIVE COLOR PALETTE* (not just default blue).

    INTERACTION & ANIMATION IMPLEMENTATION (CHOOSE 5-8 BEST FITTING):
    - **Global Animations in 'styles.css'**:
      - '@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(0px); } }'
      - '@keyframes reveal { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }'
      - '@keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-100%); } }'
      - '@keyframes noise { 0%, 100% { background-position: 0 0; } 10% { background-position: -5% -10%; } 20% { background-position: -15% 5%; } 30% { background-position: 7% -25%; } 40% { background-position: 20% 25%; } 50% { background-position: -25% 10%; } 60% { background-position: 15% 5%; } 70% { background-position: 0% 15%; } 80% { background-position: 25% 35%; } 90% { background-position: -10% 10%; } }'

    - **Compulsory Features (PICK RELEVANT ONES - DO NOT FORCE ALL)**:
      1. **Bento Grids (Bento UI)**: Modular, rounded rectangular blocks for content organization (mobile-friendly).
      2. **Glassmorphism 2.0**: High background blur, transparency, and white borders on floating elements.
      3. **Kinetic Typography**: Giant, bold, moving text (marquee/outline-only) in Hero using 'animate-marquee'.
      4. **Noise & Grain**: Subtle film grain overlay on backgrounds for warmth.
      5. **Micro-Interactions**: Buttons magnetize/scale on hover. Icons morph/rotate.
      6. **Preloader Reveals**: "Curtain visual" slide-up animation revealing content. MUST unmount/hide completely after load to prevent click blocking.
      7. **3D Object Manipulation**: Interactive 3D items. **DISABLE ON MOBILE** (touch devices) to prevent scroll hijacking.
      8. **Text Reveals**: Staggered, clipped text entry from bottom (y-axis).
      9. **Scrollytelling**: Sticky background with scrolling foreground text. **DISABLE ON MOBILE** (stack vertically instead).
      10. **Sticky Card Stacking**: Sections sliding up and stacking. **DISABLE ON MOBILE** (standard scroll).
      11. **Horizontal Scroll Sections**: One section MUST scroll horizontally. **DISABLE ON MOBILE** (convert to vertical stack or standard swipe).
      12. **Image Reveal / Masking**: Images grow, unmask, or sharpen when entering viewport.
      13. **Scroll Fade/Slide-in**: Staggered timing for all grids/cards on scroll.
      14. **3D Tilt Cards**: CSS 'perspective: 1000px' + 'rotateX/Y' on hover/scroll.
      15. **Magnetic Buttons**: Buttons subtly move towards cursor on hover.
      16. **Neumorphism**: Soft extruded shadows for tactile buttons.
      17. **Particle Animations**: Dynamic, floating particles in Hero background.
      18. **Morphing Shapes**: Smooth SVG or border-radius transitions (e.g., button to circle).
      19. **3D Scroll Effects**: Text/objects rotate/zoom based on scroll. **DISABLE ON MOBILE** to prevent jank.

    - **Implementation Details (CRITICAL FOR GLITCH-FREE ANIMATION)**:
      - **NESTED TRANSFORMS**: To prevent 'transform' conflicts (e.g., float + tilt + hover all trying to set 'transform'), YOU MUST USE NESTED WRAPPERS.
        - Example: <div class="float-wrapper"><div class="tilt-wrapper"><div class="hover-scale-content">...</div></div></div>
      - **SCROLL OBSERVING**: Use a simple 'IntersectionObserver' hook. 
        - Default state: '.reveal-on-scroll { opacity: 0; transform: translateY(30px); transition: all 1s cubic-bezier(0.16, 1, 0.3, 1); }'
        - Visible state: '.reveal-on-scroll.visible { opacity: 1; transform: translateY(0); }'
      - **3D Context**: Parent containers of 3D cards MUST have 'perspective: 1000px;' and 'transform-style: preserve-3d;'.
      - **Performance**: Add 'will-change-transform' utility to moving elements.
      - **Responsiveness**: Disable heavy 3D tilts on mobile ('@media (max-width: 768px)') to prevent overflow issues.

    REQUIRED GLOBAL SETUP (MUST IMPLEMENT):
    - **MANDATORY WATERMARK (UNREMOVEABLE)**:
      - You MUST include a fixed badge in the bottom-right corner of the screen (z-index 9999).
      - **Placement**: Render '<VibeBadge />' at the VERY TOP LEVEL of 'App.jsx', OUTSIDE any main wrappers or 3D containers.
      - **Component**: Create a file 'components/VibeBadge.jsx' with this EXACT code:

      import React, { useState } from 'react';

      export default function VibeBadge() {
        const [visible, setVisible] = useState(true);
        if (!visible) return null;
        return (
          <div className="fixed bottom-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-700 pointer-events-auto">
            <div className="group flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-white/10 pr-2 pl-3 py-1.5 rounded-full shadow-2xl hover:scale-105 transition-all duration-300">
              <a href="https://vibe-fresh.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-medium text-white/90 hover:text-white transition-colors">
                <img src="https://xnlmfbnwyqxownvhsqoz.supabase.co/storage/v1/object/public/files/ChatGPT%20Image%20Nov%2024,%202025,%2010_13_24%20PM.png" alt="VibeFresh" className="w-5 h-5 rounded-full" />
                <span>Made with VibeFresh</span>
              </a>
              <button onClick={() => setVisible(false)} className="ml-1 p-0.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </div>
        );
      }

    REQUIRED PAGE (SINGLE LANDING PAGE ONLY):
    1.  **Home/Landing** (LONG SCROLLING PAGE):
        - **MUST contain 5-6 distinct vertical sections** (stacked vertically).
        - **MANDATORY Sections**: Hero, Features, How it Works, Testimonials, Pricing Preview, Footer.
        - **SCROLLING IS REQUIRED**: Each section must have substantial height (e.g., 'min-h-[80vh]' or 'py-20') to ensure the page is scrollable.
        - **RESPONSIVE COMPACTNESS**: 
           - **Mobile**: DO NOT use huge, screen-filling cards. Stack content neatly. Font sizes must be readable but not overwhelming (e.g. max text-4xl for headers on mobile).
           - **Desktop**: Maintain a sleek, minimal look. Avoid "giant" UI components.
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

    CRITICAL OUTPUT RULES:
    1.  **NO MARKDOWN**: Do not use markdown code blocks (triple backticks). Just output the raw XML tags.
    2.  **NO EMPTY FILES**: Every <file> tag MUST contain the COMPLETE code for that file. Never output an empty file or a file with just comments.
    3.  **FULL REWRITES**: If you touch a file, output the *entire* file content. Do not use placeholders like '// ... rest of code'.
    4.  **STATUS LOGS**: Before starting a file, strictly output a log line: '[STATUS] Writing filename.ext...'
    5.  **VALIDITY**: Ensure the code is syntactically correct and fully functional.
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
