// CẤU HÌNH SUPABASE
const SUPABASE_URL = 'https://gvsbcjhohvrgaowflcwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2c2JjamhvaHZyZ2Fvd2ZsY3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzIyNTYsImV4cCI6MjA3OTY0ODI1Nn0.TMkVz82efXxfOazfhzKuWP-DYqVZY8M60WrtA4O77Xc';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN');

let allOrders = []; 
let displayedOrders = []; 
let editingOrderId = null; 
let originalPriceRef = 0; 

// 1. INIT
async function initAdmin() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return window.location.href = 'index.html';

        const { data: profile, error } = await _supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
        
        if (error || !profile) {
            alert("Lỗi: Tài khoản chưa có hồ sơ. Vui lòng kiểm tra lại.");
            return;
        }

        if (profile.role !== 'admin') {
            alert("CẢNH BÁO: Bạn không có quyền Admin!");
            return window.location.href = 'index.html';
        }

        document.getElementById('admin-name').innerText = profile.full_name || user.email;
        loadOrders();
        setupRealtime();

    } catch (err) { console.error(err); }
}
initAdmin();

async function logout() {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
}

function switchView(viewId) {
    ['orders', 'users', 'settings'].forEach(v => {
        document.getElementById('view-' + v).classList.add('hidden');
        document.getElementById('nav-' + v).classList.remove('bg-gray-800');
    });
    document.getElementById('view-' + viewId).classList.remove('hidden');
    document.getElementById('nav-' + viewId).classList.add('bg-gray-800');
    const titles = { 'orders': 'Quản lý Đơn hàng', 'users': 'Quản lý Tài khoản', 'settings': 'Cấu hình Hệ thống' };
    document.getElementById('page-title').innerText = titles[viewId];
    if(viewId === 'users') loadUsers();
    if(viewId === 'settings') loadSettingsAdmin();
}

// 2. ORDERS
async function loadOrders() {
    const { data, error } = await _supabase.from('orders').select(`*, profiles(full_name, email)`).order('created_at', { ascending: false });
    if (data) { allOrders = data; displayedOrders = data; renderOrders(data); }
}

function renderOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '';
    if(orders.length === 0) document.getElementById('no-result').classList.remove('hidden');
    else document.getElementById('no-result').classList.add('hidden');

    const statusDict = { 'pending': '<span class="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-bold">MỚI</span>', 'processing': '<span class="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-bold">ĐANG XỬ LÝ</span>', 'payment_pending': '<span class="px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs font-bold">CHỜ THANH TOÁN</span>', 'paid': '<span class="px-2 py-1 rounded bg-green-50 text-green-600 text-xs font-bold">ĐÃ TRẢ TIỀN</span>', 'completed': '<span class="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-bold">HOÀN THÀNH</span>', 'cancelled': '<span class="px-2 py-1 rounded bg-gray-200 text-gray-500 text-xs font-bold">ĐÃ HỦY</span>' };

    orders.forEach(o => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50 group";
        let details = o.type === 'file' ? `<div class="text-sm"><span class="font-bold text-blue-600">[IN FILE]</span> <a href="#" class="underline text-blue-500">Tải xuống</a><br>• ${o.page_count} trang, Cỡ ${o.font_size}</div>` : `<div class="text-sm"><span class="font-bold text-green-600">[IN CHỮ]</span> (${o.board_count} bảng)<br>• P.${o.room_number || '?'}</div>`;
        let actions = `<div class="flex flex-col gap-1">`;
        if (o.status === 'pending') actions += `<button onclick="updateStatus('${o.id}', 'processing')" class="bg-blue-600 text-white px-2 py-1 text-xs rounded">Nhận đơn</button><button onclick="updateStatus('${o.id}', 'cancelled')" class="bg-gray-400 text-white px-2 py-1 text-xs rounded">Hủy bỏ</button>`;
        else if (o.status === 'processing') actions += `<button onclick="openPriceModal('${o.id}', ${o.original_price}, ${o.adjustment_fee})" class="bg-yellow-500 text-white px-2 py-1 text-xs rounded">✏️ Chỉnh giá</button><button onclick="requestPayment('${o.id}', '${o.user_id}', ${o.final_price})" class="bg-indigo-600 text-white px-2 py-1 text-xs rounded">Gửi QR</button>`;
        else if (o.status === 'payment_pending') actions += `<button onclick="updateStatus('${o.id}', 'paid')" class="bg-green-500 text-white px-2 py-1 text-xs rounded">Đã nhận tiền</button>`;
        else if (o.status === 'paid') actions += `<button onclick="updateStatus('${o.id}', 'completed')" class="bg-green-700 text-white px-2 py-1 text-xs rounded">Hoàn thành</button>`;
        actions += `<button onclick="deleteOrder('${o.id}')" class="mt-2 text-red-500 text-xs hover:text-red-700 hover:underline flex justify-center items-center gap-1">🗑️ Xóa đơn</button></div>`;
        
        let priceDisplay = `<div class="font-bold">${formatCurrency(o.final_price)}</div>`;
        if(o.adjustment_fee !== 0) priceDisplay += `<div class="text-xs text-red-500 italic">(${o.adjustment_fee > 0 ? '+' : ''}${formatCurrency(o.adjustment_fee)})</div>`;

        tr.innerHTML = `<td class="p-4 text-xs text-gray-500">${o.id.slice(0,6)}...<br>${formatDate(o.created_at)}</td><td class="p-4 font-medium">${o.profiles?.full_name || 'No Name'}<br><span class="text-xs text-gray-500">${o.profiles?.email}</span></td><td class="p-4">${details}</td><td class="p-4">${priceDisplay}</td><td class="p-4">${statusDict[o.status]}</td><td class="p-4">${actions}</td>`;
        tbody.appendChild(tr);
    });
}

function handleSearch() {
    const term = document.getElementById('search-input').value.toLowerCase();
    displayedOrders = allOrders.filter(o => {
        const name = (o.profiles?.full_name || '').toLowerCase();
        const email = (o.profiles?.email || '').toLowerCase();
        const id = o.id.toLowerCase();
        return name.includes(term) || email.includes(term) || id.includes(term);
    });
    renderOrders(displayedOrders);
}

function filterOrders(status) {
    document.getElementById('search-input').value = ''; 
    if (status === 'all') displayedOrders = allOrders;
    else displayedOrders = allOrders.filter(o => o.status === status);
    renderOrders(displayedOrders);
}

async function updateStatus(orderId, newStatus) { await _supabase.from('orders').update({ status: newStatus }).eq('id', orderId); }
async function deleteOrder(id) { if(!confirm("Xóa vĩnh viễn?")) return; await _supabase.from('orders').delete().eq('id', id); allOrders = allOrders.filter(o => o.id !== id); handleSearch(); }
function openPriceModal(id, org, fee) { editingOrderId = id; originalPriceRef = org; document.getElementById('modal-org-price').innerText = formatCurrency(org); document.getElementById('modal-new-price').value = org + fee; document.getElementById('modal-price').classList.remove('hidden'); }
async function confirmUpdatePrice() { const newPrice = parseInt(document.getElementById('modal-new-price').value); const fee = newPrice - originalPriceRef; await _supabase.from('orders').update({ adjustment_fee: fee, adjustment_reason: document.getElementById('modal-reason').value }).eq('id', editingOrderId); document.getElementById('modal-price').classList.add('hidden'); }
async function requestPayment(orderId, userId, amount) { if(!confirm("Yêu cầu thanh toán?")) return; await _supabase.from('orders').update({ status: 'payment_pending' }).eq('id', orderId); await _supabase.from('messages').insert({ sender_id: (await _supabase.auth.getUser()).data.user.id, content: `Thanh toán: ${formatCurrency(amount)}.`, is_admin: true }); alert("Đã gửi!"); }

async function loadUsers() {
    const { data: users } = await _supabase.from('profiles').select('*').order('created_at');
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    users.forEach(u => {
         const tr = document.createElement('tr'); tr.className = "border-b";
         const roleBtn = u.role === 'customer' ? `<button onclick="changeRole('${u.id}','admin')" class="text-blue-500 border px-2 text-xs">🔼 Admin</button>` : `<span class="text-green-600 font-bold text-xs">Admin</span> <button onclick="changeRole('${u.id}','customer')" class="text-gray-400 text-xs ml-2">🔽 Hạ</button>`;
         tr.innerHTML = `<td class="p-4"><img src="${u.avatar_url || 'https://via.placeholder.com/150'}" class="w-8 h-8 rounded-full bg-gray-300"></td><td class="p-4">${u.email}</td><td class="p-4">${roleBtn}</td><td class="p-4">${formatDate(u.created_at)}</td><td class="p-4"><button onclick="deleteUser('${u.id}')" class="text-red-500">Xóa</button></td>`;
         tbody.appendChild(tr);
    });
}
async function changeRole(id, role) { if(role === 'admin' && !confirm("Cấp Admin?")) return; await _supabase.from('profiles').update({ role }).eq('id', id); loadUsers(); }
async function deleteUser(id) { if(confirm("Xóa User?")) { await _supabase.from('profiles').delete().eq('id', id); loadUsers(); } }
async function loadSettingsAdmin() { const { data } = await _supabase.from('settings').select('*').single(); if(data) { document.getElementById('set-page-price').value = data.price_per_page; document.getElementById('set-board-price').value = data.price_per_board; document.getElementById('set-density').value = data.density_fee_percent; } }
async function saveSettings() { const { data } = await _supabase.from('settings').select('id').single(); await _supabase.from('settings').update({ price_per_page: document.getElementById('set-page-price').value, price_per_board: document.getElementById('set-board-price').value, density_fee_percent: document.getElementById('set-density').value }).eq('id', data.id); alert("Lưu thành công!"); }
function setupRealtime() { _supabase.channel('admin-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { loadOrders(); }).subscribe(); }
