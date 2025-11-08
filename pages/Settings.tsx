import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useData } from '../context/DataContext';
import { Input, Label } from '../components/ui/Input';
import { NumberInput } from '../components/ui/NumberInput';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { FirebaseConfig } from '../types';
import { FirebaseError, initializeApp, deleteApp, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, getDocs, writeBatch, doc, getDoc, setDoc, deleteDoc, getFirestore } from 'firebase/firestore';


const ConnectionCard: React.FC = () => {
    const { user, authIsLoading, firebaseConfig, setFirebaseConfig } = useData();
    
    // State for login form
    const [configString, setConfigString] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // State for logout confirmation
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

    useEffect(() => {
        if (firebaseConfig && Object.values(firebaseConfig).every(v => v)) {
            const formattedConfig = `const firebaseConfig = {\n` +
                `  apiKey: "${firebaseConfig.apiKey}",\n` +
                `  authDomain: "${firebaseConfig.authDomain}",\n` +
                `  projectId: "${firebaseConfig.projectId}",\n` +
                `  storageBucket: "${firebaseConfig.storageBucket}",\n` +
                `  messagingSenderId: "${firebaseConfig.messagingSenderId}",\n` +
                `  appId: "${firebaseConfig.appId}"\n` +
                `};`;
            setConfigString(formattedConfig);
        }
    }, [firebaseConfig]);


    const handleConnectAndLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // 1. Parse Config
        const extractValue = (key: string): string | null => {
            const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
            const match = configString.match(regex);
            return match ? match[1].trim() : null;
        };
        const configKeys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const parsedConfig = configKeys.reduce((acc, key) => {
            acc[key] = extractValue(key);
            return acc;
        }, {} as Partial<Record<keyof FirebaseConfig, string | null>>);

        if (!Object.values(parsedConfig).every(v => v)) {
            const missingKeys = configKeys.filter(key => !parsedConfig[key]);
            setError(`Không thể phân tích cấu hình. Các trường bị thiếu: ${missingKeys.join(', ')}`);
            setIsLoading(false);
            return;
        }

        // 2. This process will interact with the [DEFAULT] Firebase app instance
        // to ensure the login session is persisted correctly for the main app.
        let tempApp;
        try {
            // Attempt to get and delete any existing default app to ensure a clean state.
            try {
                const existingApp = getApp();
                await deleteApp(existingApp);
            } catch (e) {
                // No default app existed, which is fine.
            }

            // Initialize the [DEFAULT] app with the new config for testing.
            tempApp = initializeApp(parsedConfig as FirebaseConfig);
            const tempAuth = getAuth(tempApp);
            await signInWithEmailAndPassword(tempAuth, email, password);

            // Pre-flight check for Firestore permissions. This will throw on permission-denied.
            const tempDb = getFirestore(tempApp);
            const checkDocRef = doc(tempDb, 'settings', 'periods');
            await getDoc(checkDocRef); 

            // 3. Success: Save config to localStorage. The session is now persisted for the [DEFAULT] app.
            setFirebaseConfig(parsedConfig as FirebaseConfig);
            alert('Kết nối và đăng nhập thành công! Ứng dụng sẽ được tải lại.');
            window.location.reload();

        } catch (err) {
            let errorMessage = 'Đã xảy ra lỗi không xác định. Vui lòng kiểm tra lại cấu hình Firebase và thông tin đăng nhập.';
            if (err instanceof FirebaseError) {
                switch (err.code) {
                    case 'auth/invalid-credential':
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage = 'Sai email hoặc mật khẩu.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Địa chỉ email không hợp lệ.';
                        break;
                    case 'auth/network-request-failed':
                         errorMessage = 'Lỗi mạng hoặc cấu hình Firebase không chính xác (sai authDomain, projectId...).';
                        break;
                    case 'permission-denied':
                        errorMessage = 'Đăng nhập thành công, nhưng không có quyền truy cập Firestore. Vui lòng kiểm tra lại Security Rules của bạn trong Firebase Console và thử lại.';
                        break;
                    default:
                        errorMessage = err.message;
                        break;
                }
            }
            setError(errorMessage);

            // On failure, clean up the [DEFAULT] app instance we created for the test.
            if (tempApp) {
                await deleteApp(tempApp).catch(e => console.error("Error during cleanup:", e));
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleLogoutAndReset = async () => {
        const { auth } = await import('../lib/firebase');
        if (auth) {
            await signOut(auth);
        }
        setFirebaseConfig(null);
        setIsLogoutConfirmOpen(false);
        window.location.reload();
    };

    if (authIsLoading) {
        return (
             <Card>
                <CardHeader>Kết nối & Xác thực</CardHeader>
                <CardContent>
                    <p className="text-gray-400">Đang kiểm tra trạng thái kết nối...</p>
                </CardContent>
            </Card>
        );
    }
    
    if (user) {
        return (
            <Card>
                <CardHeader>Kết nối & Xác thực</CardHeader>
                <CardContent>
                     <p className="text-gray-300 mb-4">
                        Đã kết nối và đăng nhập với tài khoản: <span className="font-semibold text-white">{user.email}</span>
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                        Đăng xuất sẽ ngắt kết nối khỏi Firebase và xóa cấu hình đã lưu. Bạn sẽ cần cấu hình lại để sử dụng lại ứng dụng.
                    </p>
                    <Button variant="danger" onClick={() => setIsLogoutConfirmOpen(true)}>
                        Đăng xuất & Xóa Cấu hình
                    </Button>
                    <ConfirmationModal
                        isOpen={isLogoutConfirmOpen}
                        onClose={() => setIsLogoutConfirmOpen(false)}
                        onConfirm={handleLogoutAndReset}
                        title="Xác nhận Đăng xuất"
                        message="Bạn có chắc chắn muốn đăng xuất không? Hành động này sẽ xóa cấu hình Firebase đã lưu trên trình duyệt này."
                        confirmButtonText="Đăng xuất"
                        confirmButtonVariant="danger"
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>Kết nối & Xác thực</CardHeader>
            <CardContent>
                <form onSubmit={handleConnectAndLogin} className="space-y-4">
                     <p className="text-sm text-gray-400">
                        Dán cấu hình Firebase và nhập thông tin đăng nhập để kết nối với cơ sở dữ liệu của bạn.
                    </p>
                    <div>
                        <Label htmlFor="firebase-config-paste">Đoạn mã cấu hình Firebase</Label>
                        <textarea
                            id="firebase-config-paste"
                            className="w-full h-40 px-3 py-2 bg-gray-900 border border-gray-600 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                            placeholder={`const firebaseConfig = { ... };`}
                            value={configString}
                            onChange={e => setConfigString(e.target.value)}
                            spellCheck="false"
                            required
                        />
                    </div>
                     <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ten@example.com" />
                    </div>
                    <div>
                        <Label htmlFor="password">Mật khẩu</Label>
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <div className="flex justify-end pt-2 border-t border-gray-700">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Đang xử lý...' : 'Kết nối & Đăng nhập'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

const COLLECTION_NAMES = [
    'projects', 'dailyAdCosts', 'adDeposits', 'adFundTransfers', 'commissions', 
    'assetTypes', 'assets', 'liabilities', 'receivables', 'receivablePayments', 
    'exchangeLogs', 'miscellaneousExpenses', 'partners', 'withdrawals', 
    'debtPayments', 'taxPayments', 'capitalInflows', 'categories', 'niches',
    'adAccounts', // This was missing
    'periodLiabilities', 'periodReceivables', 'periodDebtPayments', 'periodReceivablePayments'
];


export default function Settings() {
    const { taxSettings, updateTaxSettings, seedData, setCurrentPage } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isConfirmImportOpen, setIsConfirmImportOpen] = useState(false);
    const [isConfirmSeedOpen, setIsConfirmSeedOpen] = useState(false);
    const [importData, setImportData] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [localClosingDay, setLocalClosingDay] = useState(taxSettings.periodClosingDay);

    useEffect(() => {
        setLocalClosingDay(taxSettings.periodClosingDay);
    }, [taxSettings.periodClosingDay]);

    const isClosingDayChanged = localClosingDay !== taxSettings.periodClosingDay;

    const handleSaveClosingDay = () => {
        const clampedValue = Math.max(1, Math.min(28, Math.floor(localClosingDay)));
        updateTaxSettings({ ...taxSettings, periodClosingDay: clampedValue });
    };

    const handleExport = async () => {
        if (!db) {
            alert("Kết nối Firebase không khả dụng.");
            return;
        }

        const backupData: { [key: string]: any } = {};
        
        try {
            for (const collectionName of COLLECTION_NAMES) {
                const snapshot = await getDocs(collection(db, collectionName));
                backupData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
            
            const taxDoc = await getDoc(doc(db, 'settings', 'tax'));
            const periodsDoc = await getDoc(doc(db, 'settings', 'periods'));
            backupData.settings = {
                tax: taxDoc.exists() ? taxDoc.data() : null,
                periods: periodsDoc.exists() ? periodsDoc.data() : null
            };

            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = `affiliate-acc-firestore-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();

        } catch (error) {
            console.error("Export error:", error);
            alert("Đã xảy ra lỗi khi xuất dữ liệu từ Firestore.");
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

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
        event.target.value = '';
    };

    const wipeAllFirestoreData = async () => {
        if (!db) {
            alert("Kết nối Firebase không khả dụng.");
            throw new Error("DB not connected");
        }
        
        for (const collectionName of COLLECTION_NAMES) {
            const snapshot = await getDocs(collection(db, collectionName));
            if(snapshot.empty) continue;
            
            const batches = [];
            let currentBatch = writeBatch(db);
            let operationCount = 0;
            
            snapshot.docs.forEach(doc => {
                if (collectionName === 'partners' && doc.id === 'default-me') {
                    return; // Skip deleting the default partner
                }
                currentBatch.delete(doc.ref);
                operationCount++;
                if (operationCount >= 499) {
                    batches.push(currentBatch);
                    currentBatch = writeBatch(db);
                    operationCount = 0;
                }
            });
            if(operationCount > 0) batches.push(currentBatch);
            
            await Promise.all(batches.map(batch => batch.commit()));
        }

        await deleteDoc(doc(db, 'settings', 'tax')).catch(()=>{});
        await deleteDoc(doc(db, 'settings', 'periods')).catch(()=>{});
    };

    const handleConfirmDeleteAllData = async () => {
        setIsConfirmDeleteOpen(false);
        setIsDeleting(true);
        try {
            await wipeAllFirestoreData();
            alert("Đã xóa toàn bộ dữ liệu. Ứng dụng sẽ được tải lại.");
            window.location.reload();
        } catch (error) {
            alert("Đã xảy ra lỗi khi xóa dữ liệu Firestore.");
            console.error("Delete error:", error);
            setIsDeleting(false);
        }
    };
    
    const handleConfirmImport = async () => {
        if (!importData || !db) return;
        
        setIsConfirmImportOpen(false);
        setIsImporting(true);

        try {
            await wipeAllFirestoreData();

            const dataToImport = JSON.parse(importData);
            let batch = writeBatch(db);
            let operationCount = 0;

            for (const collectionName of COLLECTION_NAMES) {
                if (dataToImport[collectionName] && Array.isArray(dataToImport[collectionName])) {
                    for (const docData of dataToImport[collectionName]) {
                        if (docData.id) {
                            const { id, ...data } = docData;
                            batch.set(doc(db, collectionName, id), data);
                            operationCount++;
                            if (operationCount >= 499) {
                                await batch.commit();
                                batch = writeBatch(db);
                                operationCount = 0;
                            }
                        }
                    }
                }
            }
            
            if (dataToImport.settings) {
                if (dataToImport.settings.tax) {
                    batch.set(doc(db, 'settings', 'tax'), dataToImport.settings.tax);
                }
                if (dataToImport.settings.periods) {
                    batch.set(doc(db, 'settings', 'periods'), dataToImport.settings.periods);
                }
            }
            
            if(operationCount > 0) await batch.commit();

            alert("Nhập dữ liệu thành công. Ứng dụng sẽ được tải lại.");
            window.location.reload();

        } catch (error) {
            alert("Lỗi khi nhập dữ liệu. Vui lòng kiểm tra tệp JSON và thử lại.");
            console.error("Import error:", error);
            setIsImporting(false);
        }
    };
    
    const handleConfirmSeed = async () => {
        setIsConfirmSeedOpen(false);
        // seedData function already handles loading state and reload.
        await seedData();
    };

    return (
        <div>
             {(isImporting || isDeleting) && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-[100] flex flex-col items-center justify-center">
                    <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8
 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h2 className="text-white text-xl font-semibold">{isImporting ? "Đang nhập dữ liệu..." : "Đang xóa dữ liệu..."}</h2>
                    <p className="text-gray-400">Vui lòng không đóng ứng dụng.</p>
                </div>
            )}
            <Header title="Cài đặt" />
            <div className="space-y-8">
                <ConnectionCard />
                
                <Card>
                    <CardHeader>Trợ giúp & Hướng dẫn</CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-400 mb-4">
                            Nếu bạn là người dùng mới hoặc cần xem lại quy trình làm việc, hãy truy cập trang hướng dẫn chi tiết của chúng tôi.
                        </p>
                        <Button variant="secondary" onClick={() => setCurrentPage('Guide')}>
                            Xem hướng dẫn sử dụng
                        </Button>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>Quản lý dữ liệu</CardHeader>
                     <CardContent className="space-y-4">
                        <p className="text-sm text-gray-400">
                            Tạo bản sao lưu toàn bộ dữ liệu trên Firestore hoặc khôi phục từ một tệp sao lưu. Bạn cũng có thể khôi phục lại bộ dữ liệu mẫu ban đầu.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button onClick={handleExport}>Xuất dữ liệu (Export)</Button>
                            <Button onClick={handleImportClick} variant="secondary">Nhập dữ liệu (Import)</Button>
                            <Button onClick={() => setIsConfirmSeedOpen(true)} variant="secondary">Khôi phục dữ liệu mẫu</Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".json"
                                className="hidden"
                            />
                        </div>
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
                        <p className="mb-4">Hành động này không thể được hoàn tác. Điều này sẽ xóa vĩnh viễn tất cả các dự án, chi phí, hoa hồng và các cài đặt khác của bạn trên Firestore.</p>
                        <Button variant="danger" onClick={() => setIsConfirmDeleteOpen(true)}>Xóa tất cả dữ liệu</Button>
                    </CardContent>
                </Card>
            </div>
             <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={handleConfirmDeleteAllData}
                title="Xác nhận xóa toàn bộ dữ liệu"
                message="CẢNH BÁO: Hành động này sẽ xóa TOÀN BỘ dữ liệu của bạn trên Firestore và không thể hoàn tác. Ứng dụng sẽ trở về trạng thái trống. Bạn có chắc chắn muốn tiếp tục không?"
            />
             <ConfirmationModal
                isOpen={isConfirmImportOpen}
                onClose={() => setIsConfirmImportOpen(false)}
                onConfirm={handleConfirmImport}
                title="Xác nhận nhập dữ liệu"
                message="Bạn có chắc muốn nhập dữ liệu từ tệp này không? Tất cả dữ liệu hiện tại trên Firestore sẽ bị GHI ĐÈ vĩnh viễn. Hành động này không thể hoàn tác."
                confirmButtonText="Nhập và Ghi đè"
                confirmButtonVariant="danger"
            />
             <ConfirmationModal
                isOpen={isConfirmSeedOpen}
                onClose={() => setIsConfirmSeedOpen(false)}
                onConfirm={handleConfirmSeed}
                title="Xác nhận khôi phục dữ liệu mẫu"
                message="Bạn có chắc chắn muốn khôi phục dữ liệu mẫu không? Thao tác này sẽ XÓA TẤT CẢ dữ liệu hiện tại và thay thế bằng dữ liệu mẫu ban đầu."
                confirmButtonText="Khôi phục"
                confirmButtonVariant="primary"
            />
        </div>
    );
}