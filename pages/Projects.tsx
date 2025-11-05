import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import * as T from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Plus, Edit, Trash2, Users, X } from '../components/icons/IconComponents';
import { formatCurrency, isDateInPeriod, formatPercentage, formatDate } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';


const adsPlatformLabels: Record<T.AdsPlatform, string> = {
    google: 'Google Ads',
    youtube: 'Youtube Ads',
    tiktok: 'Tiktok Ads',
    facebook: 'Facebook Ads',
    other: 'Other'
};

const projectTypeLabels: Record<T.ProjectType, string> = {
    test: 'Test',
    deployment: 'Triển khai'
};

const projectStatusLabels: Record<T.ProjectStatus, string> = {
    running: 'Đang chạy',
    stopped: 'Đã dừng'
};

const AddPartnerModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
            setName(''); // reset for next time
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Thêm đối tác mới">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="newPartnerName">Tên đối tác</Label>
                    <Input 
                        id="newPartnerName" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        required 
                        autoFocus
                    />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit">Lưu</Button>
                </div>
            </form>
        </Modal>
    );
};


const ProjectForm: React.FC<{ project?: T.Project; onSave: (project: Omit<T.Project, 'id' | 'period'> | T.Project) => void; onCancel: () => void; }> = ({ project, onSave, onCancel }) => {
    const { partners, addPartner, categories, niches, masterProjects, projects, currentPeriod } = useData();
    const [name, setName] = useState(project?.name || '');
    const [adsPlatforms, setAdsPlatforms] = useState<T.AdsPlatform[]>(project?.adsPlatforms || ['google']);
    const [projectType, setProjectType] = useState<T.ProjectType>(project?.projectType || 'test');
    const [status, setStatus] = useState<T.ProjectStatus>(project?.status || 'running');
    const [isPartnership, setIsPartnership] = useState(project?.isPartnership || false);
    const [shares, setShares] = useState<T.PartnerShare[]>(project?.partnerShares || []);
    const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
    const [categoryId, setCategoryId] = useState(project?.categoryId || '');
    const [nicheId, setNicheId] = useState(project?.nicheId || '');

    const [suggestions, setSuggestions] = useState<{ name: string; categoryId?: string; nicheId?: string; }[]>([]);
    const [isSuggestionBoxOpen, setIsSuggestionBoxOpen] = useState(false);

     const availableNiches = useMemo(() => {
        if (!categoryId) return [];
        return niches.filter(n => n.categoryId === categoryId);
    }, [categoryId, niches]);

    useEffect(() => {
        if (categoryId && !availableNiches.some(n => n.id === nicheId)) {
            setNicheId('');
        }
    }, [categoryId, availableNiches, nicheId]);
    
    useEffect(() => {
        if (isPartnership) {
            const partnerIdsInShares = new Set(shares.map(s => s.partnerId));
            const newShares = [...shares];
            
            partners.forEach(p => {
                if (!partnerIdsInShares.has(p.id)) {
                    newShares.push({ partnerId: p.id, sharePercentage: 0 });
                }
            });
            
            const allPartnerIds = new Set(partners.map(p => p.id));
            const filteredShares = newShares.filter(s => allPartnerIds.has(s.partnerId));
            
            setShares(filteredShares);
        }
    }, [isPartnership, partners]);


    const handleShareChange = (partnerId: string, percentage: number) => {
        setShares(currentShares =>
            currentShares.map(s => s.partnerId === partnerId ? { ...s, sharePercentage: percentage } : s)
        );
    };
    
    const totalShare = useMemo(() => shares.reduce((sum, s) => sum + (Number(s.sharePercentage) || 0), 0), [shares]);

    const handlePlatformChange = (platform: T.AdsPlatform, checked: boolean) => {
        setAdsPlatforms(prev => {
            if (checked) {
                return [...prev, platform];
            } else {
                return prev.filter(p => p !== platform);
            }
        });
    };

    const projectsForCurrentPeriod = useMemo(() => 
        projects.filter(p => p.period === currentPeriod),
    [projects, currentPeriod]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value);

        if (value.trim()) {
            const currentPeriodProjectNames = new Set(projectsForCurrentPeriod.map(p => p.name.trim().toLowerCase()));
            
            const filteredSuggestions = masterProjects.filter(p => 
                p.name.toLowerCase().includes(value.toLowerCase()) &&
                !currentPeriodProjectNames.has(p.name.trim().toLowerCase())
            );
            setSuggestions(filteredSuggestions);
            setIsSuggestionBoxOpen(filteredSuggestions.length > 0);
        } else {
            setSuggestions([]);
            setIsSuggestionBoxOpen(false);
        }
    };

    const handleSuggestionClick = (suggestion: { name: string; categoryId?: string; nicheId?: string; }) => {
        setName(suggestion.name);
        setCategoryId(suggestion.categoryId || '');
        setNicheId(suggestion.nicheId || '');
        setSuggestions([]);
        setIsSuggestionBoxOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (adsPlatforms.length === 0) {
            alert('Vui lòng chọn ít nhất một nền tảng Ads.');
            return;
        }
        if (isPartnership && totalShare !== 100) {
            alert('Tổng tỷ lệ phân chia của các đối tác phải bằng 100%.');
            return;
        }
        onSave({ 
            ...project, 
            id: project?.id || '', 
            name, 
            adsPlatforms, 
            projectType, 
            status, 
            isPartnership,
            partnerShares: isPartnership ? shares : undefined,
            categoryId: categoryId || undefined,
            nicheId: nicheId || undefined,
        });
    };
    
    const handleAddPartner = (name: string) => {
        addPartner({ name });
        setIsAddPartnerModalOpen(false);
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
    const checkboxClassName = "h-4 w-4 rounded border-gray-600 bg-gray-800 text-primary-600 focus:ring-primary-500";

    return (
        <>
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="name">Tên dự án</Label>
                    <div className="relative">
                        <Input 
                            id="name" 
                            value={name} 
                            onChange={handleNameChange}
                            onBlur={() => setTimeout(() => setIsSuggestionBoxOpen(false), 150)} // Delay to allow click
                            autoComplete="off"
                            required 
                        />
                        {isSuggestionBoxOpen && suggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                <ul>
                                    {suggestions.map((s, index) => (
                                        <li 
                                            key={index}
                                            className="px-3 py-2 cursor-pointer hover:bg-primary-600 text-gray-200"
                                            onMouseDown={() => handleSuggestionClick(s)}
                                        >
                                            {s.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="category">Hạng mục</Label>
                        <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className={selectClassName}>
                           <option value="">-- Không có --</option>
                           {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="niche">Ngách</Label>
                        <select id="niche" value={nicheId} onChange={e => setNicheId(e.target.value)} className={selectClassName} disabled={!categoryId || availableNiches.length === 0}>
                           <option value="">-- Không có --</option>
                           {availableNiches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <Label>Nền tảng Ads</Label>
                    <div className="grid grid-cols-2 gap-2 p-3 border border-gray-600 rounded-md bg-gray-900">
                        {Object.entries(adsPlatformLabels).map(([key, label]) => (
                            <label key={key} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={adsPlatforms.includes(key as T.AdsPlatform)}
                                    onChange={(e) => handlePlatformChange(key as T.AdsPlatform, e.target.checked)}
                                    className={checkboxClassName}
                                />
                                <span className="text-gray-300">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <Label htmlFor="projectType">Loại</Label>
                        <select id="projectType" value={projectType} onChange={e => setProjectType(e.target.value as T.ProjectType)} className={selectClassName}>
                           {Object.entries(projectTypeLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                           ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="status">Trạng thái</Label>
                        <select id="status" value={status} onChange={e => setStatus(e.target.value as T.ProjectStatus)} className={selectClassName}>
                           {Object.entries(projectStatusLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                           ))}
                        </select>
                    </div>
                </div>
                 <div className="border-t border-gray-700 pt-4">
                    <button
                        type="button"
                        onClick={() => setIsPartnership(!isPartnership)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                            isPartnership 
                                ? 'bg-primary-600/20 text-primary-300 ring-1 ring-primary-500' 
                                : 'text-gray-400 hover:bg-gray-700/50'
                        }`}
                    >
                        <Users />
                        <span>Dự án hợp tác</span>
                    </button>
                </div>

                {isPartnership && (
                    <div className="border-t border-gray-700 pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <h4 className="font-semibold text-white">Phân chia lợi nhuận</h4>
                                 <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsAddPartnerModalOpen(true)}
                                    className="!py-1 !px-2 !text-xs"
                                >
                                    <span className="flex items-center gap-1"><Plus width={14} height={14} /> Thêm đối tác</span>
                                </Button>
                            </div>
                            <span className={`text-sm font-bold ${totalShare === 100 ? 'text-green-400' : 'text-red-400'}`}>
                                Tổng: {totalShare.toFixed(2).replace('.', ',')}%
                            </span>
                        </div>
                       
                        {shares.map(share => {
                             const partner = partners.find(p => p.id === share.partnerId);
                             if (!partner) return null;
                             return (
                                <div key={share.partnerId} className="flex items-center gap-4">
                                    <Label htmlFor={`share-${share.partnerId}`} className="flex-1 mb-0">{partner.name}</Label>
                                    <div className="relative w-32">
                                        <NumberInput
                                            id={`share-${share.partnerId}`}
                                            value={share.sharePercentage}
                                            onValueChange={val => handleShareChange(share.partnerId, val)}
                                            className="pr-8"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">%</span>
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                )}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
         <AddPartnerModal 
            isOpen={isAddPartnerModalOpen}
            onClose={() => setIsAddPartnerModalOpen(false)}
            onSave={handleAddPartner}
        />
        </>
    );
};

const CustomChartTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-3 border border-gray-600 rounded-lg shadow-lg">
        <p className="label text-white font-bold mb-2">{formatDate(String(label))}</p>
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

export default function Projects() {
    const { projects, addProject, updateProject, deleteProject, enrichedDailyAdCosts, commissions, assets, categories, niches, currentPeriod, isReadOnly } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<T.Project | undefined>(undefined);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<{id: string, name: string} | null>(null);
    const [activeTab, setActiveTab] = useState<'report' | 'trends'>('report');

    const [filters, setFilters] = useState({
        projectId: 'all',
        startDate: '',
        endDate: '',
        assetId: 'all',
        adsPlatform: 'all',
        categoryId: 'all',
        nicheId: 'all',
    });

    const availableNichesForFilter = useMemo(() => {
        if (filters.categoryId === 'all') return niches;
        return niches.filter(n => n.categoryId === filters.categoryId);
    }, [filters.categoryId, niches]);

    // FIX: Changed type of value from 'number | string' to 'any' to align with recharts prop type.
    const yAxisTickFormatter = (value: any) => {
        const num = Number(value);
        if (isNaN(num)) return '0';
        
        const units = [
            { value: 1_000_000_000, symbol: 'tỷ' },
            { value: 1_000_000, symbol: 'triệu' },
            { value: 1_000, symbol: 'k' }
        ];

        const absNum = Math.abs(num);
        if (absNum < 1000) return num.toLocaleString('vi-VN');

        for (const unit of units) {
            if (absNum >= unit.value) {
                const formatted = (num / unit.value).toLocaleString('vi-VN', {
                    maximumFractionDigits: 1,
                });
                return `${formatted.replace(/[,.]0$/, '')} ${unit.symbol}`;
            }
        }
        return num.toLocaleString('vi-VN');
    };

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => {
            const newFilters = { ...prev, [field]: value };
            if (field === 'categoryId') {
                newFilters.nicheId = 'all';
            }
            return newFilters;
        });
    };

    const resetFilters = () => {
        setFilters({
            projectId: 'all',
            startDate: '',
            endDate: '',
            assetId: 'all',
            adsPlatform: 'all',
            categoryId: 'all',
            nicheId: 'all',
        });
    };

    const projectsForCurrentPeriod = useMemo(() => 
        projects.filter(p => p.period === currentPeriod),
    [projects, currentPeriod]);

    const handleSave = (project: Omit<T.Project, 'id' | 'period'> | T.Project) => {
        if ('id' in project && project.id) {
            updateProject(project as T.Project);
        } else {
            addProject(project);
        }
        setIsModalOpen(false);
        setEditingProject(undefined);
    };
    
    const handleDeleteClick = (project: {id: string, name: string}) => {
        setProjectToDelete(project);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (projectToDelete) {
            deleteProject(projectToDelete.id);
            setIsConfirmModalOpen(false);
            setProjectToDelete(null);
        }
    };


    const filteredData = useMemo(() => {
        let filteredCosts = enrichedDailyAdCosts.filter(c => isDateInPeriod(c.date, currentPeriod));
        let filteredCommissions = commissions.filter(c => isDateInPeriod(c.date, currentPeriod));

        if (filters.startDate) {
            filteredCosts = filteredCosts.filter(c => c.date >= filters.startDate);
            filteredCommissions = filteredCommissions.filter(c => c.date >= filters.startDate);
        }
        if (filters.endDate) {
            filteredCosts = filteredCosts.filter(c => c.date <= filters.endDate);
            filteredCommissions = filteredCommissions.filter(c => c.date <= filters.endDate);
        }
        if (filters.assetId !== 'all') {
            filteredCommissions = filteredCommissions.filter(c => c.assetId === filters.assetId);
        }
        
        const projectMap = new Map<string, T.Project>(projects.map(p => [p.id, p]));
        
        if (filters.adsPlatform !== 'all') {
            filteredCosts = filteredCosts.filter(c => projectMap.get(c.projectId)?.adsPlatforms.includes(filters.adsPlatform as T.AdsPlatform));
            filteredCommissions = filteredCommissions.filter(c => projectMap.get(c.projectId)?.adsPlatforms.includes(filters.adsPlatform as T.AdsPlatform));
        }

        let projectsToDisplay = projectsForCurrentPeriod.filter(p => 
            filters.projectId === 'all' || p.id === filters.projectId
        );
        
        if (filters.categoryId !== 'all') {
            projectsToDisplay = projectsToDisplay.filter(p => p.categoryId === filters.categoryId);
        }
        if (filters.nicheId !== 'all') {
            projectsToDisplay = projectsToDisplay.filter(p => p.nicheId === filters.nicheId);
        }

        const projectIdsToFilter = new Set(projectsToDisplay.map(p => p.id));
        
        filteredCosts = filteredCosts.filter(c => projectIdsToFilter.has(c.projectId));
        filteredCommissions = filteredCommissions.filter(c => projectIdsToFilter.has(c.projectId));

        return { filteredCosts, filteredCommissions, projectsToDisplay };

    }, [projects, enrichedDailyAdCosts, commissions, currentPeriod, filters, projectsForCurrentPeriod]);


    const projectStats = useMemo(() => {
        const assetMap = new Map(assets.map(a => [a.id, a.name]));
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const nicheMap = new Map(niches.map(n => [n.id, n.name]));
        const { filteredCosts, filteredCommissions, projectsToDisplay } = filteredData;
        
        return projectsToDisplay.map(p => {
            const projectCosts = filteredCosts.filter(c => c.projectId === p.id).reduce((sum, c) => sum + c.vndCost, 0);
            const projectCommissions = filteredCommissions.filter(c => c.projectId === p.id).reduce((sum, c) => sum + c.vndAmount, 0);
            const profit = projectCommissions - projectCosts;
            const roi = projectCosts > 0 ? (profit / projectCosts) * 100 : 0;
            
            const commissionsForThisProject = filteredCommissions.filter(c => c.projectId === p.id);
            const uniqueAssetIds = [...new Set(commissionsForThisProject.map(c => c.assetId))];
            const assetNames = uniqueAssetIds.map(id => assetMap.get(id) || 'Không rõ').join(', ');

            return {
                ...p,
                totalCost: projectCosts,
                totalCommission: projectCommissions,
                profit,
                roi,
                assetName: assetNames || (filters.assetId === 'all' ? 'Chưa nhận hoa hồng' : '—'),
                categoryName: p.categoryId ? categoryMap.get(p.categoryId) || '—' : '—',
                nicheName: p.nicheId ? nicheMap.get(p.nicheId) || '—' : '—',
            };
        });

    }, [assets, categories, niches, filters.assetId, filteredData]);
    
    const totals = useMemo(() => {
        if (projectStats.length === 0) {
            return { totalCommission: 0, totalCost: 0, totalProfit: 0, totalRoi: 0 };
        }
        const totalCommission = projectStats.reduce((sum, p) => sum + p.totalCommission, 0);
        const totalCost = projectStats.reduce((sum, p) => sum + p.totalCost, 0);
        const totalProfit = projectStats.reduce((sum, p) => sum + p.profit, 0);
        const totalRoi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
        return { totalCommission, totalCost, totalProfit, totalRoi };
    }, [projectStats]);

    const dailyChartData = useMemo(() => {
        const { filteredCosts, filteredCommissions } = filteredData;
        const dailyData = new Map<string, { revenue: number, cost: number }>();

        const processDate = (date: string, amount: number, type: 'revenue' | 'cost') => {
            if (!dailyData.has(date)) {
                dailyData.set(date, { revenue: 0, cost: 0 });
            }
            const entry = dailyData.get(date)!;
            entry[type] += amount;
        };

        filteredCommissions.forEach(c => processDate(c.date, c.vndAmount, 'revenue'));
        filteredCosts.forEach(c => processDate(c.date, c.vndCost, 'cost'));
        
        if (dailyData.size === 0) return [];

        return Array.from(dailyData.entries())
            .map(([date, values]) => ({
                date,
                revenue: values.revenue,
                cost: values.cost,
                profit: values.revenue - values.cost,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredData]);
    
    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";


    return (
        <>
            <Header title="Dự án">
                {!isReadOnly && (
                    <Button onClick={() => { setEditingProject(undefined); setIsModalOpen(true); }}>
                        <span className="flex items-center gap-2"><Plus /> Thêm dự án</span>
                    </Button>
                )}
            </Header>

            <div className="flex flex-wrap border-b border-gray-700 mb-6" role="tablist">
                 <TabButton active={activeTab === 'report'} onClick={() => setActiveTab('report')}>
                    Báo cáo dự án
                </TabButton>
                <TabButton active={activeTab === 'trends'} onClick={() => setActiveTab('trends')}>
                    Xu hướng dự án
                </TabButton>
            </div>
            
            <Card className="mb-6">
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 items-end">
                        <div className="lg:col-span-2">
                            <Label htmlFor="filter-project-id">Tên dự án</Label>
                            <select 
                                id="filter-project-id"
                                className={selectClassName}
                                value={filters.projectId}
                                onChange={e => handleFilterChange('projectId', e.target.value)}
                            >
                                <option value="all">Tất cả dự án</option>
                                {projectsForCurrentPeriod.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="filter-category">Hạng mục</Label>
                            <select 
                                id="filter-category" 
                                className={selectClassName} 
                                value={filters.categoryId} 
                                onChange={e => handleFilterChange('categoryId', e.target.value)}
                            >
                                <option value="all">Tất cả</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="filter-niche">Ngách</Label>
                            <select 
                                id="filter-niche" 
                                className={selectClassName} 
                                value={filters.nicheId} 
                                onChange={e => handleFilterChange('nicheId', e.target.value)}
                                disabled={availableNichesForFilter.length === 0 && filters.categoryId !== 'all'}
                            >
                                <option value="all">Tất cả</option>
                                {availableNichesForFilter.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="filter-start-date">Từ ngày</Label>
                            <Input 
                                id="filter-start-date" 
                                type="date" 
                                value={filters.startDate}
                                onChange={e => handleFilterChange('startDate', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="filter-end-date">Đến ngày</Label>
                            <Input 
                                id="filter-end-date" 
                                type="date" 
                                value={filters.endDate}
                                onChange={e => handleFilterChange('endDate', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="filter-asset">Tài sản</Label>
                            <select 
                                id="filter-asset"
                                className={selectClassName}
                                value={filters.assetId}
                                onChange={e => handleFilterChange('assetId', e.target.value)}
                            >
                                <option value="all">Tất cả</option>
                                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="filter-platform">Nền tảng Ads</Label>
                            <select 
                                id="filter-platform" 
                                className={selectClassName}
                                value={filters.adsPlatform}
                                onChange={e => handleFilterChange('adsPlatform', e.target.value)}
                            >
                                <option value="all">Tất cả</option>
                                {Object.entries(adsPlatformLabels).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button variant="secondary" onClick={resetFilters}>Xóa bộ lọc</Button>
                    </div>
                </CardContent>
            </Card>


            {activeTab === 'report' && (
                <Card>
                    <CardContent>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Tên dự án</TableHeader>
                                    <TableHeader>Hạng mục</TableHeader>
                                    <TableHeader>Ngách</TableHeader>
                                    <TableHeader>Nền tảng Ads</TableHeader>
                                    <TableHeader>Tài sản</TableHeader>
                                    <TableHeader>Loại</TableHeader>
                                    <TableHeader>Trạng thái</TableHeader>
                                    <TableHeader>Doanh thu</TableHeader>
                                    <TableHeader>Chi phí</TableHeader>
                                    <TableHeader>Lợi nhuận</TableHeader>
                                    <TableHeader>ROI</TableHeader>
                                    {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {projectStats.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium text-white">
                                            <div className="flex items-center justify-center">
                                            {p.isPartnership && <span className="mr-2"><Users /></span>}
                                            <span>{p.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{p.categoryName}</TableCell>
                                        <TableCell>{p.nicheName}</TableCell>
                                        <TableCell>{p.adsPlatforms.map(platform => adsPlatformLabels[platform]).join(', ')}</TableCell>
                                        <TableCell>{p.assetName}</TableCell>
                                        <TableCell>{projectTypeLabels[p.projectType]}</TableCell>
                                        <TableCell>
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === 'running' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                                                {projectStatusLabels[p.status]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-primary-400">{formatCurrency(p.totalCommission)}</TableCell>
                                        <TableCell className="text-red-400">{formatCurrency(p.totalCost)}</TableCell>
                                        <TableCell className={`font-semibold ${p.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(p.profit)}</TableCell>
                                        <TableCell className={`font-semibold ${p.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercentage(p.roi)}</TableCell>
                                        {!isReadOnly && (
                                            <TableCell>
                                                <div className="flex items-center space-x-3 justify-center">
                                                    <button onClick={() => { setEditingProject(p); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                    <button onClick={() => handleDeleteClick(p)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                            <tfoot className="border-t-2 border-gray-700">
                                <TableRow className="font-bold bg-gray-800/50 hover:bg-gray-800/50">
                                    <TableCell className="text-white text-left pl-6">Tổng cộng</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-primary-400">{formatCurrency(totals.totalCommission)}</TableCell>
                                    <TableCell className="text-red-400">{formatCurrency(totals.totalCost)}</TableCell>
                                    <TableCell className={`${totals.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(totals.totalProfit)}</TableCell>
                                    <TableCell className={`${totals.totalRoi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercentage(totals.totalRoi)}</TableCell>
                                    {!isReadOnly && <TableCell></TableCell>}
                                </TableRow>
                            </tfoot>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'trends' && (
                <Card>
                    <CardContent style={{ height: '60vh' }}>
                         {dailyChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke="#94a3b8" 
                                        // FIX: The 'tick' parameter from recharts is of type 'any' which is not assignable to the 'string' expected by 'formatDate'.
                                        // Casting 'tick' to a string resolves the type mismatch.
                                        tickFormatter={(tick) => formatDate(String(tick)).substring(0, 5)}
                                    />
                                    <YAxis 
                                        stroke="#94a3b8" 
                                        tickFormatter={yAxisTickFormatter} 
                                        width={80}
                                    />
                                    <Tooltip content={<CustomChartTooltip />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="cost" name="Chi phí" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                Không có dữ liệu để hiển thị với bộ lọc hiện tại.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {!isReadOnly && (
                <>
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? 'Sửa dự án' : 'Thêm dự án mới'}>
                        <ProjectForm
                            project={editingProject}
                            onSave={handleSave}
                            onCancel={() => { setIsModalOpen(false); setEditingProject(undefined); }}
                        />
                    </Modal>
                    
                    <ConfirmationModal
                        isOpen={isConfirmModalOpen}
                        onClose={() => setIsConfirmModalOpen(false)}
                        onConfirm={handleConfirmDelete}
                        title="Xác nhận xóa dự án"
                        message={`Bạn có chắc chắn muốn xóa dự án "${projectToDelete?.name}" không? Hành động này sẽ xóa tất cả chi phí và hoa hồng liên quan và không thể hoàn tác.`}
                    />
                </>
            )}
        </>
    );
    //tét
}