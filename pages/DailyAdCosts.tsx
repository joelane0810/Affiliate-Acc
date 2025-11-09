import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import type * as T from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Plus, Edit, Trash2, ArrowRightLeft } from '../components/icons/IconComponents';
import { formatCurrency, formatDate, isDateInPeriod } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

const adsPlatformLabels: Record<T.AdsPlatform, string> = {
    google: 'Google Ads',
    youtube: 'Youtube Ads',
    tiktok: 'Tiktok Ads',
    facebook: 'Facebook Ads',
    other: 'Other'
};

const adAccountStatusLabels: Record<T.AdAccount['status'], string> = {
    running: 'Đang chạy',
    stopped: 'Đã dừng',
    cancelled: 'Đã hủy'
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

const AdCostForm: React.FC<{
    cost?: T.DailyAdCost;
    projectsForPeriod: T.Project[];
    adAccounts: T.AdAccount[];
    onSave: (cost: Omit<T.DailyAdCost, 'id'> | T.DailyAdCost) => void;
    onCancel: () => void;
}> = ({ cost, projectsForPeriod, adAccounts, onSave, onCancel }) => {
    const { currentPeriod } = useData();
    const [projectId, setProjectId] = useState(cost?.projectId || (projectsForPeriod[0]?.id || ''));
    const [adAccountNumber, setAdAccountNumber] = useState(cost?.adAccountNumber || '');
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(cost?.date || defaultDate);
    const [amount, setAmount] = useState(cost?.amount || 0);
    const [vatRate, setVatRate] = useState(cost?.vatRate || 0);

    const availableAdAccounts = useMemo(() => {
        if (!projectId) return adAccounts;
        const selectedProject = projectsForPeriod.find(p => p.id === projectId);
        if (!selectedProject) return adAccounts;
        
        return adAccounts.filter(acc => selectedProject.adsPlatforms.includes(acc.adsPlatform));
    }, [projectId, projectsForPeriod, adAccounts]);

    useEffect(() => {
        if (projectId) {
            const accounts = availableAdAccounts.map(a => a.accountNumber);
            if (!accounts.includes(adAccountNumber)) {
                setAdAccountNumber(accounts[0] || '');
            }
        } else {
            setAdAccountNumber('');
        }
    }, [projectId, availableAdAccounts]);

    const selectedAccountStatus = useMemo(() => {
        return availableAdAccounts.find(acc => acc.accountNumber === adAccountNumber)?.status;
    }, [adAccountNumber, availableAdAccounts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !adAccountNumber) {
            alert("Vui lòng chọn dự án và tài khoản Ads.");
            return;
        }
        
        onSave({ ...cost, id: cost?.id || '', projectId, adAccountNumber, date, amount, vatRate });
    };
    
    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="project">Dự án</Label>
                    <select id="project" value={projectId} onChange={e => setProjectId(e.target.value)} className={selectClassName} required>
                        <option value="" disabled>-- Chọn dự án --</option>
                        {projectsForPeriod.map(p => <option key={p.id} value={p.id}>{p.name} ({p.adsPlatforms.map(ap => adsPlatformLabels[ap]).join('/')})</option>)}
                    </select>
                </div>
                <div>
                    <Label htmlFor="adAccount">Tài khoản Ads</Label>
                    <div className="flex items-center space-x-2">
                        <select 
                            id="adAccount" 
                            value={adAccountNumber} 
                            onChange={e => setAdAccountNumber(e.target.value)} 
                            className="flex-grow px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required
                            disabled={!projectId}
                        >
                            <option value="" disabled>-- Chọn tài khoản --</option>
                            {availableAdAccounts.map(acc => {
                                let statusText = '';
                                if (acc.status === 'stopped') statusText = ' (Đã dừng)';
                                if (acc.status === 'cancelled') statusText = ' (Đã hủy)';
                                return <option key={acc.id} value={acc.accountNumber}>{acc.accountNumber}{statusText}</option>
                            })}
                        </select>
                        <div className="flex-shrink-0 w-24 text-center">
                            {selectedAccountStatus === 'stopped' && <span className="text-yellow-400 text-sm font-semibold">Đã dừng</span>}
                            {selectedAccountStatus === 'cancelled' && <span className="text-red-400 text-sm font-semibold">Đã hủy</span>}
                        </div>
                    </div>
                    {projectId && availableAdAccounts.length === 0 && (
                        <p className="text-xs text-yellow-400 mt-1">Không có tài khoản Ads nào phù hợp với nền tảng của dự án này.</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="date">Ngày</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="amountUSD">Số tiền chi tiêu (USD)</Label>
                    <NumberInput id="amountUSD" value={amount} onValueChange={setAmount} required />
                </div>
                <div>
                    <Label htmlFor="vatRate">VAT (%)</Label>
                    <NumberInput id="vatRate" value={vatRate} onValueChange={setVatRate} />
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

const AdCostsContent = () => {
    const { projects, partners, adAccounts, enrichedDailyAdCosts, addDailyAdCost, updateDailyAdCost, deleteDailyAdCost, currentPeriod, isReadOnly } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<T.DailyAdCost | undefined>(undefined);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [costToDeleteId, setCostToDeleteId] = useState<string | null>(null);

    const projectsForPeriod = useMemo(() =>
        projects.filter(p => p.period === currentPeriod),
    [projects, currentPeriod]);

    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
    const partnerMap = useMemo(() => new Map(partners.map(p => [p.id, p.name])), [partners]);

    const enrichedCostsForPeriod = useMemo(() => {
        return enrichedDailyAdCosts
            .filter(c => isDateInPeriod(c.date, currentPeriod))
            .map(c => ({
                ...c,
                projectName: projectMap.get(c.projectId)?.name || 'N/A',
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [enrichedDailyAdCosts, projectMap, currentPeriod]);

    const handleSave = (cost: Omit<T.DailyAdCost, 'id'> | T.DailyAdCost) => {
        if ('id' in cost && cost.id) {
            updateDailyAdCost(cost as T.DailyAdCost);
        } else {
            const { id, ...newCost } = cost as T.DailyAdCost;
            addDailyAdCost(newCost);
        }
        setIsModalOpen(false);
        setEditingCost(undefined);
    };
    
    const handleDeleteClick = (costId: string) => {
        setCostToDeleteId(costId);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (costToDeleteId) {
            deleteDailyAdCost(costToDeleteId);
            setIsConfirmModalOpen(false);
            setCostToDeleteId(null);
        }
    };

    return (
        <>
            <Header title="Chi phí Ads hàng ngày">
                {!isReadOnly && (
                    <Button onClick={() => { setEditingCost(undefined); setIsModalOpen(true); }} disabled={projectsForPeriod.length === 0}>
                        <span className="flex items-center gap-2"><Plus /> Thêm chi phí</span>
                    </Button>
                )}
            </Header>
            {projects.length === 0 && currentPeriod ? (
                <Card>
                    <CardContent>
                        <p className="text-center text-gray-400">Vui lòng tạo ít nhất một dự án trước khi thêm chi phí.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Ngày</TableHeader>
                                    <TableHeader>Dự án</TableHeader>
                                    <TableHeader>Sở hữu</TableHeader>
                                    <TableHeader>Tài khoản Ads</TableHeader>
                                    <TableHeader>Chi phí (USD)</TableHeader>
                                    <TableHeader>Tỷ giá (hiệu lực)</TableHeader>
                                    <TableHeader>Thành tiền (VND)</TableHeader>
                                    <TableHeader>VAT</TableHeader>
                                    {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {enrichedCostsForPeriod.map(cost => {
                                    const project = projectMap.get(cost.projectId);
                                    return (
                                    <TableRow key={cost.id}>
                                        <TableCell>{formatDate(cost.date)}</TableCell>
                                        <TableCell className="font-medium text-white">{cost.projectName}</TableCell>
                                        <TableCell className="text-xs">
                                            {project?.isPartnership && project.partnerShares && project.partnerShares.length > 0
                                                ? project.partnerShares.map(s => partnerMap.get(s.partnerId)).filter(Boolean).join(', ')
                                                : 'Tôi'}
                                        </TableCell>
                                        <TableCell>{cost.adAccountNumber}</TableCell>
                                        <TableCell>{formatCurrency(cost.amount, 'USD')}</TableCell>
                                        <TableCell>{cost.effectiveRate ? cost.effectiveRate.toLocaleString('vi-VN') : '—'}</TableCell>
                                        <TableCell className="text-red-400 font-semibold">{formatCurrency(cost.vndCost)}</TableCell>
                                        <TableCell className="text-yellow-400">{formatCurrency(cost.vndCost * (cost.vatRate || 0) / 100)}</TableCell>
                                        {!isReadOnly && (
                                            <TableCell>
                                                <div className="flex items-center space-x-3 justify-center">
                                                    <button onClick={() => { setEditingCost(cost); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                    <button onClick={() => handleDeleteClick(cost.id)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                )})}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
             {!isReadOnly && (
                <>
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCost ? 'Sửa chi phí' : 'Thêm chi phí mới'}>
                        <AdCostForm
                            cost={editingCost}
                            projectsForPeriod={projectsForPeriod}
                            adAccounts={adAccounts}
                            onSave={handleSave}
                            onCancel={() => { setIsModalOpen(false); setEditingCost(undefined); }}
                        />
                    </Modal>
                    <ConfirmationModal
                        isOpen={isConfirmModalOpen}
                        onClose={() => setIsConfirmModalOpen(false)}
                        onConfirm={handleConfirmDelete}
                        title="Xác nhận xóa chi phí"
                        message="Bạn có chắc chắn muốn xóa chi phí này không? Hành động này không thể hoàn tác."
                    />
                </>
            )}
        </>
    );
};


const AdDepositForm: React.FC<{
    deposit?: T.AdDeposit;
    assets: T.Asset[];
    assetTypes: T.AssetType[];
    projectsForPeriod: T.Project[];
    onSave: (deposit: (Omit<T.AdDeposit, 'id'> | T.AdDeposit) | (Omit<T.AdDeposit, 'id'>)[]) => void;
    onCancel: () => void;
    adAccounts: T.AdAccount[];
}> = ({ deposit, assets, assetTypes, projectsForPeriod, onSave, onCancel, adAccounts }) => {
    const { currentPeriod } = useData();
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(deposit?.date || defaultDate);
    const [adsPlatform, setAdsPlatform] = useState<T.AdsPlatform>(deposit?.adsPlatform || 'google');
    const [adAccountNumber, setAdAccountNumber] = useState(deposit?.adAccountNumber || '');
    const [projectId, setProjectId] = useState(deposit?.projectId || '');
    const [assetId, setAssetId] = useState(deposit?.assetId || '');
    const [usdAmount, setUsdAmount] = useState(deposit?.usdAmount || 0);
    const [rate, setRate] = useState(deposit?.rate || 0);
    const [status, setStatus] = useState<T.AdDeposit['status']>(deposit?.status || 'running');
    
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
    const [bulkProjectAssignments, setBulkProjectAssignments] = useState<Record<string, string>>({});

    const availableAdAccounts = useMemo(() => {
        // Filter out cancelled accounts first
        let accounts = adAccounts.filter(acc => acc.status !== 'cancelled');
        
        // In bulk mode, only filter by platform
        if (isBulkMode) {
            return accounts.filter(acc => acc.adsPlatform === adsPlatform);
        }
        // In single mode, filter by project if selected, otherwise by platform
        const selectedProject = projectId ? projectsForPeriod.find(p => p.id === projectId) : null;
        if (selectedProject) {
            accounts = accounts.filter(acc => selectedProject.adsPlatforms.includes(acc.adsPlatform));
        } else {
            accounts = accounts.filter(acc => acc.adsPlatform === adsPlatform);
        }
        return accounts;
    }, [adAccounts, adsPlatform, projectId, projectsForPeriod, isBulkMode]);

    useEffect(() => {
        if (adAccountNumber && !availableAdAccounts.some(acc => acc.accountNumber === adAccountNumber)) {
            setAdAccountNumber(availableAdAccounts[0]?.accountNumber || '');
        }
    }, [availableAdAccounts, adAccountNumber]);

    const handleAccountSelection = (accountNumber: string) => {
        setSelectedAccounts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accountNumber)) {
                newSet.delete(accountNumber);
            } else {
                newSet.add(accountNumber);
            }
            return newSet;
        });
    };

    const handleBulkProjectChange = (accountNumber: string, projectId: string) => {
        setBulkProjectAssignments(prev => ({
            ...prev,
            [accountNumber]: projectId,
        }));
    };
    
    const groupedVndAssets = useMemo(() => {
        const vndAssets = assets.filter(a => a.currency === 'VND');
        const grouped: { [typeId: string]: T.Asset[] } = {};

        for (const asset of vndAssets) {
            if (!grouped[asset.typeId]) {
                grouped[asset.typeId] = [];
            }
            grouped[asset.typeId].push(asset);
        }
        
        return assetTypes
            .map(assetType => ({
                type: assetType,
                assets: grouped[assetType.id] || []
            }))
            .filter(group => group.assets.length > 0);
    }, [assets, assetTypes]);


    const filteredProjects = useMemo(() => 
        projectsForPeriod.filter(p => p.adsPlatforms.includes(adsPlatform)),
    [projectsForPeriod, adsPlatform]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId) {
            alert("Vui lòng chọn tài sản chi trả.");
            return;
        }
        const vndAmount = usdAmount * rate;

        if (isBulkMode) {
            if (selectedAccounts.size === 0) {
                alert("Vui lòng chọn ít nhất một tài khoản Ads.");
                return;
            }
            const depositsToSave = Array.from(selectedAccounts).map(accNum => ({
                date, adsPlatform, adAccountNumber: accNum, projectId: bulkProjectAssignments[accNum] || undefined, assetId, usdAmount, rate, vndAmount, status
            }));
            onSave(depositsToSave);
        } else {
            if (!adAccountNumber) {
                alert("Vui lòng chọn tài khoản Ads.");
                return;
            }
            onSave({ ...deposit, id: deposit?.id || '', date, adsPlatform, adAccountNumber, projectId: projectId || undefined, assetId, usdAmount, rate, vndAmount, status });
        }
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {!deposit && (
                <div className="flex justify-end">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setIsBulkMode(!isBulkMode)}>
                        {isBulkMode ? 'Chuyển sang nạp một tài khoản' : 'Nạp nhiều tài khoản'}
                    </Button>
                </div>
            )}
            <div>
                <Label htmlFor="date">Ngày nạp</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="adsPlatform">Nền tảng Ads</Label>
                    <select id="adsPlatform" value={adsPlatform} onChange={e => {
                        setAdsPlatform(e.target.value as T.AdsPlatform);
                        setAdAccountNumber('');
                        setProjectId('');
                    }} className={selectClassName}>
                        {Object.entries(adsPlatformLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
                {!isBulkMode && (
                    <div>
                        <Label htmlFor="project">Dự án (Tùy chọn)</Label>
                        <select id="project" value={projectId} onChange={e => setProjectId(e.target.value)} className={selectClassName}>
                            <option value="">-- Không có --</option>
                            {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {isBulkMode ? (
                <div>
                    <Label>Chọn tài khoản và gán dự án ({selectedAccounts.size} đã chọn)</Label>
                    <div className="max-h-48 overflow-y-auto border border-gray-600 rounded-md p-2 space-y-1 bg-gray-900">
                        {availableAdAccounts.map(acc => {
                            const projectsForThisAccount = projectsForPeriod.filter(p => p.adsPlatforms.includes(acc.adsPlatform));
                            return (
                                <div key={acc.id} className="flex items-center space-x-3 p-1.5 rounded-md hover:bg-gray-800">
                                    <input type="checkbox" checked={selectedAccounts.has(acc.accountNumber)} onChange={() => handleAccountSelection(acc.accountNumber)} className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-primary-600 focus:ring-primary-500" />
                                    <span className="text-gray-200 flex-1">{acc.accountNumber}</span>
                                    <select 
                                        value={bulkProjectAssignments[acc.accountNumber] || ''}
                                        onChange={(e) => handleBulkProjectChange(acc.accountNumber, e.target.value)}
                                        className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="">-- Gán dự án (tùy chọn) --</option>
                                        {projectsForThisAccount.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                 <div>
                    <Label htmlFor="adAccountNumber">Số tài khoản Ads</Label>
                    <select 
                        id="adAccountNumber" 
                        value={adAccountNumber} 
                        onChange={e => setAdAccountNumber(e.target.value)} 
                        required
                        className={selectClassName}
                    >
                        <option value="" disabled>-- Chọn tài khoản --</option>
                        {availableAdAccounts.map(acc => <option key={acc.id} value={acc.accountNumber}>{acc.accountNumber}</option>)}
                    </select>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="asset">Nguồn tiền chi trả</Label>
                     <select id="asset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                        <option value="" disabled>-- Chọn tài sản VND --</option>
                        {groupedVndAssets.map(group => (
                            <optgroup key={group.type.id} label={group.type.name}>
                                {group.assets.map(asset => (
                                    <option key={asset.id} value={asset.id}>{asset.name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
                 <div>
                    <Label htmlFor="status">Trạng thái</Label>
                    <select id="status" value={status} onChange={e => setStatus(e.target.value as T.AdDeposit['status'])} className={selectClassName}>
                        {Object.entries(adAccountStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-700 pt-4">
                <div>
                    <Label htmlFor="usdAmount">Số tiền nạp (USD)</Label>
                    <NumberInput id="usdAmount" value={usdAmount} onValueChange={setUsdAmount} required />
                </div>
                <div>
                    <Label htmlFor="rate">Tỷ giá</Label>
                    <NumberInput id="rate" value={rate} onValueChange={setRate} required />
                </div>
                <div className="md:col-span-2">
                    <Label>Thành tiền (VND)</Label>
                    <Input value={formatCurrency(usdAmount * rate)} readOnly className="bg-gray-800" />
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

const AdFundTransferForm: React.FC<{
    onSave: (transfer: Omit<T.AdFundTransfer, 'id'>) => void;
    onCancel: () => void;
    adAccounts: T.AdAccount[];
}> = ({ onSave, onCancel, adAccounts }) => {
    const { currentPeriod } = useData();
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];

    const [date, setDate] = useState(defaultDate);
    const [adsPlatform, setAdsPlatform] = useState<T.AdsPlatform>('google');
    const [fromAdAccountNumber, setFromAdAccountNumber] = useState('');
    const [toAdAccountNumber, setToAdAccountNumber] = useState('');
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState('');

    const fromAccountOptions = useMemo(() => 
        adAccounts.filter(acc => acc.adsPlatform === adsPlatform), 
    [adAccounts, adsPlatform]);

    const toAccountOptions = useMemo(() => 
        adAccounts.filter(acc => acc.adsPlatform === adsPlatform && acc.accountNumber !== fromAdAccountNumber),
    [adAccounts, adsPlatform, fromAdAccountNumber]);

    useEffect(() => {
        setFromAdAccountNumber('');
        setToAdAccountNumber('');
    }, [adsPlatform]);
    
    useEffect(() => {
        if(toAdAccountNumber === fromAdAccountNumber && fromAdAccountNumber !== '') {
            setToAdAccountNumber('');
        }
    }, [fromAdAccountNumber, toAdAccountNumber]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromAdAccountNumber || !toAdAccountNumber || amount <= 0) {
            alert("Vui lòng điền đầy đủ thông tin.");
            return;
        }
        if(fromAdAccountNumber === toAdAccountNumber){
            alert("Tài khoản nguồn và tài khoản đích không được trùng nhau.");
            return;
        }
        onSave({ date, adsPlatform, fromAdAccountNumber, toAdAccountNumber, amount, description });
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <Label htmlFor="transferDate">Ngày chuyển</Label>
                <Input id="transferDate" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
             <div>
                <Label htmlFor="transferPlatform">Nền tảng Ads</Label>
                <select id="transferPlatform" value={adsPlatform} onChange={e => setAdsPlatform(e.target.value as T.AdsPlatform)} className={selectClassName}>
                    {Object.entries(adsPlatformLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="fromAccount">Từ tài khoản</Label>
                    <select 
                        id="fromAccount" 
                        value={fromAdAccountNumber} 
                        onChange={e => setFromAdAccountNumber(e.target.value)} 
                        className={selectClassName} 
                        required
                    >
                        <option value="" disabled>-- Chọn TK nguồn --</option>
                        {fromAccountOptions.map(acc => (
                            <option key={acc.id} value={acc.accountNumber}>{acc.accountNumber}</option>
                        ))}
                    </select>
                </div>
                 <div>
                    <Label htmlFor="toAccount">Đến tài khoản</Label>
                    <select 
                        id="toAccount" 
                        value={toAdAccountNumber} 
                        onChange={e => setToAdAccountNumber(e.target.value)} 
                        className={selectClassName} 
                        required
                    >
                        <option value="" disabled>-- Chọn TK đích --</option>
                        {toAccountOptions.map(acc => (
                            <option key={acc.id} value={acc.accountNumber}>{acc.accountNumber}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div>
                <Label htmlFor="transferAmount">Số tiền (USD)</Label>
                <NumberInput id="transferAmount" value={amount} onValueChange={setAmount} required />
            </div>
             <div>
                <Label htmlFor="transferDesc">Mô tả (Tùy chọn)</Label>
                <Input id="transferDesc" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu chuyển tiền</Button>
            </div>
        </form>
    );
};

const AdDepositsContent = () => {
    const { assets, assetTypes, projects, partners, adAccounts, adDeposits, addAdDeposit, updateAdDeposit, deleteAdDeposit, addAdFundTransfer, currentPeriod, isReadOnly } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [editingDeposit, setEditingDeposit] = useState<T.AdDeposit | undefined>(undefined);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [depositToDeleteId, setDepositToDeleteId] = useState<string | null>(null);
    
    const projectsForPeriod = useMemo(() => projects.filter(p => p.period === currentPeriod), [projects, currentPeriod]);

    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
    const partnerMap = useMemo(() => new Map(partners.map(p => [p.id, p.name])), [partners]);
    const assetMap = useMemo(() => new Map(assets.map(a => [a.id, a.name])), [assets]);

    const enrichedDeposits = useMemo(() => {
        return adDeposits
            .filter(d => isDateInPeriod(d.date, currentPeriod))
            .map(d => ({
                ...d,
                projectName: d.projectId ? projectMap.get(d.projectId)?.name || 'N/A' : '—',
                assetName: assetMap.get(d.assetId) || 'N/A',
            }))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [adDeposits, projectMap, assetMap, currentPeriod]);

    const handleSave = (depositOrDeposits: (Omit<T.AdDeposit, 'id'> | T.AdDeposit) | (Omit<T.AdDeposit, 'id'>)[]) => {
        if (Array.isArray(depositOrDeposits)) {
            addAdDeposit(depositOrDeposits);
        } else {
            const deposit = depositOrDeposits;
            if ('id' in deposit && deposit.id) {
                updateAdDeposit(deposit as T.AdDeposit);
            } else {
                addAdDeposit(deposit as Omit<T.AdDeposit, 'id'>);
            }
        }
        setIsModalOpen(false);
        setEditingDeposit(undefined);
    };

    const handleSaveTransfer = (transfer: Omit<T.AdFundTransfer, 'id'>) => {
        addAdFundTransfer(transfer);
        setIsTransferModalOpen(false);
    };

    const handleDeleteClick = (id: string) => {
        setDepositToDeleteId(id);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (depositToDeleteId) {
            deleteAdDeposit(depositToDeleteId);
            setIsConfirmModalOpen(false);
            setDepositToDeleteId(null);
        }
    };
    
    return (
        <>
            <Header title="Nạp tiền vào tài khoản Ads">
                {!isReadOnly && (
                    <div className="flex items-center gap-4">
                         <Button variant="secondary" onClick={() => setIsTransferModalOpen(true)}>
                            <span className="flex items-center gap-2"><ArrowRightLeft /> Chuyển tiền Ads</span>
                        </Button>
                        <Button onClick={() => { setEditingDeposit(undefined); setIsModalOpen(true); }} disabled={assets.length === 0 || adAccounts.length === 0}>
                            <span className="flex items-center gap-2"><Plus /> Thêm giao dịch nạp</span>
                        </Button>
                    </div>
                )}
            </Header>
            <Card>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Ngày</TableHeader>
                                <TableHeader>Số tài khoản</TableHeader>
                                <TableHeader>Nền tảng</TableHeader>
                                <TableHeader>Sở hữu</TableHeader>
                                <TableHeader>Nguồn tiền chi trả</TableHeader>
                                <TableHeader>Dự án</TableHeader>
                                <TableHeader>Số tiền (USD)</TableHeader>
                                <TableHeader>Tỷ giá</TableHeader>
                                <TableHeader>Thành tiền (VND)</TableHeader>
                                <TableHeader>Trạng thái</TableHeader>
                                {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {enrichedDeposits.map(d => {
                                const project = d.projectId ? projectMap.get(d.projectId) : null;
                                return (
                                <TableRow key={d.id}>
                                    <TableCell>{formatDate(d.date)}</TableCell>
                                    <TableCell className="font-medium text-white">{d.adAccountNumber}</TableCell>
                                    <TableCell>{adsPlatformLabels[d.adsPlatform]}</TableCell>
                                    <TableCell className="text-xs">
                                        {project?.isPartnership && project.partnerShares && project.partnerShares.length > 0
                                            ? project.partnerShares.map(s => partnerMap.get(s.partnerId)).filter(Boolean).join(', ')
                                            : 'Tôi'}
                                    </TableCell>
                                    <TableCell className="font-medium text-white">{d.assetName}</TableCell>
                                    <TableCell>{d.projectName}</TableCell>
                                    <TableCell>{formatCurrency(d.usdAmount, 'USD')}</TableCell>
                                    <TableCell>{d.rate.toLocaleString('vi-VN')}</TableCell>
                                    <TableCell className="text-primary-400 font-semibold">{formatCurrency(d.vndAmount)}</TableCell>
                                     <TableCell>
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            d.status === 'running' ? 'bg-green-200 text-green-800' : 
                                            d.status === 'stopped' ? 'bg-gray-200 text-gray-800' : 'bg-red-200 text-red-800'
                                        }`}>
                                            {adAccountStatusLabels[d.status]}
                                        </span>
                                    </TableCell>
                                    {!isReadOnly && (
                                        <TableCell>
                                            <div className="flex items-center space-x-3 justify-center">
                                                <button onClick={() => { setEditingDeposit(d); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                <button onClick={() => handleDeleteClick(d.id)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {!isReadOnly && (
                 <>
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDeposit ? 'Sửa giao dịch nạp' : 'Thêm giao dịch nạp'}>
                        <AdDepositForm
                            deposit={editingDeposit}
                            assets={assets}
                            assetTypes={assetTypes}
                            projectsForPeriod={projectsForPeriod}
                            onSave={handleSave}
                            onCancel={() => { setIsModalOpen(false); setEditingDeposit(undefined); }}
                            adAccounts={adAccounts}
                        />
                    </Modal>
                    <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Chuyển tiền giữa các tài khoản Ads">
                        <AdFundTransferForm 
                            adAccounts={adAccounts}
                            onSave={handleSaveTransfer} 
                            onCancel={() => setIsTransferModalOpen(false)} 
                        />
                    </Modal>
                    <ConfirmationModal
                        isOpen={isConfirmModalOpen}
                        onClose={() => setIsConfirmModalOpen(false)}
                        onConfirm={handleConfirmDelete}
                        title="Xác nhận xóa giao dịch nạp"
                        message="Bạn có chắc chắn muốn xóa giao dịch này? Hành động này có thể ảnh hưởng đến cách tính chi phí VND cho các chi phí quảng cáo sau đó."
                    />
                </>
            )}
        </>
    );
};

export default function DailyAdCosts() {
    const [activeTab, setActiveTab] = useState<'costs' | 'deposits'>('costs');
    
    return (
        <div>
            <div className="flex flex-wrap border-b border-gray-700 mb-6" role="tablist">
                 <TabButton active={activeTab === 'costs'} onClick={() => setActiveTab('costs')}>
                    Chi phí Ads
                </TabButton>
                <TabButton active={activeTab === 'deposits'} onClick={() => setActiveTab('deposits')}>
                    Nạp tiền Ads
                </TabButton>
            </div>
             <div>
                {activeTab === 'costs' && <AdCostsContent />}
                {activeTab === 'deposits' && <AdDepositsContent />}
            </div>
        </div>
    )
}