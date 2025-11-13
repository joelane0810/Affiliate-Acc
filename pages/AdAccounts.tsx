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
    onSave: (account: Omit<T.AdAccount, 'id' | 'workspaceId'> | T.AdAccount | Omit<T.AdAccount, 'id' | 'workspaceId'>[]) => void;
    onCancel: () => void;
}> = ({ account, onSave, onCancel }) => {
    const [accountNumber, setAccountNumber] = useState(account?.accountNumber || '');
    const [adsPlatform, setAdsPlatform] = useState<T.AdsPlatform>(account?.adsPlatform || 'google');
    const [status, setStatus] = useState<T.AdAccount['status']>(account?.status || 'running');

    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkAccountNumbers, setBulkAccountNumbers] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isBulkMode) {
            const accountsToSave = bulkAccountNumbers
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .map(accNum => ({
                    accountNumber: accNum,
                    adsPlatform,
                    status,
                }));
            
            if (accountsToSave.length > 0) {
                onSave(accountsToSave);
            } else {
                alert("Vui lòng nhập ít nhất một số tài khoản.");
            }
        } else {
            if (!accountNumber.trim()) {
                alert("Vui lòng nhập số tài khoản.");
                return;
            }
            const dataToSave = { accountNumber, adsPlatform, status };
            if (account) {
                onSave({ ...account, ...dataToSave });
            } else {
                onSave(dataToSave);
            }
        }
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {!account && (
                <div className="flex justify-end">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setIsBulkMode(!isBulkMode)}>
                        {isBulkMode ? 'Chuyển sang tạo một tài khoản' : 'Tạo nhiều tài khoản'}
                    </Button>
                </div>
            )}
            
            {isBulkMode ? (
                <div>
                    <Label htmlFor="bulkAccountNumbers">Danh sách số tài khoản (mỗi số một dòng)</Label>
                    <textarea
                        id="bulkAccountNumbers"
                        value={bulkAccountNumbers}
                        onChange={e => setBulkAccountNumbers(e.target.value)}
                        className="w-full h-32 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="625-608-7597&#10;FB-ACC-002&#10;TIKTOK-ACC-003"
                    />
                </div>
            ) : (
                <div>
                    <Label htmlFor="accountNumber">Số tài khoản</Label>
                    <Input id="accountNumber" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required />
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        adAccountTransactions, enrichedAdAccounts
    } = useData();
    
    const isReadOnly = false; 

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<T.AdAccount | undefined>(undefined);
    const [accountToDelete, setAccountToDelete] = useState<T.AdAccount | null>(null);

    const handleSaveAccount = (accountOrAccounts: Omit<T.AdAccount, 'id' | 'workspaceId'> | T.AdAccount | Omit<T.AdAccount, 'id' | 'workspaceId'>[]) => {
        if (Array.isArray(accountOrAccounts)) {
            addAdAccount(accountOrAccounts);
        } else if ('id' in accountOrAccounts && accountOrAccounts.id) {
            updateAdAccount(accountOrAccounts as T.AdAccount);
        } else {
            addAdAccount(accountOrAccounts as Omit<T.AdAccount, 'id' | 'workspaceId'>);
        }
        setIsModalOpen(false);
        setEditingAccount(undefined);
    };

    const handleDeleteClick = (account: T.AdAccount) => {
        setAccountToDelete(account);
    };

    const handleConfirmDelete = () => {
        if (accountToDelete) {
            deleteAdAccount(accountToDelete.id);
            setAccountToDelete(null);
        }
    };

    const ledgerData = useMemo(() => {
        return adAccountTransactions;
    }, [adAccountTransactions]);

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
                                <TableHeader>Số dư (USD)</TableHeader>
                                <TableHeader>Trạng thái</TableHeader>
                                {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {enrichedAdAccounts.length > 0 ? enrichedAdAccounts.map(acc => (
                                <TableRow key={acc.id}>
                                    <TableCell className="font-medium text-white">{acc.accountNumber}</TableCell>
                                    <TableCell>{adsPlatformLabels[acc.adsPlatform]}</TableCell>
                                    <TableCell className="font-semibold text-primary-400">{formatCurrency(acc.balance, 'USD')}</TableCell>
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
                                    <TableCell colSpan={!isReadOnly ? 5 : 4} className="text-center text-gray-500 py-8">
                                        Chưa có tài khoản Ads nào. Hãy thêm một tài khoản mới.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {adAccounts.length > 0 && (
                 <Card>
                    <CardHeader>Biến động số dư tài khoản ads</CardHeader>
                    <CardContent>
                         <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Ngày</TableHeader>
                                    <TableHeader>Tài khoản ads</TableHeader>
                                    <TableHeader>Mô tả</TableHeader>
                                    <TableHeader>Nạp (USD)</TableHeader>
                                    <TableHeader>Tiêu (USD)</TableHeader>
                                    <TableHeader>Số dư (USD)</TableHeader>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ledgerData.length > 0 ? ledgerData.map((row, index) => (
                                    <TableRow key={row.id}>
                                        <TableCell>{formatDate(row.date)}</TableCell>
                                        <TableCell className="font-medium text-white">{row.adAccountNumber}</TableCell>
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
                                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                            Không có giao dịch cho tài khoản nào.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
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
                        message={`Bạn có chắc muốn xóa tài khoản "${accountToDelete?.accountNumber}"? Hành động này không thể hoàn tác.`}
                    />
                </>
            )}
        </div>
    );
}