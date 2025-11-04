import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { ExchangeLog, Asset } from '../types';
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


const ExchangeLogForm: React.FC<{
    log?: ExchangeLog;
    assets: Asset[];
    enrichedAssets: ReturnType<typeof useData>['enrichedAssets'];
    onSave: (log: Omit<ExchangeLog, 'id'> | ExchangeLog) => void;
    onCancel: () => void;
}> = ({ log, assets, enrichedAssets, onSave, onCancel }) => {
    const { currentPeriod } = useData();
    const defaultDate = currentPeriod ? `${currentPeriod}-01` : new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(log?.date || defaultDate);
    const [usdAmount, setUsdAmount] = useState(log?.usdAmount || 0);
    const [rate, setRate] = useState(log?.rate || 0);

    const usdAssets = useMemo(() => assets.filter(a => a.currency === 'USD'), [assets]);
    const vndAssets = useMemo(() => assets.filter(a => a.currency === 'VND'), [assets]);

    const [sellingAssetId, setSellingAssetId] = useState(log?.sellingAssetId || (usdAssets[0]?.id || ''));
    const [receivingAssetId, setReceivingAssetId] = useState(log?.receivingAssetId || (vndAssets[0]?.id || ''));
    
    const selectedSellingAssetData = useMemo(() => {
        return enrichedAssets.find(a => a.id === sellingAssetId);
    }, [sellingAssetId, enrichedAssets]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sellingAssetId || !receivingAssetId) {
            alert("Vui lòng chọn tài sản bán và nhận.");
            return;
        }
        
        const selectedAssetBalance = enrichedAssets.find(a => a.id === sellingAssetId)?.balance ?? 0;
        if (usdAmount > selectedAssetBalance) {
            alert(`Số tiền bán (${formatCurrency(usdAmount, 'USD')}) không thể vượt quá số dư hiện tại của tài sản (${formatCurrency(selectedAssetBalance, 'USD')}).`);
            return;
        }

        const vndAmount = usdAmount * rate;
        onSave({ ...log, id: log?.id || '', date, sellingAssetId, receivingAssetId, usdAmount, rate, vndAmount });
    };
    
    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="date">Ngày</Label>
                    <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <Label htmlFor="sellingAsset">Tài sản bán (USD)</Label>
                        <select id="sellingAsset" value={sellingAssetId} onChange={e => setSellingAssetId(e.target.value)} className={selectClassName} required>
                            <option value="" disabled>-- Chọn tài sản --</option>
                            {usdAssets.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        {selectedSellingAssetData && (
                            <p className="text-xs text-gray-400 mt-1">
                                Số dư khả dụng: {formatCurrency(selectedSellingAssetData.balance, 'USD')}
                            </p>
                        )}
                    </div>
                     <div>
                        <Label htmlFor="receivingAsset">Tài sản nhận (VND)</Label>
                        <select id="receivingAsset" value={receivingAssetId} onChange={e => setReceivingAssetId(e.target.value)} className={selectClassName} required>
                            <option value="" disabled>-- Chọn tài sản --</option>
                            {vndAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-700 pt-4">
                    <div>
                        <Label htmlFor="usdAmount">Số tiền (USD)</Label>
                        <NumberInput id="usdAmount" value={usdAmount} onValueChange={setUsdAmount} required />
                    </div>
                    <div>
                        <Label htmlFor="rate">Tỷ giá</Label>
                        <NumberInput id="rate" value={rate} onValueChange={setRate} required />
                    </div>
                     <div className="md:col-span-2">
                        <Label>Thành tiền (VND)</Label>
                        <Input value={formatCurrency(usdAmount * rate)} readOnly className="bg-gray-800" />
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


export default function ExchangeLog() {
  const { assets, exchangeLogs, addExchangeLog, updateExchangeLog, deleteExchangeLog, currentPeriod, isReadOnly, enrichedAssets } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ExchangeLog | undefined>(undefined);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [logToDeleteId, setLogToDeleteId] = useState<string | null>(null);

  const enrichedLogs = useMemo(() => {
    const assetMap = new Map(assets.map(a => [a.id, a.name]));
    return exchangeLogs
      .filter(log => isDateInPeriod(log.date, currentPeriod))
      .map(log => ({
        ...log,
        sellingAssetName: assetMap.get(log.sellingAssetId) || 'N/A',
        receivingAssetName: assetMap.get(log.receivingAssetId) || 'N/A',
      }))
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [exchangeLogs, assets, currentPeriod]);

  const handleSave = (log: Omit<ExchangeLog, 'id'> | ExchangeLog) => {
    if ('id' in log && log.id) {
        updateExchangeLog(log as ExchangeLog);
    } else {
        addExchangeLog(log);
    }
    setIsModalOpen(false);
    setEditingLog(undefined);
  };
  
    const handleDeleteClick = (logId: string) => {
        setLogToDeleteId(logId);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (logToDeleteId) {
            deleteExchangeLog(logToDeleteId);
            setIsConfirmModalOpen(false);
            setLogToDeleteId(null);
        }
    };
  
  const hasUSDAssets = useMemo(() => assets.some(a => a.currency === 'USD'), [assets]);
  const hasVNDAssets = useMemo(() => assets.some(a => a.currency === 'VND'), [assets]);


  return (
    <>
      <Header title="Bán USD">
        {!isReadOnly && (
            <Button onClick={() => { setEditingLog(undefined); setIsModalOpen(true); }} disabled={!hasUSDAssets || !hasVNDAssets}>
                <span className="flex items-center gap-2"><Plus /> Thêm giao dịch</span>
            </Button>
        )}
      </Header>
      {!hasUSDAssets || !hasVNDAssets ? (
        <Card>
            <CardContent>
                <p className="text-center text-gray-400">Vui lòng tạo ít nhất một tài sản USD và một tài sản VND trước khi thêm giao dịch.</p>
            </CardContent>
        </Card>
      ) : (
        <Card>
            <CardContent>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeader className="w-40">Ngày</TableHeader>
                            <TableHeader>Tài sản bán</TableHeader>
                            <TableHeader>Tài sản nhận</TableHeader>
                            <TableHeader>USD</TableHeader>
                            <TableHeader>Rate</TableHeader>
                            <TableHeader>VND</TableHeader>
                            {!isReadOnly && <TableHeader>Hành động</TableHeader>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                      {enrichedLogs.map(log => (
                        <TableRow key={log.id}>
                            <TableCell>{formatDate(log.date)}</TableCell>
                            <TableCell className="font-medium text-white">{log.sellingAssetName}</TableCell>
                            <TableCell className="font-medium text-white">{log.receivingAssetName}</TableCell>
                            <TableCell>{formatCurrency(log.usdAmount, 'USD')}</TableCell>
                            <TableCell>{log.rate.toLocaleString('vi-VN')}</TableCell>
                            <TableCell className="text-primary-400 font-semibold">{formatCurrency(log.vndAmount)}</TableCell>
                            {!isReadOnly && (
                                <TableCell>
                                    <div className="flex items-center space-x-3 justify-center">
                                        <button onClick={() => { setEditingLog(log); setIsModalOpen(true); }} className="text-gray-400 hover:text-primary-400"><Edit /></button>
                                        <button onClick={() => handleDeleteClick(log.id)} className="text-gray-400 hover:text-red-400"><Trash2 /></button>
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
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLog ? 'Sửa giao dịch' : 'Thêm giao dịch mới'}>
                <ExchangeLogForm
                    log={editingLog}
                    assets={assets}
                    enrichedAssets={enrichedAssets}
                    onSave={handleSave}
                    onCancel={() => { setIsModalOpen(false); setEditingLog(undefined); }}
                />
            </Modal>
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Xác nhận xóa giao dịch"
                message="Bạn có chắc chắn muốn xóa giao dịch này không? Hành động này sẽ hoàn lại số dư tài sản và không thể hoàn tác."
            />
        </>
      )}
    </>
  );
}