import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DataProvider, useData } from './context/DataContext';
import { Card, CardContent } from './components/ui/Card';
import { Page } from './types';

// Dynamically import pages
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import DailyAdCosts from './pages/DailyAdCosts';
import Commissions from './pages/Commissions';
import ExchangeLog from './pages/ExchangeLog';
import MiscellaneousExpenses from './pages/MiscellaneousExpenses';
import DebtsReceivables from './pages/DebtsReceivables';
import Partners from './pages/Partners';
import Assets from './pages/Assets';
import Tax from './pages/Tax';
import Reports from './pages/Reports';
import LongReport from './pages/LongReport';
import Settings from './pages/Settings';

const pages: { [key in Page]: React.ComponentType } = {
  Dashboard,
  Projects,
  DailyAdCosts,
  Commissions,
  ExchangeLog,
  MiscellaneousExpenses,
  DebtsReceivables,
  Partners,
  Assets,
  Tax,
  Reports,
  LongReport,
  Settings,
};

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
        <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-white text-lg">Đang tải dữ liệu...</p>
    </div>
);


const DisabledPagePlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full pt-20">
        <Card className="max-w-md text-center">
            <CardContent>
                <h2 className="text-xl font-bold mb-2 text-white">Chưa mở kỳ báo cáo</h2>
                <p className="text-gray-400">
                    Vui lòng vào trang "Báo cáo tháng" để mở một kỳ báo cáo mới và bắt đầu sử dụng các chức năng kế toán.
                </p>
            </CardContent>
        </Card>
    </div>
);

const ViewingModeIndicator = () => {
    const { viewingPeriod, clearViewingPeriod } = useData();
    if (!viewingPeriod) return null;

    const [year, month] = viewingPeriod.split('-');
    const periodLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

    return (
        <div className="fixed top-4 right-8 bg-blue-900/80 backdrop-blur-sm border border-primary-700 text-white text-sm rounded-lg shadow-lg z-50 flex items-center p-2">
            <div className="p-2">
                <p>
                    Đang xem kỳ báo cáo: <span className="font-bold">{periodLabel}</span>
                </p>
            </div>
            <button
                onClick={clearViewingPeriod}
                className="ml-4 px-3 py-1 bg-primary-600 hover:bg-primary-700 rounded-md font-semibold transition-colors"
            >
                Thoát
            </button>
        </div>
    );
};

const AppContent = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const { isLoading, activePeriod, viewingPeriod, currentPage, setCurrentPage } = useData();

  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  const disabledWithoutPeriod: Page[] = [
    'Dashboard', 'Projects', 'DailyAdCosts', 'Commissions',
    'ExchangeLog', 'MiscellaneousExpenses', 'DebtsReceivables', 'Partners', 'Tax'
  ];
  
  const isPageDisabled = !activePeriod && !viewingPeriod && disabledWithoutPeriod.includes(currentPage);
  const CurrentPageComponent = pages[currentPage];

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">
      <ViewingModeIndicator />
      <Sidebar 
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
      />
      <main className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-20'}`}>
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {isPageDisabled ? <DisabledPagePlaceholder /> : <CurrentPageComponent />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}