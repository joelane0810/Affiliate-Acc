import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import type { Asset, Liability, DebtPayment, Partner, AssetType, CapitalInflow, Receivable, ReceivablePayment } from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Plus, Edit, Trash2 } from '../components/icons/IconComponents';
import { formatCurrency, formatDate } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

const ProgressBar: React.FC<{ value: number, max: number }> = ({ value, max }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="w-full bg-gray-700 rounded-full h-5 relative flex items-center justify-center">
            <div className="bg-primary-600 h-5 rounded-full absolute left-0 top-0" style={{ width: `${percentage}%` }}></div>
            <span className="relative text-xs font-bold text-white z-10">
                {percentage.toFixed(1).replace('.', ',')}%
            </span>
        </div>
    );
};


const CapitalInflowForm: React.FC<{
    inflow?: CapitalInflow;
    assets: Asset[];
    partners: Partner[];
    onSave: (inflow: Omit<CapitalInflow, 'id'> | CapitalInflow) => void;
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
        
        const finalInflow: Omit<CapitalInflow, 'id'> | CapitalInflow = {
            ...inflow,
            id: inflow?.id || '',
            date,
            description,
            assetId,
            amount,
            contributedByPartnerId: sourceType === 'partner' ? contributedByPartnerId : (sourceType === 'me' ? 'default-me' : undefined),
            externalInvestorName: sourceType === 'external' ? externalInvestorName : undefined,
        };

        onSave(finalInflow);
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

const LiabilityForm: React.FC<{
    liability?: Liability;
    onSave: (liability: Omit<Liability, 'id'> | Liability) => void;
    onCancel: () => void;
}> = ({ liability, onSave, onCancel }) => {
    const [description, setDescription] = useState(liability?.description || '');
    const [totalAmount, setTotalAmount] = useState(liability?.totalAmount || 0);
    const [type, setType] = useState<Liability['type']>(liability?.type || 'short-term');
    const [isInstallment, setIsInstallment] = useState(liability?.isInstallment || false);
    const [startDate, setStartDate] = useState(liability?.startDate || new Date().toISOString().split('T')[0]);
    const [numberOfInstallments, setNumberOfInstallments] = useState(liability?.numberOfInstallments || 1);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalLiability: Omit<Liability, 'id'> | Liability = {
            ...liability,
            id: liability?.id || '',
            description,
            totalAmount,
            currency: 'VND', // Currently only supports VND liabilities without direct inflow.
            type,
            creationDate: liability?.creationDate || new Date().toISOString().split('T')[0],
            isInstallment,
            startDate: isInstallment ? startDate : undefined,
            numberOfInstallments: isInstallment ? numberOfInstallments : undefined,
        };
        onSave(finalLiability);
    };
    
    const monthlyPayment = useMemo(() => {
        if (isInstallment && numberOfInstallments > 0) {
            return totalAmount / numberOfInstallments;
        }
        return 0;
    }, [isInstallment, totalAmount, numberOfInstallments]);

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="liabilityDescription">Mô tả</Label>
                <Input id="liabilityDescription" value={description} onChange={e => setDescription(e.target.value)} placeholder="VD: Vay mua xe, Trả góp Macbook..." required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="liabilityType">Loại công nợ</Label>
                    <select id="liabilityType" value={type} onChange={e => setType(e.target.value as Liability['type'])} className={selectClassName}>
                        <option value="short-term">Ngắn hạn</option>
                        <option value="long-term">Dài hạn</option>
                    </select>
                </div>
                 <div>
                    <Label htmlFor="liabilityTotalAmount">Tổng số tiền (VND)</Label>
                    <NumberInput id="liabilityTotalAmount" value={totalAmount} onValueChange={setTotalAmount} disabled={!!liability} />
                </div>
            </div>
            
             <div className="flex items-center space-x-3 pt-4 border-t border-gray-700">
                <input
                    type="checkbox"
                    id="isInstallment"
                    checked={isInstallment}
                    onChange={e => setIsInstallment(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500"
                    disabled={!!liability}
                />
                <Label htmlFor="isInstallment" className="mb-0">Thanh toán trả góp</Label>
            </div>
            
            {isInstallment && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-900/50 rounded-lg">
                    <div>
                        <Label htmlFor="liabilityStartDate">Ngày bắt đầu trả</Label>
                        <Input id="liabilityStartDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={!!liability}/>
                    </div>
                     <div>
                        <Label htmlFor="numberOfInstallments">Số kỳ trả góp (tháng)</Label>
                        <NumberInput id="numberOfInstallments" value={numberOfInstallments} onValueChange={(val) => setNumberOfInstallments(Math.max(1, val))} disabled={!!liability}/>
                    </div>
                     <div className="col-span-1 sm:col-span-2">
                        <Label>Số tiền mỗi kỳ</Label>
                        <Input value={formatCurrency(monthlyPayment)} readOnly className="bg-gray-800" />
                    </div>
                </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

const ReceivableForm: React.FC<{
    receivable?: Receivable;
    assets: Asset[];
    onSave: (receivable: Omit<Receivable, 'id'> | Receivable) => void;
    onCancel: () => void;
}> = ({ receivable, assets, onSave, onCancel }) => {
    const [description, setDescription] = useState(receivable?.description || '');
    const [totalAmount, setTotalAmount] = useState(receivable?.totalAmount || 0);
    const [creationDate, setCreationDate] = useState(receivable?.creationDate || new Date().toISOString().split('T')[0]);
    const [outflowAssetId, setOutflowAssetId] = useState(receivable?.outflowAssetId || '');
    const [type, setType] = useState<Receivable['type']>(receivable?.type || 'short-term');
    const [isInstallment, setIsInstallment] = useState(receivable?.isInstallment || false);
    const [startDate, setStartDate] = useState(receivable?.startDate || new Date().toISOString().split('T')[0]);
    const [numberOfInstallments, setNumberOfInstallments] = useState(receivable?.numberOfInstallments || 1);
    
    const selectedAsset = useMemo(() => assets.find(a => a.id === outflowAssetId), [assets, outflowAssetId]);
    const currency = selectedAsset?.currency || 'VND';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!outflowAssetId && !receivable) {
            alert("Vui lòng chọn tài sản đã chi ra.");
            return;
        }
        
        const finalReceivable: Omit<Receivable, 'id'> | Receivable = {
            ...receivable,
            id: receivable?.id || '',
            description,
            totalAmount,
            currency,
            type,
            creationDate,
            outflowAssetId,
            isInstallment,
            startDate: isInstallment ? startDate : undefined,
            numberOfInstallments: isInstallment ? numberOfInstallments : undefined,
        };

        onSave(finalReceivable);
    };

    const monthlyReceivable = useMemo(() => {
        if (isInstallment && numberOfInstallments > 0) {
            return totalAmount / numberOfInstallments;
        }
        return 0;
    }, [isInstallment, totalAmount, numberOfInstallments]);

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="rec-date">Ngày tạo</Label>
                <Input id="rec-date" type="date" value={creationDate} onChange={e => setCreationDate(e.target.value)} required disabled={!!receivable} />
            </div>
            <div>
                <Label htmlFor="rec-desc">Mô tả</Label>
                <Input id="rec-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="VD: Cho mượn, Tạm ứng cho đối tác..." required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="rec-type">Loại phải thu</Label>
                    <select id="rec-type" value={type} onChange={e => setType(e.target.value as Receivable['type'])} className={selectClassName}>
                        <option value="short-term">Ngắn hạn</option>
                        <option value="long-term">Dài hạn</option>
                    </select>
                </div>
                <div>
                    <Label htmlFor="rec-asset">Tài sản chi ra</Label>
                    <select id="rec-asset" value={outflowAssetId} onChange={e => setOutflowAssetId(e.target.value)} className={selectClassName} required disabled={!!receivable}>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                    </select>
                </div>
                 <div>
                    <Label htmlFor="rec-amount">Số tiền ({currency})</Label>
                    <NumberInput id="rec-amount" value={totalAmount} onValueChange={setTotalAmount} required disabled={!!receivable} />
                </div>
            </div>

            <div className="flex items-center space-x-3 pt-4 border-t border-gray-700">
                <input
                    type="checkbox"
                    id="rec-isInstallment"
                    checked={isInstallment}
                    onChange={e => setIsInstallment(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500"
                    disabled={!!receivable}
                />
                <Label htmlFor="rec-isInstallment" className="mb-0">Thu hồi nhiều kỳ (trả góp)</Label>
            </div>
            
            {isInstallment && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-900/50 rounded-lg">
                    <div>
                        <Label htmlFor="rec-startDate">Ngày bắt đầu thu</Label>
                        <Input id="rec-startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={!!receivable} />
                    </div>
                     <div>
                        <Label htmlFor="rec-numInstallments">Số kỳ thu (tháng)</Label>
                        <NumberInput id="rec-numInstallments" value={numberOfInstallments} onValueChange={(val) => setNumberOfInstallments(Math.max(1, val))} disabled={!!receivable} />
                    </div>
                     <div className="col-span-1 sm:col-span-2">
                        <Label>Số tiền mỗi kỳ</Label>
                        <Input value={formatCurrency(monthlyReceivable, currency)} readOnly className="bg-gray-800" />
                    </div>
                </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

type EnrichedLiability = Liability & { paidAmount: number; remainingAmount: number };
type EnrichedReceivable = Receivable & { paidAmount: number; remainingAmount: number };

const AssetDebtPaymentModal: React.FC<{
    liability: EnrichedLiability;
    vndAssets: (Asset & { balance: number; } )[];
    onClose: () => void;
    onSave: (payment: { liabilityId: string; amount: number; assetId: string; date: string }) => void;
}> = ({ liability, vndAssets, onClose, onSave }) => {
    const { currentPeriod } = useData();
    const [amount, setAmount] = useState(liability.remainingAmount);
    const [assetId, setAssetId] = useState(vndAssets[0]?.id || '');
    const [date, setDate] = useState(currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId || amount <= 0) {
            alert("Vui lòng chọn tài sản và nhập số tiền hợp lệ.");
            return;
        }
        if (amount > liability.remainingAmount) {
            alert(`Số tiền trả không thể lớn hơn nợ còn lại (${formatCurrency(liability.remainingAmount)}).`);
            return;
        }
        onSave({ liabilityId: liability.id, amount, assetId, date });
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Trả nợ: ${liability.description}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="paymentDate">Ngày trả</Label>
                    <Input id="paymentDate" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="paymentAmount">Số tiền trả (VND)</Label>
                    <NumberInput id="paymentAmount" value={amount} onValueChange={setAmount} />
                    <p className="text-xs text-gray-400 mt-1">
                        Tổng còn lại: {formatCurrency(liability.remainingAmount)}
                    </p>
                </div>
                <div>
                    <Label htmlFor="paymentAsset">Nguồn tiền</Label>
                    <select id="paymentAsset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {vndAssets.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                    </select>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit">Xác nhận trả</Button>
                </div>
            </form>
        </Modal>
    );
};

const ReceivablePaymentModal: React.FC<{
    receivable: EnrichedReceivable;
    assets: Asset[];
    onClose: () => void;
    onSave: (payment: Omit<ReceivablePayment, 'id'>) => void;
}> = ({ receivable, assets, onClose, onSave }) => {
    const { currentPeriod } = useData();
    const [amount, setAmount] = useState(receivable.remainingAmount);
    const [assetId, setAssetId] = useState(assets.find(a => a.currency === receivable.currency)?.id || '');
    const [date, setDate] = useState(currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId || amount <= 0) {
            alert("Vui lòng chọn tài sản và nhập số tiền hợp lệ.");
            return;
        }
        if (amount > receivable.remainingAmount) {
            alert(`Số tiền nhận không thể lớn hơn số tiền còn lại (${formatCurrency(receivable.remainingAmount, receivable.currency)}).`);
            return;
        }
        onSave({ receivableId: receivable.id, amount, assetId, date });
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Thu nợ: ${receivable.description}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="paymentDate">Ngày nhận</Label>
                    <Input id="paymentDate" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="paymentAmount">Số tiền nhận ({receivable.currency})</Label>
                    <NumberInput id="paymentAmount" value={amount} onValueChange={setAmount} />
                    <p className="text-xs text-gray-400 mt-1">
                        Tổng còn lại: {formatCurrency(receivable.remainingAmount, receivable.currency)}
                    </p>
                </div>
                <div>
                    <Label htmlFor="paymentAsset">Tài sản nhận</Label>
                    <select id="paymentAsset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {assets.filter(a => a.currency === receivable.currency).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit">Xác nhận</Button>
                </div>
            </form>
        </Modal>
    );
};


export default function CapitalSources() {
    const { 
        assets,
        liabilities, addLiability, updateLiability, deleteLiability,
        partners, 
        debtPayments, addDebtPayment, isReadOnly,
        enrichedAssets,
        receivables, addReceivable, updateReceivable, deleteReceivable,
        receivablePayments, addReceivablePayment,
        capitalInflows, addCapitalInflow, updateCapitalInflow, deleteCapitalInflow
    } = useData();
    
    const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
    const [editingLiability, setEditingLiability] = useState<Liability | undefined>(undefined);
    const [liabilityToDelete, setLiabilityToDelete] = useState<Liability | null>(null);
    const [payingLiability, setPayingLiability] = useState<EnrichedLiability | null>(null);

    const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);
    const [editingReceivable, setEditingReceivable] = useState<Receivable | undefined>(undefined);
    const [receivableToDelete, setReceivableToDelete] = useState<Receivable | null>(null);
    const [collectingReceivable, setCollectingReceivable] = useState<EnrichedReceivable | null>(null);
    
    const [isCapitalInflowModalOpen, setIsCapitalInflowModalOpen] = useState(false);
    const [editingCapitalInflow, setEditingCapitalInflow] = useState<CapitalInflow | undefined>(undefined);
    const [capitalInflowToDelete, setCapitalInflowToDelete] = useState<CapitalInflow | null>(null);

    // Liability handlers
    const handleSaveLiability = (liability: Omit<Liability, 'id'> | Liability) => {
        if ('id' in liability && liability.id) {
            updateLiability(liability as Liability);
        } else {
            // FIX: Cast liability to Liability to safely destructure 'id' property.
            // The form component always provides a full Liability object, with an empty string for new items.
            const { id, ...newLiability } = liability as Liability;
            addLiability(newLiability);
        }
        setIsLiabilityModalOpen(false);
        setEditingLiability(undefined);
    };
    const handleDeleteLiabilityClick = (liability: Liability) => { setLiabilityToDelete(liability); };
    const handleConfirmDeleteLiability = () => { if (liabilityToDelete) { deleteLiability(liabilityToDelete.id); setLiabilityToDelete(null); } };
    const handleSaveDebtPayment = (payment: { liabilityId: string; amount: number; assetId: string; date: string; }) => {
        addDebtPayment(payment);
        const liability = liabilities.find(l => l.id === payment.liabilityId);
        if (liability) {
            const totalPaid = debtPayments.filter(p => p.liabilityId === liability.id).reduce((sum, p) => sum + p.amount, 0) + payment.amount;
            if (totalPaid >= liability.totalAmount) {
                updateLiability({ ...liability, completionDate: payment.date });
            }
        }
        setPayingLiability(null);
    };
    
    // Receivable handlers
    const handleSaveReceivable = (receivable: Omit<Receivable, 'id'> | Receivable) => {
        if ('id' in receivable && receivable.id) {
            updateReceivable(receivable as Receivable);
        } else {
            // FIX: Cast receivable to Receivable to safely destructure 'id' property.
            // The form component always provides a full Receivable object, with an empty string for new items.
            const { id, ...newReceivable } = receivable as Receivable;
            addReceivable(newReceivable);
        }
        setIsReceivableModalOpen(false);
        setEditingReceivable(undefined);
    };
    const handleDeleteReceivableClick = (receivable: Receivable) => { setReceivableToDelete(receivable); };
    const handleConfirmDeleteReceivable = () => { if (receivableToDelete) { deleteReceivable(receivableToDelete.id); setReceivableToDelete(null); } };
    const handleSaveReceivablePayment = (payment: Omit<ReceivablePayment, 'id'>) => {
        addReceivablePayment(payment);
        const receivable = receivables.find(r => r.id === payment.receivableId);
        if (receivable) {
            const totalPaid = receivablePayments.filter(p => p.receivableId === receivable.id).reduce((sum, p) => sum + p.amount, 0) + payment.amount;
            if (totalPaid >= receivable.totalAmount) {
                updateReceivable({ ...receivable, completionDate: payment.date });
            }
        }
        setCollectingReceivable(null);
    };

    // Capital Inflow handlers
    const handleSaveCapitalInflow = (inflow: Omit<CapitalInflow, 'id'> | CapitalInflow) => {
        if ('id' in inflow && inflow.id) {
            updateCapitalInflow(inflow as CapitalInflow);
        } else {
            // FIX: Cast inflow to CapitalInflow to safely destructure 'id' property.
            // The form component always provides a full CapitalInflow object, with an empty string for new items.
            const { id, ...newInflow } = inflow as CapitalInflow;
            addCapitalInflow(newInflow);
        }
        setIsCapitalInflowModalOpen(false);
        setEditingCapitalInflow(undefined);
    };
    const handleDeleteCapitalInflowClick = (inflow: any) => { setCapitalInflowToDelete(inflow); };
    const handleConfirmDeleteCapitalInflow = () => { if (capitalInflowToDelete) { deleteCapitalInflow(capitalInflowToDelete.id); setCapitalInflowToDelete(null); } };
    
    const enrichedLiabilities: EnrichedLiability[] = useMemo(() => {
        const paymentsByLiability = debtPayments.reduce((acc: Record<string, number>, p: DebtPayment) => {
            acc[p.liabilityId] = (acc[p.liabilityId] || 0) + p.amount;
            return acc;
        }, {});
        return liabilities.map(l => {
            const paidAmount = paymentsByLiability[l.id] || 0;
            return { ...l, paidAmount, remainingAmount: l.totalAmount - paidAmount };
        });
    }, [liabilities, debtPayments]);

    const enrichedReceivables: EnrichedReceivable[] = useMemo(() => {
        const paymentsByReceivable = receivablePayments.reduce((acc: Record<string, number>, p: ReceivablePayment) => {
            acc[p.receivableId] = (acc[p.receivableId] || 0) + p.amount;
            return acc;
        }, {});
        return receivables.map(r => {
            const paidAmount = paymentsByReceivable[r.id] || 0;
            return { ...r, paidAmount, remainingAmount: r.totalAmount - paidAmount };
        });
    }, [receivables, receivablePayments]);

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


    const shortTermLiabilities = useMemo(() => enrichedLiabilities.filter(l => l.type === 'short-term'), [enrichedLiabilities]);
    const longTermLiabilities = useMemo(() => enrichedLiabilities.filter(l => l.type === 'long-term'), [enrichedLiabilities]);
    const shortTermReceivables = useMemo(() => enrichedReceivables.filter(r => r.type === 'short-term'), [enrichedReceivables]);
    const longTermReceivables = useMemo(() => enrichedReceivables.filter(r => r.type === 'long-term'), [enrichedReceivables]);
    const enrichedVndAssets = useMemo(() => enrichedAssets.filter(asset => asset.currency === 'VND'), [enrichedAssets]);

    const renderLiabilityTable = (liabilitiesToRender: EnrichedLiability[], title: string) => (
        <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4">{title}</h3>
            <Table>
                <TableHead><TableRow>
                    <TableHeader>Mô tả</TableHeader>
                    <TableHeader>Tổng nợ</TableHeader>
                    <TableHeader>Đã trả</TableHeader>
                    <TableHeader>Còn lại</TableHeader>
                    <TableHeader className="w-40">Tiến độ</TableHeader>
                    <TableHeader className="w-40">Trạng thái</TableHeader>
                    {!isReadOnly && <TableHeader className="w-24">Hành động</TableHeader>}
                </TableRow></TableHead>
                <TableBody>
                    {liabilitiesToRender.length > 0 ? liabilitiesToRender.map(l => (
                        <TableRow key={l.id}>
                            <TableCell className="font-medium text-white">{l.description}</TableCell>
                            <TableCell>{formatCurrency(l.totalAmount)}</TableCell>
                            <TableCell className="text-primary-400">{formatCurrency(l.paidAmount)}</TableCell>
                            <TableCell className="font-semibold text-yellow-400">{formatCurrency(l.remainingAmount)}</TableCell>
                            <TableCell><ProgressBar value={l.paidAmount} max={l.totalAmount} /></TableCell>
                            <TableCell>
                                {l.remainingAmount <= 0.001 ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-200 text-green-800">Đã thanh toán</span>
                                ) : (!isReadOnly && <Button size="sm" onClick={() => setPayingLiability(l)}>Thanh toán</Button>)}
                            </TableCell>
                            {!isReadOnly && (
                                <TableCell><div className="flex items-center space-x-3 justify-center">
                                    <button onClick={() => { setEditingLiability(l); setIsLiabilityModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                    <button onClick={() => handleDeleteLiabilityClick(l)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                </div></TableCell>
                            )}
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={!isReadOnly ? 7 : 6} className="text-center text-gray-500 py-8">
                                Không có công nợ nào trong mục này.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    const renderReceivableTable = (receivablesToRender: EnrichedReceivable[], title: string) => (
        <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-4">{title}</h3>
            <Table>
                <TableHead><TableRow>
                    <TableHeader>Mô tả</TableHeader>
                    <TableHeader>Tổng phải thu</TableHeader>
                    <TableHeader>Đã thu</TableHeader>
                    <TableHeader>Còn lại</TableHeader>
                    <TableHeader className="w-40">Tiến độ</TableHeader>
                    <TableHeader className="w-40">Trạng thái</TableHeader>
                    {!isReadOnly && <TableHeader className="w-24">Hành động</TableHeader>}
                </TableRow></TableHead>
                <TableBody>
                    {receivablesToRender.length > 0 ? receivablesToRender.map(r => (
                        <TableRow key={r.id}>
                            <TableCell className="font-medium text-white">{r.description}</TableCell>
                            <TableCell>{formatCurrency(r.totalAmount, r.currency)}</TableCell>
                            <TableCell className="text-primary-400">{formatCurrency(r.paidAmount, r.currency)}</TableCell>
                            <TableCell className="font-semibold text-yellow-400">{formatCurrency(r.remainingAmount, r.currency)}</TableCell>
                            <TableCell><ProgressBar value={r.paidAmount} max={r.totalAmount} /></TableCell>
                            <TableCell>
                                {r.remainingAmount <= 0.001 ? (
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-200 text-green-800">Đã thu đủ</span>
                                ) : (!isReadOnly && <Button size="sm" onClick={() => setCollectingReceivable(r)}>Thu nợ</Button>)}
                            </TableCell>
                            {!isReadOnly && (
                                <TableCell><div className="flex items-center space-x-3 justify-center">
                                    <button onClick={() => { setEditingReceivable(r); setIsReceivableModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                    <button onClick={() => handleDeleteReceivableClick(r)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                </div></TableCell>
                            )}
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={!isReadOnly ? 7 : 6} className="text-center text-gray-500 py-8">
                                Không có khoản phải thu nào trong mục này.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div>
            <Header title="Nguồn vốn" />
            <div className="space-y-8">
                {/* Capital Inflows Table */}
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

                {/* Liabilities Section */}
                <Card>
                    <CardHeader className="flex justify-between items-center">
                        <span>Công nợ Phải trả</span>
                        {!isReadOnly && <Button onClick={() => { setEditingLiability(undefined); setIsLiabilityModalOpen(true); }}><span className="flex items-center gap-2"><Plus /> Thêm Công nợ</span></Button>}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {renderLiabilityTable(shortTermLiabilities, "Công nợ Ngắn hạn")}
                        {renderLiabilityTable(longTermLiabilities, "Công nợ Dài hạn")}
                    </CardContent>
                </Card>

                {/* Receivables Section */}
                <Card>
                    <CardHeader className="flex justify-between items-center">
                        <span>Công nợ Phải thu</span>
                        {!isReadOnly && <Button onClick={() => { setEditingReceivable(undefined); setIsReceivableModalOpen(true); }}><span className="flex items-center gap-2"><Plus /> Thêm Khoản phải thu</span></Button>}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {renderReceivableTable(shortTermReceivables, "Phải thu Ngắn hạn")}
                        {renderReceivableTable(longTermReceivables, "Phải thu Dài hạn")}
                    </CardContent>
                </Card>

                {/* Modals */}
                {!isReadOnly && (
                    <>
                        <Modal isOpen={isLiabilityModalOpen} onClose={() => setIsLiabilityModalOpen(false)} title={editingLiability ? 'Sửa công nợ' : 'Thêm công nợ mới'}>
                            <LiabilityForm liability={editingLiability} onSave={handleSaveLiability} onCancel={() => setIsLiabilityModalOpen(false)} />
                        </Modal>
                        <ConfirmationModal isOpen={!!liabilityToDelete} onClose={() => setLiabilityToDelete(null)} onConfirm={handleConfirmDeleteLiability} title="Xác nhận xóa công nợ" message={`Bạn có chắc muốn xóa công nợ "${liabilityToDelete?.description}" không? Tất cả các giao dịch thanh toán liên quan cũng sẽ bị xóa.`} />
                        {payingLiability && <AssetDebtPaymentModal liability={payingLiability} vndAssets={enrichedVndAssets} onClose={() => setPayingLiability(null)} onSave={handleSaveDebtPayment} />}

                        <Modal isOpen={isReceivableModalOpen} onClose={() => setIsReceivableModalOpen(false)} title={editingReceivable ? 'Sửa khoản phải thu' : 'Thêm khoản phải thu mới'}>
                            <ReceivableForm receivable={editingReceivable} assets={assets} onSave={handleSaveReceivable} onCancel={() => setIsReceivableModalOpen(false)} />
                        </Modal>
                        <ConfirmationModal isOpen={!!receivableToDelete} onClose={() => setReceivableToDelete(null)} onConfirm={handleConfirmDeleteReceivable} title="Xác nhận xóa khoản phải thu" message={`Bạn có chắc muốn xóa khoản phải thu "${receivableToDelete?.description}" không? Tất cả các giao dịch thu tiền liên quan cũng sẽ bị xóa.`} />
                        {collectingReceivable && <ReceivablePaymentModal receivable={collectingReceivable} assets={assets} onClose={() => setCollectingReceivable(null)} onSave={handleSaveReceivablePayment} />}

                        <Modal isOpen={isCapitalInflowModalOpen} onClose={() => setIsCapitalInflowModalOpen(false)} title={editingCapitalInflow ? 'Sửa Vốn góp/Đầu tư' : 'Thêm Vốn góp/Đầu tư'}>
                            <CapitalInflowForm inflow={editingCapitalInflow} assets={assets} partners={partners} onSave={handleSaveCapitalInflow} onCancel={() => setIsCapitalInflowModalOpen(false)} />
                        </Modal>
                        <ConfirmationModal isOpen={!!capitalInflowToDelete} onClose={() => setCapitalInflowToDelete(null)} onConfirm={handleConfirmDeleteCapitalInflow} title="Xác nhận xóa giao dịch" message={`Bạn có chắc muốn xóa giao dịch vốn góp "${capitalInflowToDelete?.description}" không?`} />
                    </>
                )}
            </div>
        </div>
    );
}