import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '../components/Header';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { useData } from '../context/DataContext';
import { TaxSettings, Asset, Project } from '../types';
import { Label, Input } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { Button } from '../components/ui/Button';
import { formatCurrency, isDateInPeriod } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';

const TaxMethodRadio: React.FC<{
    label: string;
    description: string;
    value: TaxSettings['method'];
    checked: boolean;
    onChange: (value: TaxSettings['method']) => void;
    disabled: boolean;
}> = ({ label, description, value, checked, onChange, disabled }) => (
    <label className={`block p-4 rounded-lg border cursor-pointer transition-all ${
        checked 
            ? 'bg-primary-900/50 border-primary-500 ring-2 ring-primary-500' 
            : 'bg-gray-800 border-gray-700 hover:border-gray-500'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className="flex items-center">
            <input 
                type="radio" 
                name="taxMethod" 
                value={value} 
                checked={checked} 
                onChange={() => onChange(value)}
                className="h-4 w-4 text-primary-600 bg-gray-700 border-gray-600 focus:ring-primary-500"
                disabled={disabled}
            />
            <div className="ml-3 text-sm">
                <p className="font-medium text-white">{label}</p>
                <p className="text-gray-400">{description}</p>
            </div>
        </div>
    </label>
);

const TaxAllocationRadio: React.FC<{
    label: string,
    value: 'personal' | 'total',
    onChange: (value: 'personal' | 'total') => void,
    option1Label: string,
    option2Label: string,
    disabled: boolean,
}> = ({ label, value, onChange, option1Label, option2Label, disabled }) => (
    <div>
        <Label className="mb-2">{label}</Label>
        <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" value="personal" checked={value === 'personal'} onChange={() => onChange('personal')} disabled={disabled} className="h-4 w-4 text-primary-600 bg-gray-700 border-gray-600 focus:ring-primary-500" />
                <span className="text-gray-300">{option1Label}</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" value="total" checked={value === 'total'} onChange={() => onChange('total')} disabled={disabled} className="h-4 w-4 text-primary-600 bg-gray-700 border-gray-600 focus:ring-primary-500" />
                <span className="text-gray-300">{option2Label}</span>
            </label>
        </div>
    </div>
);


const VatInputMethodRadio: React.FC<{
    label: string;
    value: TaxSettings['vatInputMethod'];
    checked: boolean;
    onChange: (value: TaxSettings['vatInputMethod']) => void;
    disabled: boolean;
}> = ({ label, value, checked, onChange, disabled }) => (
     <label className="flex items-center space-x-2">
        <input
            type="radio"
            name="vatInputMethod"
            value={value}
            checked={checked}
            onChange={() => onChange(value)}
            className="h-4 w-4 text-primary-600 bg-gray-700 border-gray-600 focus:ring-primary-500"
            disabled={disabled}
        />
        <span className="text-gray-300">{label}</span>
    </label>
);

const TaxPaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (payment: { assetId: string, amount: number, date: string, period: string }) => void;
    taxPayable: number;
    period: string;
    vndAssets: Asset[];
}> = ({ isOpen, onClose, onSave, taxPayable, period, vndAssets }) => {
    const [amount, setAmount] = useState(taxPayable);
    const [assetId, setAssetId] = useState(vndAssets[0]?.id || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        setAmount(taxPayable);
    }, [taxPayable]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId || amount <= 0) {
            alert("Vui lòng chọn tài sản và nhập số tiền hợp lệ.");
            return;
        }
        onSave({ amount, assetId, date, period });
    };

    const selectClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Thanh toán thuế kỳ ${period}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="paymentDate">Ngày thanh toán</Label>
                    <Input id="paymentDate" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div>
                    <Label htmlFor="paymentAmount">Số tiền (VND)</Label>
                    <NumberInput id="paymentAmount" value={amount} onValueChange={setAmount} />
                </div>
                <div>
                    <Label htmlFor="paymentAsset">Nguồn tiền</Label>
                    <select id="paymentAsset" value={assetId} onChange={e => setAssetId(e.target.value)} className={selectClassName} required>
                        <option value="" disabled>-- Chọn tài sản --</option>
                        {vndAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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


export default function Tax() {
  const { 
      taxSettings, updateTaxSettings, currentPeriod, isReadOnly,
      assets, addTaxPayment, periodFinancials
  } = useData();
  
  const [localSettings, setLocalSettings] = useState<TaxSettings>(taxSettings);
  const [isSaved, setIsSaved] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    setLocalSettings(taxSettings);
  }, [taxSettings]);
  
  useEffect(() => {
    setIsSaved(JSON.stringify(localSettings) === JSON.stringify(taxSettings));
  }, [localSettings, taxSettings]);

  const handleSettingsChange = <K extends keyof TaxSettings>(key: K, value: TaxSettings[K]) => {
    setLocalSettings(prev => ({...prev, [key]: value}));
  };

  const handleSave = () => {
    updateTaxSettings(localSettings);
    setIsSaved(true);
  };
  
  const handleSavePayment = (payment: { assetId: string, amount: number, date: string, period: string }) => {
    addTaxPayment(payment);
    setIsPaymentModalOpen(false);
  };
  
  const renderTaxBreakdown = () => {
    if (!periodFinancials) return null;

    const { tax, taxBases } = periodFinancials;
    
    if (localSettings.method === 'revenue') {
        return (
            <div className="flex justify-between items-center text-gray-300">
                <span>Thuế phải nộp ({formatCurrency(taxBases.revenueBase)} x {localSettings.revenueRate}%)</span>
                <span className="font-semibold">{formatCurrency(tax.taxPayable)}</span>
            </div>
        )
    }
    if (localSettings.method === 'profit_vat') {
        const vatOutputLabel = `VAT đầu ra (${formatCurrency(taxBases.vatOutputBase)} x ${localSettings.vatRate}%)`;
        let inputVatLabel = 'VAT đầu vào';
        switch(localSettings.vatInputMethod) {
            case 'auto_sum': inputVatLabel += ' (Tự động)'; break;
            case 'manual': inputVatLabel += ' (Nhập tay)'; break;
        }

        return (
            <div className="space-y-2 text-gray-300">
                <div className="flex justify-between items-center">
                    <span>{vatOutputLabel}</span>
                    <span className="font-semibold text-primary-400">{formatCurrency(tax.outputVat)}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span>{inputVatLabel}</span>
                    <span className="font-semibold text-red-400">- {formatCurrency(taxBases.vatInputBase)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-700/50 pt-1">
                    <span>VAT phải nộp (đầu ra - đầu vào)</span>
                    <span className={`font-semibold ${tax.netVat >= 0 ? '' : 'text-green-400'}`}>{formatCurrency(tax.netVat)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <span>Thuế TNDN ({formatCurrency(Math.max(0, taxBases.profitBase))} x {localSettings.incomeRate}%)</span>
                    <span className="font-semibold">{formatCurrency(tax.incomeTax)}</span>
                </div>
            </div>
        )
    }
    return null;
  }

  return (
    <>
      <Header title="Thuế" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <CardHeader>Cài đặt phương pháp tính thuế</CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <TaxMethodRadio 
                        label="Theo Doanh thu"
                        description="Phù hợp cho cá nhân kinh doanh (1.5% trên tổng doanh thu)."
                        value="revenue"
                        checked={localSettings.method === 'revenue'}
                        onChange={(value) => handleSettingsChange('method', value)}
                        disabled={isReadOnly}
                    />
                     <TaxMethodRadio 
                        label="Theo Lợi nhuận (VAT + TNDN)"
                        description="Phù hợp cho doanh nghiệp (VAT đầu ra - VAT đầu vào + TNDN)."
                        value="profit_vat"
                        checked={localSettings.method === 'profit_vat'}
                        onChange={(value) => handleSettingsChange('method', value)}
                        disabled={isReadOnly}
                    />
                </div>

                {localSettings.method === 'revenue' && (
                    <div className="border-t border-gray-700 pt-4 space-y-4">
                        <TaxAllocationRadio
                            label="Tính thuế trên"
                            value={localSettings.incomeTaxBase ?? 'personal'}
                            onChange={v => handleSettingsChange('incomeTaxBase', v)}
                            option1Label="Doanh thu của tôi"
                            option2Label="Tổng doanh thu"
                            disabled={isReadOnly}
                        />
                        <div>
                            <Label htmlFor="revenueRate">Tỷ lệ thuế Doanh thu (%)</Label>
                            <NumberInput id="revenueRate" value={localSettings.revenueRate} onValueChange={(val) => handleSettingsChange('revenueRate', val)} disabled={isReadOnly} />
                        </div>
                    </div>
                )}

                {localSettings.method === 'profit_vat' && (
                    <div className="space-y-6 border-t border-gray-700 pt-4">
                        <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg">
                             <h4 className="font-semibold text-white">Phân bổ thuế</h4>
                             <div className="space-y-3">
                                 <TaxAllocationRadio label="Thuế TNDN/TNCN tính trên" value={localSettings.incomeTaxBase ?? 'personal'} onChange={v => handleSettingsChange('incomeTaxBase', v)} option1Label="Lợi nhuận của tôi" option2Label="Tổng lợi nhuận" disabled={isReadOnly} />
                                 <TaxAllocationRadio label="VAT đầu ra tính trên" value={localSettings.vatOutputBase ?? 'personal'} onChange={v => handleSettingsChange('vatOutputBase', v)} option1Label="Doanh thu của tôi" option2Label="Tổng doanh thu" disabled={isReadOnly} />
                                 <TaxAllocationRadio label="VAT đầu vào tính trên" value={localSettings.vatInputBase ?? 'total'} onChange={v => handleSettingsChange('vatInputBase', v)} option1Label="Chi phí của tôi" option2Label="Tổng chi phí" disabled={isReadOnly} />
                             </div>
                        </div>

                        <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg">
                            <h4 className="font-semibold text-white">Cài đặt VAT đầu vào</h4>
                            <div className="flex flex-col space-y-3">
                                <VatInputMethodRadio 
                                    label="Tự động tổng hợp từ các chi phí"
                                    value="auto_sum"
                                    checked={localSettings.vatInputMethod === 'auto_sum'}
                                    onChange={v => handleSettingsChange('vatInputMethod', v)}
                                    disabled={isReadOnly}
                                />
                                <VatInputMethodRadio 
                                    label="Nhập tay"
                                    value="manual"
                                    checked={localSettings.vatInputMethod === 'manual'}
                                    onChange={v => handleSettingsChange('vatInputMethod', v)}
                                    disabled={isReadOnly}
                                />
                            </div>
                            {localSettings.vatInputMethod === 'manual' && (
                                <div className="pt-2">
                                     <Label htmlFor="manualInputVat">Tổng VAT đầu vào (VND)</Label>
                                     <NumberInput id="manualInputVat" value={localSettings.manualInputVat} onValueChange={(val) => handleSettingsChange('manualInputVat', val)} disabled={isReadOnly} />
                                </div>
                            )}
                        </div>
                         <div>
                            <Label htmlFor="vatRate">Tỷ lệ thuế VAT (%)</Label>
                            <p className="text-xs text-gray-400 mb-1">Áp dụng cho VAT đầu ra.</p>
                            <NumberInput id="vatRate" value={localSettings.vatRate} onValueChange={(val) => handleSettingsChange('vatRate', val)} disabled={isReadOnly} />
                        </div>
                         <div>
                            <Label htmlFor="incomeRate">Tỷ lệ thuế TNDN (%)</Label>
                            <NumberInput id="incomeRate" value={localSettings.incomeRate} onValueChange={(val) => handleSettingsChange('incomeRate', val)} disabled={isReadOnly} />
                        </div>
                    </div>
                )}
                
                <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white">Điều chỉnh thủ công</h4>
                    <div>
                        <Label htmlFor="taxSeparationAmount">Dòng tiền tách thuế (VND)</Label>
                        <p className="text-xs text-gray-400 mb-1">Số doanh thu chuyển cho bên thứ 3, không tính vào doanh thu chịu thuế.</p>
                        <NumberInput 
                            id="taxSeparationAmount" 
                            value={localSettings.taxSeparationAmount ?? 0} 
                            onValueChange={(val) => handleSettingsChange('taxSeparationAmount', val)} 
                            disabled={isReadOnly} 
                        />
                    </div>
                </div>

                {!isReadOnly && (
                    <div className="flex justify-end pt-4 border-t border-gray-700">
                        <Button onClick={handleSave} disabled={isSaved}>
                            {isSaved ? 'Đã lưu' : 'Lưu cài đặt'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>

        <div className="space-y-8">
            <Card>
                <CardHeader>Mô phỏng thuế cho kỳ này (của Tôi)</CardHeader>
                {periodFinancials && (
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-gray-900/50 rounded-lg space-y-2">
                            <div className="flex justify-between items-center text-gray-300">
                                <span>Tổng Doanh thu ({localSettings.incomeTaxBase === 'total' ? 'toàn bộ' : 'cá nhân'})</span>
                                <span className="font-semibold text-primary-400">{formatCurrency(periodFinancials.taxBases.initialRevenueBase)}</span>
                            </div>
                            {periodFinancials.taxBases.taxSeparationAmount > 0 && (
                                <div className="flex justify-between items-center text-gray-300">
                                    <span>(-) Dòng tiền tách thuế</span>
                                    <span className="font-semibold text-yellow-400">- {formatCurrency(periodFinancials.taxBases.taxSeparationAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-gray-300 border-t border-gray-700/50 pt-1">
                                <span className="font-bold">Doanh thu tính thuế</span>
                                <span className="font-bold text-primary-400">{formatCurrency(periodFinancials.taxBases.revenueBase)}</span>
                            </div>

                            <div className="flex justify-between items-center text-gray-300 mt-2">
                                <span>Tổng Chi phí ({localSettings.incomeTaxBase === 'total' ? 'toàn bộ' : 'cá nhân'})</span>
                                <span className="font-semibold text-red-400">{formatCurrency(periodFinancials.taxBases.costBase)}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-300 pt-2 border-t border-gray-700">
                                <span>Lợi nhuận trước thuế</span>
                                <span className={`font-semibold ${periodFinancials.taxBases.profitBase >=0 ? 'text-green-400':'text-red-400'}`}>{formatCurrency(periodFinancials.taxBases.profitBase)}</span>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
                            <h4 className="font-semibold text-white">Chi tiết thuế (dự tính)</h4>
                            {renderTaxBreakdown()}
                            <div className="flex justify-between items-center text-white pt-2 border-t border-gray-700">
                                <span className="text-lg font-bold">Tổng thuế phải nộp</span>
                                <span className="text-xl font-bold text-yellow-400">{formatCurrency(periodFinancials.tax.taxPayable)}</span>
                            </div>
                        </div>

                        {!isReadOnly && (
                            <div className="flex justify-center pt-4">
                                <Button onClick={() => setIsPaymentModalOpen(true)} disabled={periodFinancials.tax.taxPayable <= 0}>
                                    Thanh toán thuế
                                </Button>
                            </div>
                        )}

                        <p className="text-xs text-gray-500 text-center pt-2">
                            Đây là số liệu mô phỏng dựa trên cài đặt và dữ liệu trong kỳ.
                        </p>
                    </CardContent>
                )}
            </Card>

             <Card>
                <CardHeader>Chi tiết thuế của các đối tác</CardHeader>
                <CardContent>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Đối tác</TableHeader>
                                <TableHeader>Lợi nhuận</TableHeader>
                                <TableHeader>Thuế dự tính</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {periodFinancials?.partnerPnlDetails.map(p => (
                                <TableRow key={p.partnerId}>
                                    <TableCell className="font-semibold text-white">{p.name}</TableCell>
                                    <TableCell className={p.profit >= 0 ? 'text-green-400' : 'text-red-400'}>{formatCurrency(p.profit)}</TableCell>
                                    <TableCell className="font-semibold text-yellow-400">{formatCurrency(p.taxPayable)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
      
      {!isReadOnly && currentPeriod && periodFinancials && (
        <TaxPaymentModal 
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            onSave={handleSavePayment}
            taxPayable={periodFinancials.tax.taxPayable}
            period={currentPeriod}
            vndAssets={assets.filter(a => a.currency === 'VND')}
        />
      )}
    </>
  );
}