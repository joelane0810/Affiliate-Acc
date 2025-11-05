import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import type * as T from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { Plus, Edit, Trash2 } from '../components/icons/IconComponents';
import { formatCurrency, formatDate } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

const adsPlatformLabels: Record<T.AdsPlatform, string> = {
    google: 'Google Ads',
    youtube: 'Youtube Ads',
    tiktok: 'Tiktok Ads',
    facebook: 'Facebook Ads',
    other: 'Other'
};

const adAccountStatusLabels: Record<T.AdAccount['status'], string> = {
    running: 'Đang chạy',
    stopped: 'Đã dừng',
    cancelled: 'Đã hủy'
};

const AdAccountForm: React.FC<{
    account?: T.AdAccount;
    onSave: (account: Omit<T.AdAccount, 'id'> | T.AdAccount) => void;
    onCancel: () => void;
}> = ({ account, onSave, onCancel }) => {
    const [accountNumber, setAccountNumber] = useState(account?.accountNumber || '');
    const [adsPlatform, setAdsPlatform] = useState<T.AdsPlatform>(account?.adsPlatform || 'google');
    const [status, setStatus] = useState<T.AdAccount['status']>(account?.status || 'running');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountNumber.trim()) {
            alert("Vui lòng nhập số tài khoản.");
            return;
        }
        onSave({ ...account, id: account?.id || '', accountNumber, adsPlatform, status });
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="accountNumber">Số tài khoản</Label>
                <Input id="accountNumber" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required />
            </div>
            <div>
                <Label htmlFor="adsPlatform">Nền tảng</Label>
                <select id="adsPlatform" value={adsPlatform} onChange={e => setAdsPlatform(e.target.value as T.AdsPlatform)} className={selectClassName}>
                    {Object.entries(adsPlatformLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
            </div>
            <div>
                <Label htmlFor="status">Trạng thái</Label>
                <select id="status" value={status} onChange={e => setStatus(e.target.value as T.AdAccount['status'])} className={selectClassName}>
                    {Object.entries(adAccountStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

export default function AdAccounts() {
    const { 
        adAccounts, addAdAccount, updateAdAccount, deleteAdAccount,
        adDeposits, adFundTransfers, dailyAdCosts, projects
    } = useData();
    
    // This page should be independent of period, so isReadOnly is not based on viewingPeriod
    const isReadOnly = false; 

    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<T.AdAccount | undefined>(undefined);
    const [accountToDelete, setAccountToDelete] = useState<T.AdAccount | null>(null);

    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);
    
     useEffect(() => {
        if (!selectedAccount && adAccounts.length > 0) {
            // Sort accounts by name before selecting the first one
            const sortedAccounts = [...adAccounts].sort((a,b) => a.accountNumber.localeCompare(b.accountNumber));
            setSelectedAccount(sortedAccounts[0].accountNumber);
        }
    }, [adAccounts, selectedAccount]);

    const handleSaveAccount = (account: Omit<T.AdAccount, 'id'> | T.AdAccount) => {
        if ('id' in account && account.id) {
            updateAdAccount(account as T.AdAccount);
        } else {
            const { id, ...newAccount } = account as T.AdAccount;
            addAdAccount(newAccount);
        }
        setIsModalOpen(false);
    };

    const handleDeleteClick = (account: T.AdAccount) => {
        setAccountToDelete(account);
    };

    const handleConfirmDelete = () => {
        if (accountToDelete) {
            deleteAdAccount(accountToDelete.id);
            setAccountToDelete(null);
            if (selectedAccount === accountToDelete.accountNumber) {
                const remainingAccounts = adAccounts.filter(a => a.id !== accountToDelete.id);
                setSelectedAccount(remainingAccounts.length > 0 ? remainingAccounts[0].accountNumber : '');
            }
        }
    };

    const ledgerData = useMemo(() => {
        if (!selectedAccount) return [];

        const transactions = [
            ...adDeposits.filter(d => d.adAccountNumber === selectedAccount)
                .map(d => ({ date: d.date, type: 'deposit' as const, amount: d.usdAmount, description: 'Nạp tiền' })),
            ...dailyAdCosts.filter(c => c.adAccountNumber === selectedAccount)
                .map(c => ({ date: c.date, type: 'cost' as const, amount: c.amount, description: `Chi phí: ${projectMap.get(c.projectId) || c.projectId}` })),
            ...adFundTransfers.filter(t => t.fromAdAccountNumber === selectedAccount)
                .map(t => ({ date: t.date, type: 'transfer_out' as const, amount: t.amount, description: `Chuyển tiền đến TK ${t.toAdAccountNumber}` })),
            ...adFundTransfers.filter(t => t.toAdAccountNumber === selectedAccount)
                .map(t => ({ date: t.date, type: 'transfer_in' as const, amount: t.amount, description: `Nhận tiền từ TK ${t.fromAdAccountNumber}` })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;
        return transactions.map(tx => {
            let deposit = 0;
            let spent = 0;
            if (tx.type === 'deposit' || tx.type === 'transfer_in') {
                runningBalance += tx.amount;
                deposit = tx.amount;
            } else {
                runningBalance -= tx.amount;
                spent = tx.amount;
            }
            return {
                date: tx.date,
                description: tx.description,
                deposit,
                spent,
                balance: runningBalance
            };
        });
    }, [selectedAccount, adDeposits, adFundTransfers, dailyAdCosts, projectMap]);

    return (
        <div>
            <Header title="Quản lý & Sổ chi tiết tài khoản Ads">
                {!isReadOnly && (
                    <Button onClick={() => { setEditingAccount(undefined); setIsModalOpen(true); }}>
                        <span className="flex items-center gap-2"><Plus /> Thêm tài khoản Ads</span>
                    </Button>
                )}
            </Header>
            <Card className="mb-8">
                <CardHeader>Danh sách tài khoản Ads</CardHeader>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Số tài khoản</TableHeader>
                                <TableHeader>Nền tảng</TableHeader>
                                <TableHeader>Trạng thái</TableHeader>
                                {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {adAccounts.length > 0 ? [...adAccounts].sort((a,b) => a.accountNumber.localeCompare(b.accountNumber)).map(acc => (
                                <TableRow 
                                    key={acc.id} 
                                    onClick={() => setSelectedAccount(acc.accountNumber)}
                                    className={`cursor-pointer ${selectedAccount === acc.accountNumber ? 'bg-primary-900/50' : ''}`}
                                >
                                    <TableCell className="font-medium text-white">{acc.accountNumber}</TableCell>
                                    <TableCell>{adsPlatformLabels[acc.adsPlatform]}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            acc.status === 'running' ? 'bg-green-200 text-green-800' : 
                                            acc.status === 'stopped' ? 'bg-gray-200 text-gray-800' : 'bg-red-200 text-red-800'
                                        }`}>
                                            {adAccountStatusLabels[acc.status]}
                                        </span>
                                    </TableCell>
                                    {!isReadOnly && (
                                        <TableCell>
                                            <div className="flex items-center space-x-3 justify-center">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingAccount(acc); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(acc); }} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={!isReadOnly ? 4 : 3} className="text-center text-gray-500 py-8">
                                        Chưa có tài khoản Ads nào. Hãy thêm một tài khoản mới.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedAccount && (
                 <Card>
                    <CardHeader>Sổ chi tiết cho tài khoản: {selectedAccount}</CardHeader>
                    <CardContent>
                         <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Ngày</TableHeader>
                                    <TableHeader>Mô tả</TableHeader>
                                    <TableHeader>Nạp (USD)</TableHeader>
                                    <TableHeader>Tiêu (USD)</TableHeader>
                                    <TableHeader>Số dư (USD)</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ledgerData.length > 0 ? ledgerData.map((row, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{formatDate(row.date)}</TableCell>
                                        <TableCell className="text-left">{row.description}</TableCell>
                                        <TableCell className="text-green-400">
                                            {row.deposit > 0 ? formatCurrency(row.deposit, 'USD') : '—'}
                                        </TableCell>
                                        <TableCell className="text-red-400">
                                            {row.spent > 0 ? formatCurrency(row.spent, 'USD') : '—'}
                                        </TableCell>
                                        <TableCell className="font-semibold text-white">
                                            {formatCurrency(row.balance, 'USD')}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                                            Không có giao dịch cho tài khoản này.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                             <tfoot className="border-t-2 border-gray-700">
                                <TableRow className="font-bold bg-gray-800/50 hover:bg-gray-800/50">
                                    <TableCell colSpan={4} className="text-right pr-6 text-white">Số dư cuối cùng</TableCell>
                                    <TableCell className="text-white text-lg">
                                        {formatCurrency(ledgerData.length > 0 ? ledgerData[ledgerData.length - 1].balance : 0, 'USD')}
                                    </TableCell>
                                </TableRow>
                            </tfoot>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {!isReadOnly && (
                <>
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAccount ? 'Sửa tài khoản Ads' : 'Thêm tài khoản Ads'}>
                        <AdAccountForm 
                            account={editingAccount}
                            onSave={handleSaveAccount}
                            onCancel={() => setIsModalOpen(false)}
                        />
                    </Modal>
                     <ConfirmationModal
                        isOpen={!!accountToDelete}
                        onClose={() => setAccountToDelete(null)}
                        onConfirm={handleConfirmDelete}
                        title="Xác nhận xóa tài khoản Ads"
                        message={`Bạn có chắc muốn xóa tài khoản "${accountToDelete?.accountNumber}"? Các giao dịch liên quan sẽ không bị xóa nhưng có thể không hiển thị đúng. Hành động này không thể hoàn tác.`}
                    />
                </>
            )}
        </div>
    );
}