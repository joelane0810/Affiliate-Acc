import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Liability, Asset, Receivable, ReceivablePayment, DebtPayment, PeriodLiability, PeriodReceivable } from '../types';
import * as T from '../types';
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
    onSave: (liability: Omit<PeriodLiability, 'id' | 'period' | 'workspaceId'>) => void;
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


// #endregion

// #region --- Period Receivable (Phải thu trong kỳ) Components ---

const PeriodReceivableForm: React.FC<{
    receivable?: PeriodReceivable;
    onSave: (receivable: Omit<PeriodReceivable, 'id' | 'period' | 'workspaceId'>) => void;
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

// #endregion

type EnrichedPeriodLiability = PeriodLiability & { paidAmount: number; remainingAmount: number; };
type EnrichedPeriodReceivable = PeriodReceivable & { paidAmount: number; remainingAmount: number; };

const PeriodDebtPaymentModal: React.FC<{
    liability: EnrichedPeriodLiability;
    assets: Asset[];
    onClose: () => void;
    onSave: (paymentInfo: Omit<T.PeriodDebtPayment, 'id' | 'workspaceId'>) => void;
}> = ({ liability, assets, onClose, onSave }) => {
    const payableAssets = useMemo(() => assets.filter(a => a.currency === liability.currency), [assets, liability]);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentAssetId, setPaymentAssetId] = useState(payableAssets[0]?.id || '');
    const [amount, setAmount] = useState(liability.remainingAmount);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!paymentAssetId) {
            alert("Vui lòng chọn tài sản thanh toán.");
            return;
        }
        if (amount <= 0 || amount > liability.remainingAmount) {
            alert(`Số tiền thanh toán phải lớn hơn 0 và không vượt quá số nợ còn lại (${formatCurrency(liability.remainingAmount, liability.currency)}).`);
            return;
        }
        onSave({ periodLiabilityId: liability.id, date: paymentDate, amount, assetId: paymentAssetId });
        onClose();
    };
    
    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Trả nợ trong kỳ: ${liability.description}`}>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="pdp-date">Ngày trả</Label>
                    <Input id="pdp-date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="pdp-amount">Số tiền trả ({liability.currency})</Label>
                    <NumberInput id="pdp-amount" value={amount} onValueChange={setAmount} />
                </div>
                 <div>
                    <Label htmlFor="pdp-asset">Nguồn tiền</Label>
                    <select id="pdp-asset" value={paymentAssetId} onChange={e => setPaymentAssetId(e.target.value)} className={selectClassName} required>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {payableAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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

const PeriodReceivablePaymentModal: React.FC<{
    receivable: EnrichedPeriodReceivable;
    assets: Asset[];
    onClose: () => void;
    onSave: (paymentInfo: Omit<T.PeriodReceivablePayment, 'id' | 'workspaceId'>) => void;
}> = ({ receivable, assets, onClose, onSave }) => {
    const receivableAssets = useMemo(() => assets.filter(a => a.currency === receivable.currency), [assets, receivable]);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentAssetId, setPaymentAssetId] = useState(receivableAssets[0]?.id || '');
    const [amount, setAmount] = useState(receivable.remainingAmount);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!paymentAssetId) {
            alert("Vui lòng chọn tài sản nhận tiền.");
            return;
        }
        if (amount <= 0 || amount > receivable.remainingAmount) {
            alert(`Số tiền thu phải lớn hơn 0 và không vượt quá số tiền còn lại (${formatCurrency(receivable.remainingAmount, receivable.currency)}).`);
            return;
        }
        onSave({ periodReceivableId: receivable.id, date: paymentDate, amount, assetId: paymentAssetId });
        onClose();
    };
    
    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Thu nợ trong kỳ: ${receivable.description}`}>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="prp-date">Ngày thu</Label>
                    <Input id="prp-date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="prp-amount">Số tiền thu ({receivable.currency})</Label>
                    <NumberInput id="prp-amount" value={amount} onValueChange={setAmount} />
                </div>
                 <div>
                    <Label htmlFor="prp-asset">Tài sản nhận</Label>
                    <select id="prp-asset" value={paymentAssetId} onChange={e => setPaymentAssetId(e.target.value)} className={selectClassName} required>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {receivableAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button type="submit">Xác nhận thu</Button>
                </div>
            </form>
        </Modal>
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

export default function DebtsReceivables() {
    const { 
        periodLiabilities, addPeriodLiability, updatePeriodLiability, deletePeriodLiability,
        periodDebtPayments, addPeriodDebtPayment,
        periodReceivables, addPeriodReceivable, updatePeriodReceivable, deletePeriodReceivable,
        periodReceivablePayments, addPeriodReceivablePayment,
        assets, isReadOnly, currentPeriod
    } = useData();

    const [activeTab, setActiveTab] = useState<'debts' | 'receivables'>('debts');

    const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
    const [editingLiability, setEditingLiability] = useState<PeriodLiability | undefined>(undefined);
    const [liabilityToDelete, setLiabilityToDelete] = useState<PeriodLiability | null>(null);
    const [payingLiability, setPayingLiability] = useState<EnrichedPeriodLiability | null>(null);
    
    const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);
    const [editingReceivable, setEditingReceivable] = useState<PeriodReceivable | undefined>(undefined);
    const [receivableToDelete, setReceivableToDelete] = useState<PeriodReceivable | null>(null);
    const [collectingReceivable, setCollectingReceivable] = useState<EnrichedPeriodReceivable | null>(null);
    
    const enrichedPeriodLiabilities: EnrichedPeriodLiability[] = useMemo(() => {
        const paymentsByLiability = periodDebtPayments.reduce((acc: Record<string, number>, p) => {
            acc[p.periodLiabilityId] = (acc[p.periodLiabilityId] || 0) + p.amount;
            return acc;
        }, {});
        return periodLiabilities
            .filter(l => l.period === currentPeriod)
            .map(l => {
                const paidAmount = paymentsByLiability[l.id] || 0;
                return { ...l, paidAmount, remainingAmount: l.amount - paidAmount };
            })
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [periodLiabilities, periodDebtPayments, currentPeriod]);

    const enrichedPeriodReceivables: EnrichedPeriodReceivable[] = useMemo(() => {
        const paymentsByReceivable = periodReceivablePayments.reduce((acc: Record<string, number>, p) => {
            acc[p.periodReceivableId] = (acc[p.periodReceivableId] || 0) + p.amount;
            return acc;
        }, {});
        return periodReceivables
            .filter(r => r.period === currentPeriod)
            .map(r => {
                const paidAmount = paymentsByReceivable[r.id] || 0;
                return { ...r, paidAmount, remainingAmount: r.amount - paidAmount };
            })
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [periodReceivables, periodReceivablePayments, currentPeriod]);


    return (
        <div>
            <Header title="Công nợ & Phải thu trong kỳ" />
            <div className="flex flex-wrap border-b border-gray-700 mb-6" role="tablist">
                <TabButton active={activeTab === 'debts'} onClick={() => setActiveTab('debts')}>Công nợ Phải trả</TabButton>
                <TabButton active={activeTab === 'receivables'} onClick={() => setActiveTab('receivables')}>Công nợ Phải thu</TabButton>
            </div>

            {activeTab === 'debts' && (
                <Card>
                    <CardHeader className="flex justify-between items-center">
                        <span>Công nợ phải trả trong kỳ</span>
                        {!isReadOnly && <Button onClick={() => { setEditingLiability(undefined); setIsLiabilityModalOpen(true); }}><span className="flex items-center gap-2"><Plus /> Thêm Công nợ</span></Button>}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHead><TableRow>
                                <TableHeader>Ngày</TableHeader>
                                <TableHeader>Mô tả</TableHeader>
                                <TableHeader>Số tiền</TableHeader>
                                <TableHeader>Đã trả</TableHeader>
                                <TableHeader>Còn lại</TableHeader>
                                {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                            </TableRow></TableHead>
                            <TableBody>
                                {enrichedPeriodLiabilities.map(l => (
                                    <TableRow key={l.id}>
                                        <TableCell>{formatDate(l.date)}</TableCell>
                                        <TableCell className="font-medium text-white">{l.description}</TableCell>
                                        <TableCell>{formatCurrency(l.amount, l.currency)}</TableCell>
                                        <TableCell className="text-primary-400">{formatCurrency(l.paidAmount, l.currency)}</TableCell>
                                        <TableCell className="font-semibold text-yellow-400">{formatCurrency(l.remainingAmount, l.currency)}</TableCell>
                                        {!isReadOnly && (
                                             <TableCell>
                                                 <div className="flex items-center space-x-3 justify-center">
                                                    {l.remainingAmount > 0 && <Button size="sm" onClick={() => setPayingLiability(l)}>Trả nợ</Button>}
                                                    <button onClick={() => { setEditingLiability(l); setIsLiabilityModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                    <button onClick={() => setLiabilityToDelete(l)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
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

            {activeTab === 'receivables' && (
                <Card>
                    <CardHeader className="flex justify-between items-center">
                        <span>Công nợ phải thu trong kỳ</span>
                        {!isReadOnly && <Button onClick={() => { setEditingReceivable(undefined); setIsReceivableModalOpen(true); }}><span className="flex items-center gap-2"><Plus /> Thêm Khoản phải thu</span></Button>}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHead><TableRow>
                                <TableHeader>Ngày</TableHeader>
                                <TableHeader>Mô tả</TableHeader>
                                <TableHeader>Số tiền</TableHeader>
                                <TableHeader>Đã thu</TableHeader>
                                <TableHeader>Còn lại</TableHeader>
                                {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                            </TableRow></TableHead>
                            <TableBody>
                                {enrichedPeriodReceivables.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell>{formatDate(r.date)}</TableCell>
                                        <TableCell className="font-medium text-white">{r.description}</TableCell>
                                        <TableCell>{formatCurrency(r.amount, r.currency)}</TableCell>
                                        <TableCell className="text-primary-400">{formatCurrency(r.paidAmount, r.currency)}</TableCell>
                                        <TableCell className="font-semibold text-yellow-400">{formatCurrency(r.remainingAmount, r.currency)}</TableCell>
                                        {!isReadOnly && (
                                            <TableCell>
                                                <div className="flex items-center space-x-3 justify-center">
                                                    {r.remainingAmount > 0 && <Button size="sm" onClick={() => setCollectingReceivable(r)}>Thu nợ</Button>}
                                                    <button onClick={() => { setEditingReceivable(r); setIsReceivableModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                    <button onClick={() => setReceivableToDelete(r)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
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
                    {/* Liability Modals */}
                    <Modal isOpen={isLiabilityModalOpen} onClose={() => setIsLiabilityModalOpen(false)} title={editingLiability ? 'Sửa công nợ' : 'Thêm công nợ'}>
                        <PeriodLiabilityForm liability={editingLiability} onSave={(data) => {
                            if(editingLiability) { updatePeriodLiability({ ...editingLiability, ...data }); }
                            else { addPeriodLiability(data); }
                            setIsLiabilityModalOpen(false);
                        }} onCancel={() => setIsLiabilityModalOpen(false)} />
                    </Modal>
                    <ConfirmationModal isOpen={!!liabilityToDelete} onClose={() => setLiabilityToDelete(null)} onConfirm={() => { if(liabilityToDelete) { deletePeriodLiability(liabilityToDelete.id); setLiabilityToDelete(null); }}} title="Xác nhận xóa" message="Bạn có chắc muốn xóa công nợ này?" />
                    {payingLiability && (
                        <PeriodDebtPaymentModal 
                            liability={payingLiability} 
                            assets={assets} 
                            onClose={() => setPayingLiability(null)} 
                            onSave={addPeriodDebtPayment} 
                        />
                    )}

                    {/* Receivable Modals */}
                    <Modal isOpen={isReceivableModalOpen} onClose={() => setIsReceivableModalOpen(false)} title={editingReceivable ? 'Sửa khoản phải thu' : 'Thêm khoản phải thu'}>
                        <PeriodReceivableForm receivable={editingReceivable} onSave={(data) => {
                            if(editingReceivable) { updatePeriodReceivable({ ...editingReceivable, ...data }); }
                            else { addPeriodReceivable(data); }
                            setIsReceivableModalOpen(false);
                        }} onCancel={() => setIsReceivableModalOpen(false)} />
                    </Modal>
                    <ConfirmationModal isOpen={!!receivableToDelete} onClose={() => setReceivableToDelete(null)} onConfirm={() => { if(receivableToDelete) { deletePeriodReceivable(receivableToDelete.id); setReceivableToDelete(null); }}} title="Xác nhận xóa" message="Bạn có chắc muốn xóa khoản phải thu này?" />
                    {collectingReceivable && (
                        <PeriodReceivablePaymentModal 
                            receivable={collectingReceivable} 
                            assets={assets} 
                            onClose={() => setCollectingReceivable(null)} 
                            onSave={addPeriodReceivablePayment} 
                        />
                    )}
                </>
            )}
        </div>
    );
}