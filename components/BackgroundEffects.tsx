import React from 'react';

const BackgroundEffects: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-vibe-500">
      {/* Solid Base */}
      <div className="absolute inset-0 bg-[#0a0a0a]"></div>
      
      {/* Architectural Grid - Very subtle */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)`, 
          backgroundSize: '40px 40px'
        }}
      ></div>

      {/* Subtle Radial Gradient to Focus Center */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]"></div>
      
      {/* Very Subtle Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-vibe-300/5 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-vibe-300/5 blur-[100px] rounded-full pointer-events-none"></div>
    </div>
  );
};

export default BackgroundEffects;