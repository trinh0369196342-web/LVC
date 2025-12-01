// Cấu hình Supabase
const SUPABASE_URL = 'https://tzfxvjrbzbfhrdnjcgza.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6Znh2anJiemJmaHJkbmpjZ3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MDk2NzgsImV4cCI6MjA4MDA4NTY3OH0.ZVYoX4BRgLm-yHGQz5D7jIiEo4fMJzP5DCjpmzwxisA';

// Khởi tạo Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Lưu trạng thái người dùng
let currentUser = null;
let currentUserRole = null;

// Hàm kiểm tra đăng nhập
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        
        // Lấy role từ metadata
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();
            
        currentUserRole = profile?.role || 'customer';
        return { user: currentUser, role: currentUserRole };
    }
    
    return null;
}

// Hàm chuyển hướng theo role
function redirectByRole(role) {
    switch(role) {
        case 'customer':
            window.location.href = 'customer.html';
            break;
        case 'seller':
            window.location.href = 'seller.html';
            break;
        case 'admin':
            window.location.href = 'admin.html';
            break;
        default:
            window.location.href = 'index.html';
    }
}

// Hàm đăng xuất
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}