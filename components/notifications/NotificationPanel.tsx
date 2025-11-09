import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useData } from '../../context/DataContext';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
            active
                ? 'border-b-2 border-primary-500 text-white'
                : 'text-gray-400 hover:text-white'
        }`}
    >
        {children}
    </button>
);

export const NotificationPanel: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { notifications } = useData();
    const [activeTab, setActiveTab] = useState<'system' | 'partner'>('system');

    const systemNotifications = notifications.filter(n => n.type === 'system');
    const partnerNotifications = notifications.filter(n => n.type === 'partner');

    const renderList = (list: typeof notifications) => {
        if (list.length === 0) {
            return <p className="text-center text-gray-500 py-8">Không có thông báo nào.</p>;
        }
        return (
            <div className="space-y-3">
                {list.map(n => (
                    <div key={n.id} className={`p-3 rounded-md ${n.read ? 'bg-gray-900/50' : 'bg-primary-900/30 border-l-4 border-primary-500'}`}>
                        <p className="text-sm text-gray-300">{n.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(n.timestamp).toLocaleString('vi-VN')}</p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Thông báo" size="2xl">
            <div className="flex border-b border-gray-700 mb-4">
                <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')}>
                    Hệ thống ({systemNotifications.length})
                </TabButton>
                <TabButton active={activeTab === 'partner'} onClick={() => setActiveTab('partner')}>
                    Đối tác ({partnerNotifications.length})
                </TabButton>
            </div>
            <div className="max-h-96 overflow-y-auto pr-2">
                {activeTab === 'system' ? renderList(systemNotifications) : renderList(partnerNotifications)}
            </div>
        </Modal>
    );
};
