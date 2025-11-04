



import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Liability, Asset, Receivable, ReceivablePayment, DebtPayment } from '../types';
import { Header } from '../components/Header';
// FIX: Import CardHeader component.
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { formatCurrency, isDateInPeriod, formatDate } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';

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
    const { liabilities, debtPayments, assets, addDebtPayment, updateLiability, currentPeriod, isReadOnly } = useData();
    const [payingDebtItem, setPayingDebtItem] = useState<DebtItem | null>(null);

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
    
    const handleSavePayment = (payment: { liabilityId: string; amount: number; assetId: string, date: string }) => {
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
    
    const isActionDisabled = isReadOnly || !currentPeriod;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>Nợ phải trả đến hạn trong kỳ</CardHeader>
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
                                        Không có công nợ nào đến hạn trong kỳ này.
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
                    onSave={handleSavePayment}
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

const ReceivablePaymentModal: React.FC<{
    receivableItem: ReceivableItem;
    assets: Asset[];
    onClose: () => void;
    onSave: (payment: Omit<ReceivablePayment, 'id'>) => void;
}> = ({ receivableItem, assets, onClose, onSave }) => {
    const { currentPeriod } = useData();
    const receivableAssets = useMemo(() => assets.filter(a => a.currency === receivableItem.receivable.currency), [assets, receivableItem]);
    
    const amountLeftToPayThisPeriod = Math.max(0, receivableItem.dueThisPeriod - receivableItem.paidThisPeriod);
    const defaultAmount = Math.min(amountLeftToPayThisPeriod, receivableItem.remainingAmount);

    const [amount, setAmount] = useState(defaultAmount);
    const [assetId, setAssetId] = useState(receivableAssets[0]?.id || '');
    const [date, setDate] = useState(currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId || amount <= 0) {
            alert("Vui lòng chọn tài sản và nhập số tiền hợp lệ.");
            return;
        }
        if (amount > receivableItem.remainingAmount) {
            alert(`Số tiền nhận không thể lớn hơn số tiền còn lại (${formatCurrency(receivableItem.remainingAmount, receivableItem.receivable.currency)}).`);
            return;
        }
        onSave({ receivableId: receivableItem.receivable.id, amount, assetId, date });
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <Modal isOpen={true} onClose={onClose} title={`Nhận thanh toán cho: ${receivableItem.receivable.description}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="rec-pay-date">Ngày nhận</Label>
                    <Input id="rec-pay-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="rec-pay-amount">Số tiền ({receivableItem.receivable.currency})</Label>
                    <NumberInput id="rec-pay-amount" value={amount} onValueChange={setAmount} />
                     <div className="text-xs text-gray-400 mt-1 flex flex-col gap-1 sm:flex-row sm:justify-between">
                        <span>Cần thu kỳ này: {formatCurrency(amountLeftToPayThisPeriod, receivableItem.receivable.currency)}</span>
                        <span>Tổng còn lại: {formatCurrency(receivableItem.remainingAmount, receivableItem.receivable.currency)}</span>
                    </div>
                </div>
                <div>
                    <Label htmlFor="rec-pay-asset">Tài sản nhận</Label>
                    <select id="rec-pay-asset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
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

const ReceivablesContent = () => {
    const { assets, receivables, receivablePayments, updateReceivable, addReceivablePayment, isReadOnly, currentPeriod } = useData();
    const [receivableToPay, setReceivableToPay] = useState<ReceivableItem | null>(null);

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
    
    const handleSavePayment = (payment: Omit<ReceivablePayment, 'id'>) => {
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

    return (
        <div className="space-y-8">
             <Card>
                <CardHeader>Nợ phải thu đến hạn trong kỳ</CardHeader>
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
                                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">Chưa có khoản phải thu nào đến hạn trong kỳ.</TableCell>
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
                    onSave={handleSavePayment}
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
    const [activeTab, setActiveTab] = useState<'payable' | 'receivable'>('payable');

    return (
        <div>
            <Header title="Công nợ & Phải thu trong kỳ" />
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
        </div>
    );
}