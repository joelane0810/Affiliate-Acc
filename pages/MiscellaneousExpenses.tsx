import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import type { MiscellaneousExpense, Asset, Project, Partner, PartnerShare } from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Plus, Edit, Trash2, Users } from '../components/icons/IconComponents';
import { formatCurrency, formatDate, isDateInPeriod } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

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
            setName('');
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

const ExpenseForm: React.FC<{
    expense?: MiscellaneousExpense;
    assets: Asset[];
    projectsForPeriod: Project[];
    onSave: (expense: Omit<MiscellaneousExpense, 'id'> | MiscellaneousExpense) => void;
    onCancel: () => void;
    partners: Partner[];
    addPartner: (name: string) => void;
}> = ({ expense, assets, projectsForPeriod, onSave, onCancel, partners, addPartner }) => {
    const { currentPeriod } = useData();
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(expense?.date || defaultDate);
    const [description, setDescription] = useState(expense?.description || '');
    const [assetId, setAssetId] = useState(expense?.assetId || '');
    const [projectId, setProjectId] = useState(expense?.projectId || '');
    const [amount, setAmount] = useState(expense?.amount || 0);
    const [vatRate, setVatRate] = useState(expense?.vatRate || 0);
    const [isPartnership, setIsPartnership] = useState(expense?.isPartnership || false);
    const [shares, setShares] = useState<PartnerShare[]>(expense?.partnerShares || []);
    const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);

    const selectedAsset = useMemo(() => assets.find(a => a.id === assetId), [assets, assetId]);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId && isPartnership && totalShare !== 100) {
            alert('Tổng tỷ lệ phân chia phải bằng 100%.');
            return;
        }

        const vndAmount = selectedAsset?.currency === 'USD' ? (amount * (expense?.rate || 25000)) : amount;

        const dataForSave: Partial<Omit<MiscellaneousExpense, 'id'>> = {
            date,
            description,
            assetId,
            amount,
            vndAmount,
            vatRate,
            isPartnership: !projectId && isPartnership,
            partnerShares: !projectId && isPartnership ? shares.filter(s => s.sharePercentage > 0) : undefined,
        };

        if (expense) { // Update
            const finalData = { ...expense, ...dataForSave };
            if (projectId) {
                finalData.projectId = projectId;
            } else {
                delete finalData.projectId;
            }
            onSave(finalData);
        } else { // Add
            const finalData = { ...dataForSave };
            if (projectId) {
                (finalData as Partial<MiscellaneousExpense>).projectId = projectId;
            }
            onSave(finalData as Omit<MiscellaneousExpense, 'id'>);
        }
    };


    const handleAddPartner = (name: string) => {
        addPartner(name);
        setIsAddPartnerModalOpen(false);
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="exp-date">Ngày</Label>
                        <Input id="exp-date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="exp-asset">Tài sản chi</Label>
                        <select id="exp-asset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                            <option value="" disabled>-- Chọn tài sản --</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <Label htmlFor="exp-desc">Mô tả</Label>
                    <Input id="exp-desc" value={description} onChange={e => setDescription(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="exp-project">Dự án (Tùy chọn)</Label>
                    <select id="exp-project" value={projectId} onChange={e => setProjectId(e.target.value)} className={selectClassName}>
                        <option value="">-- Không có --</option>
                        {projectsForPeriod.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="exp-amount">Số tiền ({selectedAsset?.currency || 'VND'})</Label>
                        <NumberInput id="exp-amount" value={amount} onValueChange={setAmount} required />
                    </div>
                    <div>
                        <Label htmlFor="exp-vat">VAT (%)</Label>
                        <NumberInput id="exp-vat" value={vatRate} onValueChange={setVatRate} />
                    </div>
                </div>

                {!projectId && (
                    <div className="border-t border-gray-700 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsPartnership(!isPartnership)}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                                isPartnership 
                                    ? 'bg-primary-600/20 text-primary-300 ring-1 ring-primary-500' 
                                    : 'text-gray-400 hover:bg-gray-700/50'
                            }`}
                        >
                            <Users />
                            <span>Phân bổ cho đối tác</span>
                        </button>
                    </div>
                )}

                {isPartnership && !projectId && (
                     <div className="border-t border-gray-700 pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                 <h4 className="font-semibold text-white">Phân chia chi phí</h4>
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
            <AddPartnerModal isOpen={isAddPartnerModalOpen} onClose={() => setIsAddPartnerModalOpen(false)} onSave={handleAddPartner} />
        </>
    );
};

export default function MiscellaneousExpenses() {
    const { 
        miscellaneousExpenses, addMiscellaneousExpense, updateMiscellaneousExpense, deleteMiscellaneousExpense, 
        assets, projects, partners, addPartner, currentPeriod, isReadOnly 
    } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<MiscellaneousExpense | undefined>(undefined);
    const [expenseToDelete, setExpenseToDelete] = useState<MiscellaneousExpense | null>(null);

    const projectsForPeriod = useMemo(() => projects.filter(p => p.period === currentPeriod), [projects, currentPeriod]);
    
    const enrichedExpenses = useMemo(() => {
        const projectMap = new Map(projects.map(p => [p.id, p.name]));
        const assetMap = new Map(assets.map(a => [a.id, { name: a.name, currency: a.currency }]));
        return miscellaneousExpenses
            .filter(e => isDateInPeriod(e.date, currentPeriod))
            .map(e => ({
                ...e,
                projectName: e.projectId ? projectMap.get(e.projectId) || 'N/A' : '—',
                assetInfo: assetMap.get(e.assetId) || { name: 'N/A', currency: 'VND' },
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [miscellaneousExpenses, projects, assets, currentPeriod]);

    const handleSave = (expense: Omit<MiscellaneousExpense, 'id'> | MiscellaneousExpense) => {
        if ('id' in expense && expense.id) {
            updateMiscellaneousExpense(expense as MiscellaneousExpense);
        } else {
            addMiscellaneousExpense(expense as Omit<MiscellaneousExpense, 'id'>);
        }
        setIsModalOpen(false);
        setEditingExpense(undefined);
    };

    const handleDelete = () => {
        if (expenseToDelete) {
            deleteMiscellaneousExpense(expenseToDelete.id);
            setExpenseToDelete(null);
        }
    };

    return (
        <>
            <Header title="Chi phí phát sinh">
                {!isReadOnly && (
                    <Button onClick={() => { setEditingExpense(undefined); setIsModalOpen(true); }}>
                        <span className="flex items-center gap-2"><Plus /> Thêm chi phí</span>
                    </Button>
                )}
            </Header>

            <Card>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Ngày</TableHeader>
                                <TableHeader>Mô tả</TableHeader>
                                <TableHeader>Dự án</TableHeader>
                                <TableHeader>Tài sản chi</TableHeader>
                                <TableHeader>Số tiền</TableHeader>
                                <TableHeader>VAT</TableHeader>
                                {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {enrichedExpenses.map(e => (
                                <TableRow key={e.id}>
                                    <TableCell>{formatDate(e.date)}</TableCell>
                                    <TableCell className="font-medium text-white">{e.description}</TableCell>
                                    <TableCell>{e.projectName}</TableCell>
                                    <TableCell>{e.assetInfo.name}</TableCell>
                                    <TableCell className="font-semibold text-red-400">{formatCurrency(e.amount, e.assetInfo.currency)}</TableCell>
                                    <TableCell className="text-yellow-400">{formatCurrency(e.vndAmount * (e.vatRate || 0) / 100)}</TableCell>
                                    {!isReadOnly && (
                                        <TableCell>
                                            <div className="flex items-center space-x-3 justify-center">
                                                <button onClick={() => { setEditingExpense(e); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                <button onClick={() => setExpenseToDelete(e)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
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
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? 'Sửa chi phí' : 'Thêm chi phí'}>
                        <ExpenseForm
                            expense={editingExpense}
                            assets={assets}
                            projectsForPeriod={projectsForPeriod}
                            partners={partners}
                            addPartner={(name) => addPartner({name})}
                            onSave={handleSave}
                            onCancel={() => {
                                setIsModalOpen(false);
                                setEditingExpense(undefined);
                            }}
                        />
                    </Modal>
                    <ConfirmationModal
                        isOpen={!!expenseToDelete}
                        onClose={() => setExpenseToDelete(null)}
                        onConfirm={handleDelete}
                        title="Xác nhận xóa"
                        message={`Bạn có chắc muốn xóa chi phí "${expenseToDelete?.description}" không?`}
                    />
                </>
            )}
        </>
    );
}