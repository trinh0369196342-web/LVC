// Cấu hình Supabase - THAY THẾ BẰNG THÔNG TIN CỦA BẠN
const SUPABASE_URL = 'https://tzfxvjrbzbfhrdnjcgza.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6Znh2anJiemJmaHJkbmpjZ3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MDk2NzgsImV4cCI6MjA4MDA4NTY3OH0.ZVYoX4BRgLm-yHGQz5D7jIiEo4fMJzP5DCjpmzwxisA';


// Khởi tạo Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Biến toàn cục
let currentUser = null;
let currentUserRole = null;
let currentPage = null;
let charts = {};
let messageSubscription = null;

// ========== HÀM XỬ LÝ CHUNG ==========

// Hàm định dạng tiền tệ
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Hàm định dạng ngày tháng
function formatDate(date) {
    return new Date(date).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Hàm hiển thị thông báo
function showToast(message, type = 'info') {
    // Tạo toast container nếu chưa có
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }

    // Tạo toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: white;
        border-radius: 10px;
        padding: 15px 20px;
        margin-bottom: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        border-left: 4px solid ${type === 'success' ? '#4cc9f0' : type === 'error' ? '#f72585' : '#4361ee'};
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}" 
               style="color: ${type === 'success' ? '#4cc9f0' : type === 'error' ? '#f72585' : '#4361ee'};"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
    `;

    toastContainer.appendChild(toast);

    // Hiển thị toast
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);

    // Tự động ẩn sau 5 giây
    const hideToast = () => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    };

    setTimeout(hideToast, 5000);

    // Nút đóng
    toast.querySelector('.toast-close').addEventListener('click', hideToast);
}

// Hàm kiểm tra nội dung trắc nghiệm
function containsMultipleChoice(content) {
    const mcRegex = /^[A-Da-d]\s*[\.\)]\s*/gm;
    return mcRegex.test(content);
}

// Hàm validate form
function validateForm(formData) {
    const errors = [];
    
    if (formData.name !== undefined && !formData.name?.trim()) {
        errors.push('Vui lòng nhập họ tên');
    }
    
    if (formData.phone !== undefined && !formData.phone?.trim()) {
        errors.push('Vui lòng nhập số điện thoại');
    } else if (formData.phone && !/^\d{10,11}$/.test(formData.phone)) {
        errors.push('Số điện thoại không hợp lệ');
    }
    
    if (formData.email !== undefined && !formData.email?.trim()) {
        errors.push('Vui lòng nhập email');
    } else if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.push('Email không hợp lệ');
    }
    
    if (formData.password !== undefined && !formData.password?.trim()) {
        errors.push('Vui lòng nhập mật khẩu');
    } else if (formData.password && formData.password.length < 6) {
        errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    }
    
    if (formData.confirmPassword !== undefined && formData.password !== formData.confirmPassword) {
        errors.push('Mật khẩu xác nhận không khớp');
    }
    
    return errors;
}

// ========== HÀM XỬ LÝ AUTHENTICATION ==========

// Hàm kiểm tra đăng nhập
async function checkAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            
            // Lấy thông tin profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name, phone, address')
                .eq('id', currentUser.id)
                .single();
                
            currentUserRole = profile?.role || 'customer';
            return { user: currentUser, role: currentUserRole, profile };
        }
        
        return null;
    } catch (error) {
        console.error('Lỗi kiểm tra đăng nhập:', error);
        return null;
    }
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

// Kiểm tra và chuyển hướng nếu đã đăng nhập
async function checkAuthAndRedirect() {
    const auth = await checkAuth();
    if (auth && window.location.pathname.endsWith('index.html')) {
        redirectByRole(auth.role);
    }
}

// Hàm đăng xuất
async function logout() {
    try {
        if (messageSubscription) {
            messageSubscription.unsubscribe();
        }
        
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
        showToast('Lỗi đăng xuất: ' + error.message, 'error');
    }
}

// Hàm đăng nhập
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const role = document.querySelector('input[name="login-role"]:checked')?.value || 'customer';
    
    if (!email || !password) {
        showToast('Vui lòng nhập email và mật khẩu', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // Cập nhật role nếu cần
        await supabase
            .from('profiles')
            .update({ role })
            .eq('id', data.user.id);
        
        redirectByRole(role);
    } catch (error) {
        showToast('Đăng nhập thất bại: ' + error.message, 'error');
    }
}

// Hàm đăng ký
async function handleRegister() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const role = document.getElementById('register-role').value;
    
    const errors = validateForm({
        name, email, phone, password, confirmPassword
    });
    
    if (errors.length > 0) {
        errors.forEach(error => showToast(error, 'error'));
        return;
    }
    
    try {
        // Đăng ký người dùng
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone
                }
            }
        });
        
        if (error) throw error;
        
        // Tạo profile
        await supabase
            .from('profiles')
            .insert({
                id: data.user.id,
                email: email,
                full_name: name,
                phone: phone,
                role: role,
                created_at: new Date()
            });
        
        showToast('Đăng ký thành công! Vui lòng kiểm tra email để xác thực.', 'success');
        
        // Chuyển sang tab đăng nhập
        setTimeout(() => {
            document.querySelector('[data-tab="login"]').click();
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = '';
        }, 2000);
    } catch (error) {
        showToast('Đăng ký thất bại: ' + error.message, 'error');
    }
}

// ========== KHỞI TẠO TRANG KHÁCH HÀNG ==========

function initCustomerPage() {
    currentPage = 'customer';
    
    // Kiểm tra đăng nhập
    checkAuth().then(auth => {
        if (!auth || auth.role !== 'customer') {
            window.location.href = 'index.html';
            return;
        }
        
        // Hiển thị thông tin người dùng
        displayCustomerInfo(auth);
        
        // Tải thông tin tài khoản
        loadCustomerAccountInfo();
        
        // Khởi tạo form đặt hàng
        initOrderForm();
        
        // Tải đơn hàng
        loadCustomerOrders();
        
        // Khởi tạo chat
        initCustomerChat();
        
        // Thiết lập navigation
        setupNavigation();
        
        // Load notifications
        loadNotifications();
    });
}

function displayCustomerInfo(auth) {
    if (document.getElementById('customer-name')) {
        document.getElementById('customer-name').textContent = 
            auth.profile?.full_name || auth.user.email;
    }
    if (document.getElementById('customer-email')) {
        document.getElementById('customer-email').textContent = auth.user.email;
    }
}

async function loadCustomerAccountInfo() {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (profile) {
            if (document.getElementById('edit-name')) {
                document.getElementById('edit-name').value = profile.full_name || '';
            }
            if (document.getElementById('edit-phone')) {
                document.getElementById('edit-phone').value = profile.phone || '';
            }
            if (document.getElementById('edit-address')) {
                document.getElementById('edit-address').value = profile.address || '';
            }
        }
        
        // Lắng nghe sự kiện lưu thông tin
        const saveBtn = document.getElementById('save-account');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveCustomerAccountInfo);
        }
    } catch (error) {
        console.error('Lỗi tải thông tin tài khoản:', error);
    }
}

async function saveCustomerAccountInfo() {
    const name = document.getElementById('edit-name').value;
    const phone = document.getElementById('edit-phone').value;
    const address = document.getElementById('edit-address').value;
    
    const errors = validateForm({ name, phone });
    if (errors.length > 0) {
        errors.forEach(error => showToast(error, 'error'));
        return;
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: name,
                phone: phone,
                address: address,
                updated_at: new Date()
            })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        showToast('Đã cập nhật thông tin thành công!', 'success');
        
        // Cập nhật hiển thị tên
        if (document.getElementById('customer-name')) {
            document.getElementById('customer-name').textContent = name;
        }
    } catch (error) {
        showToast('Lỗi cập nhật thông tin: ' + error.message, 'error');
    }
}

function initOrderForm() {
    const numTablesSelect = document.getElementById('num-tables');
    const tablesContainer = document.getElementById('tables-container');
    const tempAmountDisplay = document.getElementById('temp-amount');
    
    if (!numTablesSelect || !tablesContainer) return;
    
    const PRICE_PER_TABLE = 50000;
    
    function generateTableForms(num) {
        tablesContainer.innerHTML = '';
        
        for (let i = 1; i <= num; i++) {
            const form = document.createElement('div');
            form.className = 'table-form';
            form.innerHTML = `
                <h4><i class="fas fa-table"></i> Bảng ${i}</h4>
                <div class="form-group">
                    <label for="table-${i}-title">Tiêu đề</label>
                    <input type="text" id="table-${i}-title" class="form-control" 
                           placeholder="Nhập tiêu đề bảng ${i}">
                </div>
                <div class="form-group">
                    <label for="table-${i}-content">Nội dung</label>
                    <textarea id="table-${i}-content" class="form-control" rows="4"
                              placeholder="Nhập nội dung cho bảng ${i}"></textarea>
                    <small class="form-text">Không được chứa câu hỏi trắc nghiệm (A., B., C., D.)</small>
                </div>
                <div class="form-group">
                    <label for="table-${i}-print-content">Nội dung cần in (tự luận)</label>
                    <textarea id="table-${i}-print-content" class="form-control" rows="3"
                              placeholder="Nhập nội dung cần in cho bảng ${i}"></textarea>
                </div>
            `;
            
            // Thêm event listener để validate không cho phép trắc nghiệm
            const contentTextarea = form.querySelector(`#table-${i}-content`);
            contentTextarea.addEventListener('input', function() {
                if (containsMultipleChoice(this.value)) {
                    showToast('Nội dung không được chứa câu hỏi trắc nghiệm!', 'error');
                    this.value = this.value.replace(/^[A-Da-d]\s*[\.\)]\s*/gm, '');
                }
            });
            
            tablesContainer.appendChild(form);
        }
        
        // Cập nhật giá
        updateTempAmount();
    }
    
    function updateTempAmount() {
        const numTables = parseInt(numTablesSelect.value);
        const total = numTables * PRICE_PER_TABLE;
        if (tempAmountDisplay) {
            tempAmountDisplay.textContent = formatCurrency(total);
        }
    }
    
    // Khởi tạo với 1 bảng
    generateTableForms(1);
    
    // Xử lý thay đổi số lượng bảng
    numTablesSelect.addEventListener('change', function() {
        generateTableForms(parseInt(this.value));
    });
    
    // Xử lý tạo đơn hàng
    const createOrderBtn = document.getElementById('create-order');
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', async function() {
            const numTables = parseInt(numTablesSelect.value);
            const tablesData = [];
            
            // Thu thập dữ liệu từ các bảng
            for (let i = 1; i <= numTables; i++) {
                const title = document.getElementById(`table-${i}-title`)?.value || '';
                const content = document.getElementById(`table-${i}-content`)?.value || '';
                const printContent = document.getElementById(`table-${i}-print-content`)?.value || '';
                
                // Kiểm tra nội dung trắc nghiệm
                if (containsMultipleChoice(content)) {
                    showToast(`Bảng ${i}: Nội dung không được chứa câu hỏi trắc nghiệm!`, 'error');
                    return;
                }
                
                tablesData.push({
                    table_number: i,
                    title: title,
                    content: content,
                    print_content: printContent
                });
            }
            
            // Tính tổng tiền
            const totalAmount = numTables * PRICE_PER_TABLE;
            
            try {
                // Lưu đơn hàng vào Supabase
                const { data, error } = await supabase
                    .from('orders')
                    .insert({
                        user_id: currentUser.id,
                        tables_count: numTables,
                        tables_data: tablesData,
                        total_amount: totalAmount,
                        status: 'pending',
                        created_at: new Date()
                    });
                
                if (error) throw error;
                
                showToast('Đơn hàng đã được tạo thành công!', 'success');
                
                // Reset form
                numTablesSelect.value = '1';
                generateTableForms(1);
                
                // Tải lại danh sách đơn hàng
                loadCustomerOrders();
                
            } catch (error) {
                showToast('Lỗi tạo đơn hàng: ' + error.message, 'error');
            }
        });
    }
}

async function loadCustomerOrders() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc; margin: 20px 0;"></i>
                        <p>Chưa có đơn hàng nào</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>DH${order.id.toString().padStart(6, '0')}</td>
                <td>${formatDate(order.created_at)}</td>
                <td>${order.tables_count}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${order.status === 'pending' ? `
                            <button class="btn btn-sm btn-danger" onclick="cancelCustomerOrder(${order.id})">
                                <i class="fas fa-times"></i> Hủy
                            </button>
                        ` : ''}
                        ${order.status === 'completed' ? `
                            <button class="btn btn-sm btn-secondary" onclick="redoOrder(${order.id})">
                                <i class="fas fa-redo"></i> Làm lại
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Lỗi tải đơn hàng:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <i class="fas fa-exclamation-triangle" style="color: #f72585;"></i>
                    <p>Lỗi tải dữ liệu</p>
                </td>
            </tr>
        `;
    }
}

async function cancelCustomerOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'cancelled',
                cancelled_at: new Date()
            })
            .eq('id', orderId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        showToast('Đã hủy đơn hàng thành công!', 'success');
        loadCustomerOrders();
        
    } catch (error) {
        showToast('Lỗi hủy đơn hàng: ' + error.message, 'error');
    }
}

async function redoOrder(orderId) {
    try {
        // Lấy thông tin đơn hàng cũ
        const { data: order, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('user_id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        // Chuyển sang trang đặt hàng
        document.querySelector('.nav-item[href="#order"]').click();
        
        // Đặt số lượng bảng
        const numTablesSelect = document.getElementById('num-tables');
        numTablesSelect.value = order.tables_count;
        
        // Tạo form và điền dữ liệu
        setTimeout(() => {
            const tablesData = order.tables_data;
            tablesData.forEach((table, index) => {
                const i = index + 1;
                const titleInput = document.getElementById(`table-${i}-title`);
                const contentInput = document.getElementById(`table-${i}-content`);
                const printContentInput = document.getElementById(`table-${i}-print-content`);
                
                if (titleInput) titleInput.value = table.title || '';
                if (contentInput) contentInput.value = table.content || '';
                if (printContentInput) printContentInput.value = table.print_content || '';
            });
            
            showToast('Đã tải dữ liệu đơn hàng cũ!', 'success');
        }, 100);
        
    } catch (error) {
        showToast('Lỗi tải đơn hàng cũ: ' + error.message, 'error');
    }
}

function initCustomerChat() {
    const sendBtn = document.getElementById('send-message');
    const messageInput = document.getElementById('message-input');
    const fileUpload = document.getElementById('file-upload');
    const fileName = document.getElementById('file-name');
    
    if (!sendBtn || !messageInput) return;
    
    // Xử lý chọn file
    if (fileUpload && fileName) {
        fileUpload.addEventListener('change', function() {
            if (this.files.length > 0) {
                fileName.textContent = this.files[0].name;
            } else {
                fileName.textContent = 'Chưa chọn file';
            }
        });
    }
    
    // Xử lý gửi tin nhắn
    sendBtn.addEventListener('click', sendCustomerMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendCustomerMessage();
        }
    });
    
    // Subscribe để nhận tin nhắn realtime
    subscribeToCustomerMessages();
}

async function sendCustomerMessage() {
    const messageInput = document.getElementById('message-input');
    const receiverSelect = document.getElementById('receiver-select');
    const fileUpload = document.getElementById('file-upload');
    
    const message = messageInput.value.trim();
    const receiverType = receiverSelect?.value || 'support';
    
    if (!message && (!fileUpload || fileUpload.files.length === 0)) {
        showToast('Vui lòng nhập tin nhắn hoặc chọn file', 'warning');
        return;
    }
    
    try {
        let fileUrl = null;
        
        // Upload file nếu có
        if (fileUpload && fileUpload.files.length > 0) {
            const file = fileUpload.files[0];
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `chat-files/${currentUser.id}/${fileName}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('chat-files')
                .upload(filePath, file);
            
            if (uploadError) throw uploadError;
            
            // Lấy public URL
            const { data: urlData } = supabase.storage
                .from('chat-files')
                .getPublicUrl(filePath);
            
            fileUrl = urlData.publicUrl;
        }
        
        // Lưu tin nhắn
        const { error } = await supabase
            .from('messages')
            .insert({
                sender_id: currentUser.id,
                receiver_type: receiverType,
                message: message,
                file_url: fileUrl,
                created_at: new Date()
            });
        
        if (error) throw error;
        
        // Clear input
        messageInput.value = '';
        if (fileUpload) {
            fileUpload.value = '';
            fileName.textContent = 'Chưa chọn file';
        }
        
    } catch (error) {
        showToast('Lỗi gửi tin nhắn: ' + error.message, 'error');
    }
}

async function subscribeToCustomerMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    // Load tin nhắn cũ
    await loadCustomerMessages();
    
    // Subscribe để nhận tin nhắn mới realtime
    messageSubscription = supabase
        .channel('customer-messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, async (payload) => {
            // Kiểm tra nếu tin nhắn dành cho khách hàng
            const isForCustomer = 
                payload.new.sender_id === currentUser.id ||
                payload.new.receiver_type === 'customer' ||
                payload.new.receiver_type === 'all';
            
            if (isForCustomer) {
                await loadCustomerMessages();
            }
        })
        .subscribe();
}

async function loadCustomerMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    try {
        // Lấy tin nhắn liên quan đến khách hàng
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*, profiles:sender_id(full_name, role)')
            .or(`sender_id.eq.${currentUser.id},receiver_type.eq.customer,receiver_type.eq.all`)
            .order('created_at', { ascending: true })
            .limit(50);
        
        if (error) throw error;
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="message empty">
                    <p><i class="fas fa-comments fa-2x"></i></p>
                    <p>Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>
                </div>
            `;
            return;
        }
        
        messagesContainer.innerHTML = messages.map(msg => {
            const isSent = msg.sender_id === currentUser.id;
            const senderName = msg.profiles?.full_name || 
                              (msg.profiles?.role === 'seller' ? 'Người bán' : 
                               msg.profiles?.role === 'admin' ? 'Quản trị viên' : 'Người dùng');
            
            return `
                <div class="message ${isSent ? 'sent' : 'received'}">
                    <div class="message-header">
                        <strong>${isSent ? 'Bạn' : senderName}</strong>
                        <small>${formatDate(msg.created_at)}</small>
                    </div>
                    <div class="message-body">
                        ${msg.message ? `<p>${msg.message}</p>` : ''}
                        ${msg.file_url ? `
                            <div class="message-file">
                                <i class="fas fa-paperclip"></i>
                                <a href="${msg.file_url}" target="_blank" style="color: ${isSent ? 'white' : 'var(--primary)'};">Tệp đính kèm</a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Scroll xuống tin nhắn mới nhất
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('Lỗi tải tin nhắn:', error);
    }
}

function clearChat() {
    if (confirm('Bạn có chắc chắn muốn xóa lịch sử chat?')) {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="message empty">
                    <p><i class="fas fa-comments fa-2x"></i></p>
                    <p>Lịch sử chat đã được xóa</p>
                </div>
            `;
        }
    }
}

// ========== KHỞI TẠO TRANG NGƯỜI BÁN ==========

function initSellerPage() {
    currentPage = 'seller';
    
    // Kiểm tra đăng nhập
    checkAuth().then(auth => {
        if (!auth || auth.role !== 'seller') {
            window.location.href = 'index.html';
            return;
        }
        
        // Hiển thị thông tin người dùng
        displaySellerInfo(auth);
        
        // Tải thông tin tài khoản
        loadSellerAccountInfo();
        
        // Khởi tạo biểu đồ
        initSellerCharts();
        
        // Tải đơn hàng
        loadSellerOrders();
        
        // Khởi tạo chat
        initSellerChat();
        
        // Thiết lập navigation
        setupNavigation();
        
        // Load notifications
        loadNotifications();
    });
}

function displaySellerInfo(auth) {
    if (document.getElementById('seller-name')) {
        document.getElementById('seller-name').textContent = 
            auth.profile?.full_name || 'Người bán';
    }
    if (document.getElementById('seller-email')) {
        document.getElementById('seller-email').textContent = auth.user.email;
    }
}

async function loadSellerAccountInfo() {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (profile) {
            if (document.getElementById('seller-edit-name')) {
                document.getElementById('seller-edit-name').value = profile.full_name || '';
            }
            if (document.getElementById('seller-edit-phone')) {
                document.getElementById('seller-edit-phone').value = profile.phone || '';
            }
            if (document.getElementById('seller-edit-address')) {
                document.getElementById('seller-edit-address').value = profile.address || '';
            }
            if (document.getElementById('seller-edit-description')) {
                document.getElementById('seller-edit-description').value = profile.description || '';
            }
        }
        
        // Lắng nghe sự kiện lưu thông tin
        const saveBtn = document.getElementById('save-seller-account');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveSellerAccountInfo);
        }
    } catch (error) {
        console.error('Lỗi tải thông tin người bán:', error);
    }
}

async function saveSellerAccountInfo() {
    const name = document.getElementById('seller-edit-name').value;
    const phone = document.getElementById('seller-edit-phone').value;
    const address = document.getElementById('seller-edit-address').value;
    const description = document.getElementById('seller-edit-description').value;
    
    const errors = validateForm({ name, phone });
    if (errors.length > 0) {
        errors.forEach(error => showToast(error, 'error'));
        return;
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: name,
                phone: phone,
                address: address,
                description: description,
                updated_at: new Date()
            })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        showToast('Đã cập nhật thông tin cửa hàng thành công!', 'success');
        
    } catch (error) {
        showToast('Lỗi cập nhật thông tin: ' + error.message, 'error');
    }
}

function initSellerCharts() {
    // Biểu đồ tròn
    const pieCtx = document.getElementById('pieChart');
    if (pieCtx) {
        charts.pieChart = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['Chờ xử lý', 'Đang xử lý', 'Hoàn thành', 'Đã hủy'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#4BC0C0',
                        '#FFCE56'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // Biểu đồ đường
    const lineCtx = document.getElementById('lineChart');
    if (lineCtx) {
        charts.lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
                datasets: [{
                    label: 'Đơn nhận',
                    data: [12, 19, 3, 5, 2, 3, 7],
                    borderColor: '#36A2EB',
                    fill: false
                }, {
                    label: 'Đơn hủy',
                    data: [2, 3, 1, 4, 2, 1, 3],
                    borderColor: '#FF6384',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // Tải dữ liệu cho biểu đồ
    loadSellerChartData();
}

async function loadSellerChartData() {
    try {
        // Lấy dữ liệu đơn hàng cho biểu đồ
        const { data: orders, error } = await supabase
            .from('orders')
            .select('status, created_at')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        
        if (error) throw error;
        
        // Phân loại đơn hàng theo trạng thái
        const statusCount = {
            pending: 0,
            processing: 0,
            completed: 0,
            cancelled: 0
        };
        
        orders.forEach(order => {
            if (statusCount[order.status] !== undefined) {
                statusCount[order.status]++;
            }
        });
        
        // Cập nhật biểu đồ tròn
        if (charts.pieChart) {
            charts.pieChart.data.datasets[0].data = [
                statusCount.pending,
                statusCount.processing,
                statusCount.completed,
                statusCount.cancelled
            ];
            charts.pieChart.update();
        }
        
        // Cập nhật tổng quan
        updateSellerOverview(orders);
        
    } catch (error) {
        console.error('Lỗi tải dữ liệu biểu đồ:', error);
    }
}

function updateSellerOverview(orders) {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => 
        new Date(order.created_at).toDateString() === today
    );
    
    const completedToday = todayOrders.filter(order => order.status === 'completed').length;
    const cancelledToday = todayOrders.filter(order => order.status === 'cancelled').length;
    
    // Giả sử mỗi đơn hàng có giá trị trung bình
    const revenueToday = completedToday * 50000;
    
    if (document.getElementById('total-orders')) {
        document.getElementById('total-orders').textContent = todayOrders.length;
    }
    if (document.getElementById('completed-orders')) {
        document.getElementById('completed-orders').textContent = completedToday;
    }
    if (document.getElementById('cancelled-orders')) {
        document.getElementById('cancelled-orders').textContent = cancelledToday;
    }
    if (document.getElementById('today-revenue')) {
        document.getElementById('today-revenue').textContent = formatCurrency(revenueToday);
    }
}

async function loadSellerOrders() {
    const tbody = document.getElementById('seller-orders-table-body');
    if (!tbody) return;
    
    try {
        // Lấy tất cả đơn hàng (người bán có thể xem tất cả)
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*, profiles!orders_user_id_fkey(full_name, email)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc; margin: 20px 0;"></i>
                        <p>Chưa có đơn hàng nào</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>DH${order.id.toString().padStart(6, '0')}</td>
                <td>
                    <div>${order.profiles?.full_name || 'Khách hàng'}</div>
                    <small>${order.profiles?.email || ''}</small>
                </td>
                <td>${formatDate(order.created_at)}</td>
                <td>${order.tables_count}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="copyOrder(${order.id})" title="Sao chép đơn hàng">
                            <i class="fas fa-copy"></i>
                        </button>
                        ${order.status === 'pending' ? `
                            <button class="btn btn-sm btn-warning" onclick="cancelSellerOrder(${order.id})" title="Hủy đơn">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="btn btn-sm btn-success" onclick="requestPayment(${order.id})" title="Yêu cầu thanh toán">
                                <i class="fas fa-money-check-alt"></i>
                            </button>
                        ` : ''}
                        ${order.status === 'payment_requested' ? `
                            <button class="btn btn-sm btn-primary" onclick="markReceived(${order.id})" title="Đánh dấu đã nhận">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        ${order.status === 'received' ? `
                            <button class="btn btn-sm btn-success" onclick="markCompleted(${order.id})" title="Đánh dấu hoàn thành">
                                <i class="fas fa-check-double"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-secondary" onclick="showNotesModal(${order.id})" title="Thêm ghi chú">
                            <i class="fas fa-sticky-note"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Lỗi tải đơn hàng người bán:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <i class="fas fa-exclamation-triangle" style="color: #f72585;"></i>
                    <p>Lỗi tải dữ liệu</p>
                </td>
            </tr>
        `;
    }
}

// Các hàm xử lý đơn hàng cho người bán
async function copyOrder(orderId) {
    try {
        // Lấy thông tin đơn hàng
        const { data: order, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
        
        if (error) throw error;
        
        // Tạo đơn hàng mới với dữ liệu tương tự
        const { data: newOrder, error: insertError } = await supabase
            .from('orders')
            .insert({
                user_id: order.user_id,
                tables_count: order.tables_count,
                tables_data: order.tables_data,
                total_amount: order.total_amount,
                status: 'pending',
                created_at: new Date()
            });
        
        if (insertError) throw insertError;
        
        showToast('Đã sao chép đơn hàng thành công!', 'success');
        loadSellerOrders();
        
    } catch (error) {
        showToast('Lỗi sao chép đơn hàng: ' + error.message, 'error');
    }
}

async function cancelSellerOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'cancelled',
                cancelled_at: new Date()
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        showToast('Đã hủy đơn hàng thành công!', 'success');
        loadSellerOrders();
        
    } catch (error) {
        showToast('Lỗi hủy đơn hàng: ' + error.message, 'error');
    }
}

async function requestPayment(orderId) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'payment_requested',
                payment_requested_at: new Date()
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        showToast('Đã gửi yêu cầu thanh toán!', 'success');
        loadSellerOrders();
        
    } catch (error) {
        showToast('Lỗi yêu cầu thanh toán: ' + error.message, 'error');
    }
}

async function markReceived(orderId) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'received',
                received_at: new Date()
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        showToast('Đã đánh dấu đơn hàng đã nhận!', 'success');
        loadSellerOrders();
        
    } catch (error) {
        showToast('Lỗi cập nhật trạng thái: ' + error.message, 'error');
    }
}

async function markCompleted(orderId) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: 'completed',
                completed_at: new Date()
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        showToast('Đã đánh dấu đơn hàng hoàn thành!', 'success');
        loadSellerOrders();
        
    } catch (error) {
        showToast('Lỗi cập nhật trạng thái: ' + error.message, 'error');
    }
}

function showNotesModal(orderId) {
    document.getElementById('current-order-id').value = orderId;
    document.getElementById('notes-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('notes-modal').classList.add('hidden');
    document.getElementById('add-user-modal').classList.add('hidden');
}

async function saveOrderNotes() {
    const orderId = document.getElementById('current-order-id').value;
    const notes = document.getElementById('order-notes').value;
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                seller_notes: notes,
                updated_at: new Date()
            })
            .eq('id', orderId);
        
        if (error) throw error;
        
        showToast('Đã lưu ghi chú!', 'success');
        closeModal();
        
    } catch (error) {
        showToast('Lỗi lưu ghi chú: ' + error.message, 'error');
    }
}

function filterOrders() {
    // Implement filter logic here
    showToast('Chức năng lọc đang được phát triển', 'info');
}

function resetFilters() {
    if (document.getElementById('order-filter-status')) {
        document.getElementById('order-filter-status').value = 'all';
    }
    if (document.getElementById('order-filter-date')) {
        document.getElementById('order-filter-date').value = '';
    }
    loadSellerOrders();
}

// ========== KHỞI TẠO TRANG QUẢN TRỊ VIÊN ==========

function initAdminPage() {
    currentPage = 'admin';
    
    // Kiểm tra đăng nhập
    checkAuth().then(auth => {
        if (!auth || auth.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
        
        // Hiển thị thông tin người dùng
        displayAdminInfo(auth);
        
        // Tải thông tin tài khoản
        loadAdminAccountInfo();
        
        // Khởi tạo biểu đồ
        initAdminCharts();
        
        // Tải dữ liệu hệ thống
        loadAdminData();
        
        // Thiết lập navigation
        setupNavigation();
        
        // Load notifications
        loadNotifications();
    });
}

function displayAdminInfo(auth) {
    if (document.getElementById('admin-name')) {
        document.getElementById('admin-name').textContent = 
            auth.profile?.full_name || 'Quản trị viên';
    }
    if (document.getElementById('admin-email')) {
        document.getElementById('admin-email').textContent = auth.user.email;
    }
}

async function loadAdminAccountInfo() {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (profile) {
            if (document.getElementById('admin-edit-name')) {
                document.getElementById('admin-edit-name').value = profile.full_name || '';
            }
            if (document.getElementById('admin-edit-phone')) {
                document.getElementById('admin-edit-phone').value = profile.phone || '';
            }
        }
        
        // Lắng nghe sự kiện lưu thông tin
        const saveBtn = document.getElementById('save-admin-account');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveAdminAccountInfo);
        }
    } catch (error) {
        console.error('Lỗi tải thông tin admin:', error);
    }
}

async function saveAdminAccountInfo() {
    const name = document.getElementById('admin-edit-name').value;
    const phone = document.getElementById('admin-edit-phone').value;
    
    const errors = validateForm({ name, phone });
    if (errors.length > 0) {
        errors.forEach(error => showToast(error, 'error'));
        return;
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: name,
                phone: phone,
                updated_at: new Date()
            })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        showToast('Đã cập nhật thông tin thành công!', 'success');
        
    } catch (error) {
        showToast('Lỗi cập nhật thông tin: ' + error.message, 'error');
    }
}

function initAdminCharts() {
    // Biểu đồ tròn phân bố người dùng
    const adminPieCtx = document.getElementById('admin-pie-chart');
    if (adminPieCtx) {
        charts.adminPieChart = new Chart(adminPieCtx, {
            type: 'pie',
            data: {
                labels: ['Khách hàng', 'Người bán', 'Quản trị viên'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#4BC0C0'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // Biểu đồ đường tăng trưởng
    const adminLineCtx = document.getElementById('admin-line-chart');
    if (adminLineCtx) {
        charts.adminLineChart = new Chart(adminLineCtx, {
            type: 'line',
            data: {
                labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'],
                datasets: [{
                    label: 'Người dùng mới',
                    data: [0, 0, 0, 0],
                    borderColor: '#36A2EB',
                    fill: false
                }, {
                    label: 'Người dùng hoạt động',
                    data: [0, 0, 0, 0],
                    borderColor: '#4BC0C0',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

async function loadAdminData() {
    try {
        // Lấy thống kê người dùng
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('role, created_at');
        
        if (profilesError) throw profilesError;
        
        // Lấy thống kê đơn hàng
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('status, total_amount, created_at');
        
        if (ordersError) throw ordersError;
        
        // Cập nhật tổng quan
        updateAdminOverview(profiles, orders);
        
        // Cập nhật biểu đồ
        updateAdminCharts(profiles);
        
        // Tải danh sách người dùng
        loadUsersList();
        
        // Tải danh sách đơn hàng
        loadAdminOrders();
        
        // Tải hoạt động gần đây
        loadRecentActivity();
        
    } catch (error) {
        console.error('Lỗi tải dữ liệu admin:', error);
    }
}

function updateAdminOverview(profiles, orders) {
    // Tổng số người dùng
    if (document.getElementById('total-users')) {
        document.getElementById('total-users').textContent = profiles.length;
    }
    
    // Tổng số đơn hàng
    if (document.getElementById('total-orders')) {
        document.getElementById('total-orders').textContent = orders.length;
    }
    
    // Doanh thu tháng này
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthlyRevenue = orders
        .filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate.getMonth() === thisMonth && 
                   orderDate.getFullYear() === thisYear &&
                   order.status === 'completed';
        })
        .reduce((sum, order) => sum + (order.total_amount || 0), 0);
    
    if (document.getElementById('monthly-revenue')) {
        document.getElementById('monthly-revenue').textContent = formatCurrency(monthlyRevenue);
    }
    
    // Số đơn hoàn thành
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    if (document.getElementById('completed-orders')) {
        document.getElementById('completed-orders').textContent = completedOrders;
    }
}

function updateAdminCharts(profiles) {
    // Phân bố người dùng theo role
    const roleCount = {
        customer: profiles.filter(p => p.role === 'customer').length,
        seller: profiles.filter(p => p.role === 'seller').length,
        admin: profiles.filter(p => p.role === 'admin').length
    };
    
    if (charts.adminPieChart) {
        charts.adminPieChart.data.datasets[0].data = [
            roleCount.customer,
            roleCount.seller,
            roleCount.admin
        ];
        charts.adminPieChart.update();
    }
}

async function loadUsersList() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (profiles.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <i class="fas fa-users" style="font-size: 3rem; color: #ccc; margin: 20px 0;"></i>
                        <p>Chưa có người dùng nào</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = profiles.map(profile => `
            <tr>
                <td>${profile.id.substring(0, 8)}...</td>
                <td>${profile.full_name || 'Chưa đặt tên'}</td>
                <td>${profile.email}</td>
                <td>
                    <span class="status-badge ${getRoleBadgeClass(profile.role)}">
                        ${getRoleText(profile.role)}
                    </span>
                </td>
                <td>${profile.phone || 'Chưa có'}</td>
                <td>
                    <span class="status-badge status-active">
                        Đang hoạt động
                    </span>
                </td>
                <td>${formatDate(profile.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="editUser('${profile.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${profile.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Lỗi tải danh sách người dùng:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <i class="fas fa-exclamation-triangle" style="color: #f72585;"></i>
                    <p>Lỗi tải dữ liệu</p>
                </td>
            </tr>
        `;
    }
}

async function loadAdminOrders() {
    const tbody = document.getElementById('admin-orders-table-body');
    if (!tbody) return;
    
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*, profiles!orders_user_id_fkey(full_name, email)')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc; margin: 20px 0;"></i>
                        <p>Chưa có đơn hàng nào</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>DH${order.id.toString().padStart(6, '0')}</td>
                <td>${order.profiles?.full_name || 'Khách hàng'}</td>
                <td>Hệ thống</td>
                <td>${formatDate(order.created_at)}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info" onclick="adminCopyOrder(${order.id})">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="adminCancelOrder(${order.id})">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="adminViewNotes(${order.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Lỗi tải đơn hàng admin:', error);
    }
}

async function loadRecentActivity() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    try {
        // Lấy hoạt động gần đây từ các bảng
        const recentActivities = [];
        
        // Thêm một số hoạt động mẫu
        recentActivities.push(
            'Người dùng mới đăng ký: Nguyễn Văn A',
            'Đơn hàng DH000123 đã hoàn thành',
            'Người bán "Cửa hàng ABC" đã cập nhật thông tin',
            'Hệ thống sao lưu dữ liệu thành công'
        );
        
        activityList.innerHTML = recentActivities.map(activity => `
            <div style="padding: 10px; border-bottom: 1px solid var(--light-gray);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-circle" style="color: #4cc9f0; font-size: 0.5rem;"></i>
                    <span>${activity}</span>
                </div>
                <small style="color: var(--gray); margin-left: 20px;">${formatDate(new Date())}</small>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Lỗi tải hoạt động:', error);
    }
}

// ========== HÀM HỖ TRỢ ==========

function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy',
        'payment_requested': 'Chờ thanh toán',
        'received': 'Đã nhận'
    };
    return statusMap[status] || status;
}

function getRoleText(role) {
    const roleMap = {
        'customer': 'Khách hàng',
        'seller': 'Người bán',
        'admin': 'Quản trị viên'
    };
    return roleMap[role] || role;
}

function getRoleBadgeClass(role) {
    const classMap = {
        'customer': 'status-pending',
        'seller': 'status-processing',
        'admin': 'status-completed'
    };
    return classMap[role] || '';
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const target = this.getAttribute('href').substring(1);
            
            // Cập nhật active state
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
            
            this.classList.add('active');
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Cập nhật tiêu đề trang
                const pageTitle = document.getElementById('page-title');
                if (pageTitle) {
                    pageTitle.textContent = this.textContent.trim();
                }
            }
        });
    });
}

async function loadNotifications() {
    try {
        // Đếm số đơn hàng chờ xử lý
        const { count, error } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        if (!error && document.getElementById('notification-count')) {
            document.getElementById('notification-count').textContent = count || 0;
        }
    } catch (error) {
        console.error('Lỗi tải thông báo:', error);
    }
}

function toggleNotifications() {
    showToast('Chức năng thông báo đang được phát triển', 'info');
}

function refreshData() {
    switch(currentPage) {
        case 'customer':
            loadCustomerOrders();
            loadCustomerMessages();
            break;
        case 'seller':
            loadSellerOrders();
            loadSellerChartData();
            break;
        case 'admin':
            loadAdminData();
            break;
    }
    showToast('Đã làm mới dữ liệu', 'success');
}

function exportData() {
    showToast('Chức năng xuất báo cáo đang được phát triển', 'info');
}

// Hàm hỗ trợ cho Admin
function showAddUserModal() {
    document.getElementById('add-user-modal').classList.remove('hidden');
}

async function createNewUser() {
    const name = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const phone = document.getElementById('new-user-phone').value;
    const role = document.getElementById('new-user-role').value;
    const password = document.getElementById('new-user-password').value;
    
    const errors = validateForm({ name, email, phone, password });
    if (errors.length > 0) {
        errors.forEach(error => showToast(error, 'error'));
        return;
    }
    
    try {
        // Tạo người dùng mới
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone
                }
            }
        });
        
        if (error) throw error;
        
        // Tạo profile
        await supabase
            .from('profiles')
            .insert({
                id: data.user.id,
                email: email,
                full_name: name,
                phone: phone,
                role: role,
                created_at: new Date()
            });
        
        showToast('Đã tạo người dùng mới thành công!', 'success');
        closeModal();
        loadUsersList();
        
    } catch (error) {
        showToast('Lỗi tạo người dùng: ' + error.message, 'error');
    }
}

function editUser(userId) {
    showToast('Chức năng chỉnh sửa người dùng đang được phát triển', 'info');
}

async function deleteUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    
    try {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
        
        if (error) throw error;
        
        showToast('Đã xóa người dùng thành công!', 'success');
        loadUsersList();
        
    } catch (error) {
        showToast('Lỗi xóa người dùng: ' + error.message, 'error');
    }
}

function adminFilterOrders() {
    showToast('Chức năng lọc đang được phát triển', 'info');
}

function adminResetFilters() {
    if (document.getElementById('admin-order-filter-status')) {
        document.getElementById('admin-order-filter-status').value = 'all';
    }
    if (document.getElementById('admin-order-filter-seller')) {
        document.getElementById('admin-order-filter-seller').value = 'all';
    }
    if (document.getElementById('admin-order-filter-date')) {
        document.getElementById('admin-order-filter-date').value = '';
    }
    loadAdminOrders();
}

function adminCopyOrder(orderId) {
    showToast('Chức năng sao chép đơn hàng đang được phát triển', 'info');
}

function adminCancelOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    
    showToast('Chức năng hủy đơn hàng đang được phát triển', 'info');
}

function adminViewNotes(orderId) {
    showToast('Chức năng xem ghi chú đang được phát triển', 'info');
}

function filterUsers() {
    showToast('Chức năng lọc người dùng đang được phát triển', 'info');
}

function saveSystemSettings() {
    showToast('Đã lưu cài đặt hệ thống', 'success');
}

// Khởi tạo toàn bộ ứng dụng khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xem có đang ở trang đăng nhập không
    if (window.location.pathname.endsWith('index.html') || 
        window.location.pathname.endsWith('/')) {
        checkAuthAndRedirect();
    }
});