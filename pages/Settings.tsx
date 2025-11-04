import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useData } from '../context/DataContext';
import { Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

export default function Settings() {
    const { taxSettings, updateTaxSettings } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isConfirmImportOpen, setIsConfirmImportOpen] = useState(false);
    const [importData, setImportData] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Local state for the period closing day setting
    const [localClosingDay, setLocalClosingDay] = useState(taxSettings.periodClosingDay);

    // Sync local state if the global context changes
    useEffect(() => {
        setLocalClosingDay(taxSettings.periodClosingDay);
    }, [taxSettings.periodClosingDay]);

    useEffect(() => {
        if (isImporting && importData) {
            const timer = setTimeout(() => {
                try {
                    const data = JSON.parse(importData);
                    localStorage.clear();
                    Object.keys(data).forEach(key => {
                        const value = data[key];
                        localStorage.setItem(key, value);
                    });
                    window.location.reload();
                } catch (error) {
                    alert("Lỗi khi phân tích cú pháp tệp. Vui lòng kiểm tra tệp JSON có hợp lệ không.");
                    console.error("Import error:", error);
                    setImportData(null);
                    setIsImporting(false);
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [isImporting, importData]);
    
    useEffect(() => {
        if (isDeleting) {
            const timer = setTimeout(() => {
                try {
                    localStorage.clear();
                    window.location.reload();
                } catch (error) {
                    alert("Đã xảy ra lỗi khi xóa dữ liệu.");
                    console.error("Delete error:", error);
                    setIsDeleting(false); // Reset on error
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isDeleting]);

    const isClosingDayChanged = localClosingDay !== taxSettings.periodClosingDay;

    const handleSaveClosingDay = () => {
        const clampedValue = Math.max(1, Math.min(28, Math.floor(localClosingDay)));
        updateTaxSettings({ ...taxSettings, periodClosingDay: clampedValue });
    };

    const handleExport = () => {
        const data: { [key: string]: string } = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                data[key] = localStorage.getItem(key)!;
            }
        }
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `affiliate-accountant-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                setImportData(text);
                setIsConfirmImportOpen(true);
            } else {
                alert("Không thể đọc tệp.");
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input to allow re-selection of the same file
    };
    
    const handleConfirmImport = () => {
        if (!importData) return;
        setIsConfirmImportOpen(false);
        setIsImporting(true);
    };


    const handleConfirmDeleteAllData = () => {
        setIsConfirmDeleteOpen(false);
        setIsDeleting(true);
    };
    
    const handleTestImportExport = () => {
        if (window.confirm("Hành động này sẽ mô phỏng quá trình export và import dữ liệu để kiểm tra tính toàn vẹn. Dữ liệu hiện tại sẽ được tải lại từ bản sao lưu trong bộ nhớ. Bạn có muốn tiếp tục không?")) {
            try {
                // 1. Simulate Export: Copy all localStorage items as raw strings
                const data: { [key: string]: string } = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) {
                        data[key] = localStorage.getItem(key)!;
                    }
                }
                
                // 2. Simulate Import: Clear and write the raw strings back
                localStorage.clear();
                Object.keys(data).forEach(key => {
                    localStorage.setItem(key, data[key]);
                });

                alert("Kiểm tra thành công! Dữ liệu đã được sao lưu và phục hồi lại. Trang sẽ được tải lại.");
                window.location.reload();
            } catch (error) {
                alert("Đã xảy ra lỗi trong quá trình kiểm tra. Vui lòng kiểm tra console để biết thêm chi tiết.");
                console.error("Test Import/Export error:", error);
            }
        }
    };

    return (
        <div>
             {(isImporting || isDeleting) && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-[100] flex flex-col items-center justify-center">
                    <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h2 className="text-white text-xl font-semibold">{isImporting ? "Đang nhập dữ liệu..." : "Đang xóa dữ liệu..."}</h2>
                    <p className="text-gray-400">Vui lòng không đóng ứng dụng.</p>
                </div>
            )}
            <Header title="Cài đặt" />
            <div className="space-y-8">
                 <Card>
                    <CardHeader>Quản lý dữ liệu thủ công</CardHeader>
                    <CardContent className="flex space-x-4">
                        <Button onClick={handleExport}>Xuất dữ liệu (Export)</Button>
                        <Button onClick={handleImportClick} variant="secondary">Nhập dữ liệu (Import)</Button>
                        <Button onClick={handleTestImportExport} variant="secondary">Kiểm tra tính toàn vẹn</Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json"
                            className="hidden"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>Cài đặt Kỳ báo cáo</CardHeader>
                    <CardContent>
                        <div className="max-w-md">
                            <div className="flex items-end gap-4">
                                <div className="flex-grow">
                                    <Label htmlFor="periodClosingDay">Ngày đóng kỳ báo cáo hàng tháng</Label>
                                    <p className="text-xs text-gray-400 mb-2">
                                        Kỳ báo cáo chỉ có thể được đóng vào hoặc sau ngày này của tháng tiếp theo (giá trị từ 1 đến 28).
                                    </p>
                                    <NumberInput
                                        id="periodClosingDay"
                                        value={localClosingDay}
                                        onValueChange={(val) => {
                                            const clampedValue = Math.max(1, Math.min(28, Math.floor(val)));
                                            setLocalClosingDay(clampedValue);
                                        }}
                                    />
                                </div>
                                <Button onClick={handleSaveClosingDay} disabled={!isClosingDayChanged}>
                                    Lưu
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-500">
                    <CardHeader className="text-red-400">Khu vực nguy hiểm</CardHeader>
                    <CardContent>
                        <p className="mb-4">Hành động này không thể được hoàn tác. Điều này sẽ xóa vĩnh viễn tất cả các dự án, chi phí, hoa hồng và các cài đặt khác của bạn.</p>
                        <Button variant="danger" onClick={() => setIsConfirmDeleteOpen(true)}>Xóa tất cả dữ liệu</Button>
                    </CardContent>
                </Card>
            </div>
             <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={handleConfirmDeleteAllData}
                title="Xác nhận xóa toàn bộ dữ liệu"
                message="CẢNH BÁO: Hành động này sẽ xóa TOÀN BỘ dữ liệu của bạn và không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục không?"
            />
             <ConfirmationModal
                isOpen={isConfirmImportOpen}
                onClose={() => setIsConfirmImportOpen(false)}
                onConfirm={handleConfirmImport}
                title="Xác nhận nhập dữ liệu"
                message="Bạn có chắc muốn nhập dữ liệu từ tệp này không? Tất cả dữ liệu hiện tại sẽ bị ghi đè vĩnh viễn. Hành động này không thể hoàn tác."
                confirmButtonText="Nhập và Ghi đè"
                confirmButtonVariant="danger"
            />
        </div>
    );
}