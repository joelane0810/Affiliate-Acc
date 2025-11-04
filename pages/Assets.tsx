import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import type { Asset, Liability, DebtPayment, Withdrawal, Partner, AssetType, TaxPayment, CapitalInflow, Receivable, ReceivablePayment } from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Book } from '../components/icons/IconComponents';
import { formatCurrency, formatDate, isDateInPeriod } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';


// #region --- Shared Components ---
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
// #endregion

// #region --- Transaction History ---
const TransactionHistoryContent = () => {
    const { 
        assets, projects, liabilities, partners, adDeposits,
        commissions, exchangeLogs, miscellaneousExpenses, debtPayments, withdrawals,
        taxPayments, capitalInflows, activePeriod, closedPeriods, receivables, receivablePayments
    } = useData();

    // Create maps for quick lookups
    const assetMap = useMemo(() => new Map(assets.map(a => [a.id, a])), [assets]);
    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);
    const liabilityMap = useMemo(() => new Map(liabilities.map(l => [l.id, l.description])), [liabilities]);
    const receivableMap = useMemo(() => new Map(receivables.map(r => [r.id, r.description])), [receivables]);
    const partnerMap = useMemo(() => new Map(partners.map(p => [p.id, p.name])), [partners]);

    type UnifiedTransaction = {
        id: string;
        date: string;
        description: string;
        assetName: string;
        inflow: number;
        outflow: number;
        currency: 'USD' | 'VND';
        period: string;
    };

    const allTransactions = useMemo(() => {
        const transactions: UnifiedTransaction[] = [];

        adDeposits.forEach(deposit => {
            const asset = assetMap.get(deposit.assetId);
            if (!asset) return;
             transactions.push({
                id: `ad-deposit-${deposit.id}`,
                date: deposit.date,
                description: `Nạp tiền Ads (${deposit.adAccountNumber})`,
                assetName: asset.name,
                inflow: 0,
                outflow: deposit.vndAmount,
                currency: 'VND',
                period: deposit.date.substring(0, 7),
            });
        });

        commissions.forEach(comm => {
            const asset = assetMap.get(comm.assetId);
            if (!asset) return;
            const isUsd = asset.currency === 'USD';
            transactions.push({
                id: `comm-${comm.id}`,
                date: comm.date,
                description: `Hoa hồng: ${projectMap.get(comm.projectId) || 'N/A'}`,
                assetName: asset.name,
                inflow: isUsd ? comm.usdAmount : comm.vndAmount,
                outflow: 0,
                currency: asset.currency,
                period: comm.date.substring(0, 7),
            });
        });

        exchangeLogs.forEach(log => {
            const sellingAsset = assetMap.get(log.sellingAssetId);
            const receivingAsset = assetMap.get(log.receivingAssetId);
            if (sellingAsset) {
                transactions.push({
                    id: `ex-sell-${log.id}`,
                    date: log.date,
                    description: `Bán USD cho ${receivingAsset?.name || 'N/A'}`,
                    assetName: sellingAsset.name,
                    inflow: 0,
                    outflow: log.usdAmount,
                    currency: 'USD',
                    period: log.date.substring(0, 7),
                });
            }
            if (receivingAsset) {
                 transactions.push({
                    id: `ex-receive-${log.id}`,
                    date: log.date,
                    description: `Nhận VND từ ${sellingAsset?.name || 'N/A'}`,
                    assetName: receivingAsset.name,
                    inflow: log.vndAmount,
                    outflow: 0,
                    currency: 'VND',
                    period: log.date.substring(0, 7),
                });
            }
        });

        miscellaneousExpenses.forEach(exp => {
            const asset = assetMap.get(exp.assetId);
            if (!asset) return;
            transactions.push({
                id: `misc-${exp.id}`,
                date: exp.date,
                description: exp.description,
                assetName: asset.name,
                inflow: 0,
                outflow: exp.amount,
                currency: asset.currency,
                period: exp.date.substring(0, 7),
            });
        });

        debtPayments.forEach(payment => {
            const asset = assetMap.get(payment.assetId);
            if (!asset) return;
            transactions.push({
                id: `debt-${payment.id}`,
                date: payment.date,
                description: `Trả nợ: ${liabilityMap.get(payment.liabilityId) || 'N/A'}`,
                assetName: asset.name,
                inflow: 0,
                outflow: payment.amount,
                currency: 'VND',
                period: payment.date.substring(0, 7),
            });
        });
        
        receivables.forEach(receivable => {
            const asset = assetMap.get(receivable.outflowAssetId);
            if (!asset) return;
            transactions.push({
                id: `receivable-create-${receivable.id}`,
                date: receivable.creationDate,
                description: `Tạo khoản phải thu: ${receivable.description}`,
                assetName: asset.name,
                inflow: 0,
                outflow: receivable.totalAmount,
                currency: asset.currency,
                period: receivable.creationDate.substring(0, 7),
            });
        });

        receivablePayments.forEach(payment => {
            const asset = assetMap.get(payment.assetId);
            if (!asset) return;
            transactions.push({
                id: `receivable-pay-${payment.id}`,
                date: payment.date,
                description: `Nhận tiền thu nợ: ${receivableMap.get(payment.receivableId) || 'N/A'}`,
                assetName: asset.name,
                inflow: payment.amount,
                outflow: 0,
                currency: asset.currency,
                period: payment.date.substring(0, 7),
            });
        });

        withdrawals.forEach(w => {
            const asset = assetMap.get(w.assetId);
            if (!asset) return;
            transactions.push({
                id: `withdraw-${w.id}`,
                date: w.date,
                description: `Rút tiền (${partnerMap.get(w.withdrawnBy) || 'N/A'}): ${w.description}`,
                assetName: asset.name,
                inflow: 0,
                outflow: w.amount,
                currency: asset.currency,
                period: w.date.substring(0, 7),
            });
        });
        
        taxPayments.forEach(payment => {
            const asset = assetMap.get(payment.assetId);
            if (!asset) return;
            transactions.push({
                id: `tax-payment-${payment.id}`,
                date: payment.date,
                description: `Thanh toán thuế kỳ ${payment.period}`,
                assetName: asset.name,
                inflow: 0,
                outflow: payment.amount,
                currency: 'VND',
                period: payment.date.substring(0, 7),
            });
        });

        capitalInflows.forEach(inflow => {
            const asset = assetMap.get(inflow.assetId);
            if (!asset) return;
            transactions.push({
                id: `capital-inflow-${inflow.id}`,
                date: inflow.date,
                description: inflow.description || 'Vốn góp',
                assetName: asset.name,
                inflow: inflow.amount,
                outflow: 0,
                currency: asset.currency,
                period: inflow.date.substring(0, 7),
            });
        });

        return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || a.id.localeCompare(b.id));
    }, [assetMap, projectMap, liabilityMap, partnerMap, adDeposits, commissions, exchangeLogs, miscellaneousExpenses, debtPayments, withdrawals, taxPayments, capitalInflows, receivables, receivablePayments, receivableMap]);

    return (
        <Card>
            <CardHeader>Lịch sử tất cả giao dịch</CardHeader>
            <CardContent>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader className="w-48">Kỳ báo cáo</TableHeader>
                            <TableHeader className="w-32">Ngày</TableHeader>
                            <TableHeader className="w-1/3 min-w-[250px]">Mô tả</TableHeader>
                            <TableHeader className="w-48">Tài sản</TableHeader>
                            <TableHeader className="w-48">Tiền ra</TableHeader>
                            <TableHeader className="w-48">Tiền vào</TableHeader>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {allTransactions.length > 0 ? allTransactions.map(tx => {
                            const [year, month] = tx.period.split('-');
                            const periodLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
                            
                            let status: 'active' | 'closed' | null = null;
                            let statusLabel = '';
                            let statusColor = '';

                            if (tx.period === activePeriod) {
                                status = 'active';
                                statusLabel = 'Đang hoạt động';
                                statusColor = 'text-green-400';
                            } else if (closedPeriods.some(p => p.period === tx.period)) {
                                status = 'closed';
                                statusLabel = 'Đã đóng';
                                statusColor = 'text-gray-400';
                            }

                            return (
                                <TableRow key={tx.id}>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Book className={status === 'active' ? 'text-primary-400' : 'text-gray-500'} />
                                            <div>
                                                <div className="text-sm font-medium text-white">{periodLabel}</div>
                                                {status && <div className={`text-xs ${statusColor}`}>{statusLabel}</div>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatDate(tx.date)}</TableCell>
                                    <TableCell className="text-left">{tx.description}</TableCell>
                                    <TableCell className="font-medium text-white">{tx.assetName}</TableCell>
                                    <TableCell className="font-semibold text-red-400">
                                        {tx.outflow > 0 ? formatCurrency(tx.outflow, tx.currency) : '—'}
                                    </TableCell>
                                    <TableCell className="font-semibold text-green-400">
                                        {tx.inflow > 0 ? formatCurrency(tx.inflow, tx.currency) : '—'}
                                    </TableCell>
                                </TableRow>
                            );
                        }) : (
                             <TableRow>
                                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                    Chưa có giao dịch nào.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};
// #endregion

// #region --- Asset Management ---
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

function AssetBalanceContent() {
    const { 
        assets, addAsset, updateAsset, deleteAsset,
        assetTypes, addAssetType,
        liabilities, addLiability, updateLiability, deleteLiability,
        partners, 
        withdrawals, addWithdrawal, updateWithdrawal, deleteWithdrawal,
        debtPayments, addDebtPayment, isReadOnly,
        enrichedAssets,
        receivables, addReceivable, updateReceivable, deleteReceivable,
        receivablePayments, addReceivablePayment,
        capitalInflows, addCapitalInflow, updateCapitalInflow, deleteCapitalInflow
    } = useData();
    
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

    const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
    const [editingLiability, setEditingLiability] = useState<Liability | undefined>(undefined);
    const [liabilityToDelete, setLiabilityToDelete] = useState<Liability | null>(null);
    const [payingLiability, setPayingLiability] = useState<EnrichedLiability | null>(null);

    const [isReceivableModalOpen, setIsReceivableModalOpen] = useState(false);
    const [editingReceivable, setEditingReceivable] = useState<Receivable | undefined>(undefined);
    const [receivableToDelete, setReceivableToDelete] = useState<Receivable | null>(null);
    const [collectingReceivable, setCollectingReceivable] = useState<EnrichedReceivable | null>(null);
    
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [editingWithdrawal, setEditingWithdrawal] = useState<Withdrawal | undefined>(undefined);
    const [withdrawalToDelete, setWithdrawalToDelete] = useState<Withdrawal | null>(null);
    
    const [isCapitalInflowModalOpen, setIsCapitalInflowModalOpen] = useState(false);
    const [editingCapitalInflow, setEditingCapitalInflow] = useState<CapitalInflow | undefined>(undefined);
    const [capitalInflowToDelete, setCapitalInflowToDelete] = useState<CapitalInflow | null>(null);

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

    // Liability handlers
    const handleSaveLiability = (liability: Omit<Liability, 'id'> | Liability) => {
        if ('id' in liability && liability.id) { updateLiability(liability as Liability); } else { addLiability(liability); }
        setIsLiabilityModalOpen(false); setEditingLiability(undefined);
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
        if ('id' in receivable && receivable.id) { updateReceivable(receivable as Receivable); } else { addReceivable(receivable); }
        setIsReceivableModalOpen(false); setEditingReceivable(undefined);
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

    // Withdrawal handlers
    const handleSaveWithdrawal = (withdrawal: Omit<Withdrawal, 'id'> | Withdrawal) => {
        if ('id' in withdrawal && withdrawal.id) { updateWithdrawal(withdrawal as Withdrawal); } else { addWithdrawal(withdrawal); }
        setIsWithdrawalModalOpen(false); setEditingWithdrawal(undefined);
    };
    const handleDeleteWithdrawalClick = (withdrawal: any) => { setWithdrawalToDelete(withdrawal); };
    const handleConfirmDeleteWithdrawal = () => { if (withdrawalToDelete) { deleteWithdrawal(withdrawalToDelete.id); setWithdrawalToDelete(null); } };

    // Capital Inflow handlers
    const handleSaveCapitalInflow = (inflow: Omit<CapitalInflow, 'id'> | CapitalInflow) => {
        if ('id' in inflow && inflow.id) { updateCapitalInflow(inflow as CapitalInflow); } else { addCapitalInflow(inflow); }
        setIsCapitalInflowModalOpen(false); setEditingCapitalInflow(undefined);
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
        <div className="space-y-8">
            {/* Assets Table */}
            <Card>
                <CardHeader className="flex justify-between items-center">
                    <span>Tài sản</span>
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
                    <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title={editingAsset ? 'Sửa tài sản' : 'Thêm tài sản mới'}>
                        <AssetForm asset={editingAsset} assetTypes={assetTypes} onSave={handleSaveAsset} onCancel={() => setIsAssetModalOpen(false)} onAddAssetType={handleAddAssetType} />
                    </Modal>
                    <ConfirmationModal isOpen={!!assetToDelete} onClose={() => setAssetToDelete(null)} onConfirm={handleConfirmDeleteAsset} title="Xác nhận xóa tài sản" message={`Bạn có chắc muốn xóa tài sản "${assetToDelete?.name}" không?`} />

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

// #endregion

// #region --- Main Component ---
export default function Assets() {
    const [activeTab, setActiveTab] = useState<'balance' | 'history'>('balance');
    
    const renderContent = () => {
        switch (activeTab) {
        case 'balance':
            return <AssetBalanceContent />;
        case 'history':
            return <TransactionHistoryContent />;
        default:
            return null;
        }
    };

    return (
        <div>
            <Header title="Tài sản & Nguồn vốn" />
            <div className="flex flex-wrap border-b border-gray-700 mb-6" role="tablist">
                <TabButton active={activeTab === 'balance'} onClick={() => setActiveTab('balance')}>
                    Bảng cân đối Tài sản & Nguồn vốn
                </TabButton>
                <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
                    Lịch sử giao dịch
                </TabButton>
            </div>
            <div>{renderContent()}</div>
        </div>
    );
}
// #endregion
