import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import type { Asset, Withdrawal, Partner, AssetType, CapitalInflow } from '../types';
import * as T from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from '../components/icons/IconComponents';
import { formatCurrency, formatDate } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

const permissionLevelLabels: Record<T.PermissionLevel, string> = {
    view: 'Chỉ xem',
    edit: 'Chỉnh sửa',
    full: 'Toàn quyền',
};

const AssetTypeFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (assetType: Omit<AssetType, 'id'> | AssetType) => void;
    existingAssetType?: AssetType;
}> = ({ isOpen, onClose, onSave, existingAssetType }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (existingAssetType) {
            setName(existingAssetType.name);
        } else {
            setName('');
        }
    }, [existingAssetType, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave({
                ...existingAssetType,
                id: existingAssetType?.id || '',
                name: name.trim()
            });
            onClose();
        }
    };
    
    const title = existingAssetType ? 'Sửa loại tài sản' : 'Thêm loại tài sản mới';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="assetTypeName">Tên loại tài sản</Label>
                    <Input id="assetTypeName" value={name} onChange={e => setName(e.target.value)} required autoFocus />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit">Lưu</Button>
                </div>
            </form>
        </Modal>
    );
};

const AssetForm: React.FC<{
    asset?: Asset;
    assetTypes: AssetType[];
    partners: Partner[];
    onSave: (asset: Omit<Asset, 'id'> | Asset) => void;
    onCancel: () => void;
    onAddAssetType: (assetType: Omit<AssetType, 'id'>) => void;
}> = ({ asset, assetTypes, partners, onSave, onCancel, onAddAssetType }) => {
    const [name, setName] = useState(asset?.name || '');
    const [typeId, setTypeId] = useState<string>(asset?.typeId || (assetTypes[0]?.id || ''));
    const [balance, setBalance] = useState(asset?.balance || 0);
    const [currency, setCurrency] = useState<Asset['currency']>(asset?.currency || 'VND');
    const [ownershipType, setOwnershipType] = useState<Asset['ownershipType']>(asset?.ownershipType || 'personal');
    const [sharedWith, setSharedWith] = useState<T.AssetShare[]>(asset?.sharedWith || []);
    const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);

    useEffect(() => {
        if (!typeId && assetTypes.length > 0) {
            setTypeId(assetTypes[0].id);
        }
    }, [assetTypes, typeId]);

    const handlePartnerSelection = (partnerId: string, checked: boolean) => {
        setSharedWith(prev => {
            if (checked) {
                if (!prev.some(p => p.partnerId === partnerId)) {
                    return [...prev, { partnerId, permission: 'view' }];
                }
                return prev;
            } else {
                return prev.filter(p => p.partnerId !== partnerId);
            }
        });
    };
    
    const handlePermissionChange = (partnerId: string, permission: T.PermissionLevel) => {
        setSharedWith(prev => 
            prev.map(p => p.partnerId === partnerId ? { ...p, permission } : p)
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalSharedWith = ownershipType === 'shared' ? [...sharedWith] : [];

        if (ownershipType === 'shared') {
            const meShareIndex = finalSharedWith.findIndex(s => s.partnerId === 'default-me');
            if (meShareIndex !== -1) {
                finalSharedWith[meShareIndex] = { partnerId: 'default-me', permission: 'full' };
            } else {
                finalSharedWith.push({ partnerId: 'default-me', permission: 'full' });
            }
        }

        const assetData = {
            name,
            typeId,
            balance,
            currency,
            ownershipType,
            sharedWith: finalSharedWith,
        };
        onSave({ ...asset, id: asset?.id || '', ...assetData });
    };

    const handleSaveAssetType = (assetType: Omit<AssetType, 'id'> | AssetType) => {
        onAddAssetType(assetType);
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="assetName">Tên tài sản</Label>
                    <Input id="assetName" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <Label htmlFor="assetType">Loại tài sản</Label>
                        <div className="flex items-center gap-2">
                             <select id="assetType" value={typeId} onChange={e => setTypeId(e.target.value)} className={selectClassName}>
                                {assetTypes.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
                            </select>
                            <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddTypeModalOpen(true)} className="!p-2">
                                <Plus />
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="assetCurrency">Tiền tệ</Label>
                        <select id="assetCurrency" value={currency} onChange={e => setCurrency(e.target.value as Asset['currency'])} className={selectClassName}>
                            <option value="VND">VND</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                </div>
                <div>
                    <Label>Loại hình sở hữu</Label>
                    <div className="flex space-x-4 mt-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" value="personal" checked={ownershipType === 'personal'} onChange={() => setOwnershipType('personal')} className="h-4 w-4 text-primary-600 bg-gray-700 border-gray-600 focus:ring-primary-500" />
                            <span>Cá nhân</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" value="shared" checked={ownershipType === 'shared'} onChange={() => setOwnershipType('shared')} className="h-4 w-4 text-primary-600 bg-gray-700 border-gray-600 focus:ring-primary-500" />
                            <span>Chung với đối tác</span>
                        </label>
                    </div>
                </div>

                {ownershipType === 'shared' && (
                    <div className="pt-4 border-t border-gray-700">
                        <Label>Chia sẻ & Phân quyền</Label>
                        <div className="space-y-2 pt-1 max-h-40 overflow-y-auto bg-gray-900/50 p-3 rounded-md">
                            {partners.map(partner => {
                                const isMe = partner.id === 'default-me';
                                const isSelected = sharedWith.some(p => p.partnerId === partner.id);
                                return (
                                <div key={partner.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-800">
                                    <label className={`flex items-center space-x-2 ${isMe ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={isMe || isSelected} 
                                            onChange={(e) => !isMe && handlePartnerSelection(partner.id, e.target.checked)} 
                                            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500"
                                            disabled={isMe}
                                        />
                                        <span>{partner.name}</span>
                                    </label>
                                    {(isMe || isSelected) && (
                                        isMe ? (
                                            <div className="px-2 py-1 text-xs bg-gray-700/50 border border-gray-600/50 rounded-md text-gray-400">
                                                {permissionLevelLabels['full']}
                                            </div>
                                        ) : (
                                            <select
                                                value={sharedWith.find(p => p.partnerId === partner.id)?.permission || 'view'}
                                                onChange={(e) => handlePermissionChange(partner.id, e.target.value as T.PermissionLevel)}
                                                className="px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {Object.entries(permissionLevelLabels).map(([key, label]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                        )
                                    )}
                                </div>
                            )})}
                        </div>
                    </div>
                )}


                <div>
                    <Label htmlFor="assetBalance">Số dư ban đầu</Label>
                    <NumberInput id="assetBalance" value={balance} onValueChange={setBalance} disabled={!!asset} />
                     {asset && (
                        <p className="text-xs text-gray-400 mt-1">
                            Không thể thay đổi số dư ban đầu sau khi tạo để đảm bảo tính toàn vẹn dữ liệu.
                        </p>
                    )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                    <Button type="submit">Lưu</Button>
                </div>
            </form>
            <AssetTypeFormModal
                isOpen={isAddTypeModalOpen}
                onClose={() => setIsAddTypeModalOpen(false)}
                onSave={handleSaveAssetType}
            />
        </>
    );
};

type EnrichedAssetForWithdrawal = ReturnType<typeof useData>['enrichedAssets'][0];

const WithdrawalForm: React.FC<{
    withdrawal?: Withdrawal;
    assets: Asset[];
    partners: Partner[];
    enrichedAssets: EnrichedAssetForWithdrawal[];
    onSave: (withdrawal: Omit<Withdrawal, 'id'> | Withdrawal) => void;
    onCancel: () => void;
}> = ({ withdrawal, assets, partners, enrichedAssets, onSave, onCancel }) => {
    const [date, setDate] = useState(withdrawal?.date || new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(withdrawal?.description || '');
    const [withdrawnBy, setWithdrawnBy] = useState(withdrawal?.withdrawnBy || partners[0]?.id || '');
    const [assetId, setAssetId] = useState(withdrawal?.assetId || assets[0]?.id || '');
    const [amount, setAmount] = useState(withdrawal?.amount || 0);

    const selectedAsset = useMemo(() => assets.find(a => a.id === assetId), [assets, assetId]);
    const isUsdAsset = selectedAsset?.currency === 'USD';

    const partnerAssetBalance = useMemo(() => {
        if (!withdrawnBy || !assetId) return Infinity;
        const assetData = enrichedAssets.find(a => a.id === assetId);
        if (!assetData || !assetData.owners) return Infinity;
        const partnerData = assetData.owners.find(o => o.id === withdrawnBy);
        if (!partnerData) return 0;
        return partnerData.received - partnerData.withdrawn;
    }, [withdrawnBy, assetId, enrichedAssets]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (amount > partnerAssetBalance) {
            alert(`Số tiền rút (${formatCurrency(amount, isUsdAsset ? 'USD' : 'VND')}) không thể lớn hơn số dư khả dụng của đối tác (${formatCurrency(partnerAssetBalance, isUsdAsset ? 'USD' : 'VND')}).`);
            return;
        }

        const vndAmount = isUsdAsset ? 0 : amount;
        onSave({ 
            ...withdrawal, 
            id: withdrawal?.id || '', 
            date, 
            description,
            withdrawnBy,
            assetId, 
            amount,
            vndAmount
        });
    };

    const partnerName = partners.find(p => p.id === withdrawnBy)?.name || '';
    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <Label htmlFor="withdrawalDate">Ngày rút</Label>
                <Input id="withdrawalDate" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
                <Label htmlFor="withdrawalDesc">Mô tả</Label>
                <Input id="withdrawalDesc" value={description} onChange={e => setDescription(e.target.value)} placeholder="VD: Rút tiền mặt, chuyển khoản cho đối tác..." required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="withdrawalPartner">Đối tác rút</Label>
                    <select id="withdrawalPartner" value={withdrawnBy} onChange={e => setWithdrawnBy(e.target.value)} className={selectClassName} required>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <Label htmlFor="withdrawalAsset">Nguồn tiền</Label>
                    <select id="withdrawalAsset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                    </select>
                </div>
            </div>

            {assetId && withdrawnBy && partnerAssetBalance !== Infinity && (
                <div className="text-sm text-gray-400 bg-gray-900/50 p-2 rounded-md text-center">
                    Số dư khả dụng của <span className="font-semibold text-white">{partnerName}</span>: <span className="font-bold text-green-400">{formatCurrency(partnerAssetBalance, isUsdAsset ? 'USD' : 'VND')}</span>
                </div>
            )}
            
            <div className="border-t border-gray-700 pt-4">
                <Label htmlFor="amount">Số tiền ({selectedAsset?.currency})</Label>
                <NumberInput id="amount" value={amount} onValueChange={setAmount} required />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

const CapitalInflowForm: React.FC<{
    inflow?: CapitalInflow;
    assets: Asset[];
    partners: Partner[];
    onSave: (inflow: Omit<CapitalInflow, 'id' | 'workspaceId'>) => void;
    onCancel: () => void;
}> = ({ inflow, assets, partners, onSave, onCancel }) => {
    const [date, setDate] = useState(inflow?.date || new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(inflow?.description || '');
    const [assetId, setAssetId] = useState(inflow?.assetId || assets[0]?.id || '');
    const [amount, setAmount] = useState(inflow?.amount || 0);
    
    const [sourceType, setSourceType] = useState<'me' | 'partner' | 'external'>(() => {
        if (inflow?.contributedByPartnerId && inflow.contributedByPartnerId !== 'default-me') return 'partner';
        if (inflow?.externalInvestorName) return 'external';
        return 'me';
    });
    const [contributedByPartnerId, setContributedByPartnerId] = useState(inflow?.contributedByPartnerId || 'default-me');
    const [externalInvestorName, setExternalInvestorName] = useState(inflow?.externalInvestorName || '');

    const selectedAsset = useMemo(() => assets.find(a => a.id === assetId), [assets, assetId]);
    
    useEffect(() => {
        if (sourceType === 'partner') {
            const firstOtherPartner = partners.find(p => p.id !== 'default-me');
            if (firstOtherPartner && contributedByPartnerId === 'default-me') {
                setContributedByPartnerId(firstOtherPartner.id);
            }
        }
    }, [sourceType, partners, contributedByPartnerId]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const newInflow: Omit<CapitalInflow, 'id' | 'workspaceId'> & { [key: string]: any } = {
            date,
            description,
            assetId,
            amount,
        };
    
        if (sourceType === 'partner') {
            newInflow.contributedByPartnerId = contributedByPartnerId;
        } else if (sourceType === 'me') {
            newInflow.contributedByPartnerId = 'default-me';
        } else if (sourceType === 'external') {
            newInflow.externalInvestorName = externalInvestorName;
        }
        
        onSave(newInflow);
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
    
    const radioBaseClasses = "h-4 w-4 text-primary-600 bg-gray-700 border-gray-600 focus:ring-primary-500";
    const radioLabelBaseClasses = "flex items-center space-x-2 cursor-pointer";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <Label htmlFor="inflowDate">Ngày</Label>
                <Input id="inflowDate" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
                <Label htmlFor="inflowDesc">Mô tả</Label>
                <Input id="inflowDesc" value={description} onChange={e => setDescription(e.target.value)} placeholder="VD: Vốn góp ban đầu, Nhận đầu tư..." required />
            </div>

            <div className="border-t border-gray-700 pt-4">
                <Label className="mb-2">Nguồn vốn</Label>
                <div className="flex space-x-6">
                    <label className={radioLabelBaseClasses}>
                        <input type="radio" name="sourceType" value="me" checked={sourceType === 'me'} onChange={() => setSourceType('me')} className={radioBaseClasses} />
                        <span>Tự góp vốn</span>
                    </label>
                     <label className={radioLabelBaseClasses}>
                        <input type="radio" name="sourceType" value="partner" checked={sourceType === 'partner'} onChange={() => setSourceType('partner')} className={radioBaseClasses} />
                        <span>Đối tác</span>
                    </label>
                     <label className={radioLabelBaseClasses}>
                        <input type="radio" name="sourceType" value="external" checked={sourceType === 'external'} onChange={() => setSourceType('external')} className={radioBaseClasses} />
                        <span>Nhà đầu tư bên ngoài</span>
                    </label>
                </div>
            </div>

            {sourceType === 'partner' && (
                <div>
                    <Label htmlFor="inflowPartner">Đối tác góp vốn</Label>
                    <select id="inflowPartner" value={contributedByPartnerId} onChange={e => setContributedByPartnerId(e.target.value)} className={selectClassName} required>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            )}

            {sourceType === 'external' && (
                 <div>
                    <Label htmlFor="inflowExternal">Tên nhà đầu tư</Label>
                    <Input id="inflowExternal" value={externalInvestorName} onChange={e => setExternalInvestorName(e.target.value)} placeholder="VD: Mẹ tôi, Quỹ đầu tư ABC..." required />
                </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-700 pt-4">
                <div>
                    <Label htmlFor="inflowAsset">Tài sản nhận</Label>
                    <select id="inflowAsset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                    </select>
                </div>
                 <div>
                    <Label htmlFor="inflowAmount">Số tiền ({selectedAsset?.currency})</Label>
                    <NumberInput id="inflowAmount" value={amount} onValueChange={setAmount} required />
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
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

const BalanceSheetContent = () => {
    const { 
        assets, addAsset, updateAsset, deleteAsset,
        assetTypes, addAssetType,
        partners, 
        withdrawals, addWithdrawal, updateWithdrawal, deleteWithdrawal,
        capitalInflows, addCapitalInflow, updateCapitalInflow, deleteCapitalInflow,
        isReadOnly,
        enrichedAssets,
    } = useData();
    
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [editingWithdrawal, setEditingWithdrawal] = useState<Withdrawal | undefined>(undefined);
    const [withdrawalToDelete, setWithdrawalToDelete] = useState<Withdrawal | null>(null);
    
    const [isCapitalInflowModalOpen, setIsCapitalInflowModalOpen] = useState(false);
    const [editingCapitalInflow, setEditingCapitalInflow] = useState<CapitalInflow | undefined>(undefined);
    const [capitalInflowToDelete, setCapitalInflowToDelete] = useState<CapitalInflow | null>(null);

    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const assetTypeMap = useMemo(() => new Map(assetTypes.map(at => [at.id, at.name])), [assetTypes]);
    const partnerMap = useMemo(() => new Map(partners.map(p => [p.id, p.name])), [partners]);

    const toggleRow = (id: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedRows(newSet);
    };

    // Asset handlers
    const handleSaveAsset = (asset: Omit<Asset, 'id'> | Asset) => {
        if ('id' in asset && asset.id) {
            updateAsset(asset as Asset);
        } else {
            const { id, ...newAsset } = asset as Asset;
            addAsset(newAsset);
        }
        setIsAssetModalOpen(false);
        setEditingAsset(undefined);
    };
    const handleAddAssetType = (assetType: Omit<AssetType, 'id'>) => { addAssetType(assetType); };
    const handleDeleteAssetClick = (asset: Asset) => { setAssetToDelete(asset); };
    const handleConfirmDeleteAsset = () => { if (assetToDelete) { deleteAsset(assetToDelete.id); setAssetToDelete(null); } };

    // Withdrawal handlers
    const handleSaveWithdrawal = (withdrawal: Omit<Withdrawal, 'id'> | Withdrawal) => {
        if ('id' in withdrawal && withdrawal.id) {
            updateWithdrawal(withdrawal as Withdrawal);
        } else {
            const { id, ...newWithdrawal } = withdrawal as Withdrawal;
            addWithdrawal(newWithdrawal);
        }
        setIsWithdrawalModalOpen(false);
        setEditingWithdrawal(undefined);
    };
    const handleDeleteWithdrawalClick = (withdrawal: any) => { setWithdrawalToDelete(withdrawal); };
    const handleConfirmDeleteWithdrawal = () => { if (withdrawalToDelete) { deleteWithdrawal(withdrawalToDelete.id); setWithdrawalToDelete(null); } };
    
    const enrichedWithdrawals = useMemo(() => {
        const assetMap = new Map<string, Asset>(assets.map(a => [a.id, a]));
        const partnerMap = new Map<string, string>(partners.map(p => [p.id, p.name]));
        return withdrawals
            .map(w => {
                const asset = assetMap.get(w.assetId);
                return { ...w, assetName: asset?.name || 'N/A', partnerName: partnerMap.get(w.withdrawnBy) || 'N/A', isUSD: asset?.currency === 'USD' };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [withdrawals, assets, partners]);

    // Capital Inflow handlers
    const handleSaveCapitalInflow = (formData: Omit<CapitalInflow, 'id' | 'workspaceId'>) => {
        if (editingCapitalInflow) {
            updateCapitalInflow({ ...editingCapitalInflow, ...formData, workspaceId: editingCapitalInflow.workspaceId });
        } else {
            addCapitalInflow(formData);
        }
        setIsCapitalInflowModalOpen(false);
        setEditingCapitalInflow(undefined);
    };
    const handleDeleteCapitalInflowClick = (inflow: any) => { setCapitalInflowToDelete(inflow); };
    const handleConfirmDeleteCapitalInflow = () => { if (capitalInflowToDelete) { deleteCapitalInflow(capitalInflowToDelete.id); setCapitalInflowToDelete(null); } };
    
    const enrichedCapitalInflows = useMemo(() => {
        const assetMap = new Map<string, Asset>(assets.map(a => [a.id, a]));
        const partnerMap = new Map<string, string>(partners.map(p => [p.id, p.name]));
        return capitalInflows
            .map(i => {
                const asset = assetMap.get(i.assetId);
                let sourceName = 'Tự góp vốn';
                 if (i.contributedByPartnerId && i.contributedByPartnerId !== 'default-me') {
                    sourceName = partnerMap.get(i.contributedByPartnerId) || 'Đối tác không xác định';
                } else if (i.externalInvestorName) {
                    sourceName = i.externalInvestorName;
                }
                return {
                    ...i,
                    assetName: asset?.name || 'N/A',
                    currency: asset?.currency || 'VND',
                    sourceName
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [capitalInflows, assets, partners]);


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader className="flex justify-between items-center">
                    <span>Bảng cân đối tài sản</span>
                    {!isReadOnly && <Button onClick={() => { setEditingAsset(undefined); setIsAssetModalOpen(true); }}><span className="flex items-center gap-2"><Plus /> Thêm tài sản</span></Button>}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHead><TableRow>
                            <TableHeader className="w-12"></TableHeader>
                            <TableHeader>Tên tài sản</TableHeader>
                            <TableHeader>Loại</TableHeader>
                            <TableHeader>Sở hữu</TableHeader>
                            <TableHeader>Tiền tệ</TableHeader>
                            <TableHeader>Tiền vào</TableHeader>
                            <TableHeader>Tiền ra</TableHeader>
                            <TableHeader>Số dư</TableHeader>
                            {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                        </TableRow></TableHead>
                        <TableBody>
                            {enrichedAssets.map(asset => (
                                <React.Fragment key={asset.id}>
                                    <TableRow>
                                        <TableCell>
                                            {asset.isExpandable && (
                                                <button onClick={() => toggleRow(asset.id)} className="text-gray-400 hover:text-white">
                                                    {expandedRows.has(asset.id) ? <ChevronDown /> : <ChevronRight />}
                                                </button>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium text-white">{asset.name}</TableCell>
                                        <TableCell>{assetTypeMap.get(asset.typeId) || 'N/A'}</TableCell>
                                        <TableCell className="text-xs">
                                            {asset.ownershipType === 'personal'
                                                ? 'Tôi'
                                                : (asset.sharedWith?.map(s => partnerMap.get(s.partnerId)).filter(Boolean).join(', ') || 'Hợp tác')}
                                        </TableCell>
                                        <TableCell>{asset.currency}</TableCell>
                                        <TableCell className="font-semibold text-green-400">{formatCurrency(asset.totalReceived, asset.currency)}</TableCell>
                                        <TableCell className="font-semibold text-red-400">{formatCurrency(asset.totalWithdrawn, asset.currency)}</TableCell>
                                        <TableCell className="font-semibold text-primary-400">{formatCurrency(asset.balance, asset.currency)}</TableCell>
                                        {!isReadOnly && (
                                            <TableCell><div className="flex items-center space-x-3 justify-center">
                                                <button onClick={() => { setEditingAsset(asset); setIsAssetModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                <button onClick={() => handleDeleteAssetClick(asset)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                            </div></TableCell>
                                        )}
                                    </TableRow>
                                    {asset.isExpandable && expandedRows.has(asset.id) && (
                                        <>
                                            <TableRow className="bg-gray-900/50">
                                                <TableCell></TableCell>
                                                <TableCell colSpan={!isReadOnly ? 8 : 7} className="!py-2 !px-4 !text-left">
                                                    <h4 className="font-semibold text-white">Phân bổ theo đối tác</h4>
                                                </TableCell>
                                            </TableRow>
                                            {asset.owners.map(owner => (
                                                <TableRow key={owner.id} className="bg-gray-900/50 hover:bg-gray-800/70">
                                                    <TableCell></TableCell>
                                                    <TableCell className="pl-12 text-gray-300">{owner.name}</TableCell>
                                                    <TableCell></TableCell>
                                                    <TableCell></TableCell>
                                                    <TableCell></TableCell>
                                                    <TableCell className="text-green-400">{formatCurrency(owner.received, asset.currency)}</TableCell>
                                                    <TableCell className="text-red-400">{formatCurrency(owner.withdrawn, asset.currency)}</TableCell>
                                                    <TableCell className="text-gray-300 font-semibold">{formatCurrency(owner.received - owner.withdrawn, asset.currency)}</TableCell>
                                                    {!isReadOnly && <TableCell></TableCell>}
                                                </TableRow>
                                            ))}
                                        </>
                                    )}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex justify-between items-center">
                    <span>Rút tiền</span>
                    {!isReadOnly && <Button onClick={() => { setEditingWithdrawal(undefined); setIsWithdrawalModalOpen(true); }}><span className="flex items-center gap-2"><Plus /> Thêm giao dịch rút</span></Button>}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHead><TableRow>
                            <TableHeader>Ngày</TableHeader>
                            <TableHeader>Mô tả</TableHeader>
                            <TableHeader>Đối tác</TableHeader>
                            <TableHeader>Tài sản</TableHeader>
                            <TableHeader>Số tiền</TableHeader>
                            {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                        </TableRow></TableHead>
                        <TableBody>
                            {enrichedWithdrawals.map(w => (
                                <TableRow key={w.id}>
                                    <TableCell>{formatDate(w.date)}</TableCell>
                                    <TableCell className="font-medium text-white">{w.description}</TableCell>
                                    <TableCell>{w.partnerName}</TableCell>
                                    <TableCell>{w.assetName}</TableCell>
                                    <TableCell className="font-semibold text-red-400">{formatCurrency(w.amount, w.isUSD ? 'USD' : 'VND')}</TableCell>
                                    {!isReadOnly && (
                                        <TableCell><div className="flex items-center space-x-3 justify-center">
                                            <button onClick={() => { setEditingWithdrawal(w); setIsWithdrawalModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                            <button onClick={() => handleDeleteWithdrawalClick(w)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                        </div></TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex justify-between items-center">
                    <span>Vốn góp & Đầu tư</span>
                    {!isReadOnly && <Button onClick={() => { setEditingCapitalInflow(undefined); setIsCapitalInflowModalOpen(true); }}><span className="flex items-center gap-2"><Plus /> Thêm Vốn góp/Đầu tư</span></Button>}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHead><TableRow>
                            <TableHeader>Ngày</TableHeader>
                            <TableHeader>Mô tả</TableHeader>
                            <TableHeader>Nguồn vốn</TableHeader>
                            <TableHeader>Tài sản</TableHeader>
                            <TableHeader>Số tiền</TableHeader>
                            {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                        </TableRow></TableHead>
                        <TableBody>
                            {enrichedCapitalInflows.map(i => (
                                <TableRow key={i.id}>
                                    <TableCell>{formatDate(i.date)}</TableCell>
                                    <TableCell className="font-medium text-white text-left">{i.description}</TableCell>
                                    <TableCell>{i.sourceName}</TableCell>
                                    <TableCell>{i.assetName}</TableCell>
                                    <TableCell className="font-semibold text-green-400">{formatCurrency(i.amount, i.currency)}</TableCell>
                                    {!isReadOnly && (
                                        <TableCell><div className="flex items-center space-x-3 justify-center">
                                            <button onClick={() => { setEditingCapitalInflow(i); setIsCapitalInflowModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                            <button onClick={() => handleDeleteCapitalInflowClick(i)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                        </div></TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {!isReadOnly && (
                <>
                    <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title={editingAsset ? 'Sửa tài sản' : 'Thêm tài sản mới'}>
                        <AssetForm asset={editingAsset} assetTypes={assetTypes} partners={partners} onSave={handleSaveAsset} onCancel={() => setIsAssetModalOpen(false)} onAddAssetType={handleAddAssetType} />
                    </Modal>
                    <ConfirmationModal isOpen={!!assetToDelete} onClose={() => setAssetToDelete(null)} onConfirm={handleConfirmDeleteAsset} title="Xác nhận xóa tài sản" message={`Bạn có chắc muốn xóa tài sản "${assetToDelete?.name}" không?`} />

                    <Modal isOpen={isWithdrawalModalOpen} onClose={() => setIsWithdrawalModalOpen(false)} title={editingWithdrawal ? 'Sửa giao dịch rút' : 'Thêm giao dịch rút'}>
                        <WithdrawalForm withdrawal={editingWithdrawal} assets={assets} partners={partners} enrichedAssets={enrichedAssets} onSave={handleSaveWithdrawal} onCancel={() => setIsWithdrawalModalOpen(false)} />
                    </Modal>
                    <ConfirmationModal isOpen={!!withdrawalToDelete} onClose={() => setWithdrawalToDelete(null)} onConfirm={handleConfirmDeleteWithdrawal} title="Xác nhận xóa giao dịch rút" message={`Bạn có chắc muốn xóa giao dịch rút tiền "${withdrawalToDelete?.description}" không?`} />
                
                    <Modal isOpen={isCapitalInflowModalOpen} onClose={() => setIsCapitalInflowModalOpen(false)} title={editingCapitalInflow ? 'Sửa Vốn góp/Đầu tư' : 'Thêm Vốn góp/Đầu tư'}>
                        <CapitalInflowForm inflow={editingCapitalInflow} assets={assets} partners={partners} onSave={handleSaveCapitalInflow} onCancel={() => setIsCapitalInflowModalOpen(false)} />
                    </Modal>
                    <ConfirmationModal isOpen={!!capitalInflowToDelete} onClose={() => setCapitalInflowToDelete(null)} onConfirm={handleConfirmDeleteCapitalInflow} title="Xác nhận xóa giao dịch" message={`Bạn có chắc muốn xóa giao dịch vốn góp "${capitalInflowToDelete?.description}" không?`} />
                </>
            )}
        </div>
    );
}

const TransactionHistoryContent = () => {
    const { allTransactions, assets } = useData();
    const [filters, setFilters] = useState({ assetId: 'all', startDate: '', endDate: '' });

    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(t => {
            if (filters.assetId !== 'all' && t.asset.id !== filters.assetId) return false;
            if (filters.startDate && t.date < filters.startDate) return false;
            if (filters.endDate && t.date > filters.endDate) return false;
            return true;
        });
    }, [allTransactions, filters]);

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Card>
            <CardHeader>Lịch sử giao dịch</CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-gray-900/50 rounded-lg">
                    <div>
                        <Label htmlFor="filter-asset">Tài sản</Label>
                        <select id="filter-asset" value={filters.assetId} onChange={e => handleFilterChange('assetId', e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="all">Tất cả tài sản</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="filter-start-date">Từ ngày</Label>
                        <Input id="filter-start-date" type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="filter-end-date">Đến ngày</Label>
                        <Input id="filter-end-date" type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                    </div>
                </div>
                <Table>
                    <TableHead><TableRow>
                        <TableHeader>Ngày</TableHeader>
                        <TableHeader>Tài sản</TableHeader>
                        <TableHeader>Loại</TableHeader>
                        <TableHeader>Mô tả</TableHeader>
                        <TableHeader>Người chuyển</TableHeader>
                        <TableHeader>Người nhận</TableHeader>
                        <TableHeader>Tiền vào</TableHeader>
                        <TableHeader>Tiền ra</TableHeader>
                    </TableRow></TableHead>
                    <TableBody>
                        {filteredTransactions.map(t => (
                            <TableRow key={t.id}>
                                <TableCell>{formatDate(t.date)}</TableCell>
                                <TableCell className="font-medium text-white">{t.asset.name}</TableCell>
                                <TableCell>{t.type}</TableCell>
                                <TableCell className="text-left">{t.description}</TableCell>
                                <TableCell>{t.sender || '—'}</TableCell>
                                <TableCell>{t.receiver || '—'}</TableCell>
                                <TableCell className="text-green-400 font-semibold">{t.inflow > 0 ? formatCurrency(t.inflow, t.asset.currency) : '—'}</TableCell>
                                <TableCell className="text-red-400 font-semibold">{t.outflow > 0 ? formatCurrency(t.outflow, t.asset.currency) : '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default function Assets() {
    const [activeTab, setActiveTab] = useState('balance');
    
    return (
        <div>
            <Header title="Tài sản" />
            <div className="flex flex-wrap border-b border-gray-700 mb-6" role="tablist">
                <TabButton active={activeTab === 'balance'} onClick={() => setActiveTab('balance')}>
                    Bảng cân đối
                </TabButton>
                <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
                    Lịch sử giao dịch
                </TabButton>
            </div>
            
            {activeTab === 'balance' && <BalanceSheetContent />}
            {activeTab === 'history' && <TransactionHistoryContent />}
        </div>
    );
}