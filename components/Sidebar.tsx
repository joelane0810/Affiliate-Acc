import React from 'react';
import type { Page } from '../types';
import { 
  LayoutDashboard, BarChart3, Target, DollarSign, Repeat, Package, 
  Handshake, Users, Landmark, Banknote, FileText, CalendarClock, Settings, ChevronLeft, ChevronRight, Book 
} from './icons/IconComponents';
import { useData } from '../context/DataContext';

interface SidebarProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const navItems: { page: Page; label: string; icon: React.ReactNode }[] = [
  { page: 'Dashboard', label: 'Tổng quan', icon: <LayoutDashboard /> },
  { page: 'Projects', label: 'Dự án', icon: <Target /> },
  { page: 'DailyAdCosts', label: 'Chi phí Ads', icon: <BarChart3 /> },
  { page: 'Commissions', label: 'Hoa hồng', icon: <DollarSign /> },
  { page: 'ExchangeLog', label: 'Bán USD', icon: <Repeat /> },
  { page: 'MiscellaneousExpenses', label: 'Chi phí phát sinh', icon: <Package /> },
  { page: 'DebtsReceivables', label: 'Công nợ & Phải thu', icon: <Handshake /> },
  { page: 'Partners', label: 'Đối tác', icon: <Users /> },
  { page: 'Assets', label: 'Tài sản', icon: <Landmark /> },
  { page: 'Tax', label: 'Thuế', icon: <Banknote /> },
  { page: 'Reports', label: 'Báo cáo tháng', icon: <FileText /> },
  { page: 'LongReport', label: 'Tổng hợp báo cáo', icon: <CalendarClock /> },
  { page: 'Settings', label: 'Cài đặt', icon: <Settings /> },
];

const alwaysEnabledPages: Page[] = ['Assets', 'Reports', 'LongReport', 'Settings'];

export const Sidebar: React.FC<SidebarProps> = ({ isExpanded, setIsExpanded }) => {
  const { activePeriod, viewingPeriod, currentPage, setCurrentPage } = useData();

  let periodLabel = '';
  let statusLabel = '';
  let statusColor = 'text-gray-400';
  let showIndicator = false;

  if (viewingPeriod) {
      showIndicator = false;
  } else if (activePeriod) {
      const [year, month] = activePeriod.split('-');
      periodLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
      statusLabel = 'Đang hoạt động';
      statusColor = 'text-green-400';
      showIndicator = true;
  } else { // No active period, not viewing
      const now = new Date();
      periodLabel = now.toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
      statusLabel = 'Chưa mở';
      statusColor = 'text-gray-400';
      showIndicator = true;
  }

  return (
    <aside className={`fixed top-0 left-0 h-full bg-gray-950 flex flex-col z-10 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}>
      {/* Header with Period Indicator */}
      <div className={`flex items-center border-b border-gray-800 h-16 shrink-0 ${isExpanded ? 'pl-4' : 'justify-center'}`}>
        <div className="flex items-center min-w-0">
          {showIndicator && (
              <div className="flex items-center">
                  <Book className={`flex-shrink-0 ${statusColor}`} />
                  {isExpanded && (
                      <div className="ml-3 truncate">
                          <p className={`text-xs ${statusColor}`}>{statusLabel}</p>
                          <p className="font-semibold text-white leading-tight">{periodLabel}</p>
                      </div>
                  )}
              </div>
          )}
        </div>
      </div>


      <nav className="flex-1 overflow-y-auto overflow-x-hidden">
        <ul className="py-4">
          {navItems.map(item => {
            const isDisabled = !activePeriod && !viewingPeriod && !alwaysEnabledPages.includes(item.page);
            return (
              <li key={item.page}>
                <button
                  onClick={() => setCurrentPage(item.page)}
                  disabled={isDisabled}
                  className={`flex items-center w-full text-left p-4 my-1 transition-colors duration-200 ${
                    currentPage === item.page
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  } ${!isExpanded ? 'justify-center' : ''}
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  {isExpanded && <span className="ml-4">{item.label}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer with App Name and Toggle */}
      <div className={`flex items-center border-t border-gray-800 shrink-0 h-16 relative ${isExpanded ? 'p-4' : 'justify-center'}`}>
        <div className={`flex items-center ${isExpanded ? 'flex-1 min-w-0' : ''}`}>
            <Banknote className="w-8 h-8 text-primary-500 flex-shrink-0" />
            {isExpanded && <h1 className="text-xl font-bold ml-3 text-white truncate">Affiliate Acc.</h1>}
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)} 
          className={`text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 flex-shrink-0 ${isExpanded ? '' : 'absolute right-2 top-1/2 -translate-y-1/2'}`}
          aria-label={isExpanded ? 'Thu gọn thanh công cụ' : 'Mở rộng thanh công cụ'}
        >
          {isExpanded ? <ChevronLeft /> : <ChevronRight />}
        </button>
      </div>
    </aside>
  );
};