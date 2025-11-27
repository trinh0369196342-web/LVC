// ============================================================
// CẤU HÌNH SUPABASE
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
let currentChatUserId = null;

// ============================================================
// 1. INIT & AUTH
// ============================================================
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
        
        // Tải dữ liệu ban đầu
        loadOrders();
        setupRealtime();

    } catch (err) { console.error("Lỗi khởi tạo:", err); }
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
    if(viewId === 'chat') loadChatUsers();
}

// ============================================================
// 2. QUẢN LÝ ĐƠN HÀNG (ORDERS)
// ============================================================
async function loadOrders() {
    const { data } = await _supabase.from('orders').select(`*, profiles(full_name, email)`).order('created_at', { ascending: false });
    if (data) { allOrders = data; displayedOrders = data; renderOrders(data); }
}

// --- Thay thế hàm renderOrders cũ bằng hàm này ---
function renderOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '';

    if(orders.length === 0) document.getElementById('no-result').classList.remove('hidden');
    else document.getElementById('no-result').classList.add('hidden');

    const statusDict = { 'pending': 'bg-yellow-100 text-yellow-800', 'processing': 'bg-blue-100 text-blue-800', 'payment_pending': 'bg-orange-100 text-orange-800', 'paid': 'bg-green-50 text-green-600', 'completed': 'bg-green-100 text-green-800', 'cancelled': 'bg-gray-200 text-gray-500' };

    orders.forEach(o => {
        const tr = document.createElement('tr'); tr.className = "border-b hover:bg-gray-50 group";
        
        // Cột chi tiết
        let details = '';
        if(o.type === 'file') {
            const isLink = o.file_url && o.file_url.startsWith('http');
            const linkAttr = isLink ? `href="${o.file_url}" target="_blank"` : `href="#" onclick="alert('File demo!')"`;
            details = `<div class="text-sm"><span class="font-bold text-blue-600">[IN FILE]</span> <a ${linkAttr} class="text-blue-600 hover:underline font-bold">⬇ Tải xuống</a><br>• ${o.page_count} trang, ${o.is_landscape ? 'Ngang' : 'Dọc'}</div>`;
        } else {
            // NÚT MỚI: openCopyPreview
            details = `
                <div class="text-sm">
                    <span class="font-bold text-green-600">[IN CHỮ]</span> (${o.board_count} bảng)<br>
                    • P.${o.room_number || '?'} - T.${o.floor_number || '?'}<br>
                    <button onclick="openCopyPreview('${o.id}')" class="mt-1 bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded text-xs hover:bg-green-100 flex items-center gap-1">
                        👁️ Xem & Copy (${o.board_count} bảng)
                    </button>
                </div>`;
        }

        let actions = `<div class="flex flex-col gap-1">`;
        if (o.status === 'pending') actions += `<button onclick="updateStatus('${o.id}', 'processing')" class="bg-blue-600 text-white px-2 rounded text-xs">Nhận</button><button onclick="updateStatus('${o.id}', 'cancelled')" class="bg-gray-400 text-white px-2 rounded text-xs">Hủy</button>`;
        else if (o.status === 'processing') actions += `<button onclick="openPriceModal('${o.id}', ${o.original_price}, ${o.adjustment_fee})" class="bg-yellow-500 text-white px-2 rounded text-xs">Giá</button><button onclick="requestPayment('${o.id}', '${o.user_id}', ${o.final_price})" class="bg-indigo-600 text-white px-2 rounded text-xs">QR</button>`;
        else if (o.status === 'payment_pending') actions += `<button onclick="updateStatus('${o.id}', 'paid')" class="bg-green-500 text-white px-2 rounded text-xs">Đã Trả</button>`;
        else if (o.status === 'paid') actions += `<button onclick="updateStatus('${o.id}', 'completed')" class="bg-green-700 text-white px-2 rounded text-xs">Xong</button>`;
        actions += `<button onclick="deleteOrder('${o.id}')" class="text-red-500 text-xs">Xóa</button></div>`;

        let priceDisplay = `<div class="font-bold">${formatCurrency(o.final_price)}</div>`;
        if(o.adjustment_fee !== 0) priceDisplay += `<div class="text-xs text-red-500 italic">(${o.adjustment_fee > 0 ? '+' : ''}${formatCurrency(o.adjustment_fee)})</div>`;

        tr.innerHTML = `<td class="p-4 text-xs">${o.id.slice(0,6)}<br>${formatDate(o.created_at)}</td><td class="p-4 font-medium">${o.profiles?.full_name || '...'}<br><span class="text-xs text-gray-500">${o.profiles?.email}</span></td><td class="p-4 text-sm">${details}</td><td class="p-4 font-bold">${priceDisplay}</td><td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${statusDict[o.status] || ''}">${o.status}</span></td><td class="p-4">${actions}</td>`;
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

// 1. CẬP NHẬT HÀM LOAD CẤU HÌNH (Thêm load QR Link)
async function loadSettingsAdmin() {
    const { data } = await _supabase.from('settings').select('*').single();
    if(data) {
        document.getElementById('set-page-price').value = data.price_per_page;
        document.getElementById('set-board-price').value = data.price_per_board;
        document.getElementById('set-density').value = data.density_fee_percent;
        // Load link QR nếu có (giả sử bạn đã thêm cột qr_code_url vào bảng settings)
        // Nếu chưa có cột trong DB, ta dùng biến tạm hoặc hardcode link ảnh của bạn
        if(data.qr_code_url) document.getElementById('set-qr-link').value = data.qr_code_url;
    }
}

// 2. CẬP NHẬT HÀM LƯU CẤU HÌNH (Lưu QR Link)
async function saveSettings() {
    const updates = {
        price_per_page: document.getElementById('set-page-price').value,
        price_per_board: document.getElementById('set-board-price').value,
        density_fee_percent: document.getElementById('set-density').value,
        // Lưu link QR (Cần thêm cột qr_code_url vào bảng settings trong Supabase trước)
        qr_code_url: document.getElementById('set-qr-link').value
    };
    
    const { data } = await _supabase.from('settings').select('id').single();
    await _supabase.from('settings').update(updates).eq('id', data.id);
    alert("Đã lưu cấu hình!");
}

// 3. NÂNG CẤP HÀM YÊU CẦU THANH TOÁN (Gửi Ảnh + Tiền)
// === TÌM ĐOẠN NÀY TRONG FILE script_admin.js VÀ THAY THẾ ===

async function requestPayment(orderId, userId, amount) {
    if(!confirm(`Xác nhận yêu cầu khách thanh toán ${formatCurrency(amount)}?`)) return;

    // --- SỬA ĐỔI TẠI ĐÂY ---
    // Thay vì lấy từ ô nhập liệu hoặc link placeholder, ta gán cứng link ảnh nội bộ
    let qrImageLink = "IMG/IMG_0542.jpeg"; 
    // ------------------------

    await _supabase.from('orders').update({ status: 'payment_pending' }).eq('id', orderId);

    const messageContent = `
        🔔 <b>YÊU CẦU THANH TOÁN</b><br>
        Mã đơn: <b>${orderId.slice(0,6)}</b><br>
        Số tiền cần trả: <b class="text-red-600 text-lg">${formatCurrency(amount)}</b><br>
        Vui lòng quét mã QR bên dưới để chuyển khoản:
    `;

    const { error } = await _supabase.from('messages').insert({
        sender_id: (await _supabase.auth.getUser()).data.user.id,
        receiver_id: userId,
        content: messageContent,
        image_url: qrImageLink, // Link ảnh bây giờ là "IMG/IMG_0542.jpeg"
        is_admin: true
    });

    if(error) alert("Lỗi gửi tin nhắn: " + error.message);
    else alert("Đã gửi yêu cầu thanh toán kèm QR Code!");
}

// ============================================================
// 3. CHAT SYSTEM (ADMIN)
// ============================================================
async function loadChatUsers() {
    // Lấy tất cả tin nhắn
    const { data: messages, error } = await _supabase
        .from('messages')
        .select('sender_id, receiver_id, created_at')
        .order('created_at', { ascending: false });
    
    if(error || !messages || messages.length === 0) {
        document.getElementById('chat-user-list').innerHTML = '<p class="p-4 text-gray-500 text-center">Chưa có tin nhắn nào.</p>';
        return;
    }

    const adminId = (await _supabase.auth.getUser()).data.user.id;
    
    // Lọc ra các ID người dùng (khác ID admin)
    let userIds = new Set();
    messages.forEach(m => {
        if (m.sender_id !== adminId) userIds.add(m.sender_id);
        if (m.receiver_id !== adminId && m.receiver_id) userIds.add(m.receiver_id);
    });

    const uniqueIds = Array.from(userIds);
    if (uniqueIds.length === 0) return;

    // Lấy thông tin user
    const { data: profiles } = await _supabase.from('profiles').select('*').in('id', uniqueIds);
    const listContainer = document.getElementById('chat-user-list');
    listContainer.innerHTML = '';

    profiles.forEach(p => {
        const div = document.createElement('div');
        div.className = "p-3 border-b hover:bg-blue-50 cursor-pointer flex items-center gap-3";
        div.onclick = () => openChatWithUser(p);
        div.innerHTML = `
            <img src="${p.avatar_url || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full bg-gray-300 object-cover">
            <div class="overflow-hidden">
                <div class="font-bold text-sm truncate">${p.full_name || 'Khách hàng'}</div>
                <div class="text-xs text-gray-500 truncate">${p.email}</div>
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

    // Load tin nhắn
    const { data: msgs } = await _supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${currentChatUserId},receiver_id.eq.${currentChatUserId}`)
        .order('created_at', { ascending: true });

    const container = document.getElementById('admin-chat-messages');
    container.innerHTML = '';
    msgs.forEach(msg => appendAdminMessage(msg));
}

function appendAdminMessage(msg) {
    const container = document.getElementById('admin-chat-messages');
    const div = document.createElement('div');
    // Nếu sender là khách (trùng ID đang chat) -> Trái. Còn lại -> Phải
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

    const { error } = await _supabase.from('messages').insert({
        sender_id: adminId,
        receiver_id: currentChatUserId,
        content: text,
        is_admin: true
    });

    if(error) alert("Lỗi gửi: " + error.message);
    else input.value = '';
}

// ============================================================
// 4. QUẢN LÝ TÀI KHOẢN (USERS)
// ============================================================
async function loadUsers() {
    // Thêm xử lý lỗi chi tiết
    const { data: users, error } = await _supabase.from('profiles').select('*').order('created_at');
    
    if(error) {
        console.error("Lỗi tải user:", error);
        document.getElementById('users-table-body').innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Lỗi tải dữ liệu (Xem Console). Hãy chạy SQL phân quyền lại.</td></tr>`;
        return;
    }

    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    const adminName = document.getElementById('admin-name').innerText;

    users.forEach(u => {
        const tr = document.createElement('tr'); tr.className = "border-b hover:bg-gray-50";
        const isMe = (u.email === adminName) || (u.full_name === adminName);
        
        let roleButton = '';
        if (u.role === 'customer') {
            roleButton = `<button onclick="changeRole('${u.id}', 'admin')" class="text-blue-500 border border-blue-500 px-2 py-1 rounded text-xs hover:bg-blue-50">🔼 Admin</button>`;
        } else {
            roleButton = `<span class="text-green-600 font-bold text-xs">Admin</span>`;
            if (!isMe) roleButton += ` <button onclick="changeRole('${u.id}', 'customer')" class="text-gray-400 text-xs ml-2 underline">🔽 Hạ</button>`;
        }

        const deleteBtn = isMe ? `<span class="text-gray-300 text-xs">--</span>` : `<button onclick="deleteUser('${u.id}')" class="text-red-500 hover:text-red-700 ml-4 font-bold text-sm">🗑️ Xóa</button>`;

        tr.innerHTML = `
            <td class="p-4"><img src="${u.avatar_url || 'https://via.placeholder.com/150'}" class="w-8 h-8 rounded-full bg-gray-300 object-cover border"></td>
            <td class="p-4 font-medium">${u.full_name || 'Chưa đặt tên'}<br><span class="text-xs text-gray-500">${u.email}</span></td>
            <td class="p-4">${roleButton}</td>
            <td class="p-4 text-gray-500 text-sm">${formatDate(u.created_at)}</td>
            <td class="p-4">${deleteBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function changeRole(id, role) { if(role === 'admin' && !confirm("Cấp Admin?")) return; await _supabase.from('profiles').update({ role }).eq('id', id); loadUsers(); }
async function deleteUser(id) {
    const { data } = await _supabase.from('orders').select('id').eq('user_id', id).eq('status', 'pending');
    if(data && data.length > 0) return alert("User này còn đơn hàng chưa xong!");
    if(confirm("Xóa vĩnh viễn?")) { await _supabase.from('profiles').delete().eq('id', id); loadUsers(); }
}

// ============================================================
// 5. SETTINGS & REALTIME
// ============================================================
async function loadSettingsAdmin() { /* ... (Giữ nguyên logic cũ) ... */ 
    const { data } = await _supabase.from('settings').select('*').single(); 
    if(data) { document.getElementById('set-page-price').value = data.price_per_page; document.getElementById('set-board-price').value = data.price_per_board; }
}
async function saveSettings() { 
    /* ... (Giữ nguyên logic cũ) ... */
    const { data } = await _supabase.from('settings').select('id').single();
    await _supabase.from('settings').update({ 
        price_per_page: document.getElementById('set-page-price').value, 
        price_per_board: document.getElementById('set-board-price').value 
    }).eq('id', data.id);
    alert("Đã lưu!");
}

function setupRealtime() {
    _supabase.channel('admin-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            if(currentChatUserId && (payload.new.sender_id === currentChatUserId || payload.new.receiver_id === currentChatUserId)) {
                appendAdminMessage(payload.new);
            }
            loadChatUsers();
        })
        .subscribe();
}
// ============================================================
// TÍNH NĂNG MỚI: XEM & SAO CHÉP BẢNG IN (PREVIEW MODAL)
// ============================================================
let currentPreviewData = []; // Lưu tạm dữ liệu để copy

function openCopyPreview(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order || !order.boards_data) return alert("Không tìm thấy dữ liệu bảng!");

    currentPreviewData = order.boards_data; // Lưu lại để dùng cho nút Copy All

    const container = document.getElementById('copy-table-container');
    
    // Tạo bảng HTML
    let html = `
        <table class="w-full border-collapse bg-white text-sm">
            <thead>
                <tr class="bg-gray-200 text-gray-700">
                    <th class="border p-3 w-16 text-center">Bảng #</th>
                    <th class="border p-3 w-1/4">Môn / Tiêu đề</th>
                    <th class="border p-3">Nội dung chi tiết</th>
                    <th class="border p-3 w-24 text-center">Tác vụ</th>
                </tr>
            </thead>
            <tbody>
    `;

    order.boards_data.forEach(b => {
        html += `
            <tr class="hover:bg-blue-50">
                <td class="border p-3 text-center font-bold text-blue-600 text-lg">${b.id}</td>
                <td class="border p-3 font-semibold text-gray-800">${b.subject || '(Trống)'}</td>
                <td class="border p-3">
                    <pre class="whitespace-pre-wrap font-sans text-gray-600">${b.content || '(Trống)'}</pre>
                </td>
                <td class="border p-3 text-center">
                    <button onclick="copySingleBoard('${b.id}')" class="text-blue-500 border border-blue-500 px-2 py-1 rounded hover:bg-blue-600 hover:text-white text-xs">
                        Copy dòng này
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    
    if(order.boards_data.length === 0) {
        html = '<p class="text-center p-10 text-gray-400">Khách hàng chưa nhập nội dung nào.</p>';
    }

    container.innerHTML = html;
    document.getElementById('modal-copy-preview').classList.remove('hidden');
}

// Hàm copy toàn bộ (Dùng để paste vào Word in hàng loạt)
function copyAllContent() {
    if(!currentPreviewData || currentPreviewData.length === 0) return;

    let text = "";
    currentPreviewData.forEach(b => {
        text += `=== BẢNG ${b.id}: ${b.subject.toUpperCase()} ===\n`;
        text += `${b.content}\n`;
        text += `----------------------------------------\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
        alert(`Đã sao chép nội dung của ${currentPreviewData.length} bảng vào bộ nhớ!`);
        // document.getElementById('modal-copy-preview').classList.add('hidden'); // Có thể đóng hoặc không
    });
}

// Hàm copy từng dòng (Nếu muốn lấy lẻ)
function copySingleBoard(boardId) {
    // boardId đang là string hoặc number, convert về number để so sánh
    const board = currentPreviewData.find(b => b.id == boardId);
    if(board) {
        const text = `${board.subject}\n${board.content}`;
        navigator.clipboard.writeText(text).then(() => {
            alert(`Đã copy nội dung Bảng ${boardId}`);
        });
    }
}
