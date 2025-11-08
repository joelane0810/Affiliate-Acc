import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '../components/Header';
import { useData } from '../context/DataContext';
import { formatDate, isDateInPeriod, formatCurrency, formatVietnameseCurrencyShorthand } from '../lib/utils';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { Eye, ChevronUp, ChevronDown, Plus, Edit, Trash2 } from '../components/icons/IconComponents';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import * as T from '../types';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';


type Tab = 'reportingPeriod' | 'trends' | 'projectArchive' | 'management';

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 text-sm font-semibold transition-colors focus:outline-none ${
      active
        ? 'border-b-2 border-primary-500 text-white'
        : 'text-gray-400 hover:text-white'
    }`}
    role="tab"
    aria-selected={active}
  >
    {children}
  </button>
);

const YearSeparator: React.FC<{ year: string }> = ({ year }) => (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 relative my-4">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-700" />
        </div>
        <div className="relative flex justify-center">
            <span className="bg-gray-900 px-4 text-lg font-semibold text-gray-400">{year}</span>
        </div>
    </div>
);

const YearSummary: React.FC<{ revenue: number; cost: number; profit: number }> = ({ revenue, cost, profit }) => {
    return (
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gray-800/50 border border-gray-700 rounded-lg p-4 grid grid-cols-3 gap-4 text-center mb-6">
             <div>
                <p className="text-sm text-gray-400">Tổng Doanh thu năm</p>
                <p className="font-semibold text-xl text-primary-400">{formatCurrency(revenue)}</p>
            </div>
            <div>
                <p className="text-sm text-gray-400">Tổng Chi phí năm</p>
                <p className="font-semibold text-xl text-red-400">{formatCurrency(cost)}</p>
            </div>
            <div>
                <p className="text-sm text-gray-400">Tổng Lợi nhuận năm</p>
                <p className={`font-semibold text-xl ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(profit)}</p>
            </div>
        </div>
    );
};


const PeriodCard: React.FC<{
    periodLabel: string;
    revenue: number;
    cost: number;
    profit: number;
    status: 'active' | 'closed';
    closedAt?: string;
    onView?: () => void;
}> = ({ periodLabel, revenue, cost, profit, status, closedAt, onView }) => {
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg transform hover:-translate-y-1 transition-transform duration-300 flex overflow-hidden group">
            <div className="w-6 flex-shrink-0 bg-gray-900/70 border-r border-black/20 flex flex-col justify-center items-center space-y-4">
                <div className="w-3/5 h-1.5 bg-gray-700 rounded-sm"></div>
                <div className="w-3/5 h-1.5 bg-gray-700 rounded-sm"></div>
                <div className="w-3/5 h-1.5 bg-gray-700 rounded-sm"></div>
            </div>
            <div className="p-4 flex-grow flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700/50">
                    <h4 className="font-bold text-lg text-white">{periodLabel}</h4>
                     <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        status === 'active' ? 'bg-primary-500 text-white animate-pulse' : 'bg-gray-700 text-gray-300'
                    }`}>
                        {status === 'active' ? 'Đang hoạt động' : 'Đã đóng'}
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-400">Doanh thu</p>
                        <p className="font-semibold text-lg text-primary-400">{formatCurrency(revenue)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Chi phí</p>
                        <p className="font-semibold text-lg text-red-400">{formatCurrency(cost)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Lợi nhuận</p>
                        <p className={`font-semibold text-lg ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(profit)}</p>
                    </div>
                </div>
                <div className="flex-grow"></div>
                {status === 'closed' && closedAt && (
                     <div className="flex justify-between items-end text-xs text-gray-500 mt-4">
                        <span>Đóng ngày: {formatDate(closedAt!)}</span>
                        {onView && (
                            <Button variant="secondary" onClick={onView} className="!py-1 !px-3 !text-xs">
                                <span className="flex items-center gap-1.5"><Eye /> Xem</span>
                            </Button>
                        )}
                    </div>
                )}
                 {status === 'active' && <div className="h-9"></div>}
            </div>
        </div>
    );
};

const OpenPeriodPrompt: React.FC<{ onOpen: () => void; periodLabel: string }> = ({ onOpen, periodLabel }) => (
    <Card className="mb-8 border border-primary-500/50">
        <CardContent className="text-center p-6">
            <h2 className="text-lg font-semibold mb-2 text-white">Chưa có kỳ báo cáo nào đang hoạt động</h2>
            <p className="text-gray-400 mb-4">
                Để bắt đầu hạch toán, bạn cần mở một kỳ báo cáo mới cho tháng này.
            </p>
            <Button onClick={onOpen}>
                Mở kỳ báo cáo {periodLabel}
            </Button>
        </CardContent>
    </Card>
);


const ReportingPeriodContent = () => {
  const { 
      closedPeriods, 
      activePeriod, 
      openPeriod,
      commissions,
      enrichedDailyAdCosts,
      miscellaneousExpenses,
      setViewingPeriod,
      setCurrentPage
  } = useData();
  const [periodToOpen, setPeriodToOpen] = useState<string | null>(null);

  const nextPeriodData = useMemo(() => {
    if (activePeriod) return null;

    let period: string;
    if (closedPeriods.length === 0) {
        period = new Date().toISOString().slice(0, 7);
    } else {
        const latestPeriod = closedPeriods.reduce((max, p) => p.period > max ? p.period : max, "0000-00");
        const [year, month] = latestPeriod.split('-').map(Number);
        const nextDate = new Date(year, month, 1); // JS month is 0-indexed, but month is 1-12. new Date(2024, 12, 1) -> Jan 2025. Correct.
        period = `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}`;
    }

    const [year, month] = period.split('-').map(Number);
    const label = `tháng ${new Date(year, month - 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}`;

    return { period, label };
  }, [activePeriod, closedPeriods]);

  const handleOpenPeriodClick = () => {
    if (nextPeriodData) {
        setPeriodToOpen(nextPeriodData.period);
    }
  };

  const handleConfirmOpenPeriod = () => {
    if (periodToOpen) {
        openPeriod(periodToOpen);
        setPeriodToOpen(null);
    }
  };

  const handleViewPeriod = (period: string) => {
    setViewingPeriod(period);
    setCurrentPage('Dashboard');
  };
  
  const allPeriods = useMemo(() => {
    const calculateStatsForPeriod = (period: string) => {
        const revenue = commissions
            .filter(c => isDateInPeriod(c.date, period))
            .reduce((sum, c) => sum + c.vndAmount, 0);

        const adCost = enrichedDailyAdCosts
            .filter(c => isDateInPeriod(c.date, period))
            .reduce((sum, c) => sum + c.vndCost, 0);
        
        const miscCost = miscellaneousExpenses
            .filter(e => isDateInPeriod(e.date, period))
            .reduce((sum, e) => sum + e.vndAmount, 0);

        const cost = adCost + miscCost;
        const profit = revenue - cost;
        return { revenue, cost, profit };
    };

    const enrichedClosed = closedPeriods.map(p => ({
        period: p.period,
        status: 'closed' as const,
        ...calculateStatsForPeriod(p.period),
        closedAt: p.closedAt
    }));

    let activePeriodData: { period: string; status: 'active'; revenue: number; cost: number; profit: number; closedAt?: string; }[] = [];
    if (activePeriod) {
        activePeriodData.push({
            period: activePeriod,
            status: 'active' as const,
            ...calculateStatsForPeriod(activePeriod),
        });
    }

    return [...activePeriodData, ...enrichedClosed].sort((a, b) => b.period.localeCompare(a.period));
  }, [closedPeriods, activePeriod, commissions, enrichedDailyAdCosts, miscellaneousExpenses]);

  const yearlyStats = useMemo(() => {
    const statsByYear: Record<string, { totalRevenue: number; totalCost: number; totalProfit: number; }> = {};
    
    allPeriods.forEach(p => {
        const year = p.period.substring(0, 4);
        if (!statsByYear[year]) {
            statsByYear[year] = { totalRevenue: 0, totalCost: 0, totalProfit: 0 };
        }
        statsByYear[year].totalRevenue += p.revenue;
        statsByYear[year].totalCost += p.cost;
        statsByYear[year].totalProfit += p.profit;
    });

    return statsByYear;
  }, [allPeriods]);

  const periodToOpenLabel = useMemo(() => {
    if (!periodToOpen) return '';
    const [year, month] = periodToOpen.split('-').map(Number);
    return new Date(year, month - 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
  }, [periodToOpen]);

  return (
    <div className="p-4">
      {!activePeriod && nextPeriodData && (
        <OpenPeriodPrompt 
            onOpen={handleOpenPeriodClick}
            periodLabel={nextPeriodData.label}
        />
      )}

      <h3 className="text-xl font-semibold mb-4 text-white">Tất cả các kỳ báo cáo</h3>
      {allPeriods.length === 0 && activePeriod === null ? (
        <p className="text-gray-300">Chưa có kỳ báo cáo nào.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allPeriods.map((p, index) => {
                const currentYear = p.period.substring(0, 4);
                const previousYear = (index > 0) ? allPeriods[index - 1].period.substring(0, 4) : null;
                const isFirstItemOfYear = currentYear !== previousYear;

                const [year, month] = p.period.split('-');
                const periodLabel = `Tháng ${new Date(parseInt(year), parseInt(month) - 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' })}`;
                
                const yearStatsForCurrentYear = yearlyStats[currentYear];

                return (
                    <React.Fragment key={p.period}>
                        {isFirstItemOfYear && (
                            <>
                                <YearSeparator year={currentYear} />
                                {yearStatsForCurrentYear && <YearSummary revenue={yearStatsForCurrentYear.totalRevenue} cost={yearStatsForCurrentYear.totalCost} profit={yearStatsForCurrentYear.totalProfit} />}
                            </>
                        )}
                        <PeriodCard
                            periodLabel={periodLabel}
                            revenue={p.revenue}
                            cost={p.cost}
                            profit={p.profit}
                            status={p.status}
                            closedAt={p.closedAt}
                            onView={p.status === 'closed' ? () => handleViewPeriod(p.period) : undefined}
                        />
                    </React.Fragment>
                );
            })}
        </div>
      )}
      <ConfirmationModal
        isOpen={!!periodToOpen}
        onClose={() => setPeriodToOpen(null)}
        onConfirm={handleConfirmOpenPeriod}
        title="Xác nhận mở kỳ báo cáo"
        message={`Bạn có chắc chắn muốn mở kỳ báo cáo cho tháng ${periodToOpenLabel} không?`}
        confirmButtonText="Mở kỳ"
        confirmButtonVariant="primary"
      />
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-3 border border-gray-600 rounded-lg shadow-lg">
          <p className="label text-white font-bold mb-2">{`${label}`}</p>
          {payload.map((pld, index) => (
              <p key={index} style={{ color: pld.color }} className="text-sm">
                  {`${pld.name}: ${formatCurrency(pld.value as number)}`}
              </p>
          ))}
        </div>
      );
    }
    return null;
};

const TrendsContent = () => {
    const [timeframe, setTimeframe] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
    const { commissions, enrichedDailyAdCosts, miscellaneousExpenses } = useData();

    const trendData = useMemo(() => {
        const monthlyStats: { [key: string]: { revenue: number, cost: number, profit: number } } = {};

        // Aggregate all data by month first
        [...commissions, ...enrichedDailyAdCosts, ...miscellaneousExpenses].forEach(item => {
            const period = item.date.substring(0, 7); // YYYY-MM
            if (!monthlyStats[period]) {
                monthlyStats[period] = { revenue: 0, cost: 0, profit: 0 };
            }
            if ('vndAmount' in item && 'usdAmount' in item) { // Commission
                monthlyStats[period].revenue += item.vndAmount;
            } else if ('vndCost' in item) { // DailyAdCost
                monthlyStats[period].cost += item.vndCost;
            } else if ('vndAmount' in item) { // MiscellaneousExpense
                monthlyStats[period].cost += item.vndAmount;
            }
        });
        
        Object.keys(monthlyStats).forEach(period => {
             monthlyStats[period].profit = monthlyStats[period].revenue - monthlyStats[period].cost;
        });
        
        const sortedMonthly = Object.entries(monthlyStats)
            .map(([period, data]) => ({ period, ...data }))
            .sort((a, b) => a.period.localeCompare(b.period));

        if (timeframe === 'monthly') {
            return sortedMonthly.map(item => ({
                ...item,
                period: item.period.replace('-', '/')
            }));
        }

        const aggregatedStats: { [key: string]: { revenue: number, cost: number, profit: number } } = {};
        
        sortedMonthly.forEach(month => {
            const date = new Date(month.period + '-01');
            let key: string;
            if (timeframe === 'quarterly') {
                const year = date.getFullYear();
                const quarter = Math.floor(date.getMonth() / 3) + 1;
                key = `${year}-Q${quarter}`;
            } else { // yearly
                key = date.getFullYear().toString();
            }

            if (!aggregatedStats[key]) {
                aggregatedStats[key] = { revenue: 0, cost: 0, profit: 0 };
            }
            aggregatedStats[key].revenue += month.revenue;
            aggregatedStats[key].cost += month.cost;
            aggregatedStats[key].profit += month.profit;
        });

        return Object.entries(aggregatedStats)
            .map(([period, data]) => ({ period, ...data }))
            .sort((a, b) => a.period.localeCompare(b.period));

    }, [commissions, enrichedDailyAdCosts, miscellaneousExpenses, timeframe]);

    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-center bg-gray-800/50 rounded-lg p-1 max-w-xs mx-auto">
                <Button variant={timeframe === 'monthly' ? 'primary' : 'secondary'} onClick={() => setTimeframe('monthly')} className="flex-1 !py-1.5">Tháng</Button>
                <Button variant={timeframe === 'quarterly' ? 'primary' : 'secondary'} onClick={() => setTimeframe('quarterly')} className="flex-1 !py-1.5">Quý</Button>
                <Button variant={timeframe === 'yearly' ? 'primary' : 'secondary'} onClick={() => setTimeframe('yearly')} className="flex-1 !py-1.5">Năm</Button>
            </div>
            
            <Card>
                <CardContent style={{height: '400px'}}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="period" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" tickFormatter={formatVietnameseCurrencyShorthand} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="cost" name="Chi phí" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                     <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Kỳ</TableHeader>
                                <TableHeader>Doanh thu</TableHeader>
                                <TableHeader>Chi phí</TableHeader>
                                <TableHeader>Lợi nhuận</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {trendData.map(item => (
                                <TableRow key={item.period}>
                                    <TableCell className="font-medium text-white">{item.period}</TableCell>
                                    <TableCell className="text-primary-400">{formatCurrency(item.revenue)}</TableCell>
                                    <TableCell className="text-red-400">{formatCurrency(item.cost)}</TableCell>
                                    <TableCell className={`font-semibold ${item.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatCurrency(item.profit)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};


type ProjectStat = {
    id: string;
    name: string;
    categoryId?: string;
    nicheId?: string;
    categoryName: string;
    nicheName: string;
    revenue: number;
    cost: number;
    profit: number;
    roi: number | null;
    isPartnership: boolean;
};


const ProjectDetailModal: React.FC<{ project: ProjectStat; onClose: () => void; }> = ({ project, onClose }) => {
    const { projects, commissions, enrichedDailyAdCosts, miscellaneousExpenses } = useData();

    const monthlyData = useMemo(() => {
        // Find all instances of this project across different periods
        const projectInstances = projects.filter(p =>
            p.name === project.name &&
            p.categoryId === project.categoryId &&
            p.nicheId === project.nicheId
        );

        // Create a map of projectId -> project instance for quick lookup
        const instanceMap = new Map(projectInstances.map(p => [p.id, p]));

        // Group stats by period (month)
        const statsByMonth: { [period: string]: { revenue: number; cost: number; projectType: T.ProjectType } } = {};

        projectInstances.forEach(instance => {
            statsByMonth[instance.period] = {
                revenue: 0,
                cost: 0,
                projectType: instance.projectType
            };
        });

        commissions.forEach(c => {
            if (instanceMap.has(c.projectId)) {
                const period = instanceMap.get(c.projectId)!.period;
                if (statsByMonth[period]) {
                    statsByMonth[period].revenue += c.vndAmount;
                }
            }
        });

        enrichedDailyAdCosts.forEach(c => {
            if (instanceMap.has(c.projectId)) {
                const period = instanceMap.get(c.projectId)!.period;
                if (statsByMonth[period]) {
                    statsByMonth[period].cost += c.vndCost;
                }
            }
        });
        
        miscellaneousExpenses.forEach(e => {
            if (e.projectId && instanceMap.has(e.projectId)) {
                const period = instanceMap.get(e.projectId)!.period;
                if (statsByMonth[period]) {
                    statsByMonth[period].cost += e.vndAmount;
                }
            }
        });

        // Convert map to sorted array
        return Object.entries(statsByMonth)
            .map(([period, data]) => {
                const [year, month] = period.split('-');
                return {
                    month: new Date(parseInt(year), parseInt(month) - 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' }),
                    period: period,
                    revenue: data.revenue,
                    cost: data.cost,
                    profit: data.revenue - data.cost,
                    projectType: data.projectType === 'test' ? 'Test' : 'Triển khai'
                };
            })
            .sort((a, b) => a.period.localeCompare(b.period));

    }, [project, projects, commissions, enrichedDailyAdCosts, miscellaneousExpenses]);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Chi tiết dự án: ${project.name}`} size="4xl">
            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeader>Tháng</TableHeader>
                        <TableHeader>Loại dự án</TableHeader>
                        <TableHeader>Doanh thu</TableHeader>
                        <TableHeader>Chi phí</TableHeader>
                        <TableHeader>Lợi nhuận</TableHeader>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {monthlyData.map(data => (
                         <TableRow key={data.period}>
                             <TableCell className="font-medium text-white">{data.month}</TableCell>
                             <TableCell>{data.projectType}</TableCell>
                             <TableCell className="text-primary-400">{formatCurrency(data.revenue)}</TableCell>
                             <TableCell className="text-red-400">{formatCurrency(data.cost)}</TableCell>
                             <TableCell className={`font-semibold ${data.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                 {formatCurrency(data.profit)}
                             </TableCell>
                         </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Modal>
    );
};


const ProjectArchiveContent = () => {
    const { projects, commissions, enrichedDailyAdCosts, miscellaneousExpenses, categories, niches } = useData();
    const [sortConfig, setSortConfig] = useState<{ key: keyof ProjectStat; direction: 'asc' | 'desc' } | null>({ key: 'profit', direction: 'desc' });
    const [selectedProject, setSelectedProject] = useState<ProjectStat | null>(null);

    const projectStats = useMemo<ProjectStat[]>(() => {
        const masterProjectStats = new Map<string, {
            name: string;
            categoryId?: string;
            nicheId?: string;
            revenue: number;
            cost: number;
            isPartnership: boolean;
        }>();

        const instanceStats = new Map<string, { revenue: number; cost: number }>();

        commissions.forEach(c => {
            const stat = instanceStats.get(c.projectId) || { revenue: 0, cost: 0 };
            stat.revenue += c.vndAmount;
            instanceStats.set(c.projectId, stat);
        });

        enrichedDailyAdCosts.forEach(c => {
            const stat = instanceStats.get(c.projectId) || { revenue: 0, cost: 0 };
            stat.cost += c.vndCost;
            instanceStats.set(c.projectId, stat);
        });

        miscellaneousExpenses.forEach(e => {
            if (e.projectId) {
                const stat = instanceStats.get(e.projectId) || { revenue: 0, cost: 0 };
                stat.cost += e.vndAmount;
                instanceStats.set(e.projectId, stat);
            }
        });

        projects.forEach(project => {
            const key = `${project.name.trim().toLowerCase()}-${project.categoryId || 'none'}-${project.nicheId || 'none'}`;
            
            const master = masterProjectStats.get(key) || {
                name: project.name,
                categoryId: project.categoryId,
                nicheId: project.nicheId,
                revenue: 0,
                cost: 0,
                isPartnership: false,
            };

            const instancePnl = instanceStats.get(project.id) || { revenue: 0, cost: 0 };

            master.revenue += instancePnl.revenue;
            master.cost += instancePnl.cost;
            master.isPartnership = master.isPartnership || project.isPartnership;

            masterProjectStats.set(key, master);
        });

        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const nicheMap = new Map(niches.map(n => [n.id, n.name]));

        return Array.from(masterProjectStats.entries()).map(([key, master]) => {
            const profit = master.revenue - master.cost;
            const roi = master.cost > 0 ? (profit / master.cost) * 100 : null;
            return {
                id: key,
                name: master.name,
                categoryId: master.categoryId,
                nicheId: master.nicheId,
                categoryName: master.categoryId ? categoryMap.get(master.categoryId) || '—' : '—',
                nicheName: master.nicheId ? nicheMap.get(master.nicheId) || '—' : '—',
                revenue: master.revenue,
                cost: master.cost,
                profit,
                roi,
                isPartnership: master.isPartnership,
            };
        });
    }, [projects, commissions, enrichedDailyAdCosts, miscellaneousExpenses, categories, niches]);

    const sortedProjects = useMemo(() => {
        let sortableItems = [...projectStats];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if(aValue === null) return 1;
                if(bValue === null) return -1;
                
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                     return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                
                if ((aValue as any) < (bValue as any)) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if ((aValue as any) > (bValue as any)) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [projectStats, sortConfig]);

    const requestSort = (key: keyof ProjectStat) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const renderRoi = (roi: number | null, profit: number) => {
        if (roi === null) {
            if (profit > 0) return <span className="text-green-400">Chỉ có doanh thu</span>;
            return <span className="text-gray-500">N/A</span>;
        }
        return <span className={roi >= 0 ? 'text-green-400' : 'text-red-400'}>{roi.toFixed(2)}%</span>;
    };

    return (
        <div className="p-4">
            <Card>
                <CardHeader>Tổng hợp hiệu suất tất cả dự án</CardHeader>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader className="cursor-pointer" onClick={() => requestSort('name')}>
                                    Tên dự án
                                </TableHeader>
                                <TableHeader className="cursor-pointer" onClick={() => requestSort('categoryName')}>
                                    Hạng mục
                                </TableHeader>
                                <TableHeader className="cursor-pointer" onClick={() => requestSort('nicheName')}>
                                    Ngách
                                </TableHeader>
                                <TableHeader>Loại</TableHeader>
                                <TableHeader className="cursor-pointer" onClick={() => requestSort('revenue')}>
                                    Tổng Doanh thu
                                </TableHeader>
                                <TableHeader className="cursor-pointer" onClick={() => requestSort('cost')}>
                                    Tổng Chi phí
                                </TableHeader>
                                <TableHeader className="cursor-pointer" onClick={() => requestSort('profit')}>
                                    Tổng Lợi nhuận
                                </TableHeader>
                                <TableHeader className="cursor-pointer" onClick={() => requestSort('roi')}>
                                    ROI Lũy kế
                                </TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedProjects.map(p => (
                                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelectedProject(p)}>
                                    <TableCell className="font-medium text-white">{p.name}</TableCell>
                                    <TableCell>{p.categoryName}</TableCell>
                                    <TableCell>{p.nicheName}</TableCell>
                                    <TableCell>{p.isPartnership ? 'Hợp tác' : 'Một mình'}</TableCell>
                                    <TableCell className="text-primary-400">{formatCurrency(p.revenue)}</TableCell>
                                    <TableCell className="text-red-400">{formatCurrency(p.cost)}</TableCell>
                                    <TableCell className={`font-semibold ${p.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatCurrency(p.profit)}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                        {renderRoi(p.roi, p.profit)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedProject && (
                <ProjectDetailModal
                    project={selectedProject}
                    onClose={() => setSelectedProject(null)}
                />
            )}
        </div>
    );
};

const FormModal: React.FC<{isOpen: boolean; onClose: () => void; onSave: (name: string) => void; title: string; initialValue?: string; label: string;}> = 
({isOpen, onClose, onSave, title, initialValue = '', label}) => {
    const [name, setName] = useState(initialValue);
    useEffect(() => {
        if(isOpen) setName(initialValue);
    }, [isOpen, initialValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(name.trim()) onSave(name.trim());
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="form-modal-name">{label}</Label>
                    <Input id="form-modal-name" value={name} onChange={e => setName(e.target.value)} required autoFocus />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit">Lưu</Button>
                </div>
            </form>
        </Modal>
    );
};

const CategoryNicheManagement = () => {
    const { 
        categories, addCategory, updateCategory, deleteCategory, 
        niches, addNiche, updateNiche, deleteNiche 
    } = useData();
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isNicheModalOpen, setIsNicheModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<T.Category | undefined>(undefined);
    const [editingNiche, setEditingNiche] = useState<T.Niche | undefined>(undefined);
    const [parentCategoryForNiche, setParentCategoryForNiche] = useState<T.Category | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<T.Category | null>(null);
    const [nicheToDelete, setNicheToDelete] = useState<T.Niche | null>(null);

    const handleSaveCategory = (name: string) => {
        if (editingCategory) {
            updateCategory({ ...editingCategory, name });
        } else {
            addCategory({ name });
        }
        setIsCategoryModalOpen(false);
    };

    const handleSaveNiche = (name: string) => {
        if (editingNiche) {
            updateNiche({ ...editingNiche, name });
        } else if (parentCategoryForNiche) {
            addNiche({ name, categoryId: parentCategoryForNiche.id });
        }
        setIsNicheModalOpen(false);
    };

    return (
        <div className="space-y-6 p-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Quản lý Hạng mục & Ngách</h2>
                <Button onClick={() => { setEditingCategory(undefined); setIsCategoryModalOpen(true); }}>
                    <span className="flex items-center gap-2"><Plus /> Thêm Hạng mục</span>
                </Button>
            </div>

            {categories.map(category => (
                <Card key={category.id}>
                    <CardHeader className="flex justify-between items-center">
                        <span className="font-bold text-xl">{category.name}</span>
                        <div className="flex items-center space-x-3">
                            <Button size="sm" variant="secondary" onClick={() => { setParentCategoryForNiche(category); setEditingNiche(undefined); setIsNicheModalOpen(true); }}>
                                <span className="flex items-center gap-1"><Plus width={14} height={14} /> Thêm Ngách</span>
                            </Button>
                            <button onClick={() => { setEditingCategory(category); setIsCategoryModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                            <button onClick={() => setCategoryToDelete(category)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {niches.filter(n => n.categoryId === category.id).length > 0 ? (
                            <ul className="space-y-2">
                                {niches.filter(n => n.categoryId === category.id).map(niche => (
                                    <li key={niche.id} className="flex justify-between items-center p-2 rounded-md bg-gray-900/50">
                                        <span>{niche.name}</span>
                                        <div className="flex items-center space-x-3">
                                            <button onClick={() => { setEditingNiche(niche); setIsNicheModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                            <button onClick={() => setNicheToDelete(niche)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-center py-2">Chưa có ngách nào trong hạng mục này.</p>
                        )}
                    </CardContent>
                </Card>
            ))}

            {/* Modals */}
            <FormModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSave={handleSaveCategory}
                title={editingCategory ? 'Sửa Hạng mục' : 'Thêm Hạng mục'}
                initialValue={editingCategory?.name}
                label="Tên Hạng mục"
            />
             <FormModal
                isOpen={isNicheModalOpen}
                onClose={() => setIsNicheModalOpen(false)}
                onSave={handleSaveNiche}
                title={editingNiche ? 'Sửa Ngách' : `Thêm Ngách cho "${parentCategoryForNiche?.name}"`}
                initialValue={editingNiche?.name}
                label="Tên Ngách"
            />
            {/* Confirmation Modals */}
            <ConfirmationModal
                isOpen={!!categoryToDelete}
                onClose={() => setCategoryToDelete(null)}
                onConfirm={() => { if(categoryToDelete) { deleteCategory(categoryToDelete.id); setCategoryToDelete(null); } }}
                title="Xác nhận xóa Hạng mục"
                message={`Bạn có chắc muốn xóa hạng mục "${categoryToDelete?.name}"?`}
            />
            <ConfirmationModal
                isOpen={!!nicheToDelete}
                onClose={() => setNicheToDelete(null)}
                onConfirm={() => { if(nicheToDelete) { deleteNiche(nicheToDelete.id); setNicheToDelete(null); } }}
                title="Xác nhận xóa Ngách"
                message={`Bạn có chắc muốn xóa ngách "${nicheToDelete?.name}"?`}
            />
        </div>
    );
};


export default function LongReport() {
  const [activeTab, setActiveTab] = useState<Tab>('reportingPeriod');

  const renderContent = () => {
    switch (activeTab) {
      case 'reportingPeriod':
        return <ReportingPeriodContent />;
      case 'trends':
        return <TrendsContent />;
      case 'projectArchive':
        return <ProjectArchiveContent />;
      case 'management':
        return <CategoryNicheManagement />;
      default:
        return null;
    }
  };

  return (
    <div>
      <Header title="Tổng hợp báo cáo" />
      
      <div className="flex flex-wrap border-b border-gray-700" role="tablist">
        <TabButton active={activeTab === 'reportingPeriod'} onClick={() => setActiveTab('reportingPeriod')}>
          Kỳ báo cáo
        </TabButton>
        <TabButton active={activeTab === 'trends'} onClick={() => setActiveTab('trends')}>
          Xu hướng
        </TabButton>
        <TabButton active={activeTab === 'projectArchive'} onClick={() => setActiveTab('projectArchive')}>
          Kho dự án
        </TabButton>
         <TabButton active={activeTab === 'management'} onClick={() => setActiveTab('management')}>
          Quản lý Hạng mục & Ngách
        </TabButton>
      </div>

      <div className="mt-6">
        {renderContent()}
      </div>
    </div>
  );
}
