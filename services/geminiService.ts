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
): Promise<string> => {
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
    Your goal is to generate "Lovable.dev" quality, production-ready websites.
    
    OUTPUT FORMAT:
    You must generate a multi-file project.
    Wrap each file in XML tags like this:
    <file name="filename.ext">
      ... content ...
    </file>

    REQUIRED FILES (For new projects):
    1. index.html (Main structure, import tailwind via CDN)
    2. styles.css (All custom CSS, animations, glass effects)
    3. script.js (Interactive logic, parallax, 3D effects)
    
    INCREMENTAL UPDATES:
    - If this is a follow-up request (history exists), you will be provided with the CURRENT FILE CONTENTS.
    - You must ONLY output the files that need to be changed.
    - If a file is not changed, DO NOT output it.
    - If you change a file, output the FULL content of that file (do not use diffs).
    - If you need to add a new file, simply output it.

    DESIGN SYSTEM (STRICT COMPLIANCE REQUIRED):
    - **Theme**: LIGHT MODE BY DEFAULT. The generated website MUST be in light mode initially. Focus on bright, airy, clean aesthetics (white/off-white backgrounds, dark text).
    - **Base**: Material 3 Design System styling.
    - **Visual Style**: You MUST use a combination of Glassmorphism (backdrop-blur, translucent white layers) AND Neumorphism (soft, extruded shadows, rounded corners) for UI elements.
    - **Framework**: Use Tailwind CSS (via CDN in index.html).
    - **Responsiveness**: Mobile-first approach is COMPULSORY. Write CSS/Classes for mobile first, then add breakpoints (md:, lg:).
    
    VISUAL GUIDELINES (CRITICAL):
    - **NO IMAGES**: Do NOT generate external image assets or use <img> tags with placeholders. 
    - **ANIMATION ONLY**: If a visual element (like a hero graphic, logo, or background) is needed, you MUST create it using:
      - CSS Gradients (conic, linear, radial)
      - CSS Animations (@keyframes)
      - SVG shapes embedded directly in the HTML
      - Glassmorphism shapes
    - The goal is to create a "living" website using only code.
    - Ensure text contrast is high (Dark gray/black text on light backgrounds).

    CRITICAL:
    - Do not output markdown code blocks (\`\`\`). Just the XML tags.
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
        
        // If file exists, we will update it. If not, we create it.
        // We need to determine if we have already "switched" to this file in this stream session
        // However, since we initialized `files` with `currentFiles`, we need to be careful not to 
        // overwrite content until we actually have new content.
        
        if (currentFile?.name !== fileName) {
           const existingFileIndex = files.findIndex(f => f.name === fileName);
           if (existingFileIndex !== -1) {
              // We are about to rewrite an existing file. 
              // We set currentFile to reference it, but we don't clear content yet 
              // because the parsing logic below extracts the *new* content from the buffer.
              currentFile = files[existingFileIndex];
              // Important: The parsing logic below uses `lastIndexOf(fileStartTag)`.
              // As the buffer grows, we will extract the new content.
           } else {
              // New file
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
            
            // Update the file content in real-time
            currentFile.content = content;
            onFileUpdate([...files]); // Send new array reference
         }
      }
    }
    
    // Final Parsing pass to ensure clean content
    // We only update the files that were actually in the output buffer
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

    return JSON.stringify(files);

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