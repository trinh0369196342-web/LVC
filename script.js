// Các hàm chung cho tất cả trang

// Hàm hiển thị thông báo
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
    
    // Nút đóng
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
}

// Thêm CSS cho toast
const toastStyles = document.createElement('style');
toastStyles.textContent = `
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    padding: 15px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 300px;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    z-index: 9999;
}

.toast.show {
    transform: translateX(0);
}

.toast-success {
    border-left: 4px solid #4cc9f0;
}

.toast-error {
    border-left: 4px solid #f72585;
}

.toast-info {
    border-left: 4px solid #4361ee;
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.toast-content i {
    font-size: 1.2rem;
}

.toast-success .toast-content i {
    color: #4cc9f0;
}

.toast-error .toast-content i {
    color: #f72585;
}

.toast-info .toast-content i {
    color: #4361ee;
}

.toast-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
}
`;
document.head.appendChild(toastStyles);

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

// Hàm kiểm tra nội dung trắc nghiệm (regex)
function containsMultipleChoice(content) {
    const mcRegex = /^[A-Da-d]\s*[\.\)]\s*/gm;
    return mcRegex.test(content);
}

// Hàm validate form
function validateForm(formData) {
    const errors = [];
    
    if (!formData.name?.trim()) {
        errors.push('Vui lòng nhập họ tên');
    }
    
    if (!formData.phone?.trim()) {
        errors.push('Vui lòng nhập số điện thoại');
    } else if (!/^\d{10,11}$/.test(formData.phone)) {
        errors.push('Số điện thoại không hợp lệ');
    }
    
    if (!formData.address?.trim()) {
        errors.push('Vui lòng nhập địa chỉ');
    }
    
    return errors;
}

// Hàm xử lý lỗi
function handleError(error, context = '') {
    console.error(`Error ${context}:`, error);
    showToast(`Lỗi ${context}: ${error.message}`, 'error');
}

// Hàm khởi tạo order form cho khách hàng
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
                <h4>Bảng ${i}</h4>
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
        tempAmountDisplay.textContent = formatCurrency(total);
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
                if (typeof loadOrders === 'function') {
                    loadOrders();
                }
                
            } catch (error) {
                handleError(error, 'tạo đơn hàng');
            }
        });
    }
}

// Hàm tải đơn hàng cho khách hàng
async function loadOrders() {
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
                            <button class="btn btn-sm btn-danger" onclick="cancelOrder(${order.id})">
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
        handleError(error, 'tải đơn hàng');
    }
}

// Hàm hủy đơn hàng
async function cancelOrder(orderId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;
    
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        showToast('Đã hủy đơn hàng thành công!', 'success');
        loadOrders();
        
    } catch (error) {
        handleError(error, 'hủy đơn hàng');
    }
}

// Hàm làm lại đơn hàng
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
        
        // Chuyển sang trang đặt hàng và prefill data
        document.querySelector('[href="#order"]').click();
        
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
        handleError(error, 'tải đơn hàng cũ');
    }
}

// Hàm lấy text trạng thái
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

// Hàm khởi tạo chat
function initChat() {
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
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Subscribe để nhận tin nhắn realtime
    subscribeToMessages();
}

async function sendMessage() {
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
            document.getElementById('file-name').textContent = 'Chưa chọn file';
        }
        
        showToast('Đã gửi tin nhắn!', 'success');
        
    } catch (error) {
        handleError(error, 'gửi tin nhắn');
    }
}

async function subscribeToMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    // Load tin nhắn cũ
    await loadMessages();
    
    // Subscribe để nhận tin nhắn mới realtime
    supabase
        .channel('messages')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
        }, async (payload) => {
            // Kiểm tra nếu tin nhắn dành cho người dùng hiện tại
            const isForCurrentUser = 
                payload.new.receiver_type === currentUserRole || 
                payload.new.sender_id === currentUser.id ||
                payload.new.receiver_type === 'all';
            
            if (isForCurrentUser) {
                await loadMessages();
            }
        })
        .subscribe();
}

async function loadMessages() {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    try {
        // Lấy tin nhắn liên quan đến người dùng hiện tại
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*, profiles:sender_id(full_name)')
            .or(`sender_id.eq.${currentUser.id},receiver_type.eq.${currentUserRole},receiver_type.eq.all`)
            .order('created_at', { ascending: true })
            .limit(50);
        
        if (error) throw error;
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="message empty">
                    <p>Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</p>
                </div>
            `;
            return;
        }
        
        messagesContainer.innerHTML = messages.map(msg => {
            const isSent = msg.sender_id === currentUser.id;
            const senderName = msg.profiles?.full_name || 'Người dùng';
            
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
                                <a href="${msg.file_url}" target="_blank">Tệp đính kèm</a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Scroll xuống tin nhắn mới nhất
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        handleError(error, 'tải tin nhắn');
    }
}

// Hàm tải và lưu thông tin tài khoản
async function loadAccountInfo() {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (profile) {
            document.getElementById('edit-name')?.value = profile.full_name || '';
            document.getElementById('edit-phone')?.value = profile.phone || '';
            document.getElementById('edit-address')?.value = profile.address || '';
        }
        
        // Lắng nghe sự kiện lưu thông tin
        const saveBtn = document.getElementById('save-account');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveAccountInfo);
        }
        
    } catch (error) {
        handleError(error, 'tải thông tin tài khoản');
    }
}

async function saveAccountInfo() {
    const name = document.getElementById('edit-name')?.value || '';
    const phone = document.getElementById('edit-phone')?.value || '';
    const address = document.getElementById('edit-address')?.value || '';
    
    const errors = validateForm({ name, phone, address });
    if (errors.length > 0) {
        errors.forEach(error => showToast(error, 'error'));
        return;
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: currentUser.id,
                full_name: name,
                phone: phone,
                address: address,
                updated_at: new Date()
            });
        
        if (error) throw error;
        
        showToast('Đã cập nhật thông tin thành công!', 'success');
        
        // Cập nhật hiển thị tên
        const userNameElement = document.getElementById('customer-name');
        if (userNameElement) {
            userNameElement.textContent = name;
        }
        
    } catch (error) {
        handleError(error, 'lưu thông tin tài khoản');
    }
}

// Export các hàm cần thiết
window.logout = logout;
window.cancelOrder = cancelOrder;
window.redoOrder = redoOrder;