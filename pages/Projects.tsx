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
        setIsSuggestionBoxOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isPartnership && totalShare !== 100) {
            alert('Tổng tỷ lệ phân chia phải bằng 100%.');
            return;
        }

        const projectData = {
            name,
            adsPlatforms,
            projectType,
            status,
            isPartnership,
            partnerShares: isPartnership ? shares.filter(s => s.sharePercentage > 0) : [],
            categoryId: categoryId || undefined,
            nicheId: nicheId || undefined,
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

            <div className="border-t border-gray-700 pt-4">
                <button type="button" onClick={() => setIsPartnership(!isPartnership)} className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${isPartnership ? 'bg-primary-600/20 text-primary-300 ring-1 ring-primary-500' : 'text-gray-400 hover:bg-gray-700/50'}`}>
                    <Users />
                    <span>Dự án hợp tác</span>
                </button>
            </div>
            
            {isPartnership && (
                 <div className="border-t border-gray-700 pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                         <div className="flex items-center gap-3">
                             <h4 className="font-semibold text-white">Phân chia lợi nhuận</h4>
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
                         return (
                            <div key={share.partnerId} className="flex items-center gap-4">
                                <Label htmlFor={`share-${share.partnerId}`} className="flex-1 mb-0">{partner.name}</Label>
                                <div className="relative w-32">
                                    <NumberInput id={`share-${share.partnerId}`} value={share.sharePercentage} onValueChange={val => handleShareChange(share.partnerId, val)} className="pr-8" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">%</span>
                                </div>
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

export default function Projects() {
    const { projects, addProject, updateProject, deleteProject, currentPeriod, isReadOnly, commissions, enrichedDailyAdCosts, miscellaneousExpenses } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<T.Project | undefined>(undefined);
    const [projectToDelete, setProjectToDelete] = useState<T.Project | null>(null);

    const enrichedProjects = useMemo(() => {
        const projectsForPeriod = projects.filter(p => isDateInPeriod(p.period, currentPeriod));
    
        return projectsForPeriod.map(p => {
          const revenue = commissions
            .filter(c => c.projectId === p.id)
            .reduce((sum, c) => sum + c.vndAmount, 0);
          
          const adCost = enrichedDailyAdCosts
            .filter(c => c.projectId === p.id)
            .reduce((sum, c) => sum + c.vndCost, 0);
          
          const miscCost = miscellaneousExpenses
            .filter(e => e.projectId === p.id)
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
      }, [projects, commissions, enrichedDailyAdCosts, miscellaneousExpenses, currentPeriod]);

    const handleSave = (project: Omit<T.Project, 'id' | 'period'> | T.Project) => {
        if ('id' in project && project.id) {
            updateProject(project as T.Project);
        } else {
            addProject(project as Omit<T.Project, 'id' | 'period'>);
        }
        setIsModalOpen(false);
        setEditingProject(undefined);
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

    return (
        <>
            <Header title="Dự án">
                {!isReadOnly && (
                    <Button onClick={() => { setEditingProject(undefined); setIsModalOpen(true); }}>
                        <span className="flex items-center gap-2"><Plus /> Thêm dự án</span>
                    </Button>
                )}
            </Header>

            <Card>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Tên dự án</TableHeader>
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
                                    <TableCell className="font-medium text-white">{p.name} {p.isPartnership && <Users className="inline-block ml-2 text-primary-400" width={16} height={16} />}</TableCell>
                                    <TableCell>{p.adsPlatforms.map(ap => adsPlatformLabels[ap]).join(', ')}</TableCell>
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
                                                <button onClick={() => { setEditingProject(p); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                <button onClick={() => handleDeleteClick(p)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

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