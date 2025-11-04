import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Liability, Asset, Receivable, ReceivablePayment, DebtPayment, PeriodLiability, PeriodReceivable } from '../types';
import { Header } from '../components/Header';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { formatCurrency, isDateInPeriod, formatDate } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { Plus, Edit, Trash2 } from '../components/icons/IconComponents';

// #region --- Period Liability (Nợ trong kỳ) Components ---

const PeriodLiabilityForm: React.FC<{
    liability?: PeriodLiability;
    onSave: (liability: Omit<PeriodLiability, 'id' | 'period' | 'isPaid'>) => void;
    onCancel: () => void;
}> = ({ liability, onSave, onCancel }) => {
    const { currentPeriod } = useData();
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(liability?.date || defaultDate);
    const [description, setDescription] = useState(liability?.description || '');
    const [amount, setAmount] = useState(liability?.amount || 0);
    const [currency, setCurrency] = useState<Asset['currency']>(liability?.currency || 'VND');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ date, description, amount, currency });
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="pl-date">Ngày</Label>
                <Input id="pl-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
                <Label htmlFor="pl-desc">Mô tả</Label>
                <Input id="pl-desc" value={description} onChange={e => setDescription(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="pl-amount">Số tiền</Label>
                    <NumberInput id="pl-amount" value={amount} onValueChange={setAmount} required />
                </div>
                 <div>
                    <Label htmlFor="pl-currency">Loại tiền</Label>
                    <select id="pl-currency" value={currency} onChange={e => setCurrency(e.target.value as Asset['currency'])} className={selectClassName}>
                        <option value="VND">VND</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

const MarkAsPaidModal: React.FC<{
    liability: PeriodLiability;
    assets: Asset[];
    onClose: () => void;
    onSave: (paymentInfo: { paymentDate: string; paymentAssetId: string; }) => void;
}> = ({ liability, assets, onClose, onSave }) => {
    const payableAssets = useMemo(() => assets.filter(a => a.currency === liability.currency), [assets, liability]);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentAssetId, setPaymentAssetId] = useState(payableAssets[0]?.id || '');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!paymentAssetId) {
            alert("Vui lòng chọn tài sản thanh toán.");
            return;
        }
        onSave({ paymentDate, paymentAssetId });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Thanh toán nợ: ${liability.description}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="pl-payment-date">Ngày thanh toán</Label>
                    <Input id="pl-payment-date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="pl-payment-asset">Tài sản thanh toán</Label>
                    <select id="pl-payment-asset" value={paymentAssetId} onChange={e => setPaymentAssetId(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" required>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {payableAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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


// #endregion

// #region --- Period Receivable (Phải thu trong kỳ) Components ---

const PeriodReceivableForm: React.FC<{
    receivable?: PeriodReceivable;
    onSave: (receivable: Omit<PeriodReceivable, 'id' | 'period' | 'isReceived'>) => void;
    onCancel: () => void;
}> = ({ receivable, onSave, onCancel }) => {
    const { currentPeriod } = useData();
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(receivable?.date || defaultDate);
    const [description, setDescription] = useState(receivable?.description || '');
    const [amount, setAmount] = useState(receivable?.amount || 0);
    const [currency, setCurrency] = useState<Asset['currency']>(receivable?.currency || 'VND');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ date, description, amount, currency });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="pr-date">Ngày</Label>
                <Input id="pr-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
                <Label htmlFor="pr-desc">Mô tả</Label>
                <Input id="pr-desc" value={description} onChange={e => setDescription(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="pr-amount">Số tiền</Label>
                    <NumberInput id="pr-amount" value={amount} onValueChange={setAmount} required />
                </div>
                <div>
                    <Label htmlFor="pr-currency">Loại tiền</Label>
                    <select id="pr-currency" value={currency} onChange={e => setCurrency(e.target.value as Asset['currency'])} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="VND">VND</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

const MarkAsReceivedModal: React.FC<{
    receivable: PeriodReceivable;
    assets: Asset[];
    onClose: () => void;
    onSave: (receiptInfo: { receiptDate: string; receiptAssetId: string; }) => void;
}> = ({ receivable, assets, onClose, onSave }) => {
    const receivableAssets = useMemo(() => assets.filter(a => a.currency === receivable.currency), [assets, receivable]);
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
    const [receiptAssetId, setReceiptAssetId] = useState(receivableAssets[0]?.id || '');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!receiptAssetId) {
            alert("Vui lòng chọn tài sản nhận tiền.");
            return;
        }
        onSave({ receiptDate, receiptAssetId });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Thu tiền: ${receivable.description}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="pr-receipt-date">Ngày nhận</Label>
                    <Input id="pr-receipt-date" type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="pr-receipt-asset">Tài sản nhận</Label>
                    <select id="pr-receipt-asset" value={receiptAssetId} onChange={e => setReceiptAssetId(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" required>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {receivableAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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

// #endregion

// #region --- Liabilities (Nợ Phải Trả) Components ---

type DebtItem = {
    liability: Liability;
    creationDate: string;
    inflowAssetName: string;
    dueThisPeriod: number;
    paidThisPeriod: number;
    totalRemaining: number;
    isPaid: boolean;
    completionDate?: string;
};

const DebtPaymentModal: React.FC<{
    debtItem: DebtItem;
    assets: Asset[];
    onClose: () => void;
    onSave: (payment: { liabilityId: string; amount: number; assetId: string, date: string }) => void;
}> = ({ debtItem, assets, onClose, onSave }) => {
    const { currentPeriod } = useData();
    const payableAssets = useMemo(() => assets.filter(a => a.currency === debtItem.liability.currency), [assets, debtItem]);
    
    const amountLeftToPayThisPeriod = Math.max(0, debtItem.dueThisPeriod - debtItem.paidThisPeriod);
    const defaultAmount = Math.min(amountLeftToPayThisPeriod, debtItem.totalRemaining);

    const [amount, setAmount] = useState(defaultAmount);
    const [assetId, setAssetId] = useState(payableAssets[0]?.id || '');
    const [date, setDate] = useState(currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId || amount <= 0) {
            alert("Vui lòng chọn tài sản và nhập số tiền hợp lệ.");
            return;
        }
        if (amount > debtItem.totalRemaining) {
            alert(`Số tiền trả không thể lớn hơn tổng nợ còn lại (${formatCurrency(debtItem.totalRemaining, debtItem.liability.currency)}).`);
            return;
        }
        onSave({ liabilityId: debtItem.liability.id, amount, assetId, date });
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Trả nợ: ${debtItem.liability.description}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label>Công nợ</Label>
                    <Input value={debtItem.liability.description} readOnly className="bg-gray-700" />
                </div>
                <div>
                    <Label htmlFor="paymentDate">Ngày trả</Label>
                    <Input id="paymentDate" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="paymentAmount">Số tiền trả ({debtItem.liability.currency})</Label>
                    <NumberInput id="paymentAmount" value={amount} onValueChange={setAmount} />
                    <div className="text-xs text-gray-400 mt-1 flex flex-col gap-1 sm:flex-row sm:justify-between">
                        <span>Kỳ này: {formatCurrency(debtItem.dueThisPeriod, debtItem.liability.currency)}</span>
                        <span>Tổng còn lại: {formatCurrency(debtItem.totalRemaining, debtItem.liability.currency)}</span>
                    </div>
                </div>
                <div>
                    <Label htmlFor="paymentAsset">Nguồn tiền</Label>
                    <select id="paymentAsset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {payableAssets.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, a.currency)})</option>)}
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

const LiabilitiesContent = () => {
    const { 
        liabilities, debtPayments, assets, addDebtPayment, updateLiability, currentPeriod, isReadOnly,
        periodLiabilities, updatePeriodLiability, deletePeriodLiability
    } = useData();
    const [payingDebtItem, setPayingDebtItem] = useState<DebtItem | null>(null);
    const [editingPeriodLiability, setEditingPeriodLiability] = useState<PeriodLiability | undefined>(undefined);
    const [deletingPeriodLiability, setDeletingPeriodLiability] = useState<PeriodLiability | null>(null);
    const [payingPeriodLiability, setPayingPeriodLiability] = useState<PeriodLiability | null>(null);

    const assetMap = useMemo(() => new Map(assets.map(a => [a.id, a])), [assets]);

    const monthlyDebtItems = useMemo<DebtItem[]>(() => {
        if (!currentPeriod) return [];
        
        const debtItems: DebtItem[] = [];
        const periodPayments = debtPayments.filter(p => isDateInPeriod(p.date, currentPeriod));

        for (const liability of liabilities) {
            const totalPaid = debtPayments
                .filter(p => p.liabilityId === liability.id)
                .reduce((acc, p) => acc + p.amount, 0);

            const totalRemaining = liability.totalAmount - totalPaid;
            const isPaid = totalRemaining <= 0.001;
            
            const paidThisPeriod = periodPayments
                .filter(p => p.liabilityId === liability.id)
                .reduce((acc, p) => acc + p.amount, 0);

            const inflowAssetName = liability.inflowAssetId ? (assetMap.get(liability.inflowAssetId)?.name || 'N/A') : '—';
            
            let dueThisPeriod = 0;

            if (liability.isInstallment) {
                if (!liability.startDate || liability.startDate.trim() === '' || !liability.numberOfInstallments || liability.numberOfInstallments <= 0) {
                     dueThisPeriod = 0;
                } else {
                    const monthlyInstallment = liability.totalAmount / liability.numberOfInstallments;
                    const [startYear, startMonth] = liability.startDate.split('-').map(Number);
                    const startDateObj = new Date(startYear, startMonth - 1, 1);

                    let totalDueUpToThisMonth = 0;
                    for (let i = 0; i < liability.numberOfInstallments; i++) {
                        const installmentDate = new Date(startDateObj);
                        installmentDate.setMonth(installmentDate.getMonth() + i);

                        const year = installmentDate.getFullYear();
                        const month = (installmentDate.getMonth() + 1).toString().padStart(2, '0');
                        const installmentPeriod = `${year}-${month}`;

                        if (installmentPeriod <= currentPeriod) {
                            totalDueUpToThisMonth += monthlyInstallment;
                        }
                    }
                    
                    const totalPaidBeforeThisMonth = totalPaid - paidThisPeriod;
                    dueThisPeriod = Math.max(0, totalDueUpToThisMonth - totalPaidBeforeThisMonth);
                }
            } else { 
                dueThisPeriod = totalRemaining + paidThisPeriod;
            }
            
            debtItems.push({
                liability,
                creationDate: liability.creationDate,
                inflowAssetName,
                dueThisPeriod,
                paidThisPeriod,
                totalRemaining,
                isPaid,
                completionDate: liability.completionDate,
            });
        }

        return debtItems
            .filter(item => item.dueThisPeriod > 0 || item.paidThisPeriod > 0)
            .sort((a,b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

    }, [liabilities, debtPayments, currentPeriod, assetMap]);
    
    const handleSaveLongTermPayment = (payment: { liabilityId: string; amount: number; assetId: string, date: string }) => {
        addDebtPayment(payment);

        const liability = liabilities.find(l => l.id === payment.liabilityId);
        if (!liability) return;

        const allPaymentsForDebt = [...debtPayments, payment];
        const totalPaid = allPaymentsForDebt
            .filter(p => p.liabilityId === liability.id)
            .reduce((acc, p) => acc + p.amount, 0);

        if (totalPaid >= liability.totalAmount) {
            updateLiability({ ...liability, completionDate: payment.date });
        }

        setPayingDebtItem(null);
    };

    const periodLiabilitiesForCurrentPeriod = useMemo(() => {
        if (!currentPeriod) return [];
        return periodLiabilities
            .filter(l => l.period === currentPeriod)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [periodLiabilities, currentPeriod]);

    const handleSavePeriodPayment = (paymentInfo: { paymentDate: string; paymentAssetId: string; }) => {
        if (payingPeriodLiability) {
            updatePeriodLiability({ ...payingPeriodLiability, isPaid: true, ...paymentInfo });
            setPayingPeriodLiability(null);
        }
    };
    
    const isActionDisabled = isReadOnly || !currentPeriod;

    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>Nợ phát sinh trong kỳ</CardHeader>
                <CardContent>
                     <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Mô tả</TableHeader>
                                <TableHeader>Ngày</TableHeader>
                                <TableHeader>Số tiền</TableHeader>
                                <TableHeader>Trạng thái</TableHeader>
                                {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {periodLiabilitiesForCurrentPeriod.length > 0 ? periodLiabilitiesForCurrentPeriod.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium text-white">{item.description}</TableCell>
                                    <TableCell>{formatDate(item.date)}</TableCell>
                                    <TableCell className="font-semibold text-yellow-400">{formatCurrency(item.amount, item.currency)}</TableCell>
                                    <TableCell>
                                        {item.isPaid ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-200 text-green-800">
                                                Đã trả
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-200 text-yellow-800">
                                                Chưa trả
                                            </span>
                                        )}
                                    </TableCell>
                                    {!isReadOnly && (
                                        <TableCell>
                                            <div className="flex items-center space-x-3 justify-center">
                                                {!item.isPaid && <Button size="sm" onClick={() => setPayingPeriodLiability(item)}>Thanh toán</Button>}
                                                <button onClick={() => setEditingPeriodLiability(item)} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                <button onClick={() => setDeletingPeriodLiability(item)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={!isReadOnly ? 5 : 4} className="text-center text-gray-500 py-8">
                                        Không có khoản nợ nào phát sinh trong kỳ.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>Nợ dài hạn &amp; trả góp</CardHeader>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Mô tả</TableHeader>
                                <TableHeader>Tài sản nhận (nếu có)</TableHeader>
                                <TableHeader>Cần trả kỳ này</TableHeader>
                                <TableHeader>Đã trả trong kỳ</TableHeader>
                                <TableHeader>Tổng còn lại</TableHeader>
                                <TableHeader>Trạng thái</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {monthlyDebtItems.length > 0 ? monthlyDebtItems.map(item => (
                                <TableRow key={item.liability.id}>
                                    <TableCell className="font-medium text-white">{item.liability.description}</TableCell>
                                    <TableCell>{item.inflowAssetName}</TableCell>
                                    <TableCell className="text-yellow-400 font-semibold">{formatCurrency(item.dueThisPeriod, item.liability.currency)}</TableCell>
                                    <TableCell className="text-green-400">{formatCurrency(item.paidThisPeriod, item.liability.currency)}</TableCell>
                                    <TableCell>{formatCurrency(item.totalRemaining, item.liability.currency)}</TableCell>
                                    <TableCell>
                                        {item.isPaid ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-200 text-green-800">
                                                Đã hoàn tất
                                            </span>
                                        ) : item.dueThisPeriod > item.paidThisPeriod ? (
                                            !isActionDisabled && (
                                                <Button size="sm" onClick={() => setPayingDebtItem(item)}>Thanh toán</Button>
                                            )
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">
                                                Đã trả đủ kỳ này
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                        Không có công nợ dài hạn nào đến hạn trong kỳ này.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {payingDebtItem && (
                <DebtPaymentModal
                    debtItem={payingDebtItem}
                    assets={assets}
                    onClose={() => setPayingDebtItem(null)}
                    onSave={handleSaveLongTermPayment}
                />
            )}
            
            {payingPeriodLiability && (
                <MarkAsPaidModal 
                    liability={payingPeriodLiability}
                    assets={assets}
                    onClose={() => setPayingPeriodLiability(null)}
                    onSave={handleSavePeriodPayment}
                />
            )}

            {deletingPeriodLiability && (
                <ConfirmationModal 
                    isOpen={true}
                    onClose={() => setDeletingPeriodLiability(null)}
                    onConfirm={() => {
                        deletePeriodLiability(deletingPeriodLiability.id);
                        setDeletingPeriodLiability(null);
                    }}
                    title="Xác nhận xóa"
                    message={`Bạn có chắc muốn xóa khoản nợ "${deletingPeriodLiability.description}" không?`}
                />
            )}
        </div>
    );
}

// #endregion

// #region --- Receivables (Nợ Phải Thu) Components ---

type ReceivableItem = {
    receivable: Receivable;
    paidAmount: number;
    paidThisPeriod: number;
    remainingAmount: number;
    isPaid: boolean;
    outflowAssetName: string;
    dueThisPeriod: number;
};

const ReceivablesContent = () => {
    const { 
        assets, receivables, receivablePayments, updateReceivable, addReceivablePayment, isReadOnly, currentPeriod,
        periodReceivables, updatePeriodReceivable, deletePeriodReceivable
    } = useData();
    const [receivableToPay, setReceivableToPay] = useState<ReceivableItem | null>(null);
    const [editingPeriodReceivable, setEditingPeriodReceivable] = useState<PeriodReceivable | undefined>(undefined);
    const [deletingPeriodReceivable, setDeletingPeriodReceivable] = useState<PeriodReceivable | null>(null);
    const [receivingPeriodReceivable, setReceivingPeriodReceivable] = useState<PeriodReceivable | null>(null);

// FIX: Define `ReceivablePaymentModal` to resolve the "Cannot find name" error.
    const ReceivablePaymentModal: React.FC<{
        receivableItem: ReceivableItem;
        assets: Asset[];
        onClose: () => void;
        onSave: (payment: Omit<ReceivablePayment, 'id'>) => void;
    }> = ({ receivableItem, assets, onClose, onSave }) => {
        const { currentPeriod } = useData();
        const receivable = receivableItem.receivable;
        const receivableAssets = useMemo(() => assets.filter(a => a.currency === receivable.currency), [assets, receivable]);
        
        const amountLeftToReceiveThisPeriod = Math.max(0, receivableItem.dueThisPeriod - receivableItem.paidThisPeriod);
        const defaultAmount = Math.min(amountLeftToReceiveThisPeriod, receivableItem.remainingAmount);

        const [amount, setAmount] = useState(defaultAmount);
        const [assetId, setAssetId] = useState(receivableAssets.find(a => a.currency === receivable.currency)?.id || '');
        const [date, setDate] = useState(currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0]);

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (!assetId || amount <= 0) {
                alert("Vui lòng chọn tài sản và nhập số tiền hợp lệ.");
                return;
            }
            if (amount > receivableItem.remainingAmount) {
                alert(`Số tiền nhận không thể lớn hơn số tiền còn lại (${formatCurrency(receivableItem.remainingAmount, receivable.currency)}).`);
                return;
            }
            onSave({ receivableId: receivable.id, amount, assetId, date });
        };

        const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
        
        return (
            <Modal isOpen={true} onClose={onClose} title={`Thu nợ: ${receivable.description}`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="rec-paymentDate">Ngày nhận</Label>
                        <Input id="rec-paymentDate" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="rec-paymentAmount">Số tiền nhận ({receivable.currency})</Label>
                        <NumberInput id="rec-paymentAmount" value={amount} onValueChange={setAmount} />
                        <div className="text-xs text-gray-400 mt-1 flex flex-col gap-1 sm:flex-row sm:justify-between">
                            <span>Cần thu kỳ này: {formatCurrency(receivableItem.dueThisPeriod, receivable.currency)}</span>
                            <span>Tổng còn lại: {formatCurrency(receivableItem.remainingAmount, receivable.currency)}</span>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="rec-paymentAsset">Tài sản nhận</Label>
                        <select id="rec-paymentAsset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                            <option value="" disabled>-- Chọn tài sản --</option>
                            {receivableAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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
    const assetMap = useMemo(() => new Map(assets.map(a => [a.id, a.name])), [assets]);
    
    const enrichedReceivables = useMemo<ReceivableItem[]>(() => {
        if (!currentPeriod) return [];
        return receivables.map(r => {
            const allPayments = receivablePayments.filter(p => p.receivableId === r.id);
            const paidAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
            const remainingAmount = r.totalAmount - paidAmount;
            const isPaid = remainingAmount <= 0.001;
            const paidThisPeriod = allPayments
                .filter(p => isDateInPeriod(p.date, currentPeriod))
                .reduce((sum, p) => sum + p.amount, 0);

            let dueThisPeriod = 0;
            if (r.isInstallment) {
                if (!r.startDate || r.startDate.trim() === '' || !r.numberOfInstallments || r.numberOfInstallments <= 0) {
                    dueThisPeriod = 0;
                } else {
                    const monthlyInstallment = r.totalAmount / r.numberOfInstallments;
                    const [startYear, startMonth] = r.startDate.split('-').map(Number);
                    const startDateObj = new Date(startYear, startMonth - 1, 1);

                    let totalDueUpToThisMonth = 0;
                    for (let i = 0; i < r.numberOfInstallments; i++) {
                        const installmentDate = new Date(startDateObj);
                        installmentDate.setMonth(installmentDate.getMonth() + i);
                        const year = installmentDate.getFullYear();
                        const month = (installmentDate.getMonth() + 1).toString().padStart(2, '0');
                        const installmentPeriod = `${year}-${month}`;

                        if (installmentPeriod <= currentPeriod) {
                            totalDueUpToThisMonth += monthlyInstallment;
                        }
                    }
                    const totalPaidBeforeThisMonth = paidAmount - paidThisPeriod;
                    dueThisPeriod = Math.max(0, totalDueUpToThisMonth - totalPaidBeforeThisMonth);
                }
            } else {
                dueThisPeriod = remainingAmount + paidThisPeriod;
            }

            return {
                receivable: r,
                paidAmount,
                paidThisPeriod,
                remainingAmount,
                isPaid,
                outflowAssetName: assetMap.get(r.outflowAssetId) || 'N/A',
                dueThisPeriod,
            };
        }).filter(item => item.dueThisPeriod > 0 || item.paidThisPeriod > 0)
          .sort((a,b) => new Date(b.receivable.creationDate).getTime() - new Date(a.receivable.creationDate).getTime());
    }, [receivables, receivablePayments, assetMap, currentPeriod]);
    
    const handleSaveLongTermPayment = (payment: Omit<ReceivablePayment, 'id'>) => {
        addReceivablePayment(payment);

        const receivable = receivables.find(r => r.id === payment.receivableId);
        if (!receivable) return;

        const allPaymentsForReceivable = [...receivablePayments, payment];
        const totalPaid = allPaymentsForReceivable
            .filter(p => p.receivableId === receivable.id)
            .reduce((acc, p) => acc + p.amount, 0);

        if (totalPaid >= receivable.totalAmount) {
            updateReceivable({ ...receivable, completionDate: payment.date });
        }
        setReceivableToPay(null);
    };

     const periodReceivablesForCurrentPeriod = useMemo(() => {
        if (!currentPeriod) return [];
        return periodReceivables
            .filter(r => r.period === currentPeriod)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [periodReceivables, currentPeriod]);

    const handleSavePeriodReceipt = (receiptInfo: { receiptDate: string; receiptAssetId: string; }) => {
        if (receivingPeriodReceivable) {
            updatePeriodReceivable({ ...receivingPeriodReceivable, isReceived: true, ...receiptInfo });
            setReceivingPeriodReceivable(null);
        }
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>Khoản phải thu trong kỳ</CardHeader>
                <CardContent>
                     <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Mô tả</TableHeader>
                                <TableHeader>Ngày</TableHeader>
                                <TableHeader>Số tiền</TableHeader>
                                <TableHeader>Trạng thái</TableHeader>
                                {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {periodReceivablesForCurrentPeriod.length > 0 ? periodReceivablesForCurrentPeriod.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium text-white">{item.description}</TableCell>
                                    <TableCell>{formatDate(item.date)}</TableCell>
                                    <TableCell className="font-semibold text-green-400">{formatCurrency(item.amount, item.currency)}</TableCell>
                                    <TableCell>
                                        {item.isReceived ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-200 text-green-800">
                                                Đã thu
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-200 text-yellow-800">
                                                Chưa thu
                                            </span>
                                        )}
                                    </TableCell>
                                    {!isReadOnly && (
                                        <TableCell>
                                            <div className="flex items-center space-x-3 justify-center">
                                                {!item.isReceived && <Button size="sm" onClick={() => setReceivingPeriodReceivable(item)}>Thu tiền</Button>}
                                                <button onClick={() => setEditingPeriodReceivable(item)} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                <button onClick={() => setDeletingPeriodReceivable(item)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={!isReadOnly ? 5 : 4} className="text-center text-gray-500 py-8">
                                        Không có khoản phải thu nào trong kỳ.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>Khoản phải thu dài hạn</CardHeader>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Mô tả</TableHeader>
                                <TableHeader>Nguồn đã chi</TableHeader>
                                <TableHeader>Cần thu kỳ này</TableHeader>
                                <TableHeader>Đã thu trong kỳ</TableHeader>
                                <TableHeader>Tổng còn lại</TableHeader>
                                <TableHeader>Trạng thái</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {enrichedReceivables.length > 0 ? enrichedReceivables.map(item => (
                                <TableRow key={item.receivable.id}>
                                    <TableCell className="font-medium text-white">{item.receivable.description}</TableCell>
                                    <TableCell>{item.outflowAssetName}</TableCell>
                                    <TableCell className="font-semibold text-yellow-400">{formatCurrency(item.dueThisPeriod, item.receivable.currency)}</TableCell>
                                    <TableCell className="text-green-400">{formatCurrency(item.paidThisPeriod, item.receivable.currency)}</TableCell>
                                    <TableCell>{formatCurrency(item.remainingAmount, item.receivable.currency)}</TableCell>
                                    <TableCell>
                                        {item.isPaid ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-200 text-green-800">
                                                Đã hoàn tất
                                            </span>
                                        ) : item.dueThisPeriod > item.paidThisPeriod ? (
                                            !isReadOnly && (
                                                <Button size="sm" onClick={() => setReceivableToPay(item)}>Thu nợ</Button>
                                            )
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">
                                                Đã thu đủ kỳ này
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">Chưa có khoản phải thu dài hạn nào đến hạn trong kỳ.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {!isReadOnly && receivableToPay && (
                <ReceivablePaymentModal
                    receivableItem={receivableToPay}
                    assets={assets}
                    onClose={() => setReceivableToPay(null)}
                    onSave={handleSaveLongTermPayment}
                />
            )}
            {!isReadOnly && receivingPeriodReceivable && (
                <MarkAsReceivedModal 
                    receivable={receivingPeriodReceivable}
                    assets={assets}
                    onClose={() => setReceivingPeriodReceivable(null)}
                    onSave={handleSavePeriodReceipt}
                />
            )}

            {deletingPeriodReceivable && (
                <ConfirmationModal 
                    isOpen={true}
                    onClose={() => setDeletingPeriodReceivable(null)}
                    onConfirm={() => {
                        deletePeriodReceivable(deletingPeriodReceivable.id);
                        setDeletingPeriodReceivable(null);
                    }}
                    title="Xác nhận xóa"
                    message={`Bạn có chắc muốn xóa khoản phải thu "${deletingPeriodReceivable.description}" không?`}
                />
            )}
        </div>
    );
};

// #endregion


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

export default function DebtsReceivables() {
    const { isReadOnly, addPeriodLiability, addPeriodReceivable, updatePeriodLiability, updatePeriodReceivable } = useData();
    const [activeTab, setActiveTab] = useState<'payable' | 'receivable'>('payable');
    const [isLiabilityModalOpen, setLiabilityModalOpen] = useState(false);
    const [isReceivableModalOpen, setReceivableModalOpen] = useState(false);
    const [editingLiability, setEditingLiability] = useState<PeriodLiability | undefined>(undefined);
    const [editingReceivable, setEditingReceivable] = useState<PeriodReceivable | undefined>(undefined);
    
    const handleSavePeriodLiability = (data: Omit<PeriodLiability, 'id' | 'period' | 'isPaid'>) => {
        if (editingLiability) {
            updatePeriodLiability({ ...editingLiability, ...data });
        } else {
            addPeriodLiability({ ...data, isPaid: false });
        }
        setLiabilityModalOpen(false);
        setEditingLiability(undefined);
    };

    const handleSavePeriodReceivable = (data: Omit<PeriodReceivable, 'id' | 'period' | 'isReceived'>) => {
        if (editingReceivable) {
            updatePeriodReceivable({ ...editingReceivable, ...data });
        } else {
            addPeriodReceivable({ ...data, isReceived: false });
        }
        setReceivableModalOpen(false);
        setEditingReceivable(undefined);
    };


    return (
        <div>
            <Header title="Công nợ & Phải thu trong kỳ">
                {activeTab === 'payable' && !isReadOnly && (
                    <Button onClick={() => { setEditingLiability(undefined); setLiabilityModalOpen(true); }}>
                        <span className="flex items-center gap-2"><Plus /> Thêm nợ tháng</span>
                    </Button>
                )}
                {activeTab === 'receivable' && !isReadOnly && (
                    <Button onClick={() => { setEditingReceivable(undefined); setReceivableModalOpen(true); }}>
                        <span className="flex items-center gap-2"><Plus /> Thêm khoản phải thu tháng</span>
                    </Button>
                )}
            </Header>
             <div className="flex flex-wrap border-b border-gray-700 mb-6" role="tablist">
                <TabButton active={activeTab === 'payable'} onClick={() => setActiveTab('payable')}>
                    Nợ phải trả
                </TabButton>
                <TabButton active={activeTab === 'receivable'} onClick={() => setActiveTab('receivable')}>
                    Nợ phải thu
                </TabButton>
            </div>
             <div>
                {activeTab === 'payable' && <LiabilitiesContent />}
                {activeTab === 'receivable' && <ReceivablesContent />}
            </div>

            <Modal isOpen={isLiabilityModalOpen} onClose={() => setLiabilityModalOpen(false)} title={editingLiability ? "Sửa nợ trong kỳ" : "Thêm nợ trong kỳ"}>
                <PeriodLiabilityForm 
                    liability={editingLiability}
                    onSave={handleSavePeriodLiability}
                    onCancel={() => { setLiabilityModalOpen(false); setEditingLiability(undefined); }}
                />
            </Modal>
            
             <Modal isOpen={isReceivableModalOpen} onClose={() => setReceivableModalOpen(false)} title={editingReceivable ? "Sửa khoản phải thu trong kỳ" : "Thêm khoản phải thu trong kỳ"}>
                <PeriodReceivableForm
                    receivable={editingReceivable}
                    onSave={handleSavePeriodReceivable}
                    onCancel={() => { setReceivableModalOpen(false); setEditingReceivable(undefined); }}
                />
            </Modal>
        </div>
    );
}