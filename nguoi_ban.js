// --- KẾT NỐI ---
const SUPABASE_URL = 'DÁN_URL_CỦA_BẠN_VÀO_ĐÂY';
const SUPABASE_KEY = 'DÁN_KEY_CỦA_BẠN_VÀO_ĐÂY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let myId = null;

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) window.location.href = 'login.html';
    
    // Kiểm tra đúng quyền Seller không
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    if (profile.role !== 'seller') {
        alert('Sai quyền truy cập!'); window.location.href = 'login.html';
    }
    
    myId = session.user.id;
    document.getElementById('seller-email').innerText = session.user.email;
    loadMarket(); // Tải chợ đơn
}
checkAuth();

function show(id) {
    document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if(id === 'market') loadMarket(); // Tải lại khi bấm vào
}

// --- BƯỚC 1: CHỢ ĐƠN (Chỉ hiện đơn 'pending') ---
async function loadMarket() {
    const div = document.getElementById('market-list'); // Tạo div này trong HTML
    div.innerHTML = 'Đang tải chợ...';

    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending'); // Chỉ lấy đơn chưa ai nhận

    div.innerHTML = '';
    if(orders.length === 0) div.innerHTML = '<p>Không có đơn mới.</p>';

    orders.forEach(o => {
        div.innerHTML += `
            <div class="form-box">
                Đơn #${o.id} - ${o.shipping ? 'Cần Ship' : 'Không ship'}
                <button onclick="acceptOrder(${o.id})" style="background:blue; color:white; float:right;">NHẬN ĐƠN</button>
            </div>
        `;
    });
    
    loadMyProcess(); // Tải luôn danh sách đơn mình đang làm
}

// --- BƯỚC 2: NHẬN ĐƠN (TRANH CHẤP) ---
async function acceptOrder(orderId) {
    // Logic: Chỉ cập nhật nếu status vẫn đang là 'pending'
    // Điều này ngăn 2 người cùng nhận 1 đơn
    const { error } = await supabase
        .from('orders')
        .update({ status: 'processing', handler_id: myId })
        .eq('id', orderId)
        .eq('status', 'pending');

    if (error) alert("Lỗi hoặc đơn đã bị người khác nhận mất!");
    else {
        alert("Đã nhận đơn thành công!");
        loadMarket(); // Tải lại danh sách
    }
}

// --- BƯỚC 3: XỬ LÝ ĐƠN CỦA TÔI ---
async function loadMyProcess() {
    const div = document.getElementById('my-process-list'); // Tạo div này trong HTML
    const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('handler_id', myId)
        .neq('status', 'completed') // Không lấy đơn đã xong
        .neq('status', 'cancelled');

    div.innerHTML = '';
    orders.forEach(o => {
        // Biến form_data thành chuỗi để copy
        let contentToCopy = "";
        o.form_data.forEach((item, index) => {
            contentToCopy += `[Bảng ${index+1}] ${item.mon}: ${item.noi_dung}\n`;
        });

        div.innerHTML += `
            <div class="form-box" style="border:1px solid blue">
                <b>Đơn #${o.id} Đang xử lý</b>
                <br>
                <textarea rows="3" style="width:100%">${contentToCopy}</textarea>
                <button onclick="navigator.clipboard.writeText(\`${contentToCopy}\`)">Copy Nhanh</button>
                <hr>
                Giá tiền: <input type="number" id="price-${o.id}" value="${o.total_price}" placeholder="Nhập giá">
                Link ảnh: <input type="text" id="img-${o.id}" placeholder="Link ảnh mã">
                <button onclick="completeOrder(${o.id})" style="background:green; color:white;">Gửi Mã & Xong</button>
                <button onclick="cancelOrder(${o.id})" style="color:red;">Hủy Đơn</button>
            </div>
        `;
    });
}

// --- BƯỚC 4: HOÀN THÀNH ĐƠN ---
async function completeOrder(orderId) {
    const price = document.getElementById(`price-${orderId}`).value;
    const img = document.getElementById(`img-${orderId}`).value;

    if(!img) return alert("Phải nhập link ảnh/mã!");

    const { error } = await supabase
        .from('orders')
        .update({ 
            status: 'completed', 
            total_price: price, 
            result_image: img 
        })
        .eq('id', orderId);

    if(!error) {
        alert("Đã hoàn thành đơn!");
        loadMarket(); // Làm mới
    }
}

async function cancelOrder(orderId) {
    if(!confirm("Bạn chắc chắn hủy?")) return;
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    loadMarket();
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}
