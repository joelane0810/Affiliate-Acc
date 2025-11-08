import React from 'react';
import { Header } from '../components/Header';
import { Card, CardContent } from '../components/ui/Card';

const GuideSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary-400 mb-4 pb-2 border-b-2 border-gray-700">{title}</h2>
        <div className="prose prose-invert prose-lg max-w-none text-gray-300 space-y-4">
            {children}
        </div>
    </div>
);

export default function Guide() {
    return (
        <div>
            <Header title="Hướng dẫn sử dụng" />

            <Card>
                <CardContent>
                    <GuideSection title="Giới thiệu & Luồng làm việc tổng quan">
                        <p>
                            Chào mừng bạn đến với <strong>Affiliate Accountant Pro</strong>! Ứng dụng này được thiết kế để giúp các affiliate marketer chuyên nghiệp theo dõi và quản lý tài chính một cách chi tiết. Để sử dụng hiệu quả, bạn nên tuân theo luồng làm việc được đề xuất dưới đây.
                        </p>
                    </GuideSection>
                    
                    <GuideSection title="Bước 1: Cài đặt ban đầu (Bắt buộc)">
                        <ol className="list-decimal list-inside space-y-3">
                            <li><strong>Kết nối Cơ sở dữ liệu:</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li>Đi đến trang <strong>Cài đặt</strong>.</li>
                                    <li>Trong mục "Cấu hình Firebase", dán đoạn mã cấu hình từ Firebase Console của bạn vào và nhấn "Lưu". Trang sẽ tự động tải lại. Đây là bước bắt buộc để ứng dụng có thể lưu trữ dữ liệu.</li>
                                </ul>
                            </li>
                            <li><strong>Chuẩn bị dữ liệu:</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li><strong>Nếu bạn là người dùng mới:</strong> Tại trang <strong>Cài đặt</strong>, nhấn nút "Khôi phục dữ liệu mẫu" để có một bộ dữ liệu ví dụ giúp bạn làm quen với các tính năng.</li>
                                    <li><strong>Nếu bạn có tệp sao lưu:</strong> Nhấn "Nhập dữ liệu (Import)" và chọn tệp `.json` của bạn.</li>
                                </ul>
                            </li>
                        </ol>
                    </GuideSection>

                    <GuideSection title="Bước 2: Thiết lập các hạng mục nền tảng">
                        <p>Sau khi đã có cơ sở dữ liệu, bạn cần thiết lập các thông tin cơ bản sau:</p>
                        <ol className="list-decimal list-inside space-y-3">
                            <li><strong>Tài sản (Assets):</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li>Đi đến trang <strong>Tài sản</strong>.</li>
                                    <li>Tạo các tài sản bạn sử dụng để nhận và chi tiền. Ví dụ: "Vietcombank" (Tiền tệ: VND), "PayPal" (Tiền tệ: USD), "Tiền mặt" (Tiền tệ: VND).</li>
                                    <li>Nhập số dư ban đầu cho mỗi tài sản. Đây là vốn tự có ban đầu của bạn.</li>
                                </ul>
                            </li>
                            <li><strong>Đối tác (Partners):</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li>Đi đến trang <strong>Đối tác</strong>. Đối tác "Tôi" đã được tạo sẵn.</li>
                                    <li>Thêm các đối tác khác nếu bạn có các dự án hợp tác kinh doanh.</li>
                                </ul>
                            </li>
                            <li><strong>Tài khoản Ads:</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li>Đi đến trang <strong>Quản lý & Sổ Ads</strong>.</li>
                                    <li>Thêm các tài khoản quảng cáo bạn quản lý (VD: `GG-123456`, `FB-Business-01`).</li>
                                </ul>
                            </li>
                            <li><strong>Hạng mục & Ngách (Tùy chọn):</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li>Đi đến trang <strong>Tổng hợp báo cáo</strong> &gt; tab <strong>Quản lý Hạng mục & Ngách</strong>.</li>
                                    <li>Tạo các hạng mục (VD: Sức khỏe, Tài chính) và ngách (VD: Giảm cân, Cho vay) để phân loại dự án, giúp cho việc thống kê sau này dễ dàng hơn.</li>
                                </ul>
                            </li>
                        </ol>
                    </GuideSection>

                    <GuideSection title="Bước 3: Mở kỳ báo cáo">
                        <p>Hầu hết các chức năng hạch toán sẽ bị khóa cho đến khi bạn mở một kỳ báo cáo.</p>
                        <ol className="list-decimal list-inside space-y-3">
                            <li>Đi đến trang <strong>Báo cáo tháng</strong>.</li>
                            <li>Nhấn nút "Mở kỳ báo cáo cho [Tháng Hiện tại]". Từ lúc này, bạn có thể bắt đầu nhập liệu các giao dịch cho kỳ này.</li>
                        </ol>
                    </GuideSection>
                    
                    <GuideSection title="Bước 4: Hạch toán giao dịch hàng ngày">
                        <p>Đây là công việc bạn sẽ làm thường xuyên trong kỳ báo cáo đang hoạt động.</p>
                        <ol className="list-decimal list-inside space-y-3">
                            <li><strong>Tạo Dự án:</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li>Vào trang <strong>Dự án</strong>, tạo một dự án mới cho kỳ này. Liên kết dự án với Hạng mục/Ngách đã tạo.</li>
                                    <li>Nếu là dự án hợp tác, hãy tick vào ô "Dự án hợp tác" và phân chia tỷ lệ lợi nhuận cho các đối tác.</li>
                                </ul>
                            </li>
                            <li><strong>Ghi nhận Vốn góp:</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li>Nếu có vốn góp thêm từ bạn hoặc đối tác, vào trang <strong>Tài sản</strong> &gt; Bảng "Vốn góp & Đầu tư" &gt; Nhấn "Thêm Vốn góp/Đầu tư".</li>
                                </ul>
                            </li>
                             <li><strong>Ghi nhận Doanh thu (Hoa hồng):</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li>Vào trang <strong>Hoa hồng</strong>, nhấn "Thêm hoa hồng" để ghi nhận doanh thu từ các network. Chọn đúng dự án và tài sản nhận tiền (VD: PayPal, ClickBank).</li>
                                </ul>
                            </li>
                            <li><strong>Ghi nhận Chi phí Ads:</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li><strong>Nạp tiền:</strong> Vào <strong>Chi phí Ads</strong> &gt; tab <strong>Nạp tiền Ads</strong>. Ghi lại các giao dịch nạp tiền từ một tài sản VND vào tài khoản Ads (USD). Bước này sẽ ghi nhận một khoản chi phí vào sổ sách.</li>
                                    <li><strong>Chi tiêu hàng ngày:</strong> Vào <strong>Chi phí Ads</strong> &gt; tab <strong>Chi phí Ads</strong>. Ghi lại số tiền USD đã chi tiêu mỗi ngày cho từng dự án/tài khoản.</li>
                                </ul>
                            </li>
                            <li><strong>Giao dịch khác:</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li><strong>Bán USD:</strong> Vào trang <strong>Bán USD</strong> để ghi nhận việc chuyển đổi từ tài sản USD sang VND.</li>
                                    <li><strong>Chi phí phát sinh:</strong> Vào trang <strong>Chi phí phát sinh</strong> để ghi nhận các chi phí khác (thuê tool, VPS, v.v).</li>
                                    <li><strong>Công nợ:</strong> Sử dụng trang <strong>Công nợ & Phải thu</strong> để quản lý các khoản vay/cho vay ngắn hạn phát sinh và trả/thu trong kỳ. Các khoản nợ dài hạn được quản lý ở trang <strong>Công nợ Dài hạn</strong>.</li>
                                    <li><strong>Rút tiền:</strong> Vào trang <strong>Tài sản</strong> &gt; Bảng "Rút tiền" để ghi nhận các khoản tiền bạn hoặc đối tác rút ra để chi tiêu cá nhân.</li>
                                </ul>
                            </li>
                        </ol>
                    </GuideSection>
                    
                    <GuideSection title="Bước 5: Xem xét và Đóng kỳ">
                        <ol className="list-decimal list-inside space-y-3">
                            <li><strong>Xem báo cáo:</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li>Trong suốt kỳ, bạn có thể vào các trang <strong>Tổng quan</strong>, <strong>Đối tác</strong>, <strong>Thuế</strong> và <strong>Báo cáo tháng</strong> để xem các số liệu được cập nhật theo thời gian thực.</li>
                                </ul>
                            </li>
                            <li><strong>Đóng kỳ:</strong>
                                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                    <li>Sau khi đã qua ngày đóng kỳ (cài đặt ở trang Cài đặt) và bạn đã nhập liệu xong, hãy vào trang <strong>Báo cáo tháng</strong>.</li>
                                    <li>Kiểm tra lại tất cả số liệu. Sau đó, nhấn "Đóng báo cáo tháng".</li>
                                    <li><strong>Lưu ý:</strong> Sau khi đóng, toàn bộ dữ liệu của kỳ đó sẽ bị khóa và không thể chỉnh sửa. Lợi nhuận sẽ được kết chuyển vào vốn của các đối tác.</li>
                                </ul>
                            </li>
                        </ol>
                    </GuideSection>

                    <GuideSection title="Bước 6: Phân tích dài hạn">
                        <p>
                            Trang <strong>Tổng hợp báo cáo</strong> là nơi bạn xem lại lịch sử và phân tích hiệu quả kinh doanh qua nhiều kỳ.
                        </p>
                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                            <li><strong>Tab Kỳ báo cáo:</strong> Xem lại tóm tắt kết quả của tất cả các kỳ đã đóng.</li>
                            <li><strong>Tab Xu hướng:</strong> Xem biểu đồ doanh thu, chi phí, lợi nhuận theo tháng/quý/năm.</li>
                            <li><strong>Tab Kho dự án:</strong> Thống kê hiệu suất lũy kế của tất cả các dự án bạn đã từng chạy.</li>
                        </ul>
                    </GuideSection>

                    <GuideSection title="Xử lý lỗi phổ biến">
                        <h3 className="text-xl font-semibold text-primary-300">Lỗi: "Missing or insufficient permissions"</h3>
                        <p>
                            <strong>Nguyên nhân:</strong> Lỗi này xảy ra khi Quy tắc Bảo mật (Security Rules) của Firestore không cho phép tài khoản của bạn truy cập vào dữ liệu. Đây là hành vi mặc định và an toàn khi bạn chuyển cơ sở dữ liệu sang chế độ "production".
                        </p>
                        <p>
                            <strong>Cách khắc phục:</strong> Bạn cần cập nhật các quy tắc này trong Firebase Console để cho phép người dùng đã đăng nhập được quyền truy cập.
                        </p>
                        <ol className="list-decimal list-inside space-y-3">
                            <li>Mở <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">Firebase Console</a> và chọn dự án của bạn.</li>
                            <li>Ở menu bên trái, vào mục <strong>Build</strong> &gt; <strong>Firestore Database</strong>.</li>
                            <li>Phía trên cùng, chọn tab <strong>Rules</strong>.</li>
                            <li>Xóa toàn bộ nội dung hiện có trong trình soạn thảo và dán đoạn mã sau vào:</li>
                        </ol>
                        <pre className="bg-gray-900 p-4 rounded-md border border-gray-600 text-sm whitespace-pre-wrap">
                            <code className="text-white">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Cho phép người dùng đã đăng nhập được quyền đọc và ghi tất cả tài liệu
      allow read, write: if request.auth != null;
    }
  }
}`}
                            </code>
                        </pre>
                        <ol start={5} className="list-decimal list-inside space-y-3">
                            <li>Nhấn nút <strong>Publish</strong>.</li>
                            <li>Đợi khoảng một phút để thay đổi có hiệu lực, sau đó tải lại ứng dụng này. Lỗi sẽ được khắc phục.</li>
                        </ol>
                    </GuideSection>
                </CardContent>
            </Card>
        </div>
    );
}