import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Partner, PartnerLedgerEntry, PartnerRequest } from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Plus, Edit, Trash2, CheckCircle, Info } from '../components/icons/IconComponents';
import { formatCurrency, formatDate } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

// Form for adding/editing a partner
const PartnerForm: React.FC<{
    partner?: Partner;
    onSave: (partner: Partial<Omit<Partner, 'id' | 'ownerUid' | 'ownerName'>> | Partner) => void;
    onCancel: () => void;
}> = ({ partner, onSave, onCancel }) => {
    const [name, setName] = useState(partner?.name || '');
    const [loginEmail, setLoginEmail] = useState(partner?.loginEmail || '');
    const isEditingSelf = partner?.isSelf;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ id: partner?.id || '', name, loginEmail });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="partnerName">{isEditingSelf ? "Tên của bạn" : "Tên đối tác"}</Label>
                <Input id="partnerName" value={name} onChange={e => setName(e.target.value)} required autoFocus />
                 {isEditingSelf && <p className="text-xs text-gray-400 mt-1">Tên này sẽ được hiển thị cho các đối tác của bạn.</p>}
            </div>
            <div>
                <Label htmlFor="loginEmail">Email đăng nhập (Tùy chọn)</Label>
                <Input 
                    id="loginEmail" 
                    type="email"
                    value={loginEmail} 
                    onChange={e => setLoginEmail(e.target.value)} 
                    placeholder="partner@example.com"
                    disabled={isEditingSelf}
                />
                <p className="text-xs text-gray-400 mt-1">
                    {isEditingSelf 
                        ? "Bạn không thể thay đổi email đăng nhập của chính mình."
                        : "Nếu được cung cấp, đối tác có thể dùng email này để đăng nhập và xem dữ liệu được chia sẻ."
                    }
                </p>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

// Form for adding a manual ledger entry
const LedgerEntryForm: React.FC<{
    partnerId: string;
    onSave: (entry: Omit<PartnerLedgerEntry, 'id' | 'workspaceId'>) => void;
    onCancel: () => void;
}> = ({ partnerId, onSave, onCancel }) => {
    const { user } = useData();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'inflow' | 'outflow'>('outflow');
    const [amount, setAmount] = useState(0);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            alert("Số tiền phải lớn hơn 0.");
            return;
        }
        // workspaceId will be added by context
        onSave({ partnerId, date, description, type, amount });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="entryDate">Ngày</Label>
                <Input id="entryDate" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
                <Label htmlFor="entryDesc">Mô tả</Label>
                <Input id="entryDesc" value={description} onChange={e => setDescription(e.target.value)} placeholder="VD: Điều chỉnh số dư, Tạm ứng..." required />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="entryType">Loại giao dịch</Label>
                     <select id="entryType" value={type} onChange={e => setType(e.target.value as 'inflow' | 'outflow')} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="inflow">Ghi có (Inflow)</option>
                        <option value="outflow">Ghi nợ (Outflow)</option>
                    </select>
                </div>
                 <div>
                    <Label htmlFor="entryAmount">Số tiền (VND)</Label>
                    <NumberInput id="entryAmount" value={amount} onValueChange={setAmount} required />
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

const PartnerRequests: React.FC<{
    incomingRequests: PartnerRequest[];
    onAccept: (request: PartnerRequest) => void;
    onDecline: (request: PartnerRequest) => void;
}> = ({ incomingRequests, onAccept, onDecline }) => {
    if (incomingRequests.length === 0) return null;

    return (
        <Card className="mb-8 border-primary-500/50">
            <CardHeader>Yêu cầu kết nối đang chờ</CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {incomingRequests.map(req => (
                        <div key={req.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-900/50 rounded-md">
                            <div>
                                <p className="font-semibold text-white">{req.senderName}</p>
                                <p className="text-sm text-gray-400">{req.senderEmail}</p>
                            </div>
                            <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                                <Button size="sm" onClick={() => onAccept(req)}>Chấp nhận</Button>
                                <Button size="sm" variant="danger" onClick={() => onDecline(req)}>Từ chối</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};


export default function Partners() {
    const {
        enrichedPartners, allPartnerLedgerEntries, isReadOnly,
        addPartner, updatePartner, deletePartner,
        addPartnerLedgerEntry, deletePartnerLedgerEntry,
        partnerAssetBalances,
        user,
        partnerRequests, sendPartnerRequest, acceptPartnerRequest, declinePartnerRequest
    } = useData();
    
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | undefined>(undefined);
    const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const [ledgerPartnerId, setLedgerPartnerId] = useState<string>('');
    const [ledgerEntryToDelete, setLedgerEntryToDelete] = useState<PartnerLedgerEntry | null>(null);
    
    const incomingPendingRequests = useMemo(() => {
        if (!user) return [];
        return partnerRequests.filter(req => req.recipientEmail === user.email && req.status === 'pending');
    }, [partnerRequests, user]);

    const myPartners = useMemo(() => {
        if (!user || !enrichedPartners || !Array.isArray(enrichedPartners)) {
            return [];
        }
        return enrichedPartners
            .filter(p => p.ownerUid === user.uid)
            .sort((a, b) => (a.isSelf ? -1 : b.isSelf ? 1 : a.name.localeCompare(b.name)));
    }, [enrichedPartners, user]);
    
    // Partner handlers
    const handleSavePartner = (partnerData: Partial<Omit<Partner, 'id' | 'ownerUid' | 'ownerName'>> | Partner) => {
        if ('id' in partnerData && partnerData.id) {
            updatePartner(partnerData as Partner);
        } else {
            addPartner(partnerData as Omit<Partner, 'id' | 'ownerUid' | 'ownerName'>);
        }
        setIsPartnerModalOpen(false);
    };
    const handleDeletePartner = () => {
        if (partnerToDelete) {
            deletePartner(partnerToDelete.id);
            setPartnerToDelete(null);
        }
    };
    
    // Ledger handlers
    const handleSaveLedgerEntry = (entry: Omit<PartnerLedgerEntry, 'id' | 'workspaceId'>) => {
        addPartnerLedgerEntry(entry);
        setIsLedgerModalOpen(false);
    };
    const handleDeleteLedgerEntry = () => {
        if (ledgerEntryToDelete) {
            deletePartnerLedgerEntry(ledgerEntryToDelete.id);
            setLedgerEntryToDelete(null);
        }
    };

    const partnerLedger = useMemo(() => 
        [...allPartnerLedgerEntries].sort((a,b) => {
             const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
             if (dateComparison !== 0) return dateComparison;
             return b.id.localeCompare(a.id);
        }),
    [allPartnerLedgerEntries]);
    
    const partnerMap = useMemo(() => new Map(enrichedPartners.map(p => [p.id, p.name])), [enrichedPartners]);

    const renderPartnerStatusButton = (partner: Partner) => {
        if (partner.isSelf || partner.status === 'linked') {
            return (
                <div className="flex items-center justify-center gap-2 text-green-400 font-semibold text-sm py-1 px-3 bg-green-900/50 rounded-md">
                    <CheckCircle width={16} height={16} />
                    <span>Đã kết nối</span>
                </div>
            );
        }
        if (partner.status === 'pending') {
            return <Button size="sm" variant="secondary" className="w-full" disabled>Đã gửi yêu cầu</Button>;
        }
        if (partner.loginEmail) {
            return <Button size="sm" variant="secondary" className="w-full" onClick={() => sendPartnerRequest(partner)}>Gửi yêu cầu kết nối</Button>;
        }
        return (
            <div className="flex items-center justify-center gap-2 text-yellow-400 font-semibold text-xs py-1 px-3 bg-yellow-900/50 rounded-md">
                <Info width={14} height={14} />
                <span>Chưa liên kết</span>
            </div>
        );
    };

    return (
        <div>
            <Header title="Đối tác">
                {!isReadOnly && (
                    <Button onClick={() => { setEditingPartner(undefined); setIsPartnerModalOpen(true); }}>
                        <span className="flex items-center gap-2"><Plus /> Thêm đối tác</span>
                    </Button>
                )}
            </Header>

            <PartnerRequests 
                incomingRequests={incomingPendingRequests}
                onAccept={acceptPartnerRequest}
                onDecline={declinePartnerRequest}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {myPartners.map(partner => {
                    const balancesForPartner = partnerAssetBalances.get(partner.id) || [];
                    return (
                    <Card key={partner.id} className="flex flex-col">
                        <CardHeader className="flex justify-between items-center">
                            <span>{partner.name}</span>
                             {!isReadOnly && (
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => { setEditingPartner(partner); setIsPartnerModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                    {!partner.isSelf && <button onClick={() => setPartnerToDelete(partner)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-gray-400">Tổng Ghi có (Inflow)</span>
                                <span className="font-semibold text-green-400">{formatCurrency(partner.totalInflow)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-gray-400">Tổng Ghi nợ (Outflow)</span>
                                <span className="font-semibold text-red-400">{formatCurrency(partner.totalOutflow)}</span>
                            </div>
                            <div className="flex justify-between items-baseline pt-3 border-t border-gray-700">
                                <span className="font-bold text-white">Số dư</span>
                                <span className={`font-bold text-xl ${partner.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(partner.balance)}</span>
                            </div>
                            {balancesForPartner.length > 0 && (
                                <div className="pt-3 border-t border-gray-700 mt-3">
                                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Phân bổ theo tài sản</h4>
                                    <div className="space-y-1.5 text-sm max-h-24 overflow-y-auto pr-2">
                                        {balancesForPartner.map(assetBalance => (
                                            <div key={assetBalance.assetId} className="flex justify-between">
                                                <span className="text-gray-300 truncate pr-2">{assetBalance.assetName}</span>
                                                <span className="font-mono font-semibold text-gray-200 flex-shrink-0">
                                                    {formatCurrency(assetBalance.balance, assetBalance.currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                         <div className="p-4 pt-2 border-t border-gray-700">
                            {renderPartnerStatusButton(partner)}
                        </div>
                    </Card>
                )})}
            </div>

            <Card>
                <CardHeader>Sổ cái đối tác</CardHeader>
                <CardContent>
                     <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Ngày</TableHeader>
                                <TableHeader>Đối tác</TableHeader>
                                <TableHeader className="text-left">Mô tả</TableHeader>
                                <TableHeader className="text-left">Nguồn</TableHeader>
                                <TableHeader className="text-left">Đích</TableHeader>
                                <TableHeader>Ghi có (Inflow)</TableHeader>
                                <TableHeader>Ghi nợ (Outflow)</TableHeader>
                                {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {partnerLedger.map(entry => {
                                const isManualEntry = !entry.id.startsWith('ci-') && !entry.id.startsWith('wd-') && !entry.id.startsWith('pnl-') && !entry.id.startsWith('active-');
                                return (
                                <TableRow key={entry.id}>
                                    <TableCell>{formatDate(entry.date)}</TableCell>
                                    <TableCell className="font-medium text-white">{partnerMap.get(entry.partnerId) || 'N/A'}</TableCell>
                                    <TableCell className="text-left">{entry.description}</TableCell>
                                    <TableCell className="text-left text-gray-400">{entry.sourceName || '—'}</TableCell>
                                    <TableCell className="text-left text-gray-400">{entry.destinationName || '—'}</TableCell>
                                    <TableCell className="text-green-400">{entry.type === 'inflow' ? formatCurrency(entry.amount) : '—'}</TableCell>
                                    <TableCell className="text-red-400">{entry.type === 'outflow' ? formatCurrency(entry.amount) : '—'}</TableCell>
                                    <TableCell>
                                        {!isReadOnly && isManualEntry && (
                                             <button onClick={() => setLedgerEntryToDelete(entry)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
                                        )}
                                         {!isManualEntry && <span className="text-xs text-gray-500">Tự động</span>}
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            {!isReadOnly && (
                <>
                    <Modal isOpen={isPartnerModalOpen} onClose={() => setIsPartnerModalOpen(false)} title={editingPartner ? 'Sửa thông tin' : 'Thêm đối tác'}>
                        <PartnerForm partner={editingPartner} onSave={handleSavePartner} onCancel={() => setIsPartnerModalOpen(false)} />
                    </Modal>
                    <ConfirmationModal isOpen={!!partnerToDelete} onClose={() => setPartnerToDelete(null)} onConfirm={handleDeletePartner} title="Xác nhận xóa" message={`Bạn có chắc muốn xóa đối tác "${partnerToDelete?.name}" không?`} />
                
                    {ledgerPartnerId && <Modal isOpen={isLedgerModalOpen} onClose={() => setIsLedgerModalOpen(false)} title={`Ghi sổ cho ${partnerMap.get(ledgerPartnerId)}`}>
                        <LedgerEntryForm partnerId={ledgerPartnerId} onSave={handleSaveLedgerEntry} onCancel={() => setIsLedgerModalOpen(false)} />
                    </Modal>}
                    <ConfirmationModal isOpen={!!ledgerEntryToDelete} onClose={() => setLedgerEntryToDelete(null)} onConfirm={handleDeleteLedgerEntry} title="Xác nhận xóa" message={`Bạn có chắc muốn xóa bút toán "${ledgerEntryToDelete?.description}" không?`} />
                </>
            )}

        </div>
    );
}