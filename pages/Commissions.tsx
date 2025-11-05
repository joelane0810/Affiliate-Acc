import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Commission, Project, Asset, AssetType } from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Plus, Edit, Trash2 } from '../components/icons/IconComponents';
import { formatCurrency, formatDate, isDateInPeriod } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

const CommissionForm: React.FC<{ 
    commission?: Commission; 
    projectsForPeriod: Project[];
    assets: Asset[];
    assetTypes: AssetType[];
    onSave: (commission: Omit<Commission, 'id'> | Commission) => void; 
    onCancel: () => void; 
}> = ({ commission, projectsForPeriod, assets, assetTypes, onSave, onCancel }) => {
    const { currentPeriod } = useData();
    const [projectId, setProjectId] = useState(commission?.projectId || (projectsForPeriod[0]?.id || ''));
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(commission?.date || defaultDate);
    const [assetId, setAssetId] = useState(commission?.assetId || (assets[0]?.id || ''));
    const [usdAmount, setUsdAmount] = useState(commission?.usdAmount || 0);
    const [predictedRate, setPredictedRate] = useState(commission?.predictedRate || 0);
    
    const assetTypeMap = useMemo(() => new Map(assetTypes.map(at => [at.id, at.name])), [assetTypes]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !assetId) {
            alert("Vui lòng chọn dự án và tài sản nhận.");
            return;
        }
        const vndAmount = usdAmount * predictedRate;
        onSave({ ...commission, id: commission?.id || '', projectId, date, assetId, usdAmount, predictedRate, vndAmount });
    };
    
    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";


    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="project">Dự án</Label>
                    <select
                        id="project"
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                        className={selectClassName}
                        required
                    >
                         <option value="" disabled>-- Chọn dự án --</option>
                        {projectsForPeriod.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <Label htmlFor="date">Ngày</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                 <div>
                    <Label htmlFor="asset">Tài sản nhận</Label>
                    <select id="asset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({assetTypeMap.get(a.typeId) || 'N/A'})</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-700 pt-4">
                    <div>
                        <Label htmlFor="usdAmount">Số tiền (USD)</Label>
                        <NumberInput id="usdAmount" value={usdAmount} onValueChange={setUsdAmount} required />
                    </div>
                    <div>
                        <Label htmlFor="predictedRate">Rate (dự đoán)</Label>
                        <NumberInput id="predictedRate" value={predictedRate} onValueChange={setPredictedRate} required />
                    </div>
                     <div className="md:col-span-2">
                        <Label>Thành tiền (VND)</Label>
                        <Input value={formatCurrency(usdAmount * predictedRate)} readOnly className="bg-gray-800" />
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>
                <Button type="submit">Lưu</Button>
            </div>
        </form>
    );
};

export default function Commissions() {
    const { projects, commissions, addCommission, updateCommission, deleteCommission, assets, assetTypes, currentPeriod, isReadOnly } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCommission, setEditingCommission] = useState<Commission | undefined>(undefined);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [commissionToDeleteId, setCommissionToDeleteId] = useState<string | null>(null);

    const projectsForPeriod = useMemo(() =>
        projects.filter(p => p.period === currentPeriod),
    [projects, currentPeriod]);
    
    const handleSave = (commission: Omit<Commission, 'id'> | Commission) => {
        if ('id' in commission && commission.id) {
            updateCommission(commission as Commission);
        } else {
            const { id, ...newCommission } = commission as Commission;
            addCommission(newCommission);
        }
        setIsModalOpen(false);
        setEditingCommission(undefined);
    };
    
    const handleDeleteClick = (commissionId: string) => {
        setCommissionToDeleteId(commissionId);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (commissionToDeleteId) {
            deleteCommission(commissionToDeleteId);
            setIsConfirmModalOpen(false);
            setCommissionToDeleteId(null);
        }
    };
    
    const commissionsWithProjectName = useMemo(() => {
        const projectMap = new Map(projects.map(p => [p.id, p.name]));
        const assetMap = new Map(assets.map(a => [a.id, a.name]));
        return commissions
            .filter(c => isDateInPeriod(c.date, currentPeriod))
            .map(c => ({
                ...c,
                projectName: projectMap.get(c.projectId) || 'N/A',
                assetName: assetMap.get(c.assetId) || 'N/A'
            }))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [commissions, projects, assets, currentPeriod]);

    return (
        <>
            <Header title="Hoa hồng">
                {!isReadOnly && (
                    <Button onClick={() => { setEditingCommission(undefined); setIsModalOpen(true); }} disabled={projectsForPeriod.length === 0 || assets.length === 0}>
                        <span className="flex items-center gap-2"><Plus /> Thêm hoa hồng</span>
                    </Button>
                )}
            </Header>

            {(projects.length === 0 || assets.length === 0) && currentPeriod ? (
                <Card>
                    <CardContent>
                        <p className="text-center text-gray-400">Vui lòng tạo ít nhất một dự án và một tài sản trước khi thêm hoa hồng.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableHeader>Ngày</TableHeader>
                                    <TableHeader>Tên dự án</TableHeader>
                                    <TableHeader>Tài sản nhận</TableHeader>
                                    <TableHeader>USD</TableHeader>
                                    <TableHeader>Rate (dự đoán)</TableHeader>
                                    <TableHeader>VND</TableHeader>
                                    {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {commissionsWithProjectName.map(c => (
                                    <TableRow key={c.id}>
                                        <TableCell>{formatDate(c.date)}</TableCell>
                                        <TableCell className="font-medium text-white">{c.projectName}</TableCell>
                                        <TableCell>{c.assetName}</TableCell>
                                        <TableCell>{formatCurrency(c.usdAmount, 'USD')}</TableCell>
                                        <TableCell>{c.predictedRate.toLocaleString('vi-VN')}</TableCell>
                                        <TableCell className="text-primary-400 font-semibold">{formatCurrency(c.vndAmount)}</TableCell>
                                        {!isReadOnly && (
                                            <TableCell>
                                                <div className="flex items-center space-x-3 justify-center">
                                                    <button onClick={() => { setEditingCommission(c); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                                    <button onClick={() => handleDeleteClick(c.id)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
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
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCommission ? 'Sửa hoa hồng' : 'Thêm hoa hồng mới'}>
                        <CommissionForm
                            commission={editingCommission}
                            projectsForPeriod={projectsForPeriod}
                            assets={assets}
                            assetTypes={assetTypes}
                            onSave={handleSave}
                            onCancel={() => { setIsModalOpen(false); setEditingCommission(undefined); }}
                        />
                    </Modal>
                    
                    <ConfirmationModal
                        isOpen={isConfirmModalOpen}
                        onClose={() => setIsConfirmModalOpen(false)}
                        onConfirm={handleConfirmDelete}
                        title="Xác nhận xóa hoa hồng"
                        message="Bạn có chắc chắn muốn xóa khoản hoa hồng này không? Hành động này không thể hoàn tác."
                    />
                </>
            )}
        </>
    );
}