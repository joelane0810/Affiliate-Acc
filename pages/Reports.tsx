import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Header } from '../components/Header';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { formatCurrency } from '../lib/utils';
import { ChevronDown, ChevronRight, Book } from '../components/icons/IconComponents';

const ReportRow: React.FC<{
    label: string;
    value: number;
    isTotal?: boolean;
    isNegative?: boolean;
    indented?: boolean;
    valueColor?: string;
    isExpandable?: boolean;
    isExpanded?: boolean;
    onToggle?: () => void;
    boldLabel?: boolean;
}> = ({ label, value, isTotal = false, isNegative = false, indented = false, valueColor, isExpandable, isExpanded, onToggle, boldLabel = false }) => {
    let colorClass = valueColor;
    if (!colorClass) {
        if (value >= 0) {
           colorClass = isNegative ? 'text-red-400' : 'text-primary-400';
        } else {
           colorClass = isNegative ? 'text-primary-400' : 'text-red-400';
        }
    }
    
    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(onToggle) onToggle();
    };

    const displayValue = value < 0 ? `- ${formatCurrency(Math.abs(value))}` : formatCurrency(value);

    return (
        <div 
            className={`flex justify-between items-center py-2.5 ${isTotal ? 'border-t border-gray-700/50 mt-2 pt-2.5' : 'border-b border-gray-800'} ${isExpandable ? 'cursor-pointer hover:bg-gray-800/50 -mx-4 px-4' : ''}`}
            onClick={isExpandable ? handleToggle : undefined}
        >
            <span className={`text-gray-300 flex items-center ${boldLabel ? 'font-bold text-white' : ''}`}>
                <span className="w-6 flex-shrink-0 text-gray-500">
                    {isExpandable && (isExpanded ? <ChevronDown /> : <ChevronRight />)}
                </span>
                 <span className={`${indented ? 'pl-4' : ''}`}>{label}</span>
            </span>
            <span className={`font-semibold ${isTotal ? 'text-lg' : ''} ${colorClass}`}>
                {displayValue}
            </span>
        </div>
    );
};

const DetailRow: React.FC<{ label: string, value: number, isNegative?: boolean }> = ({ label, value, isNegative }) => (
    <div className="flex justify-between items-center py-1.5 px-4 pl-10 border-b border-gray-800/70 text-sm">
        <span className="text-gray-400 truncate pr-4">{label}</span>
        <span className={`font-mono ${isNegative ? 'text-red-400/80' : 'text-gray-300'}`}>
             {isNegative && value > 0 ? `- ${formatCurrency(value)}` : formatCurrency(value)}
        </span>
    </div>
);


const ReportPageContent = () => {
    const { 
        activePeriod,
        currentPeriod,
        closePeriod,
        periodFinancials,
        periodAssetDetails,
        taxSettings,
    } = useData();
    const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState(new Set<string>());

    const toggleRow = (key: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };
    
    const handleClosePeriodClick = () => {
        if (activePeriod) {
            const { periodClosingDay } = taxSettings;
            const [year, month] = activePeriod.split('-').map(Number);
            
            // The cutoff date is on the closing day of the *next* month.
            // JS Date month is 0-indexed. new Date(year, 11) is Dec.
            // So if month is 11 (Nov), we pass 11 to get Dec.
            const closingDate = new Date(year, month, periodClosingDay);
            closingDate.setHours(0, 0, 0, 0);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (today < closingDate) {
                const closingDateFormatted = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(closingDate);
                const periodLabel = new Date(year, month - 1).toLocaleString('vi-VN', { month: 'numeric', year: 'numeric' });
                alert(`Chưa đến ngày đóng kỳ. Kỳ báo cáo ${periodLabel} chỉ có thể được đóng từ ngày ${closingDateFormatted} trở đi.`);
                return;
            }

            setIsCloseConfirmOpen(true);
        }
    }

    const handleConfirmClosePeriod = () => {
        if (activePeriod) {
            closePeriod(activePeriod);
            setIsCloseConfirmOpen(false);
        }
    }

    if (!currentPeriod || !periodFinancials) return null;

    const [year, month] = currentPeriod.split('-');
    const periodLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

    return (
        <>
            <Header title={`Báo cáo tháng - ${periodLabel}`}>
                 {activePeriod && <Button variant="danger" onClick={handleClosePeriodClick}>Đóng báo cáo tháng</Button>}
            </Header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    <Card>
                        <CardHeader>Báo cáo kinh doanh</CardHeader>
                        <CardContent>
                            <ReportRow 
                                label="Tổng Doanh thu (dự tính)" 
                                value={periodFinancials.revenueDetails.reduce((sum, r) => sum + r.amount, 0)} 
                                valueColor="text-primary-400" 
                                isExpandable={periodFinancials.revenueDetails.length > 0}
                                isExpanded={expandedRows.has('revenue')}
                                onToggle={() => toggleRow('revenue')}
                                boldLabel
                            />
                            {expandedRows.has('revenue') && (
                                <div className="bg-gray-800/50 -mx-4">
                                    {periodFinancials.revenueDetails.map(item => (
                                        <DetailRow key={item.name} label={item.name} value={item.amount} />
                                    ))}
                                </div>
                            )}

                            <ReportRow 
                                label="Điều chỉnh doanh thu theo tỷ giá" 
                                value={periodFinancials.exchangeRateGainLoss}
                                valueColor={periodFinancials.exchangeRateGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}
                            />

                            <ReportRow label="Tổng Chi phí" value={periodFinancials.totalCost} isNegative indented={false} boldLabel />
                             <ReportRow 
                                label="Chi phí Ads" 
                                value={periodFinancials.totalAdCost} 
                                isNegative 
                                indented 
                                isExpandable={periodFinancials.adCostDetails.length > 0}
                                isExpanded={expandedRows.has('adCost')}
                                onToggle={() => toggleRow('adCost')}
                            />
                            {expandedRows.has('adCost') && (
                                 <div className="bg-gray-800/50 -mx-4">
                                    {periodFinancials.adCostDetails.map(item => (
                                        <DetailRow key={item.name} label={item.name} value={item.amount} isNegative />
                                    ))}
                                </div>
                            )}
                            <ReportRow 
                                label="Chi phí Phát sinh" 
                                value={periodFinancials.totalMiscCost} 
                                isNegative 
                                indented
                                isExpandable={periodFinancials.miscCostDetails.length > 0}
                                isExpanded={expandedRows.has('miscCost')}
                                onToggle={() => toggleRow('miscCost')}
                            />
                             {expandedRows.has('miscCost') && (
                                 <div className="bg-gray-800/50 -mx-4">
                                    {periodFinancials.miscCostDetails.map((item, index) => (
                                        <DetailRow key={`${item.name}-${index}`} label={item.name} value={item.amount} isNegative />
                                    ))}
                                </div>
                            )}
                            
                            <ReportRow label="Lợi nhuận trước thuế" value={periodFinancials.profitBeforeTax} isTotal valueColor={periodFinancials.profitBeforeTax >= 0 ? 'text-green-400' : 'text-red-400'} boldLabel/>

                            <ReportRow label="VAT phải nộp" value={Math.abs(periodFinancials.tax.netVat)} isNegative={periodFinancials.tax.netVat >= 0} />
                            <ReportRow label="Thuế TNDN/TNCN" value={periodFinancials.tax.incomeTax} isNegative />

                            <div className="bg-gray-900/50 p-4 rounded-lg mt-4">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="font-bold text-white">Lợi nhuận ròng (Sau thuế)</span>
                                    <span className={`font-bold ${periodFinancials.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatCurrency(periodFinancials.netProfit)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>Báo cáo Lưu chuyển tiền tệ</CardHeader>
                        <CardContent>
                            {/* Operating Activities */}
                            <ReportRow 
                                label="Lưu chuyển tiền từ HĐ Kinh doanh" 
                                value={periodFinancials.cashFlow.operating.net}
                                valueColor={periodFinancials.cashFlow.operating.net >= 0 ? 'text-green-400' : 'text-red-400'}
                                isExpandable
                                isExpanded={expandedRows.has('cf_operating')}
                                onToggle={() => toggleRow('cf_operating')}
                                boldLabel
                            />
                            {expandedRows.has('cf_operating') && (
                                <div className="bg-gray-800/50 -mx-4">
                                    {periodFinancials.cashFlow.operating.inflows.map((item, i) => <DetailRow key={`op-in-${i}`} label={item.label} value={item.amount} />)}
                                    {periodFinancials.cashFlow.operating.outflows.map((item, i) => <DetailRow key={`op-out-${i}`} label={item.label} value={item.amount} isNegative />)}
                                </div>
                            )}

                             {/* Investing Activities */}
                            <ReportRow 
                                label="Lưu chuyển tiền từ HĐ Đầu tư" 
                                value={periodFinancials.cashFlow.investing.net}
                                valueColor={periodFinancials.cashFlow.investing.net >= 0 ? 'text-green-400' : 'text-red-400'}
                                isExpandable
                                isExpanded={expandedRows.has('cf_investing')}
                                onToggle={() => toggleRow('cf_investing')}
                                boldLabel
                            />
                            {expandedRows.has('cf_investing') && (
                                <div className="bg-gray-800/50 -mx-4">
                                    {periodFinancials.cashFlow.investing.inflows.map((item, i) => <DetailRow key={`inv-in-${i}`} label={item.label} value={item.amount} />)}
                                    {periodFinancials.cashFlow.investing.outflows.map((item, i) => <DetailRow key={`inv-out-${i}`} label={item.label} value={item.amount} isNegative />)}
                                </div>
                            )}

                             {/* Financing Activities */}
                            <ReportRow 
                                label="Lưu chuyển tiền từ HĐ Tài chính" 
                                value={periodFinancials.cashFlow.financing.net}
                                valueColor={periodFinancials.cashFlow.financing.net >= 0 ? 'text-green-400' : 'text-red-400'}
                                isExpandable
                                isExpanded={expandedRows.has('cf_financing')}
                                onToggle={() => toggleRow('cf_financing')}
                                boldLabel
                            />
                            {expandedRows.has('cf_financing') && (
                                <div className="bg-gray-800/50 -mx-4">
                                    {periodFinancials.cashFlow.financing.inflows.map((item, i) => <DetailRow key={`fin-in-${i}`} label={item.label} value={item.amount} />)}
                                    {periodFinancials.cashFlow.financing.outflows.map((item, i) => <DetailRow key={`fin-out-${i}`} label={item.label} value={item.amount} isNegative />)}
                                </div>
                            )}

                            <ReportRow label="Lưu chuyển tiền thuần trong kỳ" value={periodFinancials.cashFlow.netChange} isTotal valueColor={periodFinancials.cashFlow.netChange >= 0 ? 'text-green-400' : 'text-red-400'} boldLabel/>
                            
                            <ReportRow label="Tiền và tương đương tiền đầu kỳ" value={periodFinancials.cashFlow.beginningBalance} valueColor="text-white" />
                            <ReportRow label="Tiền và tương đương tiền cuối kỳ" value={periodFinancials.cashFlow.endBalance} valueColor="text-white" boldLabel/>

                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader>Phân chia Lợi nhuận (dự tính)</CardHeader>
                        <CardContent>
                            <div className="mb-4 pb-2 border-b border-gray-700/50">
                                <p className="text-sm text-gray-400">Tổng lợi nhuận ròng phân bổ</p>
                                <p className={`text-2xl font-bold ${periodFinancials.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(periodFinancials.netProfit)}
                                </p>
                            </div>
                            <p className="text-sm text-gray-400 text-center">Chi tiết phân chia theo đối tác hiện có tại trang "Đối tác".</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>Báo cáo Tài sản</CardHeader>
                        <CardContent>
                             <div className="space-y-2">
                                <div className="grid grid-cols-4 text-xs font-semibold text-gray-400 px-2 pb-2 border-b border-gray-700">
                                    <div className="col-span-1">Tài sản</div>
                                    <div className="text-center">Đầu kỳ</div>
                                    <div className="text-center">Thay đổi</div>
                                    <div className="text-center">Cuối kỳ</div>
                                </div>
                                {periodAssetDetails.map(asset => (
                                    <div key={asset.id} className="grid grid-cols-4 items-center text-sm py-2 px-2 rounded-md hover:bg-gray-800/50">
                                        <div className="font-medium text-white">{asset.name}</div>
                                        <div className="text-center text-gray-300">{formatCurrency(asset.openingBalance, asset.currency)}</div>
                                        <div className={`text-center font-semibold ${asset.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(asset.change, asset.currency)}</div>
                                        <div className="text-center font-bold text-white">{formatCurrency(asset.closingBalance, asset.currency)}</div>
                                    </div>
                                ))}
                             </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
             <ConfirmationModal
                isOpen={isCloseConfirmOpen}
                onClose={() => setIsCloseConfirmOpen(false)}
                onConfirm={handleConfirmClosePeriod}
                title="Xác nhận đóng kỳ báo cáo"
                message="Bạn có chắc chắn muốn đóng kỳ báo cáo này? Sau khi đóng, dữ liệu trong kỳ sẽ bị khóa và không thể chỉnh sửa. Hành động này không thể hoàn tác."
                confirmButtonText="Đóng kỳ"
                confirmButtonVariant="danger"
            />
        </>
    );
};

const NoPeriodContent = () => {
    const { openPeriod } = useData();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    
    const currentMonthPeriod = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const currentMonthLabel = new Date().toLocaleString('vi-VN', { month: 'long', year: 'numeric' });

    const handleOpenPeriodClick = () => setIsConfirmOpen(true);
    const handleConfirmOpenPeriod = () => {
        openPeriod(currentMonthPeriod);
        setIsConfirmOpen(false);
    };

    return (
         <>
            <Header title="Báo cáo tháng" />
            <Card>
                <CardContent className="text-center p-8">
                    <h2 className="text-xl font-bold mb-2 text-white">Chưa có kỳ báo cáo nào đang hoạt động.</h2>
                    <p className="text-gray-400 mb-6">
                        Để bắt đầu hạch toán, bạn cần mở một kỳ báo cáo mới.
                    </p>
                    <Button onClick={handleOpenPeriodClick}>
                        Mở kỳ báo cáo cho {currentMonthLabel}
                    </Button>
                </CardContent>
            </Card>
             <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmOpenPeriod}
                title="Xác nhận mở kỳ báo cáo"
                message={`Bạn có chắc chắn muốn mở kỳ báo cáo cho ${currentMonthLabel} không?`}
                confirmButtonText="Mở kỳ"
                confirmButtonVariant="primary"
            />
        </>
    );
};

export default function Reports() {
  const { currentPeriod } = useData();

  return (
    <div>
      {currentPeriod ? <ReportPageContent /> : <NoPeriodContent />}
    </div>
  );
}