import React, { useState, useEffect } from 'react';
import { parseFormattedNumber } from '../../lib/utils';
import { Input } from './Input';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onValueChange: (value: number) => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({ value, onValueChange, ...props }) => {
  const [displayValue, setDisplayValue] = useState(() => value.toLocaleString('vi-VN'));

  // Effect to sync display value with props from parent, but only if not currently focused
  // to avoid disrupting user input.
  useEffect(() => {
    const currentNumericValue = parseFormattedNumber(displayValue);
    if (value !== currentNumericValue) {
      setDisplayValue(value.toLocaleString('vi-VN'));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Allow user to clear the input
    if (rawValue === '') {
        setDisplayValue('');
        onValueChange(0);
        return;
    }

    // Remove non-digit characters for parsing, but keep the comma for decimals
    const cleanedValue = rawValue.replace(/[^\d,]/g, '');
    const numericValue = parseFormattedNumber(cleanedValue);
    
    if (!isNaN(numericValue)) {
      // Format the integer part while preserving the decimal part as is
      const parts = cleanedValue.split(',');
      const integerPart = parts[0].replace(/\./g, '');
      const formattedInteger = Number(integerPart).toLocaleString('vi-VN');
      
      const newDisplayValue = parts.length > 1 ? `${formattedInteger},${parts[1]}` : formattedInteger;

      setDisplayValue(newDisplayValue);
      onValueChange(numericValue);
    }
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // On blur, do a final parse and format to ensure correctness and handle empty inputs
    const numericValue = parseFormattedNumber(e.target.value);
    setDisplayValue(numericValue.toLocaleString('vi-VN'));
    // Parent should already have the latest value from onChange, but this ensures it's perfectly synced.
    if (numericValue !== value) {
        onValueChange(numericValue);
    }
  };

  return <Input {...props} value={displayValue} onChange={handleChange} onBlur={handleBlur} type="text" inputMode="decimal" />;
};
