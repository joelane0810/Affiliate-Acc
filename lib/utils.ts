export const formatCurrency = (value: number | undefined | null, currency: 'VND' | 'USD' = 'VND'): string => {
  const numberToFormat = (value === undefined || value === null || isNaN(value)) ? 0 : value;
  
  const formatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'VND' ? 0 : 2,
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  });

  const formatted = formatter.format(numberToFormat);
  return currency === 'USD' ? formatted.replace('US$', '$') : formatted;
};

export const parseFormattedNumber = (value: string): number => {
    if (typeof value !== 'string') {
        return 0;
    }
    // Chuẩn hóa chuỗi số: xóa dấu phân cách hàng nghìn (.), thay dấu thập phân (,) bằng (.)
    const standardNumberString = value
        .replace(/\./g, '')
        .replace(',', '.');
    
    // Xóa các ký tự không phải số còn lại (VD: ký hiệu tiền tệ, khoảng trắng) trừ dấu thập phân và dấu trừ
    const cleanedString = standardNumberString.replace(/[^0-9.-]+/g, '');
    
    return parseFloat(cleanedString) || 0;
}

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    // Add timezone offset to prevent date from shifting
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(correctedDate);
  } catch (e) {
    return 'Invalid Date';
  }
};

export const getMonthYear = (dateString: string): string => {
   const date = new Date(dateString);
   const userTimezoneOffset = date.getTimezoneOffset() * 60000;
   const correctedDate = new Date(date.getTime() + userTimezoneOffset);
   return correctedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export const isDateInPeriod = (dateString: string, period: string | null): boolean => {
    if (!period) return false;
    if (!dateString) return false;
    try {
        return dateString.startsWith(period);
    } catch (e) {
        return false;
    }
};

export const formatPercentage = (value: number): string => {
    if (isNaN(value)) {
        return '0,00%';
    }
    return `${value.toFixed(2).replace('.', ',')}%`;
};