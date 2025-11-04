
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  const baseClasses = 'w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  return <input className={`${baseClasses} ${className}`} {...props} />;
};

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({children, className, ...props}) => {
    return <label className={`block text-sm font-medium text-gray-300 mb-1 ${className}`} {...props}>{children}</label>
}
