// ==================== SUPABASE CONFIGURATION ====================
// THAY THẾ BẰNG THÔNG TIN SUPABASE CỦA BẠN
const SUPABASE_URL = 'https://sxxtqxvkixmfmnplosfz.supabase.co'; // Thay thế
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4eHRxeHZraXhtZm1ucGxvc2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODY0MTcsImV4cCI6MjA4MDI2MjQxN30.Ta6T58MZIATM7BPpa5nBfCfuZPldlZMMeZDi6qyG324';

// Khởi tạo Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let currentRole = null;
let currentFile = null;

// ==================== AUTHENTICATION FUNCTIONS ====================
// Xử lý đăng nhập
async function handleLogin(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showErrorAlert('loginAlert', 'Vui lòng nhập đầy đủ email và mật khẩu');
        return;
    }
    
    startLoading('loginBtn', 'loginSpinner');
    
    try {
        // 1. Đăng nhập với Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (authError) throw authError;
        
        // 2. Lấy thông tin role từ database
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', authData.user.id)
            .single();
        
        if (userError) throw userError;
        
        // 3. Chuyển hướng đến trang tương ứng với role
        window.location.href = `${userData.role}.html`;
        
    } catch (error) {
        console.error('Login error:', error);
        showErrorAlert('loginAlert', 'Đăng nhập thất bại: ' + error.message);
        stopLoading('loginBtn', 'loginSpinner');
    }
}

// Xử lý đăng ký
async function handleRegister(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const role = document.querySelector('input[name="registerRole"]:checked').value;
    
    // Kiểm tra dữ liệu đầu vào
    if (!email || !password || !confirmPassword) {
        showErrorAlert('registerAlert', 'Vui lòng nhập đầy đủ thông tin');
        return;
    }
    
    if (password.length < 6) {
        showErrorAlert('registerAlert', 'Mật khẩu phải có ít nhất 6 ký tự');
        return;
    }
    
    if (password !== confirmPassword) {
        showErrorAlert('registerAlert', 'Mật khẩu xác nhận không khớp');
        return;
    }
    
    startLoading('registerBtn', 'registerSpinner');
    
    try {
        // 1. Đăng ký với Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: role
                }
            }
        });
        
        if (authError) throw authError;
        
        // 2. Cập nhật role trong bảng users (trigger sẽ tự động tạo user, nhưng cần update role)
        if (authData.user) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ role: role })
                .eq('id', authData.user.id);
            
            if (updateError) {
                console.warn('Could not update user role:', updateError);
                // Không throw error ở đây vì user đã được tạo
            }
        }
        
        // 3. Hiển thị thông báo thành công
        showSuccessAlert('registerAlert', 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.');
        
        // 4. Reset form
        document.getElementById('registerForm').reset();
        
        // 5. Chuyển sang tab đăng nhập sau 3 giây
        setTimeout(() => {
            switchTab('login');
            document.getElementById('loginEmail').value = email;
            hideAlert('registerAlert');
        }, 3000);
        
    } catch (error) {
        console.error('Register error:', error);
        showErrorAlert('registerAlert', 'Đăng ký thất bại: ' + error.message);
    } finally {
        stopLoading('registerBtn', 'registerSpinner');
    }
}

// Kiểm tra đăng nhập và chuyển hướng
async function checkAuthAndRedirect() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // Lấy role từ database
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (userData) {
            // Nếu đang ở trang index.html, chuyển hướng đến trang của role
            if (window.location.pathname.includes('index.html') || 
                window.location.pathname === '/') {
                window.location.href = `${userData.role}.html`;
            }
        }
    }
}

// Đăng xuất
async function logout() {
    try {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Lỗi khi đăng xuất: ' + error.message);
    }
}

// ==================== AUTH EVENT LISTENERS ====================
// Chỉ thêm event listeners nếu đang ở trang auth
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    document.addEventListener('DOMContentLoaded', function() {
        // Gắn event listeners cho forms
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }
        
        // Kiểm tra nếu đã đăng nhập thì chuyển hướng
        checkAuthAndRedirect();
    });
}

// ==================== MAIN APPLICATION FUNCTIONS ====================
// Khởi tạo trang chính
async function initializePage() {
    // Kiểm tra authentication
    const auth = await checkAuth();
    if (!auth) return;
    
    // Xác minh role khớp với trang
    await verifyRoleAccess();
    
    // Khởi tạo các thành phần chung
    await initializeCommonComponents();
    
    // Khởi tạo các thành phần theo role
    switch(currentRole) {
        case 'customer':
            await initializeCustomer();
            break;
        case 'seller':
        case 'admin':
            await initializeSellerAdmin();
            break;
    }
    
    // Thiết lập realtime subscriptions
    setupRealtimeSubscriptions();
    
    // Thiết lập event listeners
    setupEventListeners();
}

// Kiểm tra authentication
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'index.html';
        return null;
    }
    
    currentUser = user;
    
    // Lấy thông tin role từ database
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, username, address, phone, email')
        .eq('id', user.id)
        .single();
    
    if (userError) {
        console.error('Error fetching user data:', userError);
        window.location.href = 'index.html';
        return null;
    }
    
    currentRole = userData.role;
    return { user, role: currentRole, userData };
}

// Xác minh quyền truy cập theo role
async function verifyRoleAccess() {
    const currentPage = window.location.pathname.split('/').pop();
    const pageRole = currentPage.split('.')[0]; // customer.html -> customer
    
    if (currentRole !== pageRole) {
        alert(`Truy cập bị từ chối. Bạn đang đăng nhập với vai trò ${currentRole}.`);
        window.location.href = `${currentRole}.html`;
        return false;
    }
    return true;
}

// Khởi tạo các thành phần chung
async function initializeCommonComponents() {
    await fetchAccount();
    await displayOrders();
    await displayChat();
    
    // Áp dụng dark mode nếu đã bật
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
}

// Thiết lập các event listeners chung
function setupEventListeners() {
    // Form thông tin tài khoản
    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', editAccount);
    }
    
    // Nút đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Nút gửi tin nhắn
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    
    // Upload file chat
    const fileUpload = document.getElementById('fileUpload');
    if (fileUpload) {
        fileUpload.addEventListener('change', handleFileUpload);
    }
}

// ==================== ACCOUNT MANAGEMENT ====================
// Lấy thông tin tài khoản
async function fetchAccount() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('username, address, phone, email')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        // Điền thông tin vào form
        const form = document.getElementById('accountForm');
        if (form) {
            form.username.value = data.username || '';
            form.address.value = data.address || '';
            form.phone.value = data.phone || '';
            form.email.value = data.email || '';
        }
        
        // Hiển thị thông tin user
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <p><strong>Tên:</strong> ${data.username || 'Chưa cập nhật'}</p>
                <p><strong>Địa chỉ:</strong> ${data.address || 'Chưa cập nhật'}</p>
                <p><strong>SĐT:</strong> ${data.phone || 'Chưa cập nhật'}</p>
                <p><strong>Vai trò:</strong> ${currentRole}</p>
            `;
        }
        
        // Hiển thị username trong navbar
        const usernameDisplay = document.getElementById('usernameDisplay');
        if (usernameDisplay) {
            usernameDisplay.textContent = data.username || data.email;
        }
    } catch (error) {
        console.error('Error fetching account:', error);
        alert('Lỗi khi tải thông tin tài khoản');
    }
}

// Chỉnh sửa thông tin tài khoản
async function editAccount(event) {
    event.preventDefault();
    
    const form = event.target;
    const username = form.username.value;
    const address = form.address.value;
    const phone = form.phone.value;
    
    try {
        const { error } = await supabase
            .from('users')
            .update({ username, address, phone })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        alert('Cập nhật thông tin thành công!');
        await fetchAccount();
    } catch (error) {
        console.error('Error updating account:', error);
        alert('Lỗi khi cập nhật thông tin: ' + error.message);
    }
}

// ==================== CUSTOMER FUNCTIONS ====================
// Khởi tạo chức năng cho customer
async function initializeCustomer() {
    // Form chọn số bảng
    const numTablesSelect = document.getElementById('numTables');
    if (numTablesSelect) {
        numTablesSelect.addEventListener('change', renderTableForms);
        renderTableForms(); // Render lần đầu
    }
    
    // Tính giá realtime
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('input', updateTempAmount);
    }
    
    // Nút tạo đơn hàng
    const createOrderBtn = document.getElementById('createOrderBtn');
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', createOrder);
    }
}

// Render dynamic forms cho từng bảng
function renderTableForms() {
    const numTables = parseInt(document.getElementById('numTables').value) || 1;
    const tableFormsContainer = document.getElementById('tableForms');
    if (!tableFormsContainer) return;
    
    tableFormsContainer.innerHTML = '';
    
    for (let i = 1; i <= numTables; i++) {
        const tableDiv = document.createElement('div');
        tableDiv.className = 'table-form mb-4 p-3 border rounded';
        tableDiv.innerHTML = `
            <h5>Bảng ${i}</h5>
            <div class="mb-3">
                <label class="form-label">Nội dung</label>
                <textarea id="noidung_${i}" class="form-control" rows="2" 
                          placeholder="Nhập nội dung bảng ${i}"></textarea>
            </div>
            <div class="mb-3">
                <label class="form-label">Nội dung cần in (tự luận)</label>
                <textarea id="in_tu_luan_${i}" class="form-control" rows="4" 
                          placeholder="Nhập nội dung tự luận cho bảng ${i}"></textarea>
            </div>
        `;
        tableFormsContainer.appendChild(tableDiv);
    }
    
    updateTempAmount();
}

// Cập nhật giá tạm tính
function updateTempAmount() {
    const numTables = parseInt(document.getElementById('numTables').value) || 0;
    const pricePerTable = 10000;
    const totalAmount = numTables * pricePerTable;
    
    const tempAmountElement = document.getElementById('tempAmount');
    if (tempAmountElement) {
        tempAmountElement.textContent = totalAmount.toLocaleString('vi-VN') + ' VND';
    }
}

// Validate nội dung (không cho phép trắc nghiệm)
function validateContent(content) {
    const multipleChoiceRegex = /A\.|B\.|C\.|D\./i;
    return !multipleChoiceRegex.test(content);
}

// Tạo đơn hàng mới
async function createOrder() {
    const numTables = parseInt(document.getElementById('numTables').value);
    
    if (!numTables || numTables < 1 || numTables > 8) {
        alert('Vui lòng chọn số bảng từ 1-8');
        return;
    }
    
    // Xây dựng JSON content
    const content = [];
    let isValid = true;
    
    for (let i = 1; i <= numTables; i++) {
        const noidung = document.getElementById(`noidung_${i}`)?.value || '';
        const inTuLuan = document.getElementById(`in_tu_luan_${i}`)?.value || '';
        
        // Validate nội dung
        if (!validateContent(noidung) || !validateContent(inTuLuan)) {
            alert(`Nội dung bảng ${i} không được chứa câu trắc nghiệm (A., B., C., D.)`);
            isValid = false;
            break;
        }
        
        if (!noidung.trim() || !inTuLuan.trim()) {
            alert(`Vui lòng điền đầy đủ nội dung bảng ${i}`);
            isValid = false;
            break;
        }
        
        content.push({
            table: i,
            noidung: noidung,
            in_tu_luan: inTuLuan
        });
    }
    
    if (!isValid) return;
    
    const amount = numTables * 10000;
    
    try {
        const { data, error } = await supabase
            .from('orders')
            .insert([{
                user_id: currentUser.id,
                content: content,
                num_tables: numTables,
                amount: amount,
                status: 'pending'
            }])
            .select();
        
        if (error) throw error;
        
        alert('Tạo đơn hàng thành công!');
        
        // Reset form
        document.getElementById('numTables').value = '1';
        document.getElementById('tableForms').innerHTML = '';
        updateTempAmount();
        
        // Refresh danh sách đơn hàng
        await displayOrders();
    } catch (error) {
        console.error('Error creating order:', error);
        alert('Lỗi khi tạo đơn hàng: ' + error.message);
    }
}

// Hủy đơn hàng (customer)
async function cancelOrder(orderId) {
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ cancelled: true })
            .eq('id', orderId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        alert('Đã hủy đơn hàng thành công!');
        await displayOrders();
    } catch (error) {
        console.error('Error cancelling order:', error);
        alert('Lỗi khi hủy đơn hàng: ' + error.message);
    }
}

// Làm lại đơn hàng
async function redoOrder(orderId) {
    try {
        // Lấy thông tin đơn hàng
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('user_id', currentUser.id)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Hủy đơn hàng cũ
        const { error: cancelError } = await supabase
            .from('orders')
            .update({ cancelled: true })
            .eq('id', orderId);
        
        if (cancelError) throw cancelError;
        
        // Điền thông tin vào form
        document.getElementById('numTables').value = order.num_tables;
        renderTableForms();
        
        // Điền nội dung
        order.content.forEach((tableContent, index) => {
            const i = index + 1;
            const noidungElement = document.getElementById(`noidung_${i}`);
            const inTuLuanElement = document.getElementById(`in_tu_luan_${i}`);
            
            if (noidungElement) noidungElement.value = tableContent.noidung || '';
            if (inTuLuanElement) inTuLuanElement.value = tableContent.in_tu_luan || '';
        });
        
        updateTempAmount();
        
        alert('Đã chuyển đơn hàng sang form chỉnh sửa!');
        await displayOrders();
        
        // Cuộn đến form đặt hàng
        document.getElementById('orderFormSection').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error redoing order:', error);
        alert('Lỗi khi xử lý đơn hàng: ' + error.message);
    }
}

// ==================== SELLER/ADMIN FUNCTIONS ====================
// Khởi tạo chức năng cho seller/admin
async function initializeSellerAdmin() {
    // Render biểu đồ
    await renderCharts();
    
    // Nút broadcast cho admin
    const broadcastBtn = document.getElementById('broadcastBtn');
    if (broadcastBtn && currentRole === 'admin') {
        broadcastBtn.addEventListener('click', sendBroadcast);
    }
}

// Sao chép đơn hàng
async function copyOrder(orderId) {
    try {
        // Lấy đơn hàng gốc
        const { data: originalOrder, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Tạo đơn hàng mới với nội dung đã sao chép
        const { data, error } = await supabase
            .from('orders')
            .insert([{
                user_id: originalOrder.user_id,
                content: originalOrder.content,
                num_tables: originalOrder.num_tables,
                amount: originalOrder.amount,
                status: 'pending',
                notes: `Copy từ đơn hàng ${orderId.substring(0, 8)}`
            }])
            .select();
        
        if (error) throw error;
        
        alert('Đã sao chép đơn hàng thành công!');
        await displayOrders();
    } catch (error) {
        console.error('Error copying order:', error);
        alert('Lỗi khi sao chép đơn hàng: ' + error.message);
    }
}

// Sao chép đơn hàng (admin - partial copy)
async function copyOrderPartial(orderId) {
    try {
        // Lấy đơn hàng gốc
        const { data: originalOrder, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Tạo bản sao partial (chỉ bảng đầu tiên)
        const partialContent = originalOrder.content.slice(0, 1);
        const partialTables = 1;
        const partialAmount = 10000;
        
        // Lấy seller ngẫu nhiên để gán
        const { data: sellers } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'seller')
            .limit(1);
        
        const sellerId = sellers && sellers[0] ? sellers[0].id : originalOrder.user_id;
        
        const { data, error } = await supabase
            .from('orders')
            .insert([{
                user_id: sellerId,
                content: partialContent,
                num_tables: partialTables,
                amount: partialAmount,
                status: 'pending',
                notes: `Partial copy for audit from ${orderId.substring(0, 8)}`
            }])
            .select();
        
        if (error) throw error;
        
        alert('Đã sao chép đơn hàng (partial) cho audit!');
        await displayOrders();
    } catch (error) {
        console.error('Error copying order:', error);
        alert('Lỗi khi sao chép đơn hàng: ' + error.message);
    }
}

// Hủy đơn hàng (seller/admin)
async function cancelOrderSellerAdmin(orderId) {
    const isAdmin = currentRole === 'admin';
    let reason = '';
    
    if (isAdmin) {
        reason = prompt('Nhập lý do hủy đơn (sẽ được lưu vào ghi chú):');
        if (reason === null) return;
    } else {
        if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    }
    
    try {
        const updateData = { 
            cancelled: true,
            notes: isAdmin ? 
                `[ADMIN HỦY] ${reason}. ${new Date().toLocaleString('vi-VN')}` :
                'Đã hủy bởi seller'
        };
        
        const { error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId);
        
        if (error) throw error;
        
        alert('Đã hủy đơn hàng thành công!');
        await displayOrders();
    } catch (error) {
        console.error('Error cancelling order:', error);
        alert('Lỗi khi hủy đơn hàng: ' + error.message);
    }
}

// Yêu cầu thanh toán
async function requestPayment(orderId) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'payment_requested' })
            .eq('id', orderId);
        
        if (error) throw error;
        
        alert('Đã gửi yêu cầu thanh toán!');
        await displayOrders();
    } catch (error) {
        console.error('Error requesting payment:', error);
        alert('Lỗi khi yêu cầu thanh toán: ' + error.message);
    }
}

// Đánh dấu đã nhận
async function markReceived(orderId) {
    try {
        const notesInput = document.getElementById(`notes_${orderId}`);
        const notes = notesInput?.value || '';
        
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'received',
                notes: notes
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        alert('Đã đánh dấu đơn hàng đã nhận!');
        await displayOrders();
    } catch (error) {
        console.error('Error marking received:', error);
        alert('Lỗi khi cập nhật trạng thái: ' + error.message);
    }
}

// Đánh dấu hoàn thành
async function markCompleted(orderId) {
    try {
        const notesInput = document.getElementById(`notes_${orderId}`);
        const notes = notesInput?.value || '';
        
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'completed',
                notes: notes
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        alert('Đã đánh dấu đơn hàng hoàn thành!');
        await displayOrders();
    } catch (error) {
        console.error('Error marking completed:', error);
        alert('Lỗi khi cập nhật trạng thái: ' + error.message);
    }
}

// Thêm ghi chú
async function addNotes(orderId) {
    const notesInput = document.getElementById(`notes_${orderId}`);
    if (!notesInput) return;
    
    const notes = notesInput.value || '';
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ notes })
            .eq('id', orderId);
        
        if (error) throw error;
        
        // Hiển thị feedback thành công
        const originalText = notesInput.placeholder;
        notesInput.placeholder = 'Đã lưu!';
        setTimeout(() => {
            notesInput.placeholder = originalText;
        }, 2000);
    } catch (error) {
        console.error('Error adding notes:', error);
        alert('Lỗi khi lưu ghi chú: ' + error.message);
    }
}

// ==================== CHAT FUNCTIONS ====================
// Hiển thị chat
async function displayChat() {
    try {
        let messagesQuery = supabase
            .from('messages')
            .select(`
                *,
                sender:users!sender_id(username, role),
                receiver:users!receiver_id(username, role)
            `)
            .order('created_at', { ascending: true });
        
        // Query khác nhau theo role
        if (currentRole === 'admin') {
            // Admin xem tất cả tin nhắn (giới hạn 100 tin gần nhất)
            messagesQuery = messagesQuery.limit(100);
        } else {
            // Các role khác chỉ xem tin nhắn của mình
            messagesQuery = messagesQuery.or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);
        }
        
        const { data: messages, error } = await messagesQuery;
        
        if (error) throw error;
        
        const chatContainer = document.getElementById('chatMessages');
        if (!chatContainer) return;
        
        // Lấy danh sách user cho select receiver
        const { data: users } = await supabase
            .from('users')
            .select('id, username, role, email')
            .neq('id', currentUser.id)
            .order('role', { ascending: true });
        
        // Cập nhật select receiver
        const receiverSelect = document.getElementById('receiverSelect');
        if (receiverSelect && users) {
            receiverSelect.innerHTML = '<option value="">Chọn người nhận</option>';
            users.forEach(user => {
                const displayName = user.username || user.email.split('@')[0];
                receiverSelect.innerHTML += `
                    <option value="${user.id}">
                        ${displayName} (${user.role})
                    </option>
                `;
            });
        }
        
        if (!messages || messages.length === 0) {
            chatContainer.innerHTML = '<p class="text-muted text-center">Chưa có tin nhắn nào.</p>';
            return;
        }
        
        let chatHTML = '';
        messages.forEach(message => {
            const isSender = message.sender_id === currentUser.id;
            const time = new Date(message.created_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Hiển thị khác nhau cho admin
            if (currentRole === 'admin') {
                const senderName = message.sender?.username || message.sender_id.substring(0, 8);
                const receiverName = message.receiver?.username || message.receiver_id.substring(0, 8);
                
                chatHTML += `
                    <div class="chat-message mb-3">
                        <div class="small text-muted">
                            <span class="badge bg-info">${message.sender?.role}</span>
                            ${senderName} → 
                            <span class="badge bg-secondary">${message.receiver?.role}</span>
                            ${receiverName}
                            <span class="ms-2">${time}</span>
                        </div>
                        <div class="p-2 rounded bg-light">
                            ${message.content || ''}
                            ${message.file_url ? `
                                <div class="mt-1">
                                    <a href="${message.file_url}" target="_blank" class="text-primary">
                                        <i class="bi bi-paperclip"></i> Tệp đính kèm
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            } else {
                chatHTML += `
                    <div class="chat-message ${isSender ? 'text-end' : 'text-start'} mb-3">
                        <div class="d-inline-block" style="max-width: 80%;">
                            <div class="small text-muted">
                                ${isSender ? 'Bạn' : message.sender?.username} → 
                                ${isSender ? message.receiver?.username : 'Bạn'}
                                <span class="ms-2">${time}</span>
                            </div>
                            <div class="p-3 rounded ${isSender ? 'bg-primary text-white' : 'bg-light'}">
                                ${message.content || ''}
                                ${message.file_url ? `
                                    <div class="mt-2">
                                        <a href="${message.file_url}" target="_blank" 
                                           class="${isSender ? 'text-white' : 'text-primary'}">
                                            <i class="bi bi-paperclip"></i> Tệp đính kèm
                                        </a>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        chatContainer.innerHTML = chatHTML;
        
        // Tự động cuộn xuống dưới
        chatContainer.scrollTop = chatContainer.scrollHeight;
    } catch (error) {
        console.error('Error fetching chat:', error);
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer) {
            chatContainer.innerHTML = '<p class="text-danger">Lỗi khi tải tin nhắn</p>';
        }
    }
}

// Gửi tin nhắn
async function sendMessage() {
    const receiverSelect = document.getElementById('receiverSelect');
    const messageInput = document.getElementById('messageInput');
    
    if (!receiverSelect || !messageInput) return;
    
    const receiverId = receiverSelect.value;
    const content = messageInput.value.trim();
    
    if (!receiverId) {
        alert('Vui lòng chọn người nhận');
        return;
    }
    
    if (!content && !currentFile) {
        alert('Vui lòng nhập nội dung hoặc chọn file');
        return;
    }
    
    try {
        const messageData = {
            sender_id: currentUser.id,
            receiver_id: receiverId,
            content: content
        };
        
        // Upload file nếu có
        if (currentFile) {
            const fileUrl = await uploadFile(currentFile);
            if (fileUrl) {
                messageData.file_url = fileUrl;
            }
        }
        
        const { error } = await supabase
            .from('messages')
            .insert([messageData]);
        
        if (error) throw error;
        
        // Clear inputs
        messageInput.value = '';
        clearFileUpload();
        
        // Refresh chat
        await displayChat();
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Lỗi khi gửi tin nhắn: ' + error.message);
    }
}

// Gửi broadcast (admin only)
async function sendBroadcast() {
    const messageInput = document.getElementById('broadcastMessage');
    if (!messageInput) return;
    
    const content = messageInput.value.trim();
    
    if (!content) {
        alert('Vui lòng nhập nội dung broadcast');
        return;
    }
    
    if (!confirm('Gửi tin nhắn đến tất cả người dùng?')) return;
    
    try {
        // Lấy tất cả user trừ admin hiện tại
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id')
            .neq('id', currentUser.id);
        
        if (usersError) throw usersError;
        
        if (!users || users.length === 0) {
            alert('Không có người dùng nào để gửi broadcast');
            return;
        }
        
        // Tạo tin nhắn cho tất cả user
        const messages = users.map(user => ({
            sender_id: currentUser.id,
            receiver_id: user.id,
            content: `📢 BROADCAST từ Admin: ${content}`,
            created_at: new Date().toISOString()
        }));
        
        // Insert tất cả tin nhắn
        const { error } = await supabase
            .from('messages')
            .insert(messages);
        
        if (error) throw error;
        
        alert(`Đã gửi broadcast đến ${users.length} người dùng!`);
        messageInput.value = '';
        
        // Refresh chat
        await displayChat();
    } catch (error) {
        console.error('Error sending broadcast:', error);
        alert('Lỗi khi gửi broadcast: ' + error.message);
    }
}

// Xử lý upload file
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Kiểm tra kích thước file (tối đa 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File không được lớn hơn 5MB');
        event.target.value = '';
        return;
    }
    
    currentFile = file;
    
    // Hiển thị tên file
    const fileNameElement = document.getElementById('fileName');
    if (fileNameElement) {
        fileNameElement.textContent = file.name;
    }
}

// Upload file lên Supabase Storage
async function uploadFile(file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `chat-files/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('messages')
            .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Lấy public URL
        const { data: { publicUrl } } = supabase.storage
            .from('messages')
            .getPublicUrl(filePath);
        
        return publicUrl;
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Lỗi khi upload file: ' + error.message);
        return null;
    }
}

// Clear file upload
function clearFileUpload() {
    currentFile = null;
    const fileUpload = document.getElementById('fileUpload');
    if (fileUpload) {
        fileUpload.value = '';
    }
    const fileNameElement = document.getElementById('fileName');
    if (fileNameElement) {
        fileNameElement.textContent = '';
    }
}

// ==================== ORDERS DISPLAY ====================
// Hiển thị đơn hàng
async function displayOrders() {
    try {
        let ordersQuery = supabase
            .from('orders')
            .select(`
                *,
                user:users(username, email, phone, role)
            `)
            .order('created_at', { ascending: false });
        
        // Query khác nhau theo role
        if (currentRole === 'customer') {
            ordersQuery = ordersQuery.eq('user_id', currentUser.id);
        }
        
        const { data: orders, error } = await ordersQuery;
        
        if (error) throw error;
        
        const ordersContainer = document.getElementById('ordersList');
        if (!ordersContainer) return;
        
        // Cập nhật tổng số đơn hàng cho seller/admin
        if (currentRole !== 'customer') {
            const totalOrdersElement = document.getElementById('totalOrders');
            if (totalOrdersElement) {
                totalOrdersElement.textContent = orders?.length || 0;
            }
        }
        
        if (!orders || orders.length === 0) {
            ordersContainer.innerHTML = '<p class="text-muted">Chưa có đơn hàng nào.</p>';
            return;
        }
        
        let ordersHTML = '';
        orders.forEach(order => {
            const createdDate = new Date(order.created_at).toLocaleDateString('vi-VN');
            const amountFormatted = order.amount ? order.amount.toLocaleString('vi-VN') + ' VND' : 'Chưa tính';
            const statusClass = order.cancelled ? 'bg-danger' : 
                               order.status === 'completed' ? 'bg-success' :
                               order.status === 'received' ? 'bg-primary' :
                               order.status === 'payment_requested' ? 'bg-warning' :
                               'bg-secondary';
            
            const statusText = order.cancelled ? 'Đã hủy' : 
                              order.status === 'pending' ? 'Chờ xử lý' :
                              order.status === 'payment_requested' ? 'Chờ thanh toán' :
                              order.status === 'received' ? 'Đã nhận' :
                              order.status === 'completed' ? 'Hoàn thành' : order.status;
            
            // Hiển thị cho customer
            if (currentRole === 'customer') {
                ordersHTML += `
                    <div class="order-item card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="card-title">Đơn hàng #${order.id.substring(0, 8)}</h5>
                                    <p class="card-text">
                                        <strong>Số bảng:</strong> ${order.num_tables}<br>
                                        <strong>Giá:</strong> ${amountFormatted}<br>
                                        <strong>Ngày tạo:</strong> ${createdDate}<br>
                                        <strong>Trạng thái:</strong> 
                                        <span class="badge ${statusClass}">
                                            ${statusText}
                                        </span>
                                    </p>
                                </div>
                                <div class="btn-group">
                                    ${!order.cancelled && order.status !== 'completed' ? `
                                        <button class="btn btn-sm btn-danger" onclick="cancelOrder('${order.id}')">
                                            Hủy đơn
                                        </button>
                                        <button class="btn btn-sm btn-secondary" onclick="redoOrder('${order.id}')">
                                            Làm lại
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            ${order.notes ? `<p class="mt-2"><strong>Ghi chú:</strong> ${order.notes}</p>` : ''}
                        </div>
                    </div>
                `;
            } 
            // Hiển thị cho seller/admin
            else {
                const copyFunction = currentRole === 'admin' ? 'copyOrderPartial' : 'copyOrder';
                const cancelFunction = 'cancelOrderSellerAdmin';
                
                ordersHTML += `
                    <div class="order-item card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="card-title">Đơn hàng #${order.id.substring(0, 8)}</h5>
                                    <p class="card-text">
                                        <strong>Khách hàng:</strong> ${order.user?.username || order.user?.email || 'N/A'}<br>
                                        <strong>Số bảng:</strong> ${order.num_tables}<br>
                                        <strong>Giá:</strong> ${amountFormatted}<br>
                                        <strong>Ngày tạo:</strong> ${createdDate}<br>
                                        <strong>Trạng thái:</strong> 
                                        <span class="badge ${statusClass}">
                                            ${statusText}
                                        </span>
                                    </p>
                                </div>
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-info" onclick="${copyFunction}('${order.id}')">
                                        <i class="bi bi-copy"></i> Copy
                                    </button>
                                    ${!order.cancelled ? `
                                        <button class="btn btn-sm btn-danger" onclick="${cancelFunction}('${order.id}')">
                                            <i class="bi bi-x-circle"></i> Hủy
                                        </button>
                                        ${order.status === 'pending' ? `
                                            <button class="btn btn-sm btn-warning" onclick="requestPayment('${order.id}')">
                                                <i class="bi bi-cash-coin"></i> Yêu cầu TT
                                            </button>
                                            <button class="btn btn-sm btn-primary" onclick="markReceived('${order.id}')">
                                                <i class="bi bi-check-circle"></i> Đã nhận
                                            </button>
                                        ` : order.status === 'received' ? `
                                            <button class="btn btn-sm btn-success" onclick="markCompleted('${order.id}')">
                                                <i class="bi bi-check2-circle"></i> Hoàn thành
                                            </button>
                                        ` : ''}
                                    ` : ''}
                                </div>
                            </div>
                            
                            <div class="mt-3">
                                <div class="input-group">
                                    <input type="text" 
                                           id="notes_${order.id}" 
                                           class="form-control" 
                                           placeholder="Thêm ghi chú nội bộ..."
                                           value="${order.notes || ''}">
                                    <button class="btn btn-outline-secondary" 
                                            onclick="addNotes('${order.id}')">
                                        <i class="bi bi-save"></i> Lưu
                                    </button>
                                </div>
                            </div>
                            
                            ${order.content ? `
                                <div class="mt-3">
                                    <button class="btn btn-sm btn-outline-secondary" 
                                            type="button" 
                                            data-bs-toggle="collapse" 
                                            data-bs-target="#content_${order.id}">
                                        <i class="bi bi-eye"></i> Xem chi tiết nội dung
                                    </button>
                                    <div class="collapse mt-2" id="content_${order.id}">
                                        <div class="card card-body bg-light">
                                            <pre class="mb-0">${JSON.stringify(order.content, null, 2)}</pre>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        });
        
        ordersContainer.innerHTML = ordersHTML;
    } catch (error) {
        console.error('Error fetching orders:', error);
        const ordersContainer = document.getElementById('ordersList');
        if (ordersContainer) {
            ordersContainer.innerHTML = '<p class="text-danger">Lỗi khi tải danh sách đơn hàng</p>';
        }
    }
}

// ==================== CHARTS FUNCTIONS ====================
// Render biểu đồ
async function renderCharts() {
    try {
        // Lấy dữ liệu thống kê từ bảng stats
        let statsQuery = supabase
            .from('stats')
            .select('type, data')
            .eq('role', currentRole)
            .order('created_at', { ascending: false });
        
        if (currentRole === 'seller') {
            statsQuery = statsQuery.eq('owner_id', currentUser.id);
        }
        
        const { data: stats, error } = await statsQuery;
        
        if (error) {
            console.warn('Could not fetch stats:', error);
            return;
        }
        
        if (!stats || stats.length === 0) {
            console.log('No chart data available yet');
            return;
        }
        
        // Tổ chức dữ liệu theo type
        const statsByType = {};
        stats.forEach(stat => {
            statsByType[stat.type] = stat.data;
        });
        
        // Render pie chart (nếu có)
        const pieCtx = document.getElementById('pieChart');
        if (pieCtx && statsByType['pie_customer_orders']) {
            const pieData = statsByType['pie_customer_orders'];
            
            // Xóa chart cũ nếu tồn tại
            if (window.pieChartInstance) {
                window.pieChartInstance.destroy();
            }
            
            window.pieChartInstance = new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: pieData.labels || [],
                    datasets: [{
                        data: pieData.values || [],
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                            '#9966FF', '#FF9F40', '#8AC926', '#1982C4'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: currentRole === 'admin' ? 
                                'Phân bố đơn hàng toàn hệ thống' : 
                                'Phân bố đơn hàng theo khách hàng'
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        // Render line chart (nếu có)
        const lineCtx = document.getElementById('lineChart');
        if (lineCtx) {
            let lineData = null;
            let title = '';
            
            if (currentRole === 'seller' && statsByType['line_seller_orders']) {
                lineData = statsByType['line_seller_orders'];
                title = 'Xu hướng đơn hàng (7 ngày)';
            } else if (currentRole === 'admin' && statsByType['line_admin_accounts']) {
                lineData = statsByType['line_admin_accounts'];
                title = 'Tăng trưởng tài khoản (7 ngày)';
            }
            
            if (lineData && lineData.labels && lineData.labels.length > 0) {
                // Xóa chart cũ nếu tồn tại
                if (window.lineChartInstance) {
                    window.lineChartInstance.destroy();
                }
                
                window.lineChartInstance = new Chart(lineCtx, {
                    type: 'line',
                    data: {
                        labels: lineData.labels || [],
                        datasets: lineData.datasets || []
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            title: {
                                display: true,
                                text: title
                            },
                            legend: {
                                position: 'bottom'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                }
                            }
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error rendering charts:', error);
        // Không hiển thị lỗi cho user
    }
}

// ==================== REALTIME SUBSCRIPTIONS ====================
// Thiết lập realtime subscriptions
function setupRealtimeSubscriptions() {
    // Subscription cho orders
    supabase
        .channel('orders-channel')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'orders' }, 
            async (payload) => {
                console.log('Realtime order update:', payload);
                await displayOrders();
                
                // Refresh charts cho seller/admin
                if (currentRole !== 'customer') {
                    await renderCharts();
                }
            }
        )
        .subscribe();

    // Subscription cho messages
    supabase
        .channel('messages-channel')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'messages' }, 
            async (payload) => {
                const newMessage = payload.new;
                // Chỉ refresh chat nếu tin nhắn liên quan đến user hiện tại
                if (newMessage.sender_id === currentUser.id || 
                    newMessage.receiver_id === currentUser.id ||
                    currentRole === 'admin') {
                    await displayChat();
                }
            }
        )
        .subscribe();
}

// ==================== UTILITY FUNCTIONS ====================
// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// ==================== INITIALIZATION ====================
// Khởi chạy khi trang tải xong (chỉ cho các trang chính)
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Nếu đang ở trang chính (không phải index.html)
    if (currentPage && !currentPage.includes('index.html') && currentPage !== '') {
        await initializePage();
    }
});

// ==================== EXPORT FUNCTIONS FOR HTML ONCLICK ====================
// Xuất các hàm để có thể gọi từ HTML onclick
window.toggleDarkMode = toggleDarkMode;
window.logout = logout;
window.renderTableForms = renderTableForms;
window.updateTempAmount = updateTempAmount;
window.createOrder = createOrder;
window.cancelOrder = cancelOrder;
window.redoOrder = redoOrder;
window.sendMessage = sendMessage;
window.sendBroadcast = sendBroadcast;
window.handleFileUpload = handleFileUpload;
window.copyOrder = copyOrder;
window.copyOrderPartial = copyOrderPartial;
window.cancelOrderSellerAdmin = cancelOrderSellerAdmin;
window.requestPayment = requestPayment;
window.markReceived = markReceived;
window.markCompleted = markCompleted;
window.addNotes = addNotes;