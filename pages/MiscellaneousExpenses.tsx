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
}> = ({ expense, assets, projectsForPeriod, onSave, onCancel }) => {
    const { partners, addPartner, currentPeriod } = useData();
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(expense?.date || defaultDate);
    const [description, setDescription] = useState(expense?.description || '');
    const [assetId, setAssetId] = useState(expense?.assetId || (assets[0]?.id || ''));
    const [projectId, setProjectId] = useState(expense?.projectId || '');
    const [amount, setAmount] = useState(expense?.amount || 0);
    const [rate, setRate] = useState(expense?.rate || 0);
    const [vatRate, setVatRate] = useState(expense?.vatRate || 0);
    const [notes, setNotes] = useState(expense?.notes || '');
    
    const [isPartnership, setIsPartnership] = useState(expense?.isPartnership || false);
    const [shares, setShares] = useState<PartnerShare[]>(expense?.partnerShares || []);
    const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);

    const selectedAsset = useMemo(() => assets.find(a => a.id === assetId), [assets, assetId]);
    const isUsdAsset = selectedAsset?.currency === 'USD';
    const selectedProject = useMemo(() => projectsForPeriod.find(p => p.id === projectId), [projectId, projectsForPeriod]);
    const isProjectAPartnership = !!selectedProject?.isPartnership;

    useEffect(() => {
        if(projectId) {
            setIsPartnership(false);
        }
    }, [projectId]);

    useEffect(() => {
        if (isPartnership && !projectId) {
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
    }, [isPartnership, partners, projectId]);

    const handleShareChange = (partnerId: string, percentage: number) => {
        setShares(currentShares =>
            currentShares.map(s => s.partnerId === partnerId ? { ...s, sharePercentage: percentage } : s)
        );
    };

    const totalShare = useMemo(() => shares.reduce((sum, s) => sum + (Number(s.sharePercentage) || 0), 0), [shares]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId) {
            alert("Vui lòng chọn một tài sản.");
            return;
        }
        
        const vndAmount = isUsdAsset ? amount * rate : amount;
        const isProjectSelected = !!projectId;
        const isCustomPartnership = !isProjectSelected && isPartnership;

        if (isCustomPartnership) {
            if (totalShare !== 100) {
                alert('Tổng tỷ lệ phân chia của các đối tác phải bằng 100%.');
                return;
            }
        }

        onSave({ 
            ...expense, 
            id: expense?.id || '', 
            date,
            description,
            assetId,
            projectId: projectId || undefined,
            amount, 
            rate: isUsdAsset ? rate : undefined, 
            vndAmount,
            vatRate,
            notes,
            isPartnership: isCustomPartnership ? true : undefined,
            partnerShares: isCustomPartnership ? shares : undefined,
        });
    };
    
    const handleAddPartner = (name: string) => {
        addPartner({ name });
        setIsAddPartnerModalOpen(false);
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <Label htmlFor="date">Ngày</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                 <div>
                    <Label htmlFor="description">Giao dịch</Label>
                    <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="VD: Mua tên miền, trả lương..." required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="asset">Tài sản chi trả</Label>
                        <select id="asset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                            <option value="" disabled>-- Chọn tài sản --</option>
                            {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="project">Dự án liên quan (Tùy chọn)</Label>
                        <select id="project" value={projectId} onChange={e => setProjectId(e.target.value)} className={selectClassName}>
                            <option value="">-- Không có --</option>
                            {projectsForPeriod.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {isProjectAPartnership && (
                            <p className="text-xs text-gray-400 mt-1">Chi phí sẽ được phân bổ theo tỷ lệ của dự án hợp tác này.</p>
                        )}
                    </div>
                </div>
                
                {assetId && (
                    <div className="border-t border-gray-700 pt-4 space-y-4">
                        {isUsdAsset ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="amountUSD">Số tiền (USD)</Label>
                                    <NumberInput id="amountUSD" value={amount} onValueChange={setAmount} required />
                                </div>
                                <div>
                                    <Label htmlFor="rate">Tỷ giá</Label>
                                    <NumberInput id="rate" value={rate} onValueChange={setRate} required />
                                </div>
                                 <div className="md:col-span-2">
                                    <Label>Thành tiền (VND)</Label>
                                    <Input value={formatCurrency(amount * rate)} readOnly className="bg-gray-800" />
                                </div>
                            </div>
                        ) : (
                             <div>
                                <Label htmlFor="amountVND">Chi phí (VND)</Label>
                                <NumberInput id="amountVND" value={amount} onValueChange={setAmount} required />
                            </div>
                        )}
                         <div>
                            <Label htmlFor="vatRate">VAT (%)</Label>
                            <NumberInput id="vatRate" value={vatRate} onValueChange={setVatRate} />
                        </div>
                    </div>
                )}

                <div>
                    <Label htmlFor="notes">Ghi chú</Label>
                    <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                
                <div className="border-t border-gray-700 pt-4">
                    <button
                        type="button"
                        onClick={() => setIsPartnership(!isPartnership)}
                        disabled={!!projectId}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                            isPartnership && !projectId
                                ? 'bg-primary-600/20 text-primary-300 ring-1 ring-primary-500' 
                                : 'text-gray-400 hover:bg-gray-700/50'
                        }`}
                    >
                        <Users />
                        <span>Chi phí hợp tác</span>
                    </button>
                </div>

                {isPartnership && !projectId && (
                    <div className="border-t border-gray-700 pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                <h4 className="font-semibold text-white">Phân chia chi phí</h4>
                                 <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setIsAddPartnerModalOpen(true)}
                                    className="!py-1 !px-2 !text-xs"
                                >
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
                                        <NumberInput
                                            id={`share-${share.partnerId}`}
                                            value={share.sharePercentage}
                                            onValueChange={val => handleShareChange(share.partnerId, val)}
                                            className="pr-8"
                                        />
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
             <AddPartnerModal 
                isOpen={isAddPartnerModalOpen}
                onClose={() => setIsAddPartnerModalOpen(false)}
                onSave={handleAddPartner}
            />
        </>
    );
};

export default function MiscellaneousExpenses() {
    const { assets, projects, miscellaneousExpenses, addMiscellaneousExpense, updateMiscellaneousExpense, deleteMiscellaneousExpense, currentPeriod, isReadOnly } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<MiscellaneousExpense | undefined>(undefined);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);

    const projectsForPeriod = useMemo(() =>
        projects.filter(p => p.period === currentPeriod),
    [projects, currentPeriod]);

    const enrichedExpenses = useMemo(() => {
        const assetMap = new Map<string, Asset>(assets.map(a => [a.id, a]));
        const projectMap = new Map(projects.map(p => [p.id, p.name]));
        return miscellaneousExpenses
            .filter(e => isDateInPeriod(e.date, currentPeriod))
            .map(e => {
                const asset = assetMap.get(e.assetId);
                return {
                    ...e,
                    assetName: asset?.name || 'N/A',
                    isUSD: asset?.currency === 'USD',
                    projectName: e.projectId ? projectMap.get(e.projectId) : undefined,
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [miscellaneousExpenses, assets, projects, currentPeriod]);

    const handleSave = (expense: Omit<MiscellaneousExpense, 'id'> | MiscellaneousExpense) => {
        if ('id' in expense && expense.id) {
            updateMiscellaneousExpense(expense as MiscellaneousExpense);
        } else {
            const { id, ...newExpense } = expense as MiscellaneousExpense;
            addMiscellaneousExpense(newExpense);
        }
        setIsModalOpen(false);
        setEditingExpense(undefined);
    };
    
    const handleDeleteClick = (expenseId: string) => {
        setExpenseToDeleteId(expenseId);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (expenseToDeleteId) {
            deleteMiscellaneousExpense(expenseToDeleteId);
            setIsConfirmModalOpen(false);
            setExpenseToDeleteId(null);
        }
    };

    return (
        <>
            <Header title="Chi phí phát sinh">
                {!isReadOnly && (
                    <Button onClick={() => { setEditingExpense(undefined); setIsModalOpen(true); }} disabled={assets.length === 0}>
                        <span className="flex items-center gap-2"><Plus /> Thêm chi phí</span>
                    </Button>
                )}
            </Header>
            {assets.length === 0 ? (
                <Card>
                    <CardContent>
                        <p className="text-center text-gray-400">Vui lòng tạo ít nhất một tài sản trước khi thêm chi phí.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader className="w-32">Ngày</TableHeader>
                                    <TableHeader className="w-1/3 min-w-[250px]">Giao dịch</TableHeader>
                                    <TableHeader className="w-48">Dự án</TableHeader>
                                    <TableHeader className="w-48">Tài sản</TableHeader>
                                    <TableHeader className="w-40">VND</TableHeader>
                                    <TableHeader className="w-40">VAT</TableHeader>
                                    {!isReadOnly && <TableHeader className="w-28">Hành động</TableHeader>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {enrichedExpenses.map(exp => (
                                    <TableRow key={exp.id}>
                                        <TableCell>{formatDate(exp.date)}</TableCell>
                                        <TableCell className="font-medium text-white">{exp.description}</TableCell>
                                        <TableCell>{exp.projectName || '—'}</TableCell>
                                        <TableCell>{exp.assetName}</TableCell>
                                        <TableCell className="text-red-400 font-semibold">
                                            {formatCurrency(exp.vndAmount)}
                                        </TableCell>
                                        <TableCell className="text-yellow-400">
                                            {formatCurrency(exp.vndAmount * (exp.vatRate || 0) / 100)}
                                        </TableCell>
                                        {!isReadOnly && (
                                            <TableCell>
                                                <div className="flex items-center space-x-3 justify-center">
                                                    <button onClick={() => { setEditingExpense(exp); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                    <button onClick={() => handleDeleteClick(exp.id)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
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
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? 'Sửa chi phí' : 'Thêm chi phí phát sinh'}>
                        <ExpenseForm
                            expense={editingExpense}
                            assets={assets}
                            projectsForPeriod={projectsForPeriod}
                            onSave={handleSave}
                            onCancel={() => { setIsModalOpen(false); setEditingExpense(undefined); }}
                        />
                    </Modal>
                    
                    <ConfirmationModal
                        isOpen={isConfirmModalOpen}
                        onClose={() => setIsConfirmModalOpen(false)}
                        onConfirm={handleConfirmDelete}
                        title="Xác nhận xóa chi phí"
                        message="Bạn có chắc chắn muốn xóa chi phí này không? Hành động này sẽ hoàn lại số dư vào tài sản tương ứng và không thể hoàn tác."
                    />
                </>
            )}
        </>
    );
}