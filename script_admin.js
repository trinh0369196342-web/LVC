// ============================================================
// FILE: script_admin.js (BẢN ĐẦY ĐỦ - KHÔNG VIẾT TẮT)
// ============================================================

// 1. CẤU HÌNH SUPABASE
// ------------------------------------------------------------
const SUPABASE_URL = 'https://gvsbcjhohvrgaowflcwc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2c2JjamhvaHZyZ2Fvd2ZsY3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzIyNTYsImV4cCI6MjA3OTY0ODI1Nn0.TMkVz82efXxfOazfhzKuWP-DYqVZY8M60WrtA4O77Xc';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Các hàm tiện ích
const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleString('vi-VN');

// ============================================================
// VÙNG 1: BIẾN TOÀN CỤC & KHỞI TẠO (CORE)
// ============================================================
let allOrders = []; 
let displayedOrders = []; 
let editingOrderId = null; 
let originalPriceRef = 0; 

// Hàm khởi tạo Admin (Có xử lý lỗi crash)
async function initAdmin() {
    try {
        // Kiểm tra đăng nhập
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return window.location.href = 'index.html';

        // Lấy Profile và kiểm tra quyền
        const { data: profile, error } = await _supabase.from('profiles').select('role, full_name').eq('id', user.id).single();

        // Xử lý trường hợp data bị lỗi (User chưa có profile)
        if (error || !profile) {
            console.error("Lỗi Profile:", error);
            alert("Lỗi dữ liệu: Tài khoản này chưa có hồ sơ. Vui lòng kiểm tra lại Database.");
            return;
        }

        if (profile.role !== 'admin') {
            alert("CẢNH BÁO: Bạn không có quyền truy cập trang Quản trị!");
            return window.location.href = 'index.html';
        }

        // Hiển thị tên Admin
        document.getElementById('admin-name').innerText = profile.full_name || user.email;
        
        // Tải dữ liệu
        loadOrders();
        setupRealtime();

    } catch (err) {
        console.error("Critical Error:", err);
    }
}
initAdmin(); // Chạy ngay lập tức

// Hàm đăng xuất
async function logout() {
    await _supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Hàm chuyển đổi Tab
function switchView(viewId) {
    // Ẩn tất cả các view
    ['orders', 'users', 'settings'].forEach(v => {
        document.getElementById('view-' + v).classList.add('hidden');
        document.getElementById('nav-' + v).classList.remove('bg-gray-800');
    });
    
    // Hiện view được chọn
    document.getElementById('view-' + viewId).classList.remove('hidden');
    document.getElementById('nav-' + viewId).classList.add('bg-gray-800');
    
    // Đổi tiêu đề
    const titles = { 'orders': 'Quản lý Đơn hàng', 'users': 'Quản lý Tài khoản', 'settings': 'Cấu hình Hệ thống' };
    document.getElementById('page-title').innerText = titles[viewId];

    // Load dữ liệu tương ứng
    if(viewId === 'users') loadUsers();
    if(viewId === 'settings') loadSettingsAdmin();
}

// ============================================================
// VÙNG 2: TẢI & HIỂN THỊ ĐƠN HÀNG (DATA FETCHING)
// ============================================================
async function loadOrders() {
    // Lấy đơn hàng và join bảng profiles để lấy tên khách
    const { data, error } = await _supabase
        .from('orders')
        .select(`*, profiles(full_name, email)`) 
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Lỗi tải đơn:", error);
        return;
    }

    if (data) {
        allOrders = data;
        displayedOrders = data; 
        renderOrders(data);
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('orders-table-body');
    tbody.innerHTML = '';

    // Hiển thị thông báo nếu không có đơn nào
    if(orders.length === 0) {
        document.getElementById('no-result').classList.remove('hidden');
    } else {
        document.getElementById('no-result').classList.add('hidden');
    }

    const statusDict = {
        'pending': '<span class="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-bold">MỚI</span>',
        'processing': '<span class="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-bold">ĐANG XỬ LÝ</span>',
        'payment_pending': '<span class="px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs font-bold">CHỜ THANH TOÁN</span>',
        'paid': '<span class="px-2 py-1 rounded bg-green-50 text-green-600 text-xs font-bold">ĐÃ TRẢ TIỀN</span>',
        'completed': '<span class="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-bold">HOÀN THÀNH</span>',
        'cancelled': '<span class="px-2 py-1 rounded bg-gray-200 text-gray-500 text-xs font-bold">ĐÃ HỦY</span>',
    };

    orders.forEach(o => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50 group";

        // Cột chi tiết đơn hàng
        let details = '';
        if(o.type === 'file') {
            details = `
                <div class="text-sm">
                    <span class="font-bold text-blue-600">[IN FILE]</span> 
                    <a href="#" class="underline text-blue-500 hover:text-blue-700">Tải xuống</a><br>
                    • ${o.page_count} trang, Cỡ ${o.font_size}<br>
                    • ${o.is_landscape ? 'Ngang' : 'Dọc'}, ${o.density === 'bold' ? 'Đậm' : 'Thường'}
                </div>`;
        } else {
            details = `
                <div class="text-sm">
                    <span class="font-bold text-green-600">[IN CHỮ]</span> (${o.board_count} bảng)<br>
                    • P.${o.room_number || '?'} - T.${o.floor_number || '?'}<br>
                    <button onclick="smartCopy('${o.id}')" class="mt-1 text-xs border border-blue-500 text-blue-500 px-2 py-0.5 rounded hover:bg-blue-50">📋 Sao chép nội dung</button>
                </div>`;
        }

        // Cột hành động (Logic hiển thị nút theo trạng thái)
        let actions = `<div class="flex flex-col gap-2">`;
        
        if (o.status === 'pending') {
            actions += `<button onclick="updateStatus('${o.id}', 'processing')" class="bg-blue-600 text-white px-2 py-1 text-xs rounded hover:bg-blue-700">Nhận đơn</button>`;
            actions += `<button onclick="updateStatus('${o.id}', 'cancelled')" class="bg-gray-400 text-white px-2 py-1 text-xs rounded hover:bg-gray-500">Hủy bỏ</button>`;
        } 
        else if (o.status === 'processing') {
            actions += `<button onclick="openPriceModal('${o.id}', ${o.original_price}, ${o.adjustment_fee})" class="bg-yellow-500 text-white px-2 py-1 text-xs rounded hover:bg-yellow-600">✏️ Chỉnh giá</button>`;
            actions += `<button onclick="requestPayment('${o.id}', '${o.user_id}', ${o.final_price})" class="bg-indigo-600 text-white px-2 py-1 text-xs rounded hover:bg-indigo-700">Gửi QR T.Toán</button>`;
        }
        else if (o.status === 'payment_pending') {
            actions += `<button onclick="updateStatus('${o.id}', 'paid')" class="bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600">Đã nhận tiền</button>`;
        }
        else if (o.status === 'paid') {
             actions += `<button onclick="updateStatus('${o.id}', 'completed')" class="bg-green-700 text-white px-2 py-1 text-xs rounded hover:bg-green-800">Hoàn thành</button>`;
        }
        
        // Nút xóa đơn (Luôn hiển thị cuối cùng)
        actions += `<button onclick="deleteOrder('${o.id}')" class="text-red-500 text-xs hover:text-red-700 hover:underline border border-transparent hover:border-red-200 rounded py-1 flex justify-center items-center gap-1">🗑️ Xóa đơn</button>`;
        actions += `</div>`;

        // Hiển thị giá (kèm giá điều chỉnh)
        let priceDisplay = `<div class="font-bold text-gray-800">${formatCurrency(o.final_price)}</div>`;
        if(o.adjustment_fee !== 0) {
            priceDisplay += `<div class="text-xs text-red-500 italic" title="${o.adjustment_reason}">(${o.adjustment_fee > 0 ? '+' : ''}${formatCurrency(o.adjustment_fee)})</div>`;
        }

        tr.innerHTML = `
            <td class="p-4 text-xs text-gray-500">${o.id.slice(0,6)}...<br>${formatDate(o.created_at)}</td>
            <td class="p-4 font-medium text-gray-800">${o.profiles?.full_name || 'No Name'}<br><span class="text-xs text-gray-500">${o.profiles?.email}</span></td>
            <td class="p-4">${details}</td>
            <td class="p-4">${priceDisplay}</td>
            <td class="p-4">${statusDict[o.status]}</td>
            <td class="p-4">${actions}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================================
// VÙNG 3: TÌM KIẾM & LỌC (SEARCH & FILTER)
// ============================================================
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

// ============================================================
// VÙNG 4: HÀNH ĐỘNG ĐƠN HÀNG (ACTIONS)
// ============================================================
async function updateStatus(orderId, newStatus) {
    await _supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    // Realtime sẽ tự động reload giao diện
}

async function deleteOrder(id) {
    if(!confirm("CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN đơn hàng này?\n(Hành động này không thể hoàn tác)")) return;
    
    const { error } = await _supabase.from('orders').delete().eq('id', id);
    if (error) {
        alert("Lỗi khi xóa: " + error.message);
    } else {
        // Cập nhật mảng local để UI phản hồi nhanh
        allOrders = allOrders.filter(o => o.id !== id);
        handleSearch(); 
    }
}

function smartCopy(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order || !order.boards_data) return;

    let text = "";
    order.boards_data.forEach(b => {
        text += `${b.subject}\n${b.content}\n\n`; 
    });

    navigator.clipboard.writeText(text).then(() => {
        alert("Đã sao chép nội dung vào bộ nhớ tạm!");
    });
}

// ============================================================
// VÙNG 5: CHỈNH GIÁ & THANH TOÁN (PRICING & PAYMENT)
// ============================================================
function openPriceModal(orderId, original, fee) {
    editingOrderId = orderId;
    originalPriceRef = original;
    
    document.getElementById('modal-org-price').innerText = formatCurrency(original);
    document.getElementById('modal-new-price').value = original + fee;
    document.getElementById('modal-reason').value = ""; 
    document.getElementById('modal-price').classList.remove('hidden');
}

async function confirmUpdatePrice() {
    const newPrice = parseInt(document.getElementById('modal-new-price').value);
    const reason = document.getElementById('modal-reason').value;
    const adjustment_fee = newPrice - originalPriceRef;

    await _supabase.from('orders').update({
        adjustment_fee: adjustment_fee,
        adjustment_reason: reason
    }).eq('id', editingOrderId);

    document.getElementById('modal-price').classList.add('hidden');
}

async function requestPayment(orderId, userId, amount) {
    if(!confirm(`Xác nhận yêu cầu khách thanh toán ${formatCurrency(amount)}?`)) return;

    // 1. Cập nhật trạng thái đơn
    await _supabase.from('orders').update({ status: 'payment_pending' }).eq('id', orderId);

    // 2. Tạo link QR Code (VietQR)
    const qrLink = `https://img.vietqr.io/image/MB-0000000000-compact.jpg?amount=${amount}&addInfo=Don Hang ${orderId.slice(0,5)}`;
    
    // 3. Gửi tin nhắn chứa QR vào hệ thống chat
    const { error } = await _supabase.from('messages').insert({
        sender_id: (await _supabase.auth.getUser()).data.user.id,
        content: `Đơn hàng đã sẵn sàng. Vui lòng thanh toán số tiền: ${formatCurrency(amount)}. Quét mã bên dưới:`,
        image_url: qrLink,
        is_admin: true 
    });

    if(error) console.error("Lỗi gửi tin nhắn:", error);
    else alert("Đã gửi yêu cầu thanh toán và mã QR thành công!");
}

// ============================================================
// VÙNG 6: QUẢN LÝ USER (USER MANAGEMENT)
// ============================================================
async function loadUsers() {
    const { data: users, error } = await _supabase.from('profiles').select('*').order('created_at');
    
    if(error) return console.error("Lỗi tải user:", error);

    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';

    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-gray-50";
        
        // Kiểm tra xem có phải là chính mình không
        const isMyAccount = u.email === document.getElementById('admin-name').innerText;
        let roleButton = '';
        
        // Logic hiển thị nút Đổi quyền
        if (u.role === 'customer') {
            roleButton = `<button onclick="changeRole('${u.id}', 'admin')" class="text-blue-500 border border-blue-500 px-2 py-1 rounded text-xs hover:bg-blue-50">🔼 Cấp quyền Admin</button>`;
        } else {
            roleButton = `<span class="text-green-600 font-bold text-xs">Admin</span>`;
            if(!isMyAccount) {
                roleButton += ` <button onclick="changeRole('${u.id}', 'customer')" class="text-gray-400 text-xs ml-2 hover:text-red-500 underline">🔽 Hạ quyền</button>`;
            }
        }

        // Nút xóa user
        const deleteBtn = `<button onclick="deleteUser('${u.id}')" class="text-red-500 hover:text-red-700 ml-4 font-bold text-sm">🗑️ Xóa</button>`;

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

async function changeRole(userId, newRole) {
    if (newRole === 'admin') {
        if(!confirm("CẢNH BÁO QUAN TRỌNG:\nBạn đang cấp quyền Quản Trị Viên (Admin) cho người này.\nHọ sẽ có quyền xem tất cả đơn hàng và xóa dữ liệu.\n\nBạn có chắc chắn muốn tiếp tục?")) return;
    }
    
    const { error } = await _supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if(error) alert("Lỗi: " + error.message);
    else loadUsers(); // Tải lại danh sách
}

async function deleteUser(userId) {
    // Bước 1: Kiểm tra xem user này có đang nợ đơn hàng không
    const { data: orders } = await _supabase.from('orders').select('id').eq('user_id', userId).eq('status', 'pending');
    
    if (orders && orders.length > 0) {
        return alert("KHÔNG THỂ XÓA: Người dùng này đang có đơn hàng chưa xử lý. Hãy hủy hoặc hoàn thành đơn hàng trước.");
    }

    if(!confirm("Xác nhận xóa VĨNH VIỄN người dùng này khỏi hệ thống?\n(Họ sẽ không thể đăng nhập được nữa)")) return;

    // Bước 2: Xóa profile
    const { error } = await _supabase.from('profiles').delete().eq('id', userId);
    
    if(error) alert("Lỗi khi xóa: " + error.message);
    else {
        alert("Đã xóa người dùng thành công.");
        loadUsers();
    }
}

// ============================================================
// VÙNG 7: CẤU HÌNH & REALTIME (SETTINGS & EVENTS)
// ============================================================
async function loadSettingsAdmin() {
    const { data } = await _supabase.from('settings').select('*').single();
    if(data) {
        document.getElementById('set-page-price').value = data.price_per_page;
        document.getElementById('set-board-price').value = data.price_per_board;
        document.getElementById('set-density').value = data.density_fee_percent;
    }
}

async function saveSettings() {
    const updates = {
        price_per_page: document.getElementById('set-page-price').value,
        price_per_board: document.getElementById('set-board-price').value,
        density_fee_percent: document.getElementById('set-density').value
    };
    
    // Lấy ID của dòng settings đầu tiên
    const { data } = await _supabase.from('settings').select('id').single();
    
    const { error } = await _supabase.from('settings').update(updates).eq('id', data.id);
    
    if(error) alert("Lỗi lưu cấu hình: " + error.message);
    else alert("Đã lưu cấu hình giá mới thành công!");
}

// Thiết lập lắng nghe sự kiện (Realtime)
function setupRealtime() {
    // Lắng nghe bảng Orders (Khi khách đặt đơn, Admin thấy ngay)
    _supabase.channel('admin-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
            console.log("Realtime Update:", payload);
            loadOrders(); 
        })
        .subscribe();
}
