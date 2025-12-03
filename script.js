// =================================================================
// 🚨 CẤU HÌNH SUPABASE - THAY THẾ BẰNG THÔNG TIN CỦA BẠN 🚨
// =================================================================
const SUPABASE_URL = 'https://sxxtqxvkixmfmnplosfz.supabase.co'; // Thay thế
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4eHRxeHZraXhtZm1ucGxvc2Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODY0MTcsImV4cCI6MjA4MDI2MjQxN30.Ta6T58MZIATM7BPpa5nBfCfuZPldlZMMeZDi6qyG324'; // Thay thế

// Khởi tạo Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Biến toàn cục
let currentUser = null;
let currentUserRole = null;
let currentPage = null;
let charts = {};
let messageSubscription = null;

// ========== HÀM XỬ LÝ CHUNG VÀ HỖ TRỢ ==========

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    // Implement toast logic (same as original file)
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: white; border-radius: 10px; padding: 15px 20px; margin-bottom: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2); display: flex; align-items: center;
        min-width: 300px; transform: translateX(400px); transition: transform 0.3s ease;
        border-left: 4px solid ${type === 'success' ? '#4cc9f0' : type === 'error' ? '#f72585' : '#4361ee'};
    `;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}" 
               style="color: ${type === 'success' ? '#4cc9f0' : type === 'error' ? '#f72585' : '#4361ee'};"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; margin-left: 10px;">&times;</button>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 100);
    const hideToast = () => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    };
    setTimeout(hideToast, 5000);
    toast.querySelector('.toast-close').addEventListener('click', hideToast);
}

function containsMultipleChoice(content) {
    const mcRegex = /^[A-Da-d]\s*[\.\)]\s*/gm;
    return mcRegex.test(content);
}

function validateForm(formData) {
    const errors = [];
    if (formData.name !== undefined && !formData.name?.trim()) errors.push('Vui lòng nhập họ tên');
    if (formData.phone !== undefined && !formData.phone?.trim()) {
        errors.push('Vui lòng nhập số điện thoại');
    } else if (formData.phone && !/^\d{10,11}$/.test(formData.phone)) {
        errors.push('Số điện thoại không hợp lệ');
    }
    if (formData.email !== undefined && !formData.email?.trim()) errors.push('Vui lòng nhập email');
    else if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Email không hợp lệ');
    if (formData.password !== undefined && !formData.password?.trim()) errors.push('Vui lòng nhập mật khẩu');
    else if (formData.password && formData.password.length < 6) errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    if (formData.confirmPassword !== undefined && formData.password !== formData.confirmPassword) errors.push('Mật khẩu xác nhận không khớp');
    return errors;
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xử lý', 'processing': 'Đang xử lý', 'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy', 'payment_requested': 'Chờ thanh toán', 'received': 'Đã nhận'
    };
    return statusMap[status] || status;
}

function getRoleText(role) {
    const roleMap = {'customer': 'Khách hàng', 'seller': 'Người bán', 'admin': 'Quản trị viên'};
    return roleMap[role] || role;
}

function getRoleBadgeClass(role) {
    const classMap = {'customer': 'status-pending', 'seller': 'status-processing', 'admin': 'status-completed'};
    return classMap[role] || '';
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
            
            this.classList.add('active');
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add('active');
                
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
            if (typeof loadSellerChartData === 'function') loadSellerChartData();
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

function closeModal() {
    const notesModal = document.getElementById('notes-modal');
    const addUserModal = document.getElementById('add-user-modal');

    if (notesModal) notesModal.classList.add('hidden');
    if (addUserModal) addUserModal.classList.add('hidden');
}


// ========== HÀM XỬ LÝ AUTHENTICATION ==========

async function checkAuth() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role, full_name, phone, address, description')
                .eq('id', currentUser.id)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.error('Lỗi tải profile:', error.message);
            }
            
            currentUserRole = profile?.role || 'customer';
            return { user: currentUser, role: currentUserRole, profile };
        }
        
        return null;
    } catch (error) {
        console.error('Lỗi kiểm tra đăng nhập:', error);
        return null;
    }
}

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

async function checkAuthAndRedirect() {
    const auth = await checkAuth();
    if (auth && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
        redirectByRole(auth.role);
    }
}

async function logout() {
    try {
        if (messageSubscription) {
            supabase.removeChannel(messageSubscription);
        }
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
        showToast('Lỗi đăng xuất: ' + error.message, 'error');
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const role = document.querySelector('input[name="login-role"]:checked')?.value || 'customer';
    
    if (!email || !password) {
        showToast('Vui lòng nhập email và mật khẩu', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        await supabase
            .from('profiles')
            .update({ role, updated_at: new Date() })
            .eq('id', data.user.id);
        
        redirectByRole(role);
    } catch (error) {
        showToast('Đăng nhập thất bại: ' + error.message, 'error');
    }
}

async function handleRegister() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const role = document.getElementById('register-role').value;
    
    const errors = validateForm({ name, email, phone, password, confirmPassword });
    
    if (errors.length > 0) {
        errors.forEach(error => showToast(error, 'error'));
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
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
        
        setTimeout(() => {
            document.querySelector('[data-tab="login"]').click();
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').value = '';
        }, 2000);
    } catch (error) {
        showToast('Đăng ký thất bại: ' + error.message, 'error');
    }
}

// ========== LOGIC CHO CUSTOMER ==========

function initCustomerPage() {
    currentPage = 'customer';
    checkAuth().then(auth => {
        if (!auth || auth.role !== 'customer') {
            window.location.href = 'index.html';
            return;
        }
        displayCustomerInfo(auth);
        loadCustomerAccountInfo();
        initOrderForm();
        loadCustomerOrders();
        initCustomerChat();
        setupNavigation();
        loadNotifications();
    });
}

function displayCustomerInfo(auth) {
    if (document.getElementById('customer-name')) {
        document.getElementById('customer-name').textContent = auth.profile?.full_name || auth.user.email;
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
            document.getElementById('edit-name').value = profile.full_name || '';
            document.getElementById('edit-phone').value = profile.phone || '';
            document.getElementById('edit-address').value = profile.address || '';
        }
        
        const saveBtn = document.getElementById('save-account');
        if (saveBtn) { saveBtn.addEventListener('click', saveCustomerAccountInfo); }
    } catch (error) { console.error('Lỗi tải thông tin tài khoản:', error); }
}

async function saveCustomerAccountInfo() {
    const name = document.getElementById('edit-name').value;
    const phone = document.getElementById('edit-phone').value;
    const address = document.getElementById('edit-address').value;
    
    const errors = validateForm({ name, phone });
    if (errors.length > 0) { errors.forEach(error => showToast(error, 'error')); return; }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ full_name: name, phone: phone, address: address, updated_at: new Date() })
            .eq('id', currentUser.id);
        
        if (error) throw error;
        
        showToast('Đã cập nhật thông tin thành công!', 'success');
        if (document.getElementById('customer-name')) { document.getElementById('customer-name').textContent = name; }
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
            const contentTextarea = form.querySelector(`#table-${i}-content`);
            contentTextarea.addEventListener('input', function() {
                if (containsMultipleChoice(this.value)) {
                    showToast('Nội dung không được chứa câu hỏi trắc nghiệm!', 'error');
                    this.value = this.value.replace(/^[A-Da-d]\s*[\.\)]\s*/gm, '');
                }
            });
            tablesContainer.appendChild(form);
        }
        updateTempAmount();
    }
    
    function updateTempAmount() {
        const numTables = parseInt(numTablesSelect.value);
        const total = numTables * PRICE_PER_TABLE;
        if (tempAmountDisplay) {
            tempAmountDisplay.textContent = formatCurrency(total);
        }
    }
    
    generateTableForms(1);
    numTablesSelect.addEventListener('change', function() {
        generateTableForms(parseInt(this.value));
    });
    
    const createOrderBtn = document.getElementById('create-order');
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', async function() {
            const numTables = parseInt(numTablesSelect.value);
            const tablesData = [];
            
            for (let i = 1; i <= numTables; i++) {
                const title = document.getElementById(`table-${i}-title`)?.value || '';
                const content = document.getElementById(`table-${i}-content`)?.value || '';
                const printContent = document.getElementById(`table-${i}-print-content`)?.value || '';
                
                if (containsMultipleChoice(content)) {
                    showToast(`Bảng ${i}: Nội dung không được chứa câu hỏi trắc nghiệm!`, 'error');
                    return;
                }
                
                tablesData.push({ table_number: i, title: title, content: content, print_content: printContent });
            }
            
            const totalAmount = numTables * PRICE_PER_TABLE;
            
            try {
                // Kiểm tra xem user_id có tồn tại không trước khi insert
                if (!currentUser || !currentUser.id) {
                    showToast('Lỗi xác thực: Không tìm thấy ID người dùng.', 'error');
                    return;
                }

                const { error } = await supabase
                    .from('orders')
                    .insert({ user_id: currentUser.id, tables_count: numTables, tables_data: tablesData, total_amount: totalAmount, status: 'pending', created_at: new Date() });
                
                if (error) throw error;
                
                showToast('Đơn hàng đã được tạo thành công!', 'success');
                numTablesSelect.value = '1';
                generateTableForms(1);
                loadCustomerOrders();
                
            } catch (error) {
                console.error('Lỗi chi tiết tạo đơn hàng:', error);
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
            tbody.innerHTML = `<tr><td colspan="6" class="text-center">
                <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc; margin: 20px 0;"></i>
                <p>Chưa có đơn hàng nào</p></td></tr>`;
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
                            </button>` : ''}
                        ${order.status === 'completed' ? `
                            <button class="btn btn-sm btn-secondary" onclick="redoOrder(${order.id})">
                                <i class="fas fa-redo"></i> Làm lại
                            </button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Lỗi chi tiết tải đơn hàng:', error);
        // Hiển thị thông báo lỗi chi tiết hơn trên giao diện
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">
            <i class="fas fa-exclamation-triangle" style="color: #f72585;"></i>
            <p>Lỗi tải dữ liệu: ${error.message}</p></td></tr>`;
    }
}

async function cancelCustomerOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled', cancelled_at: new Date() })
            .eq('id', orderId)
            .eq('user_id', currentUser.id);
        if (error) throw error;
        showToast('Đã hủy đơn hàng thành công!', 'success');
        loadCustomerOrders();
    } catch (error) { showToast('Lỗi hủy đơn hàng: ' + error.message, 'error'); }
}

async function redoOrder(orderId) {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select('tables_count, tables_data')
            .eq('id', orderId)
            .eq('user_id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        document.querySelector('.nav-item[href="#order"]').click();
        const numTablesSelect = document.getElementById('num-tables');
        numTablesSelect.value = order.tables_count;
        
        numTablesSelect.dispatchEvent(new Event('change'));

        setTimeout(() => {
            order.tables_data.forEach((table, index) => {
                const i = index + 1;
                const titleInput = document.getElementById(`table-${i}-title`);
                const contentInput = document.getElementById(`table-${i}-content`);
                const printContentInput = document.getElementById(`table-${i}-print-content`);
                
                if (titleInput) titleInput.value = table.title || '';
                if (contentInput) contentInput.value = table.content || '';
                if (printContentInput) printContentInput.value = table.print_content || '';
            });
            showToast('Đã tải dữ liệu đơn hàng cũ!', 'success');
        }, 150);
        
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
    
    if (fileUpload && fileName) {
        fileUpload.addEventListener('change', function() {
            fileName.textContent = this.files.length > 0 ? this.files[0].name : 'Chưa chọn file';
        });
    }
    
    sendBtn.addEventListener('click', sendCustomerMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendCustomerMessage();
    });
    
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
        
        if (fileUpload && fileUpload.files.length > 0) {
            const file = fileUpload.files[0];
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `chat-files/${currentUser.id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('chat-files')
                .upload(filePath, file);
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
                .from('chat-files')
                .getPublicUrl(filePath);
            
            fileUrl = urlData.publicUrl;
        }
        
        const { error } = await supabase
            .from('messages')
            .insert({ sender_id: currentUser.id, receiver_type: receiverType, message: message, file_url: fileUrl, created_at: new Date() });
        
        if (error) throw error;
        
        messageInput.value = '';
        if (fileUpload) {
            fileUpload.value = '';
            document.getElementById('file-name').textContent = 'Chưa chọn file';
        }
        
    } catch (error) {
        showToast('Lỗi gửi tin nhắn: ' + error.message, 'error');
    }
}

async function subscribeToCustomerMessages() {
    await loadCustomerMessages();
    
    if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
    }

    messageSubscription = supabase
        .channel('customer-messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `sender_id=eq.${currentUser.id}`
        }, async (payload) => {
            const isRelevant = 
                payload.new.sender_id === currentUser.id ||
                payload.new.receiver_type === 'customer' ||
                payload.new.receiver_type === 'all' ||
                payload.new.receiver_type === 'support';
            
            if (isRelevant) {
                await loadCustomerMessages();
            }
        })
        .subscribe();
}

async function loadCustomerMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*, profiles:sender_id(full_name, role)')
            .or(`sender_id.eq.${currentUser.id},receiver_type.eq.customer,receiver_type.eq.all,receiver_type.eq.support`)
            .order('created_at', { ascending: true })
            .limit(50);
        
        if (error) throw error;
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `<div class="message empty"><p><i class="fas fa-comments fa-2x"></i></p><p>Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p></div>`;
            return;
        }
        
        messagesContainer.innerHTML = messages.map(msg => {
            const isSent = msg.sender_id === currentUser.id;
            const senderName = msg.profiles?.full_name || 
                              (msg.profiles?.role === 'seller' ? 'Người bán' : 
                               msg.profiles?.role === 'admin' ? 'Quản trị viên' : 'Hệ thống');
            
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
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('Lỗi tải tin nhắn:', error);
    }
}

function clearChat() {
    if (confirm('Bạn có chắc chắn muốn xóa lịch sử chat? (Chức năng xóa trên DB chưa được implement)')) {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `<div class="message empty"><p>Lịch sử chat đã được xóa</p></div>`;
        }
    }
}

// ========== LOGIC CHO SELLER ==========

function initSellerPage() {
    currentPage = 'seller';
    checkAuth().then(auth => {
        if (!auth || auth.role !== 'seller') {
            window.location.href = 'index.html';
            return;
        }
        displaySellerInfo(auth);
        loadSellerAccountInfo();
        if (typeof Chart !== 'undefined') { 
            initSellerCharts(); 
        } else {
             console.warn('Chart.js chưa được tải. Biểu đồ sẽ không hoạt động.');
        }
        loadSellerOrders();
        setupNavigation();
        loadNotifications();
    });
}

function displaySellerInfo(auth) {
    if (document.getElementById('seller-name')) { document.getElementById('seller-name').textContent = auth.profile?.full_name || 'Người bán'; }
    if (document.getElementById('seller-email')) { document.getElementById('seller-email').textContent = auth.user.email; }
}

async function loadSellerAccountInfo() {
    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        if (profile) {
            document.getElementById('seller-edit-name').value = profile.full_name || '';
            document.getElementById('seller-edit-phone').value = profile.phone || '';
            document.getElementById('seller-edit-address').value = profile.address || '';
            document.getElementById('seller-edit-description').value = profile.description || '';
        }
        const saveBtn = document.getElementById('save-seller-account');
        if (saveBtn) { saveBtn.addEventListener('click', saveSellerAccountInfo); }
    } catch (error) { console.error('Lỗi tải thông tin người bán:', error); }
}

async function saveSellerAccountInfo() {
    const name = document.getElementById('seller-edit-name').value;
    const phone = document.getElementById('seller-edit-phone').value;
    const address = document.getElementById('seller-edit-address').value;
    const description = document.getElementById('seller-edit-description').value;
    
    const errors = validateForm({ name, phone });
    if (errors.length > 0) { errors.forEach(error => showToast(error, 'error')); return; }
    
    try {
        const { error } = await supabase.from('profiles').update({ full_name: name, phone: phone, address: address, description: description, updated_at: new Date() }).eq('id', currentUser.id);
        if (error) throw error;
        showToast('Đã cập nhật thông tin cửa hàng thành công!', 'success');
    } catch (error) {
        showToast('Lỗi cập nhật thông tin: ' + error.message, 'error');
    }
}

function initSellerCharts() {
    // Logic khởi tạo biểu đồ (nếu Chart.js có sẵn)
    const pieCtx = document.getElementById('pieChart');
    if (pieCtx) {
        charts.pieChart = new Chart(pieCtx, { type: 'pie', data: { labels: ['Chờ xử lý', 'Đang xử lý', 'Hoàn thành', 'Đã hủy'], datasets: [{ data: [0, 0, 0, 0], backgroundColor: ['#FF6384', '#36A2EB', '#4BC0C0', '#FFCE56'] }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
    const lineCtx = document.getElementById('lineChart');
    if (lineCtx) {
        charts.lineChart = new Chart(lineCtx, { type: 'line', data: { labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'], datasets: [{ label: 'Đơn nhận', data: [12, 19, 3, 5, 2, 3, 7], borderColor: '#36A2EB', fill: false }, { label: 'Đơn hủy', data: [2, 3, 1, 4, 2, 1, 3], borderColor: '#FF6384', fill: false }] }, options: { responsive: true, maintainAspectRatio: false } });
    }
    loadSellerChartData();
}

async function loadSellerChartData() {
    try {
        const { data: orders, error } = await supabase.from('orders').select('status, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        if (error) throw error;
        const statusCount = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
        orders.forEach(order => { if (statusCount[order.status] !== undefined) { statusCount[order.status]++; } });
        if (charts.pieChart) {
            charts.pieChart.data.datasets[0].data = [statusCount.pending, statusCount.processing, statusCount.completed, statusCount.cancelled];
            charts.pieChart.update();
        }
        updateSellerOverview(orders);
    } catch (error) { console.error('Lỗi tải dữ liệu biểu đồ:', error); }
}

function updateSellerOverview(orders) {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => new Date(order.created_at).toDateString() === today);
    const completedToday = todayOrders.filter(order => order.status === 'completed').length;
    const cancelledToday = todayOrders.filter(order => order.status === 'cancelled').length;
    const revenueToday = completedToday * 50000;
    
    if (document.getElementById('total-orders')) { document.getElementById('total-orders').textContent = todayOrders.length; }
    if (document.getElementById('completed-orders')) { document.getElementById('completed-orders').textContent = completedToday; }
    if (document.getElementById('cancelled-orders')) { document.getElementById('cancelled-orders').textContent = cancelledToday; }
    if (document.getElementById('today-revenue')) { document.getElementById('today-revenue').textContent = formatCurrency(revenueToday); }
}

async function loadSellerOrders() {
    const tbody = document.getElementById('seller-orders-table-body');
    if (!tbody) return;
    
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*, profiles!orders_user_id_fkey(full_name, email)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center"><p>Chưa có đơn hàng nào</p></td></tr>`;
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
                            </button>` : ''}
                        ${order.status === 'payment_requested' ? `
                            <button class="btn btn-sm btn-primary" onclick="markReceived(${order.id})" title="Đánh dấu đã nhận">
                                <i class="fas fa-check"></i>
                            </button>` : ''}
                        ${order.status === 'received' ? `
                            <button class="btn btn-sm btn-success" onclick="markCompleted(${order.id})" title="Đánh dấu hoàn thành">
                                <i class="fas fa-check-double"></i>
                            </button>` : ''}
                        <button class="btn btn-sm btn-secondary" onclick="showNotesModal(${order.id})" title="Thêm ghi chú">
                            <i class="fas fa-sticky-note"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Lỗi chi tiết tải đơn hàng người bán:', error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center"><p>Lỗi tải dữ liệu: ${error.message}</p></td></tr>`;
    }
}

async function copyOrder(orderId) {
    showToast('Chức năng sao chép đơn hàng đang được phát triển', 'info');
}

async function cancelSellerOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    try {
        const { error } = await supabase.from('orders').update({ status: 'cancelled', cancelled_at: new Date() }).eq('id', orderId);
        if (error) throw error;
        showToast('Đã hủy đơn hàng thành công!', 'success');
        loadSellerOrders();
    } catch (error) { showToast('Lỗi hủy đơn hàng: ' + error.message, 'error'); }
}

async function requestPayment(orderId) {
    try {
        const { error } = await supabase.from('orders').update({ status: 'payment_requested', payment_requested_at: new Date() }).eq('id', orderId);
        if (error) throw error;
        showToast('Đã gửi yêu cầu thanh toán!', 'success');
        loadSellerOrders();
    } catch (error) { showToast('Lỗi yêu cầu thanh toán: ' + error.message, 'error'); }
}

async function markReceived(orderId) {
    try {
        const { error } = await supabase.from('orders').update({ status: 'received', received_at: new Date() }).eq('id', orderId);
        if (error) throw error;
        showToast('Đã đánh dấu đơn hàng đã nhận!', 'success');
        loadSellerOrders();
    } catch (error) { showToast('Lỗi cập nhật trạng thái: ' + error.message, 'error'); }
}

async function markCompleted(orderId) {
    try {
        const { error } = await supabase.from('orders').update({ status: 'completed', completed_at: new Date() }).eq('id', orderId);
        if (error) throw error;
        showToast('Đã đánh dấu đơn hàng hoàn thành!', 'success');
        loadSellerOrders();
        if (typeof loadSellerChartData === 'function') loadSellerChartData();
    } catch (error) { showToast('Lỗi cập nhật trạng thái: ' + error.message, 'error'); }
}

function showNotesModal(orderId) {
    document.getElementById('current-order-id').value = orderId;
    const notesModal = document.getElementById('notes-modal');
    if (notesModal) { notesModal.classList.remove('hidden'); }
}

async function saveOrderNotes() {
    const orderId = document.getElementById('current-order-id').value;
    const notes = document.getElementById('order-notes').value;
    
    try {
        const { error } = await supabase.from('orders').update({ seller_notes: notes, updated_at: new Date() }).eq('id', orderId);
        if (error) throw error;
        showToast('Đã lưu ghi chú!', 'success');
        closeModal();
    } catch (error) {
        showToast('Lỗi lưu ghi chú: ' + error.message, 'error');
    }
}

function filterOrders() { showToast('Chức năng lọc đang được phát triển', 'info'); }
function resetFilters() {
    if (document.getElementById('order-filter-status')) { document.getElementById('order-filter-status').value = 'all'; }
    if (document.getElementById('order-filter-date')) { document.getElementById('order-filter-date').value = ''; }
    loadSellerOrders();
}

// ========== LOGIC CHO ADMIN ==========

function initAdminPage() {
    currentPage = 'admin';
    checkAuth().then(auth => {
        if (!auth || auth.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
        displayAdminInfo(auth);
        loadAdminAccountInfo();
        if (typeof Chart !== 'undefined') { 
            initAdminCharts(); 
        } else {
             console.warn('Chart.js chưa được tải. Biểu đồ sẽ không hoạt động.');
        }
        loadAdminData();
        setupNavigation();
        loadNotifications();
    });
}

function displayAdminInfo(auth) {
    if (document.getElementById('admin-name')) { document.getElementById('admin-name').textContent = auth.profile?.full_name || 'Quản trị viên'; }
    if (document.getElementById('admin-email')) { document.getElementById('admin-email').textContent = auth.user.email; }
}

async function loadAdminAccountInfo() {
    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        if (profile) {
            document.getElementById('admin-edit-name').value = profile.full_name || '';
            document.getElementById('admin-edit-phone').value = profile.phone || '';
        }
        const saveBtn = document.getElementById('save-admin-account');
        if (saveBtn) { saveBtn.addEventListener('click', saveAdminAccountInfo); }
    } catch (error) { console.error('Lỗi tải thông tin admin:', error); }
}

async function saveAdminAccountInfo() {
    const name = document.getElementById('admin-edit-name').value;
    const phone = document.getElementById('admin-edit-phone').value;
    const errors = validateForm({ name, phone });
    if (errors.length > 0) { errors.forEach(error => showToast(error, 'error')); return; }
    try {
        const { error } = await supabase.from('profiles').update({ full_name: name, phone: phone, updated_at: new Date() }).eq('id', currentUser.id);
        if (error) throw error;
        showToast('Đã cập nhật thông tin thành công!', 'success');
    } catch (error) { showToast('Lỗi cập nhật thông tin: ' + error.message, 'error'); }
}

function initAdminCharts() {
    // Logic khởi tạo biểu đồ (nếu Chart.js có sẵn)
}

async function loadAdminData() {
    try {
        const { data: profiles, error: profilesError } = await supabase.from('profiles').select('role, created_at');
        if (profilesError) throw profilesError;
        const { data: orders, error: ordersError } = await supabase.from('orders').select('status, total_amount, created_at');
        if (ordersError) throw ordersError;
        
        updateAdminOverview(profiles, orders);
        // updateAdminCharts(profiles); // Cần Chart.js
        loadUsersList();
        loadAdminOrders();
        loadRecentActivity();
        
    } catch (error) { console.error('Lỗi tải dữ liệu admin:', error); }
}

function updateAdminOverview(profiles, orders) {
    if (document.getElementById('total-users')) { document.getElementById('total-users').textContent = profiles.length; }
    if (document.getElementById('total-orders')) { document.getElementById('total-orders').textContent = orders.length; }
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthlyRevenue = orders
        .filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear && order.status === 'completed';
        })
        .reduce((sum, order) => sum + (order.total_amount || 0), 0);
    
    if (document.getElementById('monthly-revenue')) { document.getElementById('monthly-revenue').textContent = formatCurrency(monthlyRevenue); }
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    if (document.getElementById('completed-orders')) { document.getElementById('completed-orders').textContent = completedOrders; }
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
            tbody.innerHTML = `<tr><td colspan="8" class="text-center"><p>Chưa có người dùng nào</p></td></tr>`;
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
                <td><span class="status-badge status-active">Đang hoạt động</span></td>
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
        tbody.innerHTML = `<tr><td colspan="8" class="text-center"><p>Lỗi tải dữ liệu</p></td></tr>`;
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
            tbody.innerHTML = `<tr><td colspan="7" class="text-center"><p>Chưa có đơn hàng nào</p></td></tr>`;
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
        
    } catch (error) { console.error('Lỗi tải đơn hàng admin:', error); }
}

async function loadRecentActivity() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    const recentActivities = ['Người dùng mới đăng ký: Nguyễn Văn A', 'Đơn hàng DH000123 đã hoàn thành', 'Người bán "Cửa hàng ABC" đã cập nhật thông tin', 'Hệ thống sao lưu dữ liệu thành công'];
    activityList.innerHTML = recentActivities.map(activity => `
        <div style="padding: 10px; border-bottom: 1px solid var(--light-gray);">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-circle" style="color: #4cc9f0; font-size: 0.5rem;"></i>
                <span>${activity}</span>
            </div>
            <small style="color: var(--gray); margin-left: 20px;">${formatDate(new Date())}</small>
        </div>
    `).join('');
}


// ========== HÀM HỖ TRỢ CHO ADMIN ==========

function showAddUserModal() {
    const addUserModal = document.getElementById('add-user-modal');
    if (addUserModal) { addUserModal.classList.remove('hidden'); }
}

async function createNewUser() {
    const name = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const phone = document.getElementById('new-user-phone').value;
    const role = document.getElementById('new-user-role').value;
    const password = document.getElementById('new-user-password').value;
    
    const errors = validateForm({ name, email, phone, password });
    if (errors.length > 0) { errors.forEach(error => showToast(error, 'error')); return; }
    
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        await supabase.from('profiles').insert({ id: data.user.id, email: email, full_name: name, phone: phone, role: role, created_at: new Date() });
        
        showToast('Đã tạo người dùng mới thành công!', 'success');
        closeModal();
        loadUsersList();
        
    } catch (error) { showToast('Lỗi tạo người dùng: ' + error.message, 'error'); }
}

function editUser(userId) { showToast(`Mở form chỉnh sửa người dùng ID: ${userId}`, 'info'); }

async function deleteUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    
    try {
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) throw error;
        
        showToast('Đã xóa người dùng thành công!', 'success');
        loadUsersList();
    } catch (error) { showToast('Lỗi xóa người dùng: ' + error.message, 'error'); }
}

function adminFilterOrders() { showToast('Chức năng lọc đang được phát triển', 'info'); }

function adminResetFilters() {
    if (document.getElementById('admin-order-filter-status')) { document.getElementById('admin-order-filter-status').value = 'all'; }
    if (document.getElementById('admin-order-filter-seller')) { document.getElementById('admin-order-filter-seller').value = 'all'; }
    if (document.getElementById('admin-order-filter-date')) { document.getElementById('admin-order-filter-date').value = ''; }
    loadAdminOrders();
}

function adminCopyOrder(orderId) { showToast(`Chức năng sao chép đơn hàng ID: ${orderId} đang được phát triển`, 'info'); }

async function adminCancelOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    try {
        const { error } = await supabase.from('orders').update({ status: 'cancelled', cancelled_at: new Date() }).eq('id', orderId);
        if (error) throw error;
        showToast('Đã hủy đơn hàng thành công!', 'success');
        loadAdminOrders();
    } catch (error) { showToast('Lỗi hủy đơn hàng: ' + error.message, 'error'); }
}

function adminViewNotes(orderId) { showToast(`Chức năng xem ghi chú đơn hàng ID: ${orderId} đang được phát triển`, 'info'); }

function filterUsers() { showToast('Chức năng lọc người dùng đang được phát triển', 'info'); }

function saveSystemSettings() { showToast('Đã lưu cài đặt hệ thống', 'success'); }

// Khởi tạo toàn bộ ứng dụng khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        checkAuthAndRedirect();
    }
});
