import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'sm';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'default', className, ...props }) => {
  const baseClasses = 'rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  
  const sizeClasses = {
    default: 'px-4 py-2 text-sm',
    sm: 'px-3 py-1 text-xs',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};