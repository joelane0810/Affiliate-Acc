import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import type { DailyAdCost, Project, Asset, AdDeposit, AdsPlatform, AdFundTransfer, AssetType } from '../types';
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

const adsPlatformLabels: Record<AdsPlatform, string> = {
    google: 'Google Ads',
    youtube: 'Youtube Ads',
    tiktok: 'Tiktok Ads',
    facebook: 'Facebook Ads',
    other: 'Other'
};

const adDepositStatusLabels: Record<AdDeposit['status'], string> = {
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
    cost?: DailyAdCost;
    projectsForPeriod: Project[];
    onSave: (cost: Omit<DailyAdCost, 'id'> | DailyAdCost) => void;
    onCancel: () => void;
}> = ({ cost, projectsForPeriod, onSave, onCancel }) => {
    const { currentPeriod, adDeposits } = useData();
    const [projectId, setProjectId] = useState(cost?.projectId || (projectsForPeriod[0]?.id || ''));
    const [adAccountNumber, setAdAccountNumber] = useState(cost?.adAccountNumber || '');
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(cost?.date || defaultDate);
    const [amount, setAmount] = useState(cost?.amount || 0);
    const [vatRate, setVatRate] = useState(cost?.vatRate || 0);

    const availableAdAccounts = useMemo(() => {
        if (!projectId) return [];
        
        const accountNumbersForProject = [...new Set(adDeposits
            .filter(d => d.projectId === projectId)
            .map(d => d.adAccountNumber))];

        return accountNumbersForProject.map(accNum => {
            const latestDepositForAccount = adDeposits
                .filter(d => d.adAccountNumber === accNum)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            
            return {
                number: accNum,
                status: latestDepositForAccount?.status || 'running'
            };
        });
    }, [projectId, adDeposits]);

    useEffect(() => {
        if (projectId) {
            const accounts = availableAdAccounts.map(a => a.number);
            if (!accounts.includes(adAccountNumber)) {
                setAdAccountNumber(accounts[0] || '');
            }
        } else {
            setAdAccountNumber('');
        }
    }, [projectId, adDeposits, availableAdAccounts]);

    const selectedAccountStatus = useMemo(() => {
        return availableAdAccounts.find(acc => acc.number === adAccountNumber)?.status;
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
                            disabled={!projectId || availableAdAccounts.length === 0}
                        >
                            <option value="" disabled>-- Chọn tài khoản --</option>
                            {availableAdAccounts.map(acc => {
                                let statusText = '';
                                if (acc.status === 'stopped') statusText = ' (Đã dừng)';
                                if (acc.status === 'cancelled') statusText = ' (Đã hủy)';
                                return <option key={acc.number} value={acc.number}>{acc.number}{statusText}</option>
                            })}
                        </select>
                        <div className="flex-shrink-0 w-24 text-center">
                            {selectedAccountStatus === 'stopped' && <span className="text-yellow-400 text-sm font-semibold">Đã dừng</span>}
                            {selectedAccountStatus === 'cancelled' && <span className="text-red-400 text-sm font-semibold">Đã hủy</span>}
                        </div>
                    </div>
                    {projectId && availableAdAccounts.length === 0 && (
                        <p className="text-xs text-yellow-400 mt-1">Dự án này chưa có giao dịch nạp tiền nào.</p>
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
    const { projects, enrichedDailyAdCosts, addDailyAdCost, updateDailyAdCost, deleteDailyAdCost, currentPeriod, isReadOnly } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<DailyAdCost | undefined>(undefined);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [costToDeleteId, setCostToDeleteId] = useState<string | null>(null);

    const projectsForPeriod = useMemo(() =>
        projects.filter(p => p.period === currentPeriod),
    [projects, currentPeriod]);

    const enrichedCostsForPeriod = useMemo(() => {
        const projectMap = new Map(projects.map(p => [p.id, p.name]));
        return enrichedDailyAdCosts
            .filter(c => isDateInPeriod(c.date, currentPeriod))
            .map(c => ({
                ...c,
                projectName: projectMap.get(c.projectId) || 'N/A',
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [enrichedDailyAdCosts, projects, currentPeriod]);

    const handleSave = (cost: Omit<DailyAdCost, 'id'> | DailyAdCost) => {
        if ('id' in cost && cost.id) {
            updateDailyAdCost(cost as DailyAdCost);
        } else {
            addDailyAdCost(cost);
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
                                    <TableHeader>Tài khoản Ads</TableHeader>
                                    <TableHeader>Chi phí (USD)</TableHeader>
                                    <TableHeader>Tỷ giá (hiệu lực)</TableHeader>
                                    <TableHeader>Thành tiền (VND)</TableHeader>
                                    <TableHeader>VAT</TableHeader>
                                    {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {enrichedCostsForPeriod.map(cost => (
                                    <TableRow key={cost.id}>
                                        <TableCell>{formatDate(cost.date)}</TableCell>
                                        <TableCell className="font-medium text-white">{cost.projectName}</TableCell>
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
                                ))}
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
    deposit?: AdDeposit;
    assets: Asset[];
    assetTypes: AssetType[];
    projectsForPeriod: Project[];
    onSave: (deposit: Omit<AdDeposit, 'id'> | AdDeposit) => void;
    onCancel: () => void;
    uniqueAdAccountNumbers: string[];
}> = ({ deposit, assets, assetTypes, projectsForPeriod, onSave, onCancel, uniqueAdAccountNumbers }) => {
    const { currentPeriod } = useData();
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(deposit?.date || defaultDate);
    const [adsPlatform, setAdsPlatform] = useState<AdsPlatform>(deposit?.adsPlatform || 'google');
    const [adAccountNumber, setAdAccountNumber] = useState(deposit?.adAccountNumber || '');
    const [projectId, setProjectId] = useState(deposit?.projectId || '');
    const [assetId, setAssetId] = useState(deposit?.assetId || '');
    const [usdAmount, setUsdAmount] = useState(deposit?.usdAmount || 0);
    const [rate, setRate] = useState(deposit?.rate || 0);
    const [status, setStatus] = useState<AdDeposit['status']>(deposit?.status || 'running');
    
    const assetTypeMap = useMemo(() => new Map(assetTypes.map(at => [at.id, at])), [assetTypes]);

    const groupedVndAssets = useMemo(() => {
        const vndAssets = assets.filter(a => a.currency === 'VND');
        const grouped: { [typeId: string]: Asset[] } = {};

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
        
        const selectedAsset = assets.find(a => a.id === assetId);
        const selectedAssetType = selectedAsset ? assetTypeMap.get(selectedAsset.typeId) : undefined;
        const agencyName = (selectedAssetType?.id === 'agency') ? selectedAsset?.name : undefined;

        onSave({ ...deposit, id: deposit?.id || '', date, adsPlatform, adAccountNumber, agency: agencyName, projectId: projectId || undefined, assetId, usdAmount, rate, vndAmount, status });
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="date">Ngày nạp</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="adAccountNumber">Số tài khoản Ads</Label>
                    <Input 
                        id="adAccountNumber" 
                        value={adAccountNumber} 
                        onChange={e => setAdAccountNumber(e.target.value)} 
                        required 
                        list="ad-account-numbers"
                        autoComplete="off"
                        placeholder="Chọn hoặc nhập mới..."
                    />
                    <datalist id="ad-account-numbers">
                        {uniqueAdAccountNumbers.map(acc => <option key={acc} value={acc} />)}
                    </datalist>
                </div>
                <div>
                    <Label htmlFor="adsPlatform">Nền tảng Ads</Label>
                    <select id="adsPlatform" value={adsPlatform} onChange={e => {
                        setAdsPlatform(e.target.value as AdsPlatform);
                        setProjectId(''); // Reset project selection when platform changes
                    }} className={selectClassName}>
                        {Object.entries(adsPlatformLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                </div>
                <div>
                    <Label htmlFor="project">Dự án (Tùy chọn)</Label>
                    <select id="project" value={projectId} onChange={e => setProjectId(e.target.value)} className={selectClassName}>
                        <option value="">-- Không có --</option>
                        {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
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
                    <select id="status" value={status} onChange={e => setStatus(e.target.value as AdDeposit['status'])} className={selectClassName}>
                        {Object.entries(adDepositStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
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
    onSave: (transfer: Omit<AdFundTransfer, 'id'>) => void;
    onCancel: () => void;
    projectsForPeriod: Project[];
}> = ({ onSave, onCancel, projectsForPeriod }) => {
    const { adDeposits, currentPeriod } = useData();
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];

    const [date, setDate] = useState(defaultDate);
    const [adsPlatform, setAdsPlatform] = useState<AdsPlatform>('google');
    const [fromAdAccountNumber, setFromAdAccountNumber] = useState('');
    const [toAdAccountNumber, setToAdAccountNumber] = useState('');
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState('');

    const fromAccountOptions = useMemo(() => {
        let relevantDeposits = adDeposits.filter(d => d.adsPlatform === adsPlatform);
        if (projectId) {
            relevantDeposits = relevantDeposits.filter(d => d.projectId === projectId);
        }
        const uniqueAccountNumbers = [...new Set(relevantDeposits.map(d => d.adAccountNumber))];
        
        return uniqueAccountNumbers.map(accNum => {
            const latestDepositForAccount = adDeposits
                .filter(d => d.adAccountNumber === accNum)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            
            return {
                number: accNum,
                status: latestDepositForAccount?.status || 'running'
            };
        });
    }, [adDeposits, adsPlatform, projectId]);
    
    const selectedFromAccountStatus = useMemo(() => {
        return fromAccountOptions.find(acc => acc.number === fromAdAccountNumber)?.status;
    }, [fromAdAccountNumber, fromAccountOptions]);

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
                <select id="transferPlatform" value={adsPlatform} onChange={e => {
                    setAdsPlatform(e.target.value as AdsPlatform);
                    setFromAdAccountNumber('');
                    setProjectId('');
                }} className={selectClassName}>
                    {Object.entries(adsPlatformLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
            </div>
            <div>
                <Label htmlFor="transferProject">Dự án (Tùy chọn)</Label>
                <select 
                    id="transferProject" 
                    value={projectId} 
                    onChange={e => {
                        setProjectId(e.target.value);
                        setFromAdAccountNumber('');
                    }} 
                    className={selectClassName}
                >
                    <option value="">-- Lọc theo dự án --</option>
                    {projectsForPeriod
                        .filter(p => p.adsPlatforms.includes(adsPlatform))
                        .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="fromAccount">Từ tài khoản</Label>
                    <div className="flex items-center space-x-2">
                        <select 
                            id="fromAccount" 
                            value={fromAdAccountNumber} 
                            onChange={e => setFromAdAccountNumber(e.target.value)} 
                            className="flex-grow px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" 
                            required
                        >
                            <option value="" disabled>-- Chọn TK nguồn --</option>
                            {fromAccountOptions.map(acc => {
                                let statusText = '';
                                if (acc.status === 'stopped') statusText = ' (Đã dừng)';
                                if (acc.status === 'cancelled') statusText = ' (Đã hủy)';
                                return <option key={acc.number} value={acc.number}>{acc.number}{statusText}</option>
                            })}
                        </select>
                        <div className="flex-shrink-0 text-center w-16">
                            {selectedFromAccountStatus === 'stopped' && <span className="text-yellow-400 text-xs font-semibold">Đã dừng</span>}
                            {selectedFromAccountStatus === 'cancelled' && <span className="text-red-400 text-xs font-semibold">Đã hủy</span>}
                        </div>
                    </div>
                </div>
                 <div>
                    <Label htmlFor="toAccount">Đến tài khoản</Label>
                    <Input id="toAccount" value={toAdAccountNumber} onChange={e => setToAdAccountNumber(e.target.value)} required />
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
    const { assets, assetTypes, projects, adDeposits, addAdDeposit, updateAdDeposit, deleteAdDeposit, addAdFundTransfer, currentPeriod, isReadOnly } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [editingDeposit, setEditingDeposit] = useState<AdDeposit | undefined>(undefined);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [depositToDeleteId, setDepositToDeleteId] = useState<string | null>(null);
    
    const projectsForPeriod = useMemo(() => projects.filter(p => p.period === currentPeriod), [projects, currentPeriod]);

    const uniqueAdAccountNumbers = useMemo(() => 
        [...new Set(adDeposits.map(d => d.adAccountNumber))].sort()
    , [adDeposits]);

    const enrichedDeposits = useMemo(() => {
        const projectMap = new Map(projects.map(p => [p.id, p.name]));
        const assetMap = new Map(assets.map(a => [a.id, a.name]));
        return adDeposits
            .filter(d => isDateInPeriod(d.date, currentPeriod))
            .map(d => ({
                ...d,
                projectName: d.projectId ? projectMap.get(d.projectId) || 'N/A' : '—',
                assetName: assetMap.get(d.assetId) || 'N/A',
            }))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [adDeposits, projects, assets, currentPeriod]);

    const handleSave = (deposit: Omit<AdDeposit, 'id'> | AdDeposit) => {
        if ('id' in deposit && deposit.id) {
            updateAdDeposit(deposit as AdDeposit);
        } else {
            addAdDeposit(deposit);
        }
        setIsModalOpen(false);
        setEditingDeposit(undefined);
    };

    const handleSaveTransfer = (transfer: Omit<AdFundTransfer, 'id'>) => {
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
                        <Button onClick={() => { setEditingDeposit(undefined); setIsModalOpen(true); }} disabled={assets.length === 0}>
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
                                <TableHeader>Agency</TableHeader>
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
                            {enrichedDeposits.map(d => (
                                <TableRow key={d.id}>
                                    <TableCell>{formatDate(d.date)}</TableCell>
                                    <TableCell className="font-medium text-white">{d.adAccountNumber}</TableCell>
                                    <TableCell>{adsPlatformLabels[d.adsPlatform]}</TableCell>
                                    <TableCell>{d.agency || '—'}</TableCell>
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
                                            {adDepositStatusLabels[d.status]}
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
                            ))}
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
                            uniqueAdAccountNumbers={uniqueAdAccountNumbers}
                        />
                    </Modal>
                    <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Chuyển tiền giữa các tài khoản Ads">
                        <AdFundTransferForm 
                            projectsForPeriod={projectsForPeriod}
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

const AdAccountLedgerContent = () => {
    const { adDeposits, adFundTransfers, dailyAdCosts, projects } = useData();
    const [selectedAccount, setSelectedAccount] = useState<string>('');

    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);

    const adAccounts = useMemo(() => {
        const accounts = new Set<string>();
        adDeposits.forEach(d => accounts.add(d.adAccountNumber));
        adFundTransfers.forEach(t => {
            accounts.add(t.fromAdAccountNumber);
            accounts.add(t.toAdAccountNumber);
        });
        dailyAdCosts.forEach(c => accounts.add(c.adAccountNumber));
        return Array.from(accounts).sort();
    }, [adDeposits, adFundTransfers, dailyAdCosts]);
    
     useEffect(() => {
        if (!selectedAccount && adAccounts.length > 0) {
            setSelectedAccount(adAccounts[0]);
        }
    }, [adAccounts, selectedAccount]);


    const ledgerData = useMemo(() => {
        if (!selectedAccount) return [];

        type LedgerEntry = {
            date: string;
            description: string;
            deposit: number;
            spent: number;
            balance: number;
        };

        const transactions = [
            ...adDeposits.filter(d => d.adAccountNumber === selectedAccount)
                .map(d => ({ date: d.date, type: 'deposit' as const, amount: d.usdAmount, description: 'Nạp tiền' })),
            ...dailyAdCosts.filter(c => c.adAccountNumber === selectedAccount)
                .map(c => ({ date: c.date, type: 'cost' as const, amount: c.amount, description: `Chi phí: ${projectMap.get(c.projectId) || c.projectId}` })),
            ...adFundTransfers.filter(t => t.fromAdAccountNumber === selectedAccount)
                .map(t => ({ date: t.date, type: 'transfer_out' as const, amount: t.amount, description: `Chuyển tiền đến TK ${t.toAdAccountNumber}` })),
            ...adFundTransfers.filter(t => t.toAdAccountNumber === selectedAccount)
                .map(t => ({ date: t.date, type: 'transfer_in' as const, amount: t.amount, description: `Nhận tiền từ TK ${t.fromAdAccountNumber}` })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;
        return transactions.map(tx => {
            let deposit = 0;
            let spent = 0;
            if (tx.type === 'deposit' || tx.type === 'transfer_in') {
                runningBalance += tx.amount;
                deposit = tx.amount;
            } else {
                runningBalance -= tx.amount;
                spent = tx.amount;
            }
            return {
                date: tx.date,
                description: tx.description,
                deposit,
                spent,
                balance: runningBalance
            };
        });
    }, [selectedAccount, adDeposits, adFundTransfers, dailyAdCosts, projectMap]);

    return (
        <div>
            <Header title="Sổ chi tiết tài khoản Ads" />
            <Card>
                <CardContent>
                    <div className="mb-4">
                        <Label htmlFor="ledgerAccountSelect">Chọn tài khoản Ads</Label>
                         <select 
                            id="ledgerAccountSelect"
                            value={selectedAccount} 
                            onChange={e => setSelectedAccount(e.target.value)}
                            className="w-full max-w-sm px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            {adAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                        </select>
                    </div>
                     <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Ngày</TableHeader>
                                <TableHeader>Mô tả</TableHeader>
                                <TableHeader>Nạp (USD)</TableHeader>
                                <TableHeader>Tiêu (USD)</TableHeader>
                                <TableHeader>Số dư (USD)</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {ledgerData.length > 0 ? ledgerData.map((row, index) => (
                                <TableRow key={index}>
                                    <TableCell>{formatDate(row.date)}</TableCell>
                                    <TableCell className="text-left">{row.description}</TableCell>
                                    <TableCell className="text-green-400">
                                        {row.deposit > 0 ? formatCurrency(row.deposit, 'USD') : '—'}
                                    </TableCell>
                                    <TableCell className="text-red-400">
                                        {row.spent > 0 ? formatCurrency(row.spent, 'USD') : '—'}
                                    </TableCell>
                                    <TableCell className="font-semibold text-white">
                                        {formatCurrency(row.balance, 'USD')}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                                        {selectedAccount ? 'Không có giao dịch cho tài khoản này.' : 'Vui lòng chọn một tài khoản.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};


export default function DailyAdCosts() {
    const [activeTab, setActiveTab] = useState<'costs' | 'deposits' | 'ledger'>('costs');
    
    return (
        <div>
            <div className="flex flex-wrap border-b border-gray-700 mb-6" role="tablist">
                 <TabButton active={activeTab === 'costs'} onClick={() => setActiveTab('costs')}>
                    Chi phí Ads
                </TabButton>
                <TabButton active={activeTab === 'deposits'} onClick={() => setActiveTab('deposits')}>
                    Nạp tiền Ads
                </TabButton>
                 <TabButton active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')}>
                    Sổ chi tiết tài khoản Ads
                </TabButton>
            </div>
             <div>
                {activeTab === 'costs' && <AdCostsContent />}
                {activeTab === 'deposits' && <AdDepositsContent />}
                {activeTab === 'ledger' && <AdAccountLedgerContent />}
            </div>
        </div>
    )
}