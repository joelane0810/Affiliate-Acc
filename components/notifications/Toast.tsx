import React, { useEffect, useState } from 'react';
import type { Notification } from '../../types';
import { CheckCircle, Info } from '../icons/IconComponents';

export const Toast: React.FC<{
    toast: Notification | null;
    onClear: () => void;
}> = ({ toast, onClear }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (toast) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                // Allow time for fade-out animation before clearing
                setTimeout(onClear, 300);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [toast, onClear]);

    if (!toast) return null;

    const isPartner = toast.type === 'partner';
    
    return (
        <div 
            className={`fixed top-6 right-6 w-80 p-4 rounded-lg shadow-lg border z-50 flex items-start gap-3 transition-all duration-300 ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            } ${
                isPartner 
                ? 'bg-purple-900/80 backdrop-blur-sm border-purple-700' 
                : 'bg-gray-800/80 backdrop-blur-sm border-gray-700'
            }`}
        >
            <div className={`flex-shrink-0 mt-0.5 ${isPartner ? 'text-purple-400' : 'text-green-400'}`}>
                {isPartner ? <Info /> : <CheckCircle />}
            </div>
            <div>
                <p className="font-semibold text-white">{isPartner ? 'Cập nhật đối tác' : 'Thao tác thành công'}</p>
                <p className="text-sm text-gray-300">{toast.message}</p>
            </div>
        </div>
    );
};
