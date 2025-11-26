// config.js
// 1. Thay thế bằng thông tin thật của bạn
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY_HERE';

// 2. Khởi tạo Client
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 3. Hàm tiện ích: Định dạng tiền tệ VNĐ
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// 4. Hàm tiện ích: Định dạng ngày tháng
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
};

// 5. Cấu hình giá mặc định (Sẽ được ghi đè khi tải từ DB)
let GLOBAL_SETTINGS = {
    price_per_page: 500,
    price_per_board: 5000,
    density_fee_percent: 20
};
