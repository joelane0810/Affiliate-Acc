import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Partner } from '../types';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { Plus, Trash2 } from '../components/icons/IconComponents';
import { formatCurrency, formatPercentage } from '../lib/utils';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';


export default function Partners() {
    const { 
        partners, addPartner, updatePartner, deletePartner,
        periodFinancials, isReadOnly
    } = useData();
    const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);

    const partnerStats = useMemo(() => {
        if (!periodFinancials) {
            return partners.map(p => ({
                ...p,
                revenue: 0,
                cost: 0,
                profit: 0,
                roi: 0,
            }));
        }
        return periodFinancials.partnerPnlDetails.map(pnl => {
            const roi = pnl.cost > 0 ? (pnl.profit / pnl.cost) * 100 : 0;
            return {
                ...pnl,
                id: pnl.partnerId,
                roi,
            };
        });
    }, [periodFinancials, partners]);

    const handleAddPartner = () => {
        addPartner({
            name: 'Đối tác mới',
        });
    };

    const handleDeleteClick = (partner: { id: string, name: string }) => {
        if (partner.id === 'default-me') {
            alert("Không thể xóa đối tác 'Tôi'.");
            return;
        }
        if (partners.length <= 1) {
            alert("Không thể xóa đối tác cuối cùng.");
            return;
        }
        setPartnerToDelete(partner as Partner);
    };

    const handleConfirmDelete = () => {
        if (partnerToDelete) {
            deletePartner(partnerToDelete.id);
            setPartnerToDelete(null);
        }
    };

    const handlePartnerChange = (id: string, field: 'name', value: string) => {
        const partnerToUpdate = partners.find(p => p.id === id);
        if (partnerToUpdate) {
            if (partnerToUpdate.id === 'default-me') return;
            const updatedPartner = { ...partnerToUpdate, [field]: value };
            updatePartner(updatedPartner);
        }
    };

    return (
        <>
            <Header title="Đối tác">
                {!isReadOnly && (
                    <Button onClick={handleAddPartner}>
                        <span className="flex items-center gap-2"><Plus /> Thêm đối tác</span>
                    </Button>
                )}
            </Header>

            <Card>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader className="w-1/3">Đối tác</TableHeader>
                                <TableHeader>Doanh thu kỳ</TableHeader>
                                <TableHeader>Chi phí kỳ</TableHeader>
                                <TableHeader>Lợi nhuận kỳ</TableHeader>
                                <TableHeader>ROI kỳ</TableHeader>
                                {!isReadOnly && <TableHeader className="w-24">Hành động</TableHeader>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {partnerStats.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="py-3">
                                        <Input
                                            value={p.name}
                                            onChange={(e) => handlePartnerChange(p.id, 'name', e.target.value)}
                                            className="bg-transparent border-none focus:ring-1 focus:bg-gray-800 focus:ring-primary-500 py-1 text-center"
                                            aria-label={`Tên đối tác ${p.name}`}
                                            readOnly={p.id === 'default-me' || isReadOnly}
                                        />
                                    </TableCell>
                                    <TableCell className="text-primary-400 py-3">{formatCurrency(p.revenue)}</TableCell>
                                    <TableCell className="text-red-400 py-3">{formatCurrency(p.cost)}</TableCell>
                                    <TableCell className={`font-semibold py-3 ${p.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatCurrency(p.profit)}
                                    </TableCell>
                                    <TableCell className={`font-semibold py-3 ${p.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                       {p.cost > 0 ? formatPercentage(p.roi) : 'N/A'}
                                    </TableCell>
                                    {!isReadOnly && (
                                        <TableCell className="py-3">
                                            <div className="flex justify-center">
                                                {p.id !== 'default-me' && (
                                                    <button 
                                                        onClick={() => handleDeleteClick(p)} 
                                                        className="text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        disabled={partners.length <= 1}
                                                        aria-label={`Xóa đối tác ${p.name}`}
                                                    >
                                                        <Trash2 />
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                        <tfoot className="border-t-2 border-gray-700">
                            <TableRow className="hover:bg-gray-900">
                                <TableCell className="font-bold text-white py-3">Tổng</TableCell>
                                <TableCell className="font-bold text-white py-3">{formatCurrency(periodFinancials?.totalRevenue)}</TableCell>
                                <TableCell className="font-bold text-white py-3">{formatCurrency(periodFinancials?.totalCost)}</TableCell>
                                <TableCell 
                                     className={`font-bold py-3 ${periodFinancials && periodFinancials.totalProfit >= 0 ? 'text-white' : 'text-red-400'}`}
                                >
                                    {formatCurrency(periodFinancials?.totalProfit)}
                                </TableCell>
                                <TableCell className="py-3"></TableCell>
                                {!isReadOnly && <TableCell className="py-3"></TableCell>}
                            </TableRow>
                        </tfoot>
                    </Table>
                </CardContent>
            </Card>
            
            {!isReadOnly && (
                <ConfirmationModal
                    isOpen={!!partnerToDelete}
                    onClose={() => setPartnerToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title="Xác nhận xóa đối tác"
                    message={`Bạn có chắc chắn muốn xóa đối tác "${partnerToDelete?.name}" không? Hành động này không thể hoàn tác.`}
                />
            )}
        </>
    );
}