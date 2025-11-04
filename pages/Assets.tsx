import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import type { Asset, Withdrawal, Partner, AssetType, CapitalInflow } from '../types';
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
    onSave: (asset: Omit<Asset, 'id'> | Asset) => void;
    onCancel: () => void;
    onAddAssetType: (assetType: Omit<AssetType, 'id'>) => void;
}> = ({ asset, assetTypes, onSave, onCancel, onAddAssetType }) => {
    const [name, setName] = useState(asset?.name || '');
    const [typeId, setTypeId] = useState<string>(asset?.typeId || (assetTypes[0]?.id || ''));
    const [balance, setBalance] = useState(asset?.balance || 0);
    const [currency, setCurrency] = useState<Asset['currency']>(asset?.currency || 'VND');
    const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);

    useEffect(() => {
        if (!typeId && assetTypes.length > 0) {
            setTypeId(assetTypes[0].id);
        }
    }, [assetTypes, typeId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...asset, id: asset?.id || '', name, typeId, balance, currency });
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

export default function Assets() {
    const { 
        assets, addAsset, updateAsset, deleteAsset,
        assetTypes, addAssetType,
        partners, 
        withdrawals, addWithdrawal, updateWithdrawal, deleteWithdrawal,
        isReadOnly,
        enrichedAssets,
    } = useData();
    
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [editingWithdrawal, setEditingWithdrawal] = useState<Withdrawal | undefined>(undefined);
    const [withdrawalToDelete, setWithdrawalToDelete] = useState<Withdrawal | null>(null);

    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const assetTypeMap = useMemo(() => new Map(assetTypes.map(at => [at.id, at.name])), [assetTypes]);

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
        if ('id' in asset && asset.id) { updateAsset(asset as Asset); } else { addAsset(asset as Omit<Asset, 'id'>); }
        setIsAssetModalOpen(false); setEditingAsset(undefined);
    };
    const handleAddAssetType = (assetType: Omit<AssetType, 'id'>) => { addAssetType(assetType); };
    const handleDeleteAssetClick = (asset: Asset) => { setAssetToDelete(asset); };
    const handleConfirmDeleteAsset = () => { if (assetToDelete) { deleteAsset(assetToDelete.id); setAssetToDelete(null); } };

    // Withdrawal handlers
    const handleSaveWithdrawal = (withdrawal: Omit<Withdrawal, 'id'> | Withdrawal) => {
        if ('id' in withdrawal && withdrawal.id) { updateWithdrawal(withdrawal as Withdrawal); } else { addWithdrawal(withdrawal); }
        setIsWithdrawalModalOpen(false); setEditingWithdrawal(undefined);
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

    return (
        <div>
            <Header title="Tài sản" />
            <div className="space-y-8">
                {/* Assets Table */}
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
                                                    <TableCell colSpan={!isReadOnly ? 7 : 6} className="!py-2 !px-4 !text-left">
                                                        <h4 className="font-semibold text-white">Phân bổ theo đối tác</h4>
                                                    </TableCell>
                                                </TableRow>
                                                {asset.owners.map(owner => (
                                                    <TableRow key={owner.id} className="bg-gray-900/50 hover:bg-gray-800/70">
                                                        <TableCell></TableCell>
                                                        <TableCell className="pl-12 text-gray-300">{owner.name}</TableCell>
                                                        <TableCell></TableCell>
                                                        <TableCell></TableCell>
                                                        <TableCell className="text-green-400">{formatCurrency(owner.received, asset.currency)}</TableCell>
                                                        <TableCell className="text-red-400">{formatCurrency(owner.withdrawn, asset.currency)}</TableCell>
                                                        <TableCell></TableCell>
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

                {/* Withdrawals Table */}
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

                {/* Modals */}
                {!isReadOnly && (
                    <>
                        <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title={editingAsset ? 'Sửa tài sản' : 'Thêm tài sản mới'}>
                            <AssetForm asset={editingAsset} assetTypes={assetTypes} onSave={handleSaveAsset} onCancel={() => setIsAssetModalOpen(false)} onAddAssetType={handleAddAssetType} />
                        </Modal>
                        <ConfirmationModal isOpen={!!assetToDelete} onClose={() => setAssetToDelete(null)} onConfirm={handleConfirmDeleteAsset} title="Xác nhận xóa tài sản" message={`Bạn có chắc muốn xóa tài sản "${assetToDelete?.name}" không?`} />

                        <Modal isOpen={isWithdrawalModalOpen} onClose={() => setIsWithdrawalModalOpen(false)} title={editingWithdrawal ? 'Sửa giao dịch rút' : 'Thêm giao dịch rút'}>
                            <WithdrawalForm withdrawal={editingWithdrawal} assets={assets} partners={partners} enrichedAssets={enrichedAssets} onSave={handleSaveWithdrawal} onCancel={() => setIsWithdrawalModalOpen(false)} />
                        </Modal>
                        <ConfirmationModal isOpen={!!withdrawalToDelete} onClose={() => setWithdrawalToDelete(null)} onConfirm={handleConfirmDeleteWithdrawal} title="Xác nhận xóa giao dịch rút" message={`Bạn có chắc muốn xóa giao dịch rút tiền "${withdrawalToDelete?.description}" không?`} />
                    </>
                )}
            </div>
        </div>
    );
}
