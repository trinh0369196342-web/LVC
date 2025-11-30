// --- KẾT NỐI ---
const SUPABASE_URL = 'DÁN_URL_CỦA_BẠN_VÀO_ĐÂY';
const SUPABASE_KEY = 'DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) window.location.href = 'login.html';

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile.role !== 'admin') {
        window.location.href = 'login.html';
    }
    loadAllOrders();
    loadStats();
}
checkAuth();

function show(id) {
    document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// --- QUẢN LÝ TẤT CẢ ĐƠN ---
async function loadAllOrders() {
    const div = document.getElementById('all-orders-list'); // Tạo div này trong HTML admin
    div.innerHTML = 'Đang tải...';

    // Admin lấy hết, không quan trọng ai tạo
    const { data: orders } = await supabase
        .from('orders')
        .select('*, profiles(full_name)') // join bảng profile để lấy tên khách
        .order('created_at', { ascending: false });

    div.innerHTML = '';
    orders.forEach(o => {
        let statusColor = o.status == 'pending' ? 'orange' : (o.status == 'completed' ? 'green' : 'blue');
        
        div.innerHTML += `
            <div class="form-box" style="border-left: 5px solid ${statusColor}">
                <b>#${o.id}</b> | Khách: ${o.profiles?.full_name || 'Ẩn danh'} | TT: ${o.status}
                <br>
                Người xử lý ID: ${o.handler_id || 'Chưa có'}
                <br>
                <button onclick="adminDelete(${o.id})" style="background:red; color:white; font-size:10px;">Xóa vĩnh viễn</button>
            </div>
        `;
    });
}

// --- THỐNG KÊ (BIỂU ĐỒ) ---
async function loadStats() {
    // 1. Đếm tổng đơn
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    
    // 2. Tính tổng tiền (Supabase ko có hàm sum trực tiếp qua JS client đơn giản, ta fetch về tính)
    const { data } = await supabase.from('orders').select('total_price').eq('status', 'completed');
    let totalRev = 0;
    if(data) data.forEach(d => totalRev += (d.total_price || 0));

    // Hiển thị (Cần tạo thẻ span id tương ứng trong HTML)
    document.getElementById('stat-count').innerText = count || 0;
    document.getElementById('stat-money').innerText = totalRev.toLocaleString() + ' VNĐ';
}

async function adminDelete(id) {
    if(confirm("Xóa vĩnh viễn đơn này?")) {
        await supabase.from('orders').delete().eq('id', id);
        loadAllOrders();
    }
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}
