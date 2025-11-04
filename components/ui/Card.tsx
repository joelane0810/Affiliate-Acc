
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({children, className}) => {
    return <div className={`mb-4 text-xl font-bold text-white ${className}`}>{children}</div>
}

interface CardContentProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}
export const CardContent: React.FC<CardContentProps> = ({children, className, style}) => {
    return <div className={className} style={style}>{children}</div>
}