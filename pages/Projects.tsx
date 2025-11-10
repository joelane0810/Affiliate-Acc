import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import * as T from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Plus, Edit, Trash2, Users, X, ChevronDown } from '../components/icons/IconComponents';
import { formatCurrency, isDateInPeriod, formatPercentage, formatDate, formatVietnameseCurrencyShorthand } from '../lib/utils';
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

const permissionLevelLabels: Record<T.PermissionLevel, string> = {
    view: 'Chỉ xem',
    edit: 'Chỉnh sửa',
    full: 'Toàn quyền',
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


const ProjectForm: React.FC<{ project?: T.Project; onSave: (project: Omit<T.Project, 'id' | 'period' | 'workspaceId'> | T.Project) => void; onCancel: () => void; }> = ({ project, onSave, onCancel }) => {
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
    const [affiliateUrls, setAffiliateUrls] = useState<T.AffiliateUrl[]>(project?.affiliateUrls || []);

    const [suggestions, setSuggestions] = useState<{ name: string; categoryId?: string; nicheId?: string; affiliateUrls?: T.AffiliateUrl[] }[]>([]);
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
                    newShares.push({ partnerId: p.id, sharePercentage: 0, permission: 'view' });
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

    const handlePermissionChange = (partnerId: string, permission: T.PermissionLevel) => {
        setShares(currentShares =>
            currentShares.map(s => (s.partnerId === partnerId ? { ...s, permission } : s))
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

    const handleSuggestionClick = (suggestion: { name: string; categoryId?: string; nicheId?: string; affiliateUrls?: T.AffiliateUrl[] }) => {
        setName(suggestion.name);
        setCategoryId(suggestion.categoryId || '');
        setNicheId(suggestion.nicheId || '');
        setAffiliateUrls(suggestion.affiliateUrls || []);
        setIsSuggestionBoxOpen(false);
    };
    
    const handleAddUrl = () => {
        setAffiliateUrls(prev => [...prev, { name: '', url: '' }]);
    };

    const handleUrlChange = (index: number, field: 'name' | 'url', value: string) => {
        setAffiliateUrls(prev => {
            const newUrls = [...prev];
            newUrls[index] = { ...newUrls[index], [field]: value };
            return newUrls;
        });
    };

    const handleRemoveUrl = (index: number) => {
        setAffiliateUrls(prev => prev.filter((_, i) => i !== index));
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isPartnership && totalShare !== 100) {
            alert('Tổng tỷ lệ phân chia phải bằng 100%.');
            return;
        }

        const finalShares = isPartnership 
            ? shares.map(s => 
                s.partnerId === 'default-me' 
                    ? { ...s, permission: 'full' as T.PermissionLevel } 
                    : s
              ).filter(s => s.sharePercentage > 0)
            : [];

        const projectData = {
            name,
            adsPlatforms,
            projectType,
            status,
            isPartnership,
            partnerShares: finalShares,
            categoryId: categoryId || undefined,
            nicheId: nicheId || undefined,
            affiliateUrls,
        };

        if (project) {
            onSave({ ...project, ...projectData });
        } else {
            onSave(projectData);
        }
    };

    const handleAddNewPartner = async (name: string) => {
        await addPartner({ name });
        setIsAddPartnerModalOpen(false);
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
    
    return (
        <>
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form fields */}
            <div>
                <Label htmlFor="projectName">Tên dự án</Label>
                <div className="relative">
                    <Input id="projectName" value={name} onChange={handleNameChange} required onFocus={handleNameChange} onBlur={() => setTimeout(() => setIsSuggestionBoxOpen(false), 200)} />
                    {isSuggestionBoxOpen && (
                        <ul className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-md mt-1 max-h-40 overflow-y-auto">
                            {suggestions.map(s => (
                                <li key={s.name} onMouseDown={() => handleSuggestionClick(s)} className="px-3 py-2 hover:bg-gray-700 cursor-pointer">{s.name}</li>
                            ))}
                        </ul>
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
                    <select id="niche" value={nicheId} onChange={e => setNicheId(e.target.value)} className={selectClassName} disabled={!categoryId}>
                        <option value="">-- Không có --</option>
                        {availableNiches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <Label>Nền tảng Ads</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    {Object.entries(adsPlatformLabels).map(([key, label]) => (
                        <label key={key} className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={adsPlatforms.includes(key as T.AdsPlatform)} onChange={(e) => handlePlatformChange(key as T.AdsPlatform, e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500"/>
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="projectType">Loại dự án</Label>
                    <select id="projectType" value={projectType} onChange={e => setProjectType(e.target.value as T.ProjectType)} className={selectClassName}>
                        {Object.entries(projectTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
                <div>
                    <Label htmlFor="projectStatus">Trạng thái</Label>
                    <select id="projectStatus" value={status} onChange={e => setStatus(e.target.value as T.ProjectStatus)} className={selectClassName}>
                        {Object.entries(projectStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="border-t border-gray-700 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-white">Affiliate Links</h4>
                    <Button type="button" size="sm" variant="secondary" onClick={handleAddUrl}>
                        <span className="flex items-center gap-1"><Plus width={14} height={14} /> Thêm Link</span>
                    </Button>
                </div>
                {affiliateUrls.map((url, index) => (
                    <div key={index} className="flex items-end gap-2 p-2 bg-gray-900/50 rounded-md">
                        <div className="flex-1">
                            <Label htmlFor={`url-name-${index}`} className="text-xs">Tên Link</Label>
                            <Input id={`url-name-${index}`} value={url.name} onChange={e => handleUrlChange(index, 'name', e.target.value)} placeholder="VD: Tài khoản ClickBank 1" />
                        </div>
                        <div className="flex-1">
                            <Label htmlFor={`url-url-${index}`} className="text-xs">URL</Label>
                            <Input id={`url-url-${index}`} value={url.url} onChange={e => handleUrlChange(index, 'url', e.target.value)} placeholder="https://..." />
                        </div>
                        <Button type="button" variant="danger" size="sm" className="!p-2" onClick={() => handleRemoveUrl(index)}>
                            <Trash2 />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="border-t border-gray-700 pt-4">
                <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-700/50 w-fit">
                    <input 
                        type="checkbox" 
                        checked={isPartnership} 
                        onChange={e => setIsPartnership(e.target.checked)}
                        className="h-5 w-5 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                    />
                    <div className="flex items-center gap-2 text-gray-300">
                        <Users />
                        <span className="font-medium">Dự án hợp tác</span>
                    </div>
                </label>
            </div>
            
            {isPartnership && (
                 <div className="border-t border-gray-700 pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                         <div className="flex items-center gap-3">
                             <h4 className="font-semibold text-white">Phân chia & Phân quyền</h4>
                             <Button type="button" variant="secondary" onClick={() => setIsAddPartnerModalOpen(true)} className="!py-1 !px-2 !text-xs">
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
                         const isMe = share.partnerId === 'default-me';
                         return (
                            <div key={share.partnerId} className="flex items-center gap-2">
                                <Label htmlFor={`share-${share.partnerId}`} className="w-1/3 mb-0">{partner.name}</Label>
                                <div className="relative w-1/4">
                                    <NumberInput id={`share-${share.partnerId}`} value={share.sharePercentage} onValueChange={val => handleShareChange(share.partnerId, val)} className="pr-8" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">%</span>
                                </div>
                                {isMe ? (
                                    <div className={`${selectClassName} flex-grow bg-gray-800 flex items-center px-3`}>
                                        <span className="text-gray-400">{permissionLevelLabels['full']}</span>
                                    </div>
                                ) : (
                                    <select
                                        value={share.permission || 'view'}
                                        onChange={(e) => handlePermissionChange(share.partnerId, e.target.value as T.PermissionLevel)}
                                        className={`${selectClassName} flex-grow`}
                                    >
                                        {Object.entries(permissionLevelLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                         )
                    })}
                 </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
        <AddPartnerModal isOpen={isAddPartnerModalOpen} onClose={() => setIsAddPartnerModalOpen(false)} onSave={handleAddNewPartner} />
        </>
    );
};

const ProjectFilters: React.FC<{
    projectsForPeriod: T.Project[];
    selectedProjectIds: string[];
    onProjectSelectionChange: (ids: string[]) => void;
    dateRange: { start: string; end: string };
    onDateRangeChange: (range: { start: string; end: string }) => void;
}> = ({ projectsForPeriod, selectedProjectIds, onProjectSelectionChange, dateRange, onDateRangeChange }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleProjectSelection = (projectId: string) => {
        const newSet = new Set(selectedProjectIds);
        if (newSet.has(projectId)) {
            newSet.delete(projectId);
        } else {
            newSet.add(projectId);
        }
        onProjectSelectionChange(Array.from(newSet));
    };
    
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            onProjectSelectionChange(projectsForPeriod.map(p => p.id));
        } else {
            onProjectSelectionChange([]);
        }
    };
    
    const areAllSelected = projectsForPeriod.length > 0 && selectedProjectIds.length === projectsForPeriod.length;
    const isIndeterminate = selectedProjectIds.length > 0 && selectedProjectIds.length < projectsForPeriod.length;
    const selectAllRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = isIndeterminate;
        }
    }, [isIndeterminate]);

    return (
        <Card className="mb-6">
            <CardContent className="flex flex-wrap items-center gap-4">
                <div ref={dropdownRef} className="relative">
                    <Button variant="secondary" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2">
                        {selectedProjectIds.length === projectsForPeriod.length ? 'Tất cả dự án' : `${selectedProjectIds.length} dự án được chọn`}
                        <ChevronDown />
                    </Button>
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 p-2 max-h-60 overflow-y-auto">
                            <div className="flex items-center p-2 hover:bg-gray-700 rounded-md">
                                <input ref={selectAllRef} type="checkbox" id="all-projects-filter" checked={areAllSelected} onChange={(e) => handleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500" />
                                <label htmlFor="all-projects-filter" className="ml-2 text-white font-semibold">Tất cả dự án</label>
                            </div>
                            <div className="border-t border-gray-700 my-1"></div>
                            {projectsForPeriod.map(p => (
                                 <div key={p.id} className="flex items-center p-2 hover:bg-gray-700 rounded-md">
                                    <input type="checkbox" id={`proj-filter-${p.id}`} checked={selectedProjectIds.includes(p.id)} onChange={() => handleProjectSelection(p.id)}  className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500"/>
                                    <label htmlFor={`proj-filter-${p.id}`} className="ml-2 text-gray-300 truncate">{p.name}</label>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                 <div className="flex items-center gap-2">
                    <Label htmlFor="startDate" className="mb-0 whitespace-nowrap">Từ ngày:</Label>
                    <Input id="startDate" type="date" value={dateRange.start} onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value })} className="w-40"/>
                </div>
                 <div className="flex items-center gap-2">
                    <Label htmlFor="endDate" className="mb-0 whitespace-nowrap">Đến ngày:</Label>
                    <Input id="endDate" type="date" value={dateRange.end} onChange={e => onDateRangeChange({ ...dateRange, end: e.target.value })} className="w-40"/>
                </div>
            </CardContent>
        </Card>
    );
};

const ProjectListContent: React.FC<{ 
    enrichedProjects: any[];
    partnerNameMap: Map<string, string>;
    onProjectClick: (project: T.Project) => void;
    onEditClick: (project: T.Project) => void; 
    onDeleteClick: (project: T.Project) => void;
    isReadOnly: boolean;
}> = ({ enrichedProjects, partnerNameMap, onProjectClick, onEditClick, onDeleteClick, isReadOnly }) => {
    
    const totals = useMemo(() => {
        return enrichedProjects.reduce((acc, p) => {
            acc.revenue += p.revenue;
            acc.cost += p.cost;
            acc.profit += p.profit;
            return acc;
        }, { revenue: 0, cost: 0, profit: 0 });
    }, [enrichedProjects]);

    return (
         <Card>
            <CardContent>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader>Tên dự án</TableHeader>
                            <TableHeader>Sở hữu</TableHeader>
                            <TableHeader>Nền tảng</TableHeader>
                            <TableHeader>Loại</TableHeader>
                            <TableHeader>Trạng thái</TableHeader>
                            <TableHeader>Doanh thu</TableHeader>
                            <TableHeader>Chi phí</TableHeader>
                            <TableHeader>Lợi nhuận</TableHeader>
                            {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {enrichedProjects.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium text-white">
                                    <button 
                                        onClick={() => onProjectClick(p)} 
                                        className="text-left hover:text-primary-400 hover:underline disabled:no-underline disabled:text-white disabled:cursor-default"
                                        disabled={!p.affiliateUrls || p.affiliateUrls.length === 0}
                                    >
                                        {p.name}
                                    </button>
                                    {p.isPartnership && <Users className="inline-block ml-2 text-primary-400" width={16} height={16} />}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {p.isPartnership && p.partnerShares && p.partnerShares.length > 0
                                        ? p.partnerShares.map((s: T.PartnerShare) => partnerNameMap.get(s.partnerId) || 'N/A').filter(Boolean).join(', ')
                                        : 'Tôi'}
                                </TableCell>
                                <TableCell>{p.adsPlatforms.map((ap: T.AdsPlatform) => adsPlatformLabels[ap]).join(', ')}</TableCell>
                                <TableCell>{projectTypeLabels[p.projectType]}</TableCell>
                                <TableCell>
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === 'running' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                                        {projectStatusLabels[p.status]}
                                    </span>
                                </TableCell>
                                <TableCell className="text-primary-400">{formatCurrency(p.revenue)}</TableCell>
                                <TableCell className="text-red-400">{formatCurrency(p.cost)}</TableCell>
                                <TableCell className={`font-bold ${p.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(p.profit)}
                                </TableCell>
                                {!isReadOnly && (
                                    <TableCell>
                                        <div className="flex items-center space-x-3 justify-center">
                                            <button onClick={() => onEditClick(p)} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                            <button onClick={() => onDeleteClick(p)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                    <tfoot className="border-t-2 border-gray-700 bg-gray-800">
                        <TableRow className="hover:bg-gray-800">
                            <TableHeader colSpan={5} className="text-center !font-bold text-base text-white">Tổng cộng</TableHeader>
                            <TableCell className="font-bold text-primary-400">{formatCurrency(totals.revenue)}</TableCell>
                            <TableCell className="font-bold text-red-400">{formatCurrency(totals.cost)}</TableCell>
                            <TableCell className={`font-bold ${totals.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(totals.profit)}</TableCell>
                            {!isReadOnly && <TableCell></TableCell>}
                        </TableRow>
                    </tfoot>
                </Table>
            </CardContent>
        </Card>
    );
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-700 p-2 border border-gray-600 rounded">
        <p className="label text-white font-bold">{label}</p>
        {payload.map((pld, index) => (
            <p key={index} style={{ color: pld.color }}>
                {`${pld.name}: ${formatCurrency(pld.value as number)}`}
            </p>
        ))}
      </div>
    );
  }
  return null;
};

const getWeekOfYear = (dateString: string): string => {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    // January 4 is always in week 1.
    const week1 = new Date(date.getFullYear(), 0, 4);
    // Adjust to Thursday in week 1 and count number of weeks from date to week1.
    const weekNumber = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

const ProjectTrendsContent = () => {
    const { projects, commissions, enrichedDailyAdCosts, miscellaneousExpenses, currentPeriod } = useData();
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [timeGranularity, setTimeGranularity] = useState<'daily' | 'weekly'>('daily');
    const [visibleMetrics, setVisibleMetrics] = useState(new Set(['revenue', 'cost', 'profit']));

    const projectsForPeriod = useMemo(() => projects.filter(p => p.period === currentPeriod), [projects, currentPeriod]);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const chartData = useMemo(() => {
        if (!currentPeriod) return [];

        const projectIdsToFilter = selectedProjectIds.length > 0 ? new Set(selectedProjectIds) : new Set(projectsForPeriod.map(p => p.id));
        
        const dataMap = new Map<string, { revenue: number, cost: number }>();

        const getKey = (date: string) => timeGranularity === 'daily' ? date : getWeekOfYear(date);

        commissions.forEach(c => {
            if (isDateInPeriod(c.date, currentPeriod) && projectIdsToFilter.has(c.projectId)) {
                const key = getKey(c.date);
                const entry = dataMap.get(key) || { revenue: 0, cost: 0 };
                entry.revenue += c.vndAmount;
                dataMap.set(key, entry);
            }
        });

        enrichedDailyAdCosts.forEach(c => {
            if (isDateInPeriod(c.date, currentPeriod) && projectIdsToFilter.has(c.projectId)) {
                const key = getKey(c.date);
                const entry = dataMap.get(key) || { revenue: 0, cost: 0 };
                entry.cost += c.vndCost;
                dataMap.set(key, entry);
            }
        });

        miscellaneousExpenses.forEach(e => {
            if (e.projectId && isDateInPeriod(e.date, currentPeriod) && projectIdsToFilter.has(e.projectId)) {
                const key = getKey(e.date);
                const entry = dataMap.get(key) || { revenue: 0, cost: 0 };
                entry.cost += e.vndAmount;
                dataMap.set(key, entry);
            }
        });
        
        return Array.from(dataMap.entries())
            .map(([key, values]) => ({
                date: key,
                revenue: values.revenue,
                cost: values.cost,
                profit: values.revenue - values.cost,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

    }, [currentPeriod, selectedProjectIds, timeGranularity, projectsForPeriod, commissions, enrichedDailyAdCosts, miscellaneousExpenses]);

    const handleProjectSelection = (projectId: string) => {
        setSelectedProjectIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(projectId)) {
                newSet.delete(projectId);
            } else {
                newSet.add(projectId);
            }
            return Array.from(newSet);
        });
    };
    
    const handleMetricToggle = (metric: 'revenue' | 'cost' | 'profit') => {
        setVisibleMetrics(prev => {
            const newSet = new Set(prev);
            if(newSet.has(metric)) {
                newSet.delete(metric);
            } else {
                newSet.add(metric);
            }
            return newSet;
        })
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-6">
                        <div ref={dropdownRef} className="relative">
                            <Button variant="secondary" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2">
                                {selectedProjectIds.length === 0 ? 'Tất cả dự án' : `${selectedProjectIds.length} dự án được chọn`}
                                <ChevronDown />
                            </Button>
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 p-2 max-h-60 overflow-y-auto">
                                    <div className="flex items-center p-2 hover:bg-gray-700 rounded-md">
                                        <input type="checkbox" id="all-projects" checked={selectedProjectIds.length === 0} onChange={() => setSelectedProjectIds([])} className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500" />
                                        <label htmlFor="all-projects" className="ml-2 text-white font-semibold">Tất cả dự án</label>
                                    </div>
                                    <div className="border-t border-gray-700 my-1"></div>
                                    {projectsForPeriod.map(p => (
                                         <div key={p.id} className="flex items-center p-2 hover:bg-gray-700 rounded-md">
                                            <input type="checkbox" id={`proj-${p.id}`} checked={selectedProjectIds.includes(p.id)} onChange={() => handleProjectSelection(p.id)}  className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500"/>
                                            <label htmlFor={`proj-${p.id}`} className="ml-2 text-gray-300 truncate">{p.name}</label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center bg-gray-700/50 rounded-md p-1">
                            <Button variant={timeGranularity === 'daily' ? 'secondary' : 'primary'} size="sm" onClick={() => setTimeGranularity('daily')} className={timeGranularity === 'daily' ? '!bg-primary-600' : '!bg-transparent'}>Theo ngày</Button>
                            <Button variant={timeGranularity === 'weekly' ? 'secondary' : 'primary'} size="sm" onClick={() => setTimeGranularity('weekly')} className={timeGranularity === 'weekly' ? '!bg-primary-600' : '!bg-transparent'}>Theo tuần</Button>
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        {['revenue', 'cost', 'profit'].map(metric => (
                             <label key={metric} className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={visibleMetrics.has(metric as any)} onChange={() => handleMetricToggle(metric as any)} className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500" />
                                <span className="capitalize">{metric === 'revenue' ? 'Doanh thu' : metric === 'cost' ? 'Chi phí' : 'Lợi nhuận'}</span>
                            </label>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                            <XAxis dataKey="date" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" tickFormatter={(tick) => formatVietnameseCurrencyShorthand(tick)} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {visibleMetrics.has('revenue') && <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />}
                            {visibleMetrics.has('cost') && <Line type="monotone" dataKey="cost" name="Chi phí" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />}
                            {visibleMetrics.has('profit') && <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />}
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}

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

const UrlListModal: React.FC<{
    project: T.Project | null;
    onClose: () => void;
}> = ({ project, onClose }) => {
    if (!project || !project.affiliateUrls || project.affiliateUrls.length === 0) {
        return null;
    }

    const handleUrlClick = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
        onClose();
    };
    
    return (
        <Modal isOpen={!!project} onClose={onClose} title={`Affiliate Links cho: ${project.name}`}>
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {project.affiliateUrls.map((link, index) => (
                    <button
                        key={index}
                        onClick={() => handleUrlClick(link.url)}
                        className="w-full text-left p-3 bg-gray-900 hover:bg-gray-700 rounded-md transition-colors"
                    >
                        <span className="font-semibold text-primary-400">{link.name}</span>
                        <p className="text-sm text-gray-500 truncate">{link.url}</p>
                    </button>
                ))}
            </div>
        </Modal>
    );
};


export default function Projects() {
    const { 
        isReadOnly, addProject, updateProject, deleteProject, currentPeriod, 
        projects, partners, commissions, enrichedDailyAdCosts, miscellaneousExpenses, partnerNameMap
    } = useData();
    const [activeTab, setActiveTab] = useState<'list' | 'trends'>('list');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<T.Project | undefined>(undefined);
    const [projectToDelete, setProjectToDelete] = useState<T.Project | null>(null);
    const [urlModalProject, setUrlModalProject] = useState<T.Project | null>(null);

    // Filter states
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endOfRange = new Date().toISOString().split('T')[0];
        return { start: startOfMonth, end: endOfRange };
    });

    const projectsForPeriod = useMemo(() => 
        projects.filter(p => p.period === currentPeriod),
    [projects, currentPeriod]);
    
    // Auto-select all projects when projects for period changes, or when currentPeriod changes
    useEffect(() => {
        setSelectedProjectIds(projectsForPeriod.map(p => p.id));
    }, [projectsForPeriod]);

    const filteredAndEnrichedProjects = useMemo(() => {
        const projectIdsToProcess = new Set(selectedProjectIds);
        const projectsToProcess = projectsForPeriod.filter(p => projectIdsToProcess.has(p.id));
        
        const isDateInRange = (date: string) => {
            return (!dateRange.start || date >= dateRange.start) && (!dateRange.end || date <= dateRange.end);
        };
    
        return projectsToProcess.map(p => {
          const revenue = commissions
            .filter(c => c.projectId === p.id && isDateInRange(c.date))
            .reduce((sum, c) => sum + c.vndAmount, 0);
          
          const adCost = enrichedDailyAdCosts
            .filter(c => c.projectId === p.id && isDateInRange(c.date))
            .reduce((sum, c) => sum + c.vndCost, 0);
          
          const miscCost = miscellaneousExpenses
            .filter(e => e.projectId === p.id && isDateInRange(e.date))
            .reduce((sum, e) => sum + e.vndAmount, 0);
          
          const totalCost = adCost + miscCost;
          const profit = revenue - totalCost;
    
          return {
            ...p,
            revenue,
            cost: totalCost,
            profit,
          };
        }).sort((a,b) => b.profit - a.profit);
      }, [
        projectsForPeriod, commissions, enrichedDailyAdCosts, miscellaneousExpenses, 
        selectedProjectIds, dateRange
      ]);

    const handleSave = (project: Omit<T.Project, 'id' | 'period' | 'workspaceId'> | T.Project) => {
        if ('id' in project && project.id) {
            updateProject(project as T.Project);
        } else {
            addProject(project as Omit<T.Project, 'id' | 'period' | 'workspaceId'>);
        }
        setIsModalOpen(false);
        setEditingProject(undefined);
    };

    const handleAddClick = () => {
        setEditingProject(undefined);
        setIsModalOpen(true);
    };
    
    const handleEditClick = (project: T.Project) => {
        setEditingProject(project);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (project: T.Project) => {
        setProjectToDelete(project);
    };

    const handleConfirmDelete = () => {
        if (projectToDelete) {
            deleteProject(projectToDelete.id);
            setProjectToDelete(null);
        }
    };
    
    const handleProjectClick = (project: T.Project) => {
        if (project.affiliateUrls && project.affiliateUrls.length > 0) {
            setUrlModalProject(project);
        }
    };

    return (
        <>
            <Header title="Dự án">
                {activeTab === 'list' && !isReadOnly && (
                    <Button onClick={handleAddClick} disabled={!currentPeriod}>
                        <span className="flex items-center gap-2"><Plus /> Thêm dự án</span>
                    </Button>
                )}
            </Header>

            <div className="flex flex-wrap border-b border-gray-700 mb-6" role="tablist">
                <TabButton active={activeTab === 'list'} onClick={() => setActiveTab('list')}>
                    Danh sách dự án
                </TabButton>
                <TabButton active={activeTab === 'trends'} onClick={() => setActiveTab('trends')}>
                    Xu hướng
                </TabButton>
            </div>
            
            {activeTab === 'list' && (
                <>
                    <ProjectFilters
                        projectsForPeriod={projectsForPeriod}
                        selectedProjectIds={selectedProjectIds}
                        onProjectSelectionChange={setSelectedProjectIds}
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                    />
                    <ProjectListContent 
                        enrichedProjects={filteredAndEnrichedProjects} 
                        partnerNameMap={partnerNameMap}
                        onProjectClick={handleProjectClick}
                        onEditClick={handleEditClick}
                        onDeleteClick={handleDeleteClick}
                        isReadOnly={isReadOnly}
                    />
                </>
            )}
            {activeTab === 'trends' && <ProjectTrendsContent />}
            
            {urlModalProject && (
                <UrlListModal
                    project={urlModalProject}
                    onClose={() => setUrlModalProject(null)}
                />
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
                        isOpen={!!projectToDelete}
                        onClose={() => setProjectToDelete(null)}
                        onConfirm={handleConfirmDelete}
                        title="Xác nhận xóa dự án"
                        message={`Bạn có chắc chắn muốn xóa dự án "${projectToDelete?.name}" không? Tất cả dữ liệu liên quan (chi phí, hoa hồng) cũng sẽ bị xóa.`}
                    />
                </>
            )}
        </>
    );
}