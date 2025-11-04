
import React from 'react';

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, children }) => {
  return (
    <div className="flex flex-col items-start gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {children}
      </div>
    </div>
  );
};