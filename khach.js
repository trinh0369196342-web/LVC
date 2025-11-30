// --- BƯỚC 1: KẾT NỐI SUPABASE ---
const SUPABASE_URL = 'DÁN_URL_CỦA_BẠN_VÀO_ĐÂY';
const SUPABASE_KEY = 'DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let myId = null; // Lưu ID của chính mình

// --- BƯỚC 2: KIỂM TRA ĐĂNG NHẬP ---
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) window.location.href = 'login.html';
    
    myId = session.user.id;
    document.getElementById('user-email').innerText = session.user.email;
    loadMyOrders(); // Tải danh sách đơn hàng ngay khi vào
}
checkAuth();

// --- BƯỚC 3: XỬ LÝ GIAO DIỆN (TAB) ---
function show(id) {
    document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// Hàm vẽ form nhập liệu (1-10 bảng)
function renderForms() {
    const qty = document.getElementById('qty').value;
    const area = document.getElementById('forms-area');
    area.innerHTML = ''; // Xóa cũ
    
    for(let i=1; i<=qty; i++) {
        area.innerHTML += `
            <div class="form-box" id="box-${i}">
                <b>Bảng ${i}</b><br>
                Môn: <input type="text" class="inp-subj" placeholder="VD: Văn"><br>
                Nội dung: <textarea class="inp-cont" rows="3" style="width:100%"></textarea>
            </div>`;
    }
}

// --- BƯỚC 4: TẠO ĐƠN HÀNG (QUAN TRỌNG) ---
async function createOrder() {
    const qty = document.getElementById('qty').value;
    if(qty == 0) return alert("Chưa chọn số lượng bảng!");

    // 1. Gom dữ liệu từ các ô nhập vào thành 1 mảng (JSON)
    let formsData = [];
    for(let i=1; i<=qty; i++) {
        const box = document.getElementById(`box-${i}`);
        const subj = box.querySelector('.inp-subj').value;
        const cont = box.querySelector('.inp-cont').value;
        
        if(!subj || !cont) return alert(`Bảng số ${i} chưa nhập đủ!`);
        formsData.push({ mon: subj, noi_dung: cont });
    }

    // 2. Kiểm tra ship
    const isShip = document.getElementById('chk-ship').checked;

    // 3. Gửi lên Supabase
    const { error } = await supabase.from('orders').insert({
        customer_id: myId,
        form_data: formsData, // Lưu mảng JSON vào cột jsonb
        shipping: isShip,
        status: 'pending' // Mặc định là chờ
    });

    if(error) alert("Lỗi: " + error.message);
    else {
        alert("Tạo đơn thành công!");
        show('orders'); // Chuyển sang tab đơn hàng
        loadMyOrders(); // Tải lại danh sách
    }
}

// --- BƯỚC 5: TẢI DANH SÁCH ĐƠN ---
async function loadMyOrders() {
    const list = document.getElementById('list-orders');
    list.innerHTML = 'Đang tải...';

    // Lấy tất cả đơn của tôi, sắp xếp mới nhất lên đầu
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', myId)
        .order('created_at', { ascending: false });

    list.innerHTML = '';
    orders.forEach(order => {
        // Màu trạng thái
        let color = 'orange'; // pending
        if(order.status === 'processing') color = 'blue';
        if(order.status === 'completed') color = 'green';
        if(order.status === 'cancelled') color = 'red';

        // Nếu đã xong thì hiện nút xem ảnh
        let actionBtn = '';
        if(order.status === 'completed' && order.result_image) {
            actionBtn = `<a href="${order.result_image}" target="_blank" style="color:green; font-weight:bold;">[XEM ẢNH MÃ]</a>`;
        }

        list.innerHTML += `
            <div class="form-box" style="border-left: 5px solid ${color}">
                <b>Đơn #${order.id}</b> - Trạng thái: <span style="color:${color}">${order.status}</span>
                <br>Ship: ${order.shipping ? 'Có' : 'Không'} | Giá: ${order.total_price}đ
                <br>${actionBtn}
            </div>
        `;
    });
}

// --- BƯỚC 6: CHAT (Đơn giản) ---
async function sendChat() {
    const msg = document.getElementById('chat-input').value;
    const role = document.getElementById('chat-role').value; // Nhắn cho seller hay admin
    
    // Ở bản đơn giản này, ta chỉ lưu tin nhắn vào bảng messages
    // Để định danh người nhận, ta có thể quy ước admin có id cố định hoặc chat theo đơn hàng.
    // Tạm thời chỉ lưu log tin nhắn.
    await supabase.from('messages').insert({
        sender_id: myId,
        content: `(Gửi ${role}): ${msg}`
    });
    
    alert("Đã gửi tin nhắn hỗ trợ!");
    document.getElementById('chat-input').value = '';
}

// Đăng xuất
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}
