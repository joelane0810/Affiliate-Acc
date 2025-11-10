import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import * as T from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Plus, Edit, Trash2 } from '../components/icons/IconComponents';
import { formatCurrency, formatDate, formatPercentage } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

// --- Shared Tab Button ---
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

// --- Savings Components ---
const SavingForm: React.FC<{
    saving?: T.Saving;
    // FIX: Corrected onSave prop type to allow objects without workspaceId for new entries.
    onSave: (saving: Omit<T.Saving, 'id' | 'workspaceId'> | T.Saving) => void;
    onCancel: () => void;
    assets: T.Asset[];
}> = ({ saving, onSave, onCancel, assets }) => {
    const [description, setDescription] = useState(saving?.description || '');
    const [assetId, setAssetId] = useState(saving?.assetId || '');
    const [principalAmount, setPrincipalAmount] = useState(saving?.principalAmount || 0);
    const [startDate, setStartDate] = useState(saving?.startDate || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(saving?.endDate || '');
    const [interestRate, setInterestRate] = useState(saving?.interestRate || 0);
    const [status, setStatus] = useState<T.Saving['status']>(saving?.status || 'active');
    
    const selectedAsset = useMemo(() => assets.find(a => a.id === assetId), [assets, assetId]);
    const currency = selectedAsset?.currency || 'VND';

    // FIX: Adjusted handleSubmit to create the correct object for new vs. edited savings.
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId) {
            alert('Vui lòng chọn tài sản nguồn.');
            return;
        }
        const data = { description, assetId, principalAmount, startDate, endDate, interestRate, status, currency };
        if (saving) {
            onSave({ ...saving, ...data });
        } else {
            onSave(data);
        }
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="s_desc">Mô tả</Label>
                <Input id="s_desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="VD: Sổ tiết kiệm Techcombank 6 tháng" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="s_assetId">Tài sản nguồn</Label>
                    <select id="s_assetId" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                    </select>
                </div>
                <div>
                    <Label htmlFor="s_principal">Số tiền gốc ({currency})</Label>
                    <NumberInput id="s_principal" value={principalAmount} onValueChange={setPrincipalAmount} required />
                </div>
                <div>
                    <Label htmlFor="s_startDate">Ngày gửi</Label>
                    <Input id="s_startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="s_endDate">Ngày đáo hạn</Label>
                    <Input id="s_endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="s_interest">Lãi suất (%/năm)</Label>
                    <NumberInput id="s_interest" value={interestRate} onValueChange={setInterestRate} required />
                </div>
                <div>
                    <Label htmlFor="s_status">Trạng thái</Label>
                    <select id="s_status" value={status} onChange={e => setStatus(e.target.value as T.Saving['status'])} className={selectClassName}>
                        <option value="active">Đang gửi</option>
                        <option value="matured">Đã đáo hạn</option>
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

const SavingsContent = () => {
    const { savings, assets, addSaving, updateSaving, deleteSaving } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSaving, setEditingSaving] = useState<T.Saving | undefined>(undefined);
    const [savingToDelete, setSavingToDelete] = useState<T.Saving | null>(null);
    
    const assetMap = useMemo(() => new Map(assets.map(a => [a.id, a.name])), [assets]);

    // FIX: Updated handler to match new prop signature and correctly call context functions.
    const handleSave = (savingData: Omit<T.Saving, 'id' | 'workspaceId'> | T.Saving) => {
        if ('id' in savingData && savingData.id) {
            updateSaving(savingData as T.Saving);
        } else {
            addSaving(savingData as Omit<T.Saving, 'id' | 'workspaceId'>);
        }
        setIsModalOpen(false);
        setEditingSaving(undefined);
    };

    const handleDelete = () => {
        if(savingToDelete) {
            deleteSaving(savingToDelete.id);
            setSavingToDelete(null);
        }
    };

    const sortedSavings = useMemo(() => [...savings].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()), [savings]);

    return (
        <>
            <Header title="">
                <Button onClick={() => { setEditingSaving(undefined); setIsModalOpen(true); }}><span className="flex items-center gap-2"><Plus /> Thêm khoản tiết kiệm</span></Button>
            </Header>
            <Card>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Mô tả</TableHeader>
                                <TableHeader>Tài sản nguồn</TableHeader>
                                <TableHeader>Số tiền gốc</TableHeader>
                                <TableHeader>Ngày gửi</TableHeader>
                                <TableHeader>Ngày đáo hạn</TableHeader>
                                <TableHeader>Lãi suất</TableHeader>
                                <TableHeader>Trạng thái</TableHeader>
                                <TableHeader>Hành động</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedSavings.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium text-white">{s.description}</TableCell>
                                    <TableCell>{assetMap.get(s.assetId) || 'N/A'}</TableCell>
                                    <TableCell className="font-semibold text-primary-400">{formatCurrency(s.principalAmount, s.currency)}</TableCell>
                                    <TableCell>{formatDate(s.startDate)}</TableCell>
                                    <TableCell>{formatDate(s.endDate)}</TableCell>
                                    <TableCell>{formatPercentage(s.interestRate)}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'}`}>
                                            {s.status === 'active' ? 'Đang gửi' : 'Đã đáo hạn'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-3 justify-center">
                                            <button onClick={() => { setEditingSaving(s); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                            <button onClick={() => setSavingToDelete(s)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSaving ? 'Sửa khoản tiết kiệm' : 'Thêm khoản tiết kiệm'}>
                <SavingForm saving={editingSaving} onSave={handleSave} onCancel={() => setIsModalOpen(false)} assets={assets} />
            </Modal>
            <ConfirmationModal isOpen={!!savingToDelete} onClose={() => setSavingToDelete(null)} onConfirm={handleDelete} title="Xác nhận xóa" message={`Bạn có chắc muốn xóa khoản tiết kiệm "${savingToDelete?.description}" không?`} />
        </>
    );
};

// --- Investments Components ---
const InvestmentForm: React.FC<{
    investment?: T.Investment;
    onSave: (investment: Omit<T.Investment, 'id' | 'workspaceId'> | T.Investment) => void;
    onCancel: () => void;
    assets: T.Asset[];
}> = ({ investment, onSave, onCancel, assets }) => {
    const [description, setDescription] = useState(investment?.description || '');
    const [assetId, setAssetId] = useState(investment?.assetId || '');
    const [investmentAmount, setInvestmentAmount] = useState(investment?.investmentAmount || 0);
    const [date, setDate] = useState(investment?.date || new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<T.Investment['status']>(investment?.status || 'ongoing');
    const [liquidationDate, setLiquidationDate] = useState(investment?.liquidationDate || '');
    const [liquidationAmount, setLiquidationAmount] = useState(investment?.liquidationAmount || 0);
    const [liquidationAssetId, setLiquidationAssetId] = useState(investment?.liquidationAssetId || '');

    const selectedAsset = useMemo(() => assets.find(a => a.id === assetId), [assets, assetId]);
    const currency = useMemo(() => investment?.currency || selectedAsset?.currency || 'VND', [investment, selectedAsset]);
    
    const compatibleAssets = useMemo(() => assets.filter(a => a.currency === currency), [assets, currency]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId) {
            alert('Vui lòng chọn tài sản nguồn.');
            return;
        }

        const commonData = {
            description,
            assetId,
            investmentAmount,
            date,
            status,
            currency,
            liquidationDate: status === 'liquidated' ? liquidationDate : undefined,
            liquidationAmount: status === 'liquidated' ? liquidationAmount : undefined,
            liquidationAssetId: status === 'liquidated' ? liquidationAssetId : undefined,
        };

        if (status === 'liquidated' && (!liquidationDate || !liquidationAssetId)) {
            alert('Vui lòng nhập ngày thanh lý và tài sản nhận tiền.');
            return;
        }
        
        if (investment) {
            onSave({ ...investment, ...commonData });
        } else {
            onSave(commonData);
        }
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="i_desc">Mô tả khoản đầu tư</Label>
                <Input id="i_desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="VD: Mua cổ phiếu VNM, Đầu tư BTC..." required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="i_assetId">Tài sản nguồn</Label>
                    <select id="i_assetId" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required disabled={!!investment}>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                    </select>
                </div>
                <div>
                    <Label htmlFor="i_amount">Số tiền đầu tư ({currency})</Label>
                    <NumberInput id="i_amount" value={investmentAmount} onValueChange={setInvestmentAmount} required disabled={!!investment} />
                </div>
                <div>
                    <Label htmlFor="i_date">Ngày đầu tư</Label>
                    <Input id="i_date" type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={!!investment}/>
                </div>
                <div>
                    <Label htmlFor="i_status">Trạng thái</Label>
                    <select id="i_status" value={status} onChange={e => setStatus(e.target.value as T.Investment['status'])} className={selectClassName}>
                        <option value="ongoing">Đang đầu tư</option>
                        <option value="liquidated">Đã thanh lý</option>
                    </select>
                </div>
            </div>

            {status === 'liquidated' && (
                <div className="space-y-4 pt-4 border-t border-gray-700 mt-4">
                     <h3 className="text-md font-semibold text-white">Thông tin thanh lý</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="i_liq_date">Ngày thanh lý</Label>
                            <Input id="i_liq_date" type="date" value={liquidationDate} onChange={e => setLiquidationDate(e.target.value)} required />
                        </div>
                        <div>
                             <Label htmlFor="i_liq_asset">Tài sản nhận tiền</Label>
                             <select id="i_liq_asset" value={liquidationAssetId} onChange={e => setLiquidationAssetId(e.target.value)} className={selectClassName} required>
                                 <option value="" disabled>-- Chọn tài sản ({currency}) --</option>
                                 {compatibleAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                             </select>
                         </div>
                         <div className="sm:col-span-2">
                             <Label htmlFor="i_liq_amount">Số tiền thu về ({currency})</Label>
                             <NumberInput id="i_liq_amount" value={liquidationAmount} onValueChange={setLiquidationAmount} required />
                         </div>
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

const InvestmentsContent = () => {
    const { investments, assets, addInvestment, updateInvestment, deleteInvestment } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvestment, setEditingInvestment] = useState<T.Investment | undefined>(undefined);
    const [investmentToDelete, setInvestmentToDelete] = useState<T.Investment | null>(null);

    const assetMap = useMemo(() => new Map(assets.map(a => [a.id, a.name])), [assets]);
    
    const handleSave = (investmentData: Omit<T.Investment, 'id' | 'workspaceId'> | T.Investment) => {
        if ('id' in investmentData && investmentData.id) {
            updateInvestment(investmentData as T.Investment);
        } else {
            addInvestment(investmentData as Omit<T.Investment, 'id' | 'workspaceId'>);
        }
        setIsModalOpen(false);
        setEditingInvestment(undefined);
    };

    const handleDelete = () => {
        if(investmentToDelete) {
            deleteInvestment(investmentToDelete.id);
            setInvestmentToDelete(null);
        }
    };
    
    const sortedInvestments = useMemo(() => [...investments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [investments]);

    return (
         <>
            <Header title="">
                <Button onClick={() => { setEditingInvestment(undefined); setIsModalOpen(true); }}><span className="flex items-center gap-2"><Plus /> Thêm khoản đầu tư</span></Button>
            </Header>
            <Card>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Mô tả</TableHeader>
                                <TableHeader>Tài sản nguồn</TableHeader>
                                <TableHeader>Số tiền đầu tư</TableHeader>
                                <TableHeader>Ngày đầu tư</TableHeader>
                                <TableHeader>Trạng thái</TableHeader>
                                <TableHeader>Ngày thanh lý</TableHeader>
                                <TableHeader>Tiền thu về</TableHeader>
                                <TableHeader>Lãi/Lỗ</TableHeader>
                                <TableHeader>Hành động</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedInvestments.map(i => {
                                const gainLoss = i.status === 'liquidated' ? (i.liquidationAmount || 0) - i.investmentAmount : 0;
                                return (
                                <TableRow key={i.id}>
                                    <TableCell className="font-medium text-white">{i.description}</TableCell>
                                    <TableCell>{assetMap.get(i.assetId) || 'N/A'}</TableCell>
                                    <TableCell className="font-semibold text-primary-400">{formatCurrency(i.investmentAmount, i.currency)}</TableCell>
                                    <TableCell>{formatDate(i.date)}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${i.status === 'ongoing' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                                            {i.status === 'ongoing' ? 'Đang đầu tư' : 'Đã thanh lý'}
                                        </span>
                                    </TableCell>
                                    <TableCell>{i.liquidationDate ? formatDate(i.liquidationDate) : '—'}</TableCell>
                                    <TableCell>{i.liquidationAmount ? formatCurrency(i.liquidationAmount, i.currency) : '—'}</TableCell>
                                    <TableCell className={`font-semibold ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {i.status === 'liquidated' ? formatCurrency(gainLoss, i.currency) : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-3 justify-center">
                                            <button onClick={() => { setEditingInvestment(i); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                            <button onClick={() => setInvestmentToDelete(i)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingInvestment ? 'Sửa khoản đầu tư' : 'Thêm khoản đầu tư'}>
                <InvestmentForm investment={editingInvestment} onSave={handleSave} onCancel={() => setIsModalOpen(false)} assets={assets} />
            </Modal>
            <ConfirmationModal isOpen={!!investmentToDelete} onClose={() => setInvestmentToDelete(null)} onConfirm={handleDelete} title="Xác nhận xóa" message={`Bạn có chắc muốn xóa khoản đầu tư "${investmentToDelete?.description}" không?`} />
        </>
    );
};

export default function SavingsAndInvestments() {
    const [activeTab, setActiveTab] = useState<'savings' | 'investments'>('savings');

    return (
        <div>
            <Header title="Tiết kiệm & Đầu tư" />
            <div className="flex flex-wrap border-b border-gray-700 mb-6" role="tablist">
                <TabButton active={activeTab === 'savings'} onClick={() => setActiveTab('savings')}>
                    Tiết kiệm
                </TabButton>
                <TabButton active={activeTab === 'investments'} onClick={() => setActiveTab('investments')}>
                    Đầu tư
                </TabButton>
            </div>
            {activeTab === 'savings' && <SavingsContent />}
            {activeTab === 'investments' && <InvestmentsContent />}
        </div>
    );
}