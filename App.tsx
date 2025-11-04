
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DataProvider, useData } from './context/DataContext';
import { Card, CardContent } from './components/ui/Card';
import { Page } from './types';
import { Button } from './components/ui/Button';
import { Menu } from './components/icons/IconComponents';

// Dynamically import pages
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import DailyAdCosts from './pages/DailyAdCosts';
import Commissions from './pages/Commissions';
import ExchangeLog from './pages/ExchangeLog';
import MiscellaneousExpenses from './pages/MiscellaneousExpenses';
import DebtsReceivables from './pages/DebtsReceivables';
import Partners from './pages/Partners';
// FIX: Add default export to pages/Assets.tsx to resolve this import error. The fix is in pages/Assets.tsx.
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

const EmptyStatePlaceholder = () => {
    const { setCurrentPage } = useData();
    return (
        <div className="flex flex-col items-center justify-center h-full pt-20">
            <Card className="max-w-lg text-center">
                <CardContent>
                    <h2 className="text-2xl font-bold mb-3 text-white">Chào mừng đến với Affiliate Accountant Pro!</h2>
                    <p className="text-gray-400 mb-6">
                        Cơ sở dữ liệu của bạn hiện đang trống. Để bắt đầu, vui lòng thực hiện một trong các thao tác sau:
                    </p>
                    <div className="flex justify-center">
                         <Button onClick={() => setCurrentPage('Settings')}>
                            Đi đến trang Cài đặt
                        </Button>
                    </div>
                    <ul className="text-left text-gray-400 mt-6 space-y-2 list-disc list-inside">
                        <li><b>Khôi phục dữ liệu mẫu:</b> Để làm quen với các tính năng của ứng dụng.</li>
                        <li><b>Nhập dữ liệu:</b> Nếu bạn có tệp sao lưu từ trước.</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}

const ViewingModeIndicator = () => {
    const { viewingPeriod, clearViewingPeriod } = useData();
    if (!viewingPeriod) return null;

    const [year, month] = viewingPeriod.split('-');
    const periodLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

    return (
        <div className="fixed top-4 right-4 sm:right-8 bg-blue-900/80 backdrop-blur-sm border border-primary-700 text-white text-sm rounded-lg shadow-lg z-50 flex items-center p-2">
            <div className="p-2">
                <p>
                    Đang xem: <span className="font-bold hidden sm:inline">kỳ báo cáo: </span><span className="font-bold">{periodLabel}</span>
                </p>
            </div>
            <button
                onClick={clearViewingPeriod}
                className="ml-2 sm:ml-4 px-3 py-1 bg-primary-600 hover:bg-primary-700 rounded-md font-semibold transition-colors"
            >
                Thoát
            </button>
        </div>
    );
};

const AppContent = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isLoading, activePeriod, viewingPeriod, currentPage, setCurrentPage, firebaseConfig, closedPeriods } = useData();

  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  const isAppEmpty = !activePeriod && closedPeriods.length === 0;

  const disabledWithoutPeriod: Page[] = [
    'Dashboard', 'Projects', 'DailyAdCosts', 'Commissions',
    'ExchangeLog', 'MiscellaneousExpenses', 'DebtsReceivables', 'Partners', 'Tax'
  ];
  
  const isPageDisabled = !activePeriod && !viewingPeriod && disabledWithoutPeriod.includes(currentPage);
  const CurrentPageComponent = pages[currentPage];

  let mainContent;
  if (isAppEmpty && currentPage !== 'Settings' && currentPage !== 'LongReport' && currentPage !== 'Reports') {
      mainContent = <EmptyStatePlaceholder />;
  } else if (isPageDisabled) {
      mainContent = <DisabledPagePlaceholder />;
  } else {
      mainContent = <CurrentPageComponent />;
  }


  return (
    <div className="relative min-h-screen md:flex bg-gray-900 text-gray-200">
      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        ></div>
      )}
      
      <ViewingModeIndicator />
      <Sidebar 
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />
      <main className={`flex-1 flex flex-col transition-all duration-300 md:${isSidebarExpanded ? 'ml-64' : 'ml-20'}`}>
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-20">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-gray-300 hover:text-white" aria-label="Mở menu">
            <Menu />
          </button>
          <h1 className="text-lg font-bold text-white capitalize">{currentPage.replace(/([A-Z])/g, ' $1').trim()}</h1>
          <div className="w-6"></div> {/* Spacer to balance the title */}
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {mainContent}
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
