import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  variant?: 'glass' | 'neumorphic' | 'liquid';
}

const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hoverEffect = false,
  variant = 'glass'
}) => {
  
  const getVariantClasses = (v: string) => {
    switch(v) {
      case 'glass':
        // Cleaner glass: less white in dark mode, crisp white in light mode
        return 'bg-white/60 dark:bg-[#121214]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-lg dark:shadow-black/20';
      case 'neumorphic':
        // Solid-ish background for neumorphism with subtle depth
        return 'bg-surface-light border border-border shadow-sm dark:shadow-none';
      case 'liquid':
        // Gradient glass
        return 'bg-gradient-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-white/0 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-xl';
      default:
        return '';
    }
  };

  const baseStyles = `
    relative 
    rounded-2xl
    transition-all duration-500 ease-out
    ${getVariantClasses(variant)}
  `;

  const hoverStyles = hoverEffect 
    ? 'hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-xl hover:-translate-y-1 hover:border-white/60 dark:hover:border-white/20' 
    : '';

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`}>
      {/* Shine effect, subtle in dark mode, hidden in clean neumorphic */}
      {variant !== 'neumorphic' && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-50 dark:opacity-20 pointer-events-none" />
      )}
      {children}
    </div>
  );
};

export default GlassCard;