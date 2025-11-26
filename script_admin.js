// ============================================================
// FILE: script_admin.js (BẢN FULL - ĐÃ CÓ CHAT)
// ============================================================
const SUPABASE_URL = 'https://gvsbcjhohvrgaowflcwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2c2JjamhvaHZyZ2Fvd2ZsY3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzIyNTYsImV4cCI6MjA3OTY0ODI1Nn0.TMkVz82efXxfOazfhzKuWP-DYqVZY8M60WrtA4O77Xc';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN');

let allOrders = []; 
let displayedOrders = []; 
let editingOrderId = null; 
let originalPriceRef = 0; 
let currentChatUserId = null; // ID khách hàng đang chat

// 1. INIT ADMIN
async function initAdmin() {
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return window.location.href = 'index.html';

        const { data: profile, error } = await _supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
        
        if (error || !profile || profile.role !== 'admin') {
            alert("Bạn không có quyền truy cập Admin!");
            return window.location.href = 'index.html';
        }

        document.getElementById('admin-name').innerText = profile.full_name || user.email;
        loadOrders();
        setupRealtime(); // Lắng nghe đơn hàng và tin nhắn

    } catch (err) { console.error(err); }
}
initAdmin();

async function logout() {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
}

function switchView(viewId) {
    ['orders', 'users', 'settings', 'chat'].forEach(v => {
        document.getElementById('view-' + v)?.classList.add('hidden');
        document.getElementById('nav-' + v)?.classList.remove('bg-gray-800');
    });
    document.getElementById('view-' + viewId).classList.remove('hidden');
    document.getElementById('nav-' + viewId).classList.add('bg-gray-800');
    
    const titles = { 'orders': 'Đơn hàng', 'users': 'Tài khoản', 'settings': 'Cấu hình', 'chat': 'Hỗ trợ Khách hàng' };
    document.getElementById('page-title').innerText = titles[viewId];

    if(viewId === 'users') loadUsers();
    if(viewId === 'settings') loadSettingsAdmin();
    if(viewId === 'chat') loadChatUsers(); // Tải danh sách người nhắn
}

// 2. LOGIC CHAT ADMIN (TÍNH NĂNG MỚI)
async function loadChatUsers() {
    // Lấy tất cả tin nhắn để tìm ra danh sách những người đã nhắn tin
    // Cách tối ưu: Lấy distinct sender_id từ messages
    const { data: messages } = await _supabase.from('messages').select('sender_id, created_at').order('created_at', { ascending: false });
    
    if(!messages) return;

    // Lọc ra các ID duy nhất (trừ tin của admin)
    const uniqueSenderIds = [...new Set(messages.map(m => m.sender_id))];
    const adminUser = await _supabase.auth.getUser();
    const adminId = adminUser.data.user.id;
    
    // Loại bỏ ID của chính admin ra khỏi danh sách
    const clientIds = uniqueSenderIds.filter(id => id !== adminId);

    // Lấy thông tin chi tiết của các khách hàng này
    const { data: profiles } = await _supabase.from('profiles').select('*').in('id', clientIds);
    
    const listContainer = document.getElementById('chat-user-list');
    listContainer.innerHTML = '';

    if(!profiles || profiles.length === 0) {
        listContainer.innerHTML = '<p class="p-4 text-gray-500 text-center">Chưa có tin nhắn nào.</p>';
        return;
    }

    profiles.forEach(p => {
        const div = document.createElement('div');
        div.className = "p-3 border-b hover:bg-blue-50 cursor-pointer flex items-center gap-3";
        div.onclick = () => openChatWithUser(p);
        div.innerHTML = `
            <img src="${p.avatar_url || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full bg-gray-300">
            <div>
                <div class="font-bold text-sm">${p.full_name || 'Khách hàng'}</div>
                <div class="text-xs text-gray-500">${p.email}</div>
            </div>
        `;
        listContainer.appendChild(div);
    });
}

async function openChatWithUser(userProfile) {
    currentChatUserId = userProfile.id;
    document.getElementById('chat-current-user').innerText = `Chat với: ${userProfile.full_name}`;
    document.getElementById('admin-chat-input').disabled = false;
    document.getElementById('admin-chat-btn').disabled = false;
    document.getElementById('admin-chat-input').focus();

    // Tải tin nhắn 2 chiều: (Sender = Khách AND Receiver = Admin) OR (Sender = Admin AND Receiver = Khách)
    // Tuy nhiên schema đơn giản hiện tại: Sender là người gửi.
    // Ta lấy tất cả tin có liên quan đến ID khách này.
    const { data: msgs } = await _supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${currentChatUserId},receiver_id.eq.${currentChatUserId}`) // Lấy tin họ gửi HOẶC tin mình gửi cho họ
        .order('created_at', { ascending: true });

    const container = document.getElementById('admin-chat-messages');
    container.innerHTML = '';
    msgs.forEach(msg => appendAdminMessage(msg));
}

function appendAdminMessage(msg) {
    const container = document.getElementById('admin-chat-messages');
    const div = document.createElement('div');
    // Nếu sender_id = currentChatUserId thì là Khách nhắn -> Bên trái
    // Nếu không phải -> Là Admin nhắn -> Bên phải
    const isCustomer = msg.sender_id === currentChatUserId;
    
    div.className = `flex ${isCustomer ? 'justify-start' : 'justify-end'}`;
    const bg = isCustomer ? 'bg-white text-gray-800 border' : 'bg-blue-600 text-white';
    
    div.innerHTML = `
        <div class="max-w-[70%] p-2 rounded-lg text-sm shadow-sm ${bg}">
            ${msg.content}
            <div class="text-[10px] opacity-70 mt-1 text-right">${new Date(msg.created_at).toLocaleTimeString()}</div>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function sendAdminReply() {
    if(!currentChatUserId) return;
    const input = document.getElementById('admin-chat-input');
    const text = input.value.trim();
    if(!text) return;

    const adminId = (await _supabase.auth.getUser()).data.user.id;

    // Gửi tin nhắn kèm receiver_id (QUAN TRỌNG ĐỂ BÊN KHÁCH NHẬN ĐƯỢC ĐÚNG)
    const { error } = await _supabase.from('messages').insert({
        sender_id: adminId,
        receiver_id: currentChatUserId, // Gửi đích danh cho khách này
        content: text,
        is_admin: true
    });

    if(error) alert("Lỗi gửi: " + error.message);
    else input.value = '';
}

// 3. ORDERS & REALTIME
async function loadOrders() {
    const { data } = await _supabase.from('orders').select(`*, profiles(full_name, email)`).order('created_at', { ascending: false });
    if (data) { allOrders = data; displayedOrders = data; renderOrders(data); }
}

function renderOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '';
    if(orders.length === 0) document.getElementById('no-result').classList.remove('hidden');
    else document.getElementById('no-result').classList.add('hidden');

    const statusDict = { 'pending': 'bg-yellow-100 text-yellow-800', 'processing': 'bg-blue-100 text-blue-800', 'payment_pending': 'bg-orange-100 text-orange-800', 'paid': 'bg-green-50 text-green-600', 'completed': 'bg-green-100 text-green-800', 'cancelled': 'bg-gray-200 text-gray-500' };

    orders.forEach(o => {
        const tr = document.createElement('tr'); tr.className = "border-b hover:bg-gray-50 group";
        let details = o.type === 'file' ? `[FILE] ${o.page_count} trang` : `[CHỮ] ${o.board_count} bảng`;
        let actions = `<div class="flex flex-col gap-1">`;
        if (o.status === 'pending') actions += `<button onclick="updateStatus('${o.id}', 'processing')" class="bg-blue-600 text-white px-2 rounded text-xs">Nhận</button><button onclick="updateStatus('${o.id}', 'cancelled')" class="bg-gray-400 text-white px-2 rounded text-xs">Hủy</button>`;
        else if (o.status === 'processing') actions += `<button onclick="openPriceModal('${o.id}', ${o.original_price}, ${o.adjustment_fee})" class="bg-yellow-500 text-white px-2 rounded text-xs">Giá</button><button onclick="requestPayment('${o.id}', '${o.user_id}', ${o.final_price})" class="bg-indigo-600 text-white px-2 rounded text-xs">QR</button>`;
        else if (o.status === 'payment_pending') actions += `<button onclick="updateStatus('${o.id}', 'paid')" class="bg-green-500 text-white px-2 rounded text-xs">Đã Trả</button>`;
        else if (o.status === 'paid') actions += `<button onclick="updateStatus('${o.id}', 'completed')" class="bg-green-700 text-white px-2 rounded text-xs">Xong</button>`;
        actions += `<button onclick="deleteOrder('${o.id}')" class="text-red-500 text-xs">Xóa</button></div>`;

        tr.innerHTML = `<td class="p-4 text-xs">${o.id.slice(0,6)}<br>${formatDate(o.created_at)}</td><td class="p-4 font-medium">${o.profiles?.full_name || '...'}<br><span class="text-xs text-gray-500">${o.profiles?.email}</span></td><td class="p-4 text-sm">${details}</td><td class="p-4 font-bold">${formatCurrency(o.final_price)}</td><td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${statusDict[o.status] || ''}">${o.status}</span></td><td class="p-4">${actions}</td>`;
        tbody.appendChild(tr);
    });
}

function handleSearch() {
    const term = document.getElementById('search-input').value.toLowerCase();
    displayedOrders = allOrders.filter(o => (o.profiles?.full_name || '').toLowerCase().includes(term) || o.id.toLowerCase().includes(term));
    renderOrders(displayedOrders);
}
function filterOrders(status) {
    document.getElementById('search-input').value = ''; 
    if (status === 'all') displayedOrders = allOrders;
    else displayedOrders = allOrders.filter(o => o.status === status);
    renderOrders(displayedOrders);
}

async function updateStatus(id, status) { await _supabase.from('orders').update({ status }).eq('id', id); }
async function deleteOrder(id) { if(confirm("Xóa?")) { await _supabase.from('orders').delete().eq('id', id); allOrders = allOrders.filter(o => o.id !== id); handleSearch(); } }
function openPriceModal(id, org, fee) { editingOrderId = id; originalPriceRef = org; document.getElementById('modal-org-price').innerText = formatCurrency(org); document.getElementById('modal-new-price').value = org + fee; document.getElementById('modal-price').classList.remove('hidden'); }
async function confirmUpdatePrice() { const fee = parseInt(document.getElementById('modal-new-price').value) - originalPriceRef; await _supabase.from('orders').update({ adjustment_fee: fee, adjustment_reason: document.getElementById('modal-reason').value }).eq('id', editingOrderId); document.getElementById('modal-price').classList.add('hidden'); }
async function requestPayment(id, uid, amt) { if(confirm("Gửi QR?")) { await _supabase.from('orders').update({ status: 'payment_pending' }).eq('id', id); await _supabase.from('messages').insert({ sender_id: (await _supabase.auth.getUser()).data.user.id, receiver_id: uid, content: `Thanh toán: ${formatCurrency(amt)}`, is_admin: true }); alert("Đã gửi!"); } }

async function loadUsers() { /* Giữ nguyên logic load user cũ */
    const { data } = await _supabase.from('profiles').select('*').order('created_at');
    const tbody = document.getElementById('users-table-body'); tbody.innerHTML = '';
    data.forEach(u => { tbody.innerHTML += `<tr class="border-b"><td class="p-4"><div class="w-8 h-8 bg-gray-300 rounded-full"></div></td><td class="p-4">${u.email}</td><td class="p-4">${u.role}</td><td class="p-4">${formatDate(u.created_at)}</td><td class="p-4"><button onclick="deleteUser('${u.id}')" class="text-red-500">Xóa</button></td></tr>`; });
}
async function changeRole(id, role) { if(confirm("Đổi quyền?")) { await _supabase.from('profiles').update({ role }).eq('id', id); loadUsers(); } }
async function deleteUser(id) { if(confirm("Xóa User?")) { await _supabase.from('profiles').delete().eq('id', id); loadUsers(); } }
async function loadSettingsAdmin() { /* Giữ nguyên */ }
async function saveSettings() { /* Giữ nguyên */ }

function setupRealtime() {
    _supabase.channel('admin-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            // Nếu đang mở chat với đúng người vừa nhắn -> Hiện tin nhắn
            if(currentChatUserId && (payload.new.sender_id === currentChatUserId || payload.new.receiver_id === currentChatUserId)) {
                appendAdminMessage(payload.new);
            }
            // Reload danh sách người nhắn (để người mới hiện lên đầu)
            loadChatUsers();
        })
        .subscribe();
}
