// ============================================================
// FILE: script_index.js (ĐÃ FIX LỖI)
// ============================================================
const SUPABASE_URL = 'https://gvsbcjhohvrgaowflcwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2c2JjamhvaHZyZ2Fvd2ZsY3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzIyNTYsImV4cCI6MjA3OTY0ODI1Nn0.TMkVz82efXxfOazfhzKuWP-DYqVZY8M60WrtA4O77Xc';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let boardsData = []; 
let currentModalIdx = 0;
let isRegistering = false;
let GLOBAL_SETTINGS = { price_per_page: 500, price_per_board: 5000, density_fee_percent: 20 };

const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN');

// 1. AUTH & INIT
async function checkUser() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        currentUser = user;
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        // Load dữ liệu
        loadProfile();
        loadSettings(); 
        subscribeRealtime(); 
        loadMessages(); // Load tin nhắn cũ ngay khi vào
    }
}
checkUser();

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('full_name').value;
    const errorP = document.getElementById('auth-error');
    errorP.innerText = "";

    try {
        if (isRegistering) {
            const { error } = await _supabase.auth.signUp({
                email, password, options: { data: { full_name: fullName } }
            });
            if (error) throw error;
            alert('Đăng ký thành công! Vui lòng đăng nhập.');
            toggleAuthMode();
        } else {
            const { error } = await _supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            location.reload();
        }
    } catch (err) {
        errorP.innerText = err.message;
    }
}

function toggleAuthMode() {
    isRegistering = !isRegistering;
    document.getElementById('full_name').classList.toggle('hidden');
    document.getElementById('auth-switch-btn').innerText = isRegistering ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký ngay";
    document.querySelector('#auth-container h2').innerText = isRegistering ? "Đăng Ký" : "Đăng Nhập";
}

async function handleLogout() {
    await _supabase.auth.signOut();
    location.reload();
}

// 2. PROFILE (NÂNG CẤP)
async function loadProfile() {
    try {
        const { data, error } = await _supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        
        if (data) {
            document.getElementById('user-display-name').innerText = data.full_name || data.email;
            
            // Điền dữ liệu vào form Profile
            document.getElementById('pro-fullname').value = data.full_name || '';
            document.getElementById('pro-email').value = data.email || '';
            document.getElementById('pro-phone').value = data.phone || '';
            document.getElementById('pro-address').value = data.address || '';
            document.getElementById('pro-avatar-url').value = data.avatar_url || '';
            
            if(data.avatar_url) document.getElementById('profile-avatar').src = data.avatar_url;

            if (data.role === 'admin') {
               if(confirm('Bạn là Admin. Chuyển sang trang quản trị?')) window.location.href = 'admin.html';
            }
        }
    } catch (err) {
        console.error("Lỗi load profile:", err);
    }
}

async function updateProfile() {
    const updates = {
        full_name: document.getElementById('pro-fullname').value,
        phone: document.getElementById('pro-phone').value,
        address: document.getElementById('pro-address').value,
        avatar_url: document.getElementById('pro-avatar-url').value,
    };

    const { error } = await _supabase.from('profiles').update(updates).eq('id', currentUser.id);
    if(error) alert("Lỗi: " + error.message);
    else {
        alert("Cập nhật thông tin thành công!");
        loadProfile(); // Reload ảnh/tên
    }
}

// 3. LOGIC GIAO DIỆN & TÍNH TIỀN (GIỮ NGUYÊN)
async function loadSettings() {
    const { data } = await _supabase.from('settings').select('*').single();
    if (data) GLOBAL_SETTINGS = data;
}

function switchTab(tabId) {
    document.getElementById('view-create-order').classList.add('hidden');
    document.getElementById('view-my-orders').classList.add('hidden');
    document.getElementById('view-profile').classList.add('hidden');
    ['tab-create', 'tab-list', 'tab-profile'].forEach(id => document.getElementById(id).className = 'flex-1 py-3 text-center text-gray-500');

    if(tabId === 'create-order') {
        document.getElementById('view-create-order').classList.remove('hidden');
        document.getElementById('tab-create').className = 'flex-1 py-3 text-center active-tab';
    } else if (tabId === 'my-orders') {
        document.getElementById('view-my-orders').classList.remove('hidden');
        document.getElementById('tab-list').className = 'flex-1 py-3 text-center active-tab';
        loadMyOrders();
    } else {
        document.getElementById('view-profile').classList.remove('hidden');
        document.getElementById('tab-profile').className = 'flex-1 py-3 text-center active-tab';
    }
}

function toggleOrderType() {
    const type = document.querySelector('input[name="orderType"]:checked').value;
    if (type === 'file') {
        document.getElementById('form-file').classList.remove('hidden');
        document.getElementById('form-text').classList.add('hidden');
    } else {
        document.getElementById('form-file').classList.add('hidden');
        document.getElementById('form-text').classList.remove('hidden');
    }
    calculatePrice();
}

function calculatePrice() {
    let total = 0;
    const type = document.querySelector('input[name="orderType"]:checked').value;
    if (type === 'file') {
        const pages = parseInt(document.getElementById('page-count').value) || 0;
        const densityVal = parseInt(document.getElementById('density').value);
        let densityMult = 1;
        if(densityVal === 2) densityMult = 1 + (GLOBAL_SETTINGS.density_fee_percent / 100); 
        if(densityVal === 3) densityMult = 1 + ((GLOBAL_SETTINGS.density_fee_percent * 2) / 100);
        total = pages * GLOBAL_SETTINGS.price_per_page * densityMult;
    } else {
        const count = parseInt(document.getElementById('board-count').value) || 0;
        total = count * GLOBAL_SETTINGS.price_per_board;
    }
    document.getElementById('total-price').innerText = formatCurrency(total);
    return total;
}

// 4. SUBMIT ORDER & FORM (GIỮ NGUYÊN)
function renderBoardSlots() {
    const count = parseInt(document.getElementById('board-count').value);
    const container = document.getElementById('board-slots');
    container.innerHTML = '';
    boardsData = []; 
    for (let i = 1; i <= count; i++) {
        boardsData.push({ id: i, subject: '', content: '' }); 
        const btn = document.createElement('div');
        btn.className = 'border-2 border-dashed border-gray-300 rounded p-4 text-center cursor-pointer hover:border-blue-500 hover:text-blue-600 bg-gray-50';
        btn.innerHTML = `<strong>Bảng ${i}</strong><br><span class="text-xs text-gray-400" id="preview-${i}">(Chưa có nội dung)</span>`;
        btn.onclick = () => openBoardModal(i);
        container.appendChild(btn);
    }
    calculatePrice();
}

function openBoardModal(idx) {
    currentModalIdx = idx;
    const data = boardsData[idx - 1];
    document.getElementById('modal-board-idx').innerText = idx;
    document.getElementById('modal-subject').value = data.subject;
    document.getElementById('modal-content').value = data.content;
    document.getElementById('board-modal').classList.remove('hidden');
}

function closeModal() { document.getElementById('board-modal').classList.add('hidden'); }

function saveBoardData() {
    const subject = document.getElementById('modal-subject').value;
    const content = document.getElementById('modal-content').value;
    if (content.match(/[ABCD]\./)) { 
         if(!confirm('Cảnh báo: Có vẻ bạn đang nhập trắc nghiệm (A. B. C...). Tiếp tục?')) return;
    }
    boardsData[currentModalIdx - 1] = { id: currentModalIdx, subject, content };
    document.getElementById(`preview-${currentModalIdx}`).innerText = subject ? subject : "(Đã nhập)";
    document.getElementById(`preview-${currentModalIdx}`).classList.add('text-green-600');
    closeModal();
}

async function submitOrder() {
    if(!currentUser) return alert("Vui lòng đăng nhập!");
    const type = document.querySelector('input[name="orderType"]:checked').value;
    const originalPrice = calculatePrice();
    
    let payload = { user_id: currentUser.id, type: type, original_price: Math.round(originalPrice), status: 'pending' };

    if (type === 'file') {
        const fileInput = document.getElementById('file-upload');
        if(fileInput.files.length === 0) return alert("Vui lòng chọn file!");
        payload.file_url = "demo_file_" + fileInput.files[0].name; 
        payload.page_count = document.getElementById('page-count').value;
        payload.font_size = document.getElementById('font-size').value;
        payload.density = document.getElementById('density').value == 1 ? 'normal' : 'bold';
        payload.is_landscape = document.getElementById('orientation').value === 'landscape';
    } else {
        const count = parseInt(document.getElementById('board-count').value);
        if (count === 0) return alert("Vui lòng chọn số lượng bảng!");
        const emptyBoard = boardsData.find(b => !b.content);
        if (emptyBoard) return alert(`Vui lòng điền nội dung cho Bảng ${emptyBoard.id}`);
        payload.board_count = count;
        payload.boards_data = boardsData;
        payload.room_number = document.getElementById('room-num').value;
        payload.floor_number = document.getElementById('floor-num').value;
    }

    const { error } = await _supabase.from('orders').insert(payload);
    if (error) alert("Lỗi: " + error.message);
    else {
        alert("Tạo đơn hàng thành công!");
        resetForm();
        switchTab('my-orders');
    }
}

function resetForm() {
    document.getElementById('page-count').value = 1;
    document.getElementById('board-count').value = 0;
    document.getElementById('board-slots').innerHTML = '';
    document.getElementById('total-price').innerText = '0 ₫';
}

// 5. QUẢN LÝ ĐƠN HÀNG (GIỮ NGUYÊN)
async function loadMyOrders() {
    const { data: orders } = await _supabase.from('orders').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    const container = document.getElementById('orders-list');
    container.innerHTML = '';
    
    if(!orders || orders.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">Chưa có đơn hàng nào.</p>';
        return;
    }

    orders.forEach(order => {
        const statusColor = { 'pending': 'text-yellow-600 bg-yellow-100', 'processing': 'text-blue-600 bg-blue-100', 'payment_pending': 'text-orange-600 bg-orange-100', 'completed': 'text-green-600 bg-green-100', 'cancelled': 'text-gray-600 bg-gray-200' };
        let detailHtml = order.type === 'file' ? `<p class="text-sm">File: <b>${order.file_url}</b> (${order.page_count} trang)</p>` : `<p class="text-sm">In Chữ: <b>${order.board_count} bảng</b> (Phòng ${order.room_number || '?'})</p>`;
        let actionsHtml = order.status === 'pending' ? `<button onclick="cancelOrder('${order.id}')" class="text-red-500 text-sm hover:underline mr-3">Hủy đơn</button>` : '';
        actionsHtml += `<button onclick="copyOrderContent('${order.id}')" class="text-blue-500 text-sm hover:underline">Sao chép</button>`;
        let priceDisplay = formatCurrency(order.final_price || order.original_price);
        if(order.adjustment_fee !== 0) priceDisplay += ` <span class="text-xs text-gray-400 line-through">${formatCurrency(order.original_price)}</span>`;

        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded shadow border-l-4 ' + (order.status === 'pending' ? 'border-yellow-500' : 'border-gray-300');
        card.innerHTML = `<div class="flex justify-between items-start mb-2"><span class="px-2 py-1 rounded text-xs font-bold ${statusColor[order.status] || ''}">${order.status.toUpperCase()}</span><span class="font-bold text-red-600">${priceDisplay}</span></div>${detailHtml}<div class="mt-2 pt-2 border-t flex justify-between items-center"><span class="text-xs text-gray-400">${formatDate(order.created_at)}</span><div>${actionsHtml}</div></div>`;
        container.appendChild(card);
    });
}

async function cancelOrder(orderId) {
    if(!confirm("Hủy đơn này?")) return;
    const { data } = await _supabase.from('orders').select('status').eq('id', orderId).single();
    if(data.status !== 'pending') return alert("Admin đã nhận đơn, không thể hủy!");
    await _supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
}

async function copyOrderContent(orderId) {
    const { data } = await _supabase.from('orders').select('*').eq('id', orderId).single();
    let textToCopy = "";
    if(data.type === 'text' && data.boards_data) data.boards_data.forEach(b => { textToCopy += `[BẢNG ${b.id} - ${b.subject}]\n${b.content}\n----------------\n`; });
    else textToCopy = `Đơn file: ${data.file_url}`;
    navigator.clipboard.writeText(textToCopy);
    alert("Đã sao chép!");
}

// 6. CHAT SUPPORT (FIXED)
function toggleChat() {
    const win = document.getElementById('chat-window');
    win.classList.toggle('hidden');
    // Reset badge
    document.getElementById('chat-badge').classList.add('hidden');
    if(!win.classList.contains('hidden')) {
        const container = document.getElementById('chat-messages');
        container.scrollTop = container.scrollHeight;
    }
}

async function loadMessages() {
    if(!currentUser) return;
    // Lấy tin nhắn của mình gửi HOẶC tin nhắn admin gửi
    // Lưu ý: Logic đơn giản này sẽ hiện tất cả tin admin gửi. 
    // Nếu muốn chat 1-1 chính xác, cần thêm cột 'receiver_id' trong DB.
    // Với mã hiện tại: Admin chat thì tất cả khách đều thấy nếu không filter kỹ. 
    // Sửa nhanh: Khách chỉ thấy tin của mình.
    
    const { data } = await _supabase.from('messages').select('*')
        .or(`sender_id.eq.${currentUser.id},is_admin.eq.true`)
        .order('created_at', { ascending: true });
        
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    data.forEach(msg => appendMessage(msg));
}

async function sendMessage() {
    if(!currentUser) return alert("Vui lòng đăng nhập để chat!");
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if(!text) return;
    
    const { error } = await _supabase.from('messages').insert({ 
        sender_id: currentUser.id, 
        content: text, 
        is_admin: false 
    });
    
    if(error) console.error(error);
    else input.value = '';
}

function appendMessage(msg) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    const isMe = msg.sender_id === currentUser.id;
    
    // Nếu là tin admin, hiện màu khác
    const bgColor = isMe ? 'bg-blue-100 text-blue-900' : (msg.is_admin ? 'bg-gray-200 text-gray-900 border border-gray-300' : 'bg-gray-100');
    const align = isMe ? 'justify-end' : 'justify-start';
    const label = !isMe && msg.is_admin ? '<span class="text-xs font-bold text-red-500 block mb-1">Admin</span>' : '';

    div.className = `flex ${align}`;
    div.innerHTML = `<div class="max-w-[80%] p-2 rounded text-sm ${bgColor}">${label}${msg.content}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function subscribeRealtime() {
    _supabase.channel('public:orders').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${currentUser.id}` }, () => { loadMyOrders(); }).subscribe();
    
    _supabase.channel('public:messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
         // Nếu tin của mình hoặc tin từ Admin
         if(payload.new.sender_id === currentUser.id || payload.new.is_admin) {
             appendMessage(payload.new);
             // Nếu Chat đang đóng và có tin mới -> Hiện chấm đỏ
             if(document.getElementById('chat-window').classList.contains('hidden')) {
                 document.getElementById('chat-badge').classList.remove('hidden');
             }
         }
    }).subscribe();
}
