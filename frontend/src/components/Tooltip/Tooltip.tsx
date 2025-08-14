import React from 'react';

interface TooltipProps {
  text: string;
  maxLength?: number;
  className?: string;
  prefix?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ 
  text, 
  maxLength = 15, 
  className = '', 
  prefix = '' 
}) => {
  const displayText = text && text.length > maxLength 
    ? text.substring(0, maxLength) + '...' 
    : text;
  
  const fullText = prefix ? `${prefix}${text}` : text;
  
  return (
    <div 
      className={className}
      title={fullText || 'N/A'}
    >
      {prefix}{displayText || 'N/A'}
    </div>
  );
};

export default Tooltip;
