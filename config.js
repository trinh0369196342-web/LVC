// config.js
// 1. Thay thế bằng thông tin thật của bạn
const SUPABASE_URL = 'https://gvsbcjhohvrgaowflcwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2c2JjamhvaHZyZ2Fvd2ZsY3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzIyNTYsImV4cCI6MjA3OTY0ODI1Nn0.TMkVz82efXxfOazfhzKuWP-DYqVZY8M60WrtA4O77Xc';

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
