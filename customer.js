// ========== KẾT NỐI SUPABASE ==========
// THAY THẾ URL VÀ KEY BẰNG THÔNG TIN CỦA BẠN
const SUPABASE_URL = 'https://rjvcadzrvoyedajraeyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdmNhZHpydm95ZWRhanJhZXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTY4ODYsImV4cCI6MjA3OTYzMjg4Nn0.hsauloLzZ0F7qZGjPE6c0iAFjxXGFZdCIbs0aOWdepA';

// Khởi tạo Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Biến toàn cục
let currentUser = null;
let orders = [];
let users = [];
let printPrices = {
    'text': 1000,
    'print': 2000,
    'extra_page': 500
};
let supportChats = [];

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
    console.log('Đang khởi tạo trang...');
    
    // Kiểm tra xem đang ở trang nào
    const h1 = document.querySelector('h1');
    const isAdminPage = h1 && h1.textContent && h1.textContent.toUpperCase().includes('ADMIN');
    
    // Tải dữ liệu từ Supabase
    initializeApp().then(() => {
        if (isAdminPage) {
            console.log('Đang ở trang ADMIN');
            initializeAdminPage();
        } else {
            console.log('Đang ở trang KHÁCH HÀNG');
            initializeCustomerPage();
        }
    }).catch(error => {
        console.error('Lỗi khởi tạo:', error);
        showMessage('Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại.');
    });
});

// Khởi tạo ứng dụng - tải dữ liệu từ Supabase
async function initializeApp() {
    try {
        // Kiểm tra trạng thái đăng nhập
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUser = {
                id: session.user.id,
                email: session.user.email,
                // Lấy thêm thông tin user từ bảng users
                ...(await getUserProfile(session.user.id))
            };
            console.log('User đã đăng nhập:', currentUser);
        }

        // Tải giá in từ Supabase
        await loadPrintPrices();
        
        // Tải danh sách users (chỉ cho admin)
        if (currentUser && currentUser.role === 'admin') {
            await loadUsersFromSupabase();
        }
        
        console.log('Khởi tạo ứng dụng thành công');
    } catch (error) {
        console.error('Lỗi khởi tạo ứng dụng:', error);
        throw error;
    }
}

// ========== TRANG KHÁCH HÀNG ==========
function initializeCustomerPage() {
    console.log('Khởi tạo trang khách hàng');
    checkLoginStatus();
    setupCustomerEventListeners();
    updateAdminLinkVisibility();
    showSection('home-section');
    updatePriceDisplay();
    calculateTotalPrice();
}

function setupCustomerEventListeners() {
    console.log('Thiết lập sự kiện cho khách hàng');
    
    // Navigation
    document.getElementById('nav-home')?.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('home-section');
    });
    
    document.getElementById('nav-orders')?.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('orders-section');
        loadOrders();
    });
    
    document.getElementById('nav-support')?.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('support-section');
        loadSupportChat();
    });
    
    document.getElementById('nav-account')?.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('account-section');
        updateAccountDisplay();
    });
    
    // Form đơn hàng
    document.getElementById('order-type')?.addEventListener('change', () => {
        toggleOrderOptions();
        calculateTotalPrice();
    });
    
    document.getElementById('create-order')?.addEventListener('click', (e) => {
        e.preventDefault();
        createOrder();
    });
    
    document.getElementById('reset-form')?.addEventListener('click', (e) => {
        e.preventDefault();
        resetOrderForm();
    });
    
    document.getElementById('table-count')?.addEventListener('change', () => {
        generateTableInputs();
        calculateTotalPrice();
    });
    
    document.getElementById('page-count')?.addEventListener('change', () => {
        calculateTotalPrice();
    });
    
    // Tài khoản
    document.getElementById('login-btn')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        handleLogin(); 
    });
    
    document.getElementById('register-btn')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        register(); 
    });
    
    document.getElementById('logout-btn')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        logout(); 
    });
    
    document.getElementById('show-register')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showRegisterForm(); 
    });
    
    document.getElementById('show-login')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showLoginForm(); 
    });
    
    // Tìm kiếm
    document.getElementById('search-orders')?.addEventListener('input', (e) => {
        searchOrders(e.target.value);
    });
    
    // Modal đóng
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
}

// ========== TRANG ADMIN ==========
function initializeAdminPage() {
    console.log('Khởi tạo trang admin');
    checkAdminLoginStatus();
    setupAdminEventListeners();
    updateCustomerLinkVisibility();
    showSection('orders-section');
}

function setupAdminEventListeners() {
    console.log('Thiết lập sự kiện cho admin');
    
    // Navigation admin
    document.getElementById('nav-orders')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showSection('orders-section'); 
        loadAdminOrders(); 
    });
    
    document.getElementById('nav-statistics')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showSection('statistics-section'); 
        loadUserStatistics(); 
    });
    
    document.getElementById('nav-support')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showSection('support-section'); 
        loadAdminSupportChats(); 
    });
    
    document.getElementById('nav-account')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showSection('account-section'); 
        updateAdminAccountDisplay(); 
    });
    
    // Đăng nhập admin
    document.getElementById('admin-login-btn')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        handleAdminLogin(); 
    });
    
    document.getElementById('admin-logout-btn')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        adminLogout(); 
    });
    
    // Tìm kiếm admin
    document.getElementById('search-orders')?.addEventListener('input', (e) => {
        searchAdminOrders(e.target.value);
    });
    
    // Modal đóng
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
}

// ========== HÀM SUPABASE ==========

// Tải giá in từ Supabase
async function loadPrintPrices() {
    try {
        const { data, error } = await supabase
            .from('print_prices')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1);
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            printPrices = {
                text: data[0].price_text,
                print: data[0].price_print,
                extra_page: data[0].price_extra_page
            };
        }
        console.log('Đã tải giá in:', printPrices);
    } catch (error) {
        console.error('Lỗi tải giá in:', error);
    }
}

// Lấy thông tin user profile
async function getUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Lỗi lấy thông tin user:', error);
        return null;
    }
}

// Tải danh sách users từ Supabase
async function loadUsersFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        users = data || [];
        console.log('Đã tải users:', users.length);
    } catch (error) {
        console.error('Lỗi tải users:', error);
        users = [];
    }
}

// ========== ĐĂNG KÝ/ĐĂNG NHẬP VỚI SUPABASE AUTH ==========

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    try {
        // Đăng nhập với Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Lấy thông tin user profile
        const userProfile = await getUserProfile(data.user.id);
        
        currentUser = {
            id: data.user.id,
            email: data.user.email,
            ...userProfile
        };
        
        showMessage('Đăng nhập thành công!');
        
        // Kiểm tra và chuyển hướng nếu là admin
        if (currentUser.role === 'admin') {
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            updateAccountDisplay();
            updateAdminLinkVisibility();
        }
        
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        showMessage('Email hoặc mật khẩu không đúng');
    }
}

async function handleAdminLogin() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    if (!email || !password) {
        showMessage('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    try {
        // Đăng nhập với Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Lấy thông tin user profile
        const userProfile = await getUserProfile(data.user.id);
        
        if (userProfile.role !== 'admin') {
            showMessage('Tài khoản không có quyền admin');
            await supabase.auth.signOut();
            return;
        }
        
        currentUser = {
            id: data.user.id,
            email: data.user.email,
            ...userProfile
        };
        
        updateAdminAccountDisplay();
        showMessage('Đăng nhập admin thành công!');
        updateCustomerLinkVisibility();
        
    } catch (error) {
        console.error('Lỗi đăng nhập admin:', error);
        showMessage('Thông tin đăng nhập không đúng');
    }
}

async function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    
    if (!name || !email || !phone || !password || !confirm) {
        showMessage('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    if (password !== confirm) {
        showMessage('Mật khẩu xác nhận không khớp');
        return;
    }
    
    try {
        // Đăng ký với Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });
        
        if (error) throw error;
        
        // Thêm thông tin vào bảng users
        const { error: profileError } = await supabase
            .from('users')
            .insert([
                {
                    id: data.user.id,
                    name: name,
                    email: email,
                    phone: phone,
                    role: 'customer',
                    status: 'active'
                }
            ]);
            
        if (profileError) throw profileError;
        
        showMessage('Đăng ký thành công! Vui lòng đăng nhập.');
        showLoginForm();
        
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        showMessage('Lỗi đăng ký: ' + error.message);
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        updateAccountDisplay();
        showMessage('Đã đăng xuất');
        
        const adminLink = document.querySelector('footer a[href="admin.html"]');
        if (adminLink) {
            adminLink.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi đăng xuất:', error);
    }
}

async function adminLogout() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        updateAdminAccountDisplay();
        showMessage('Đã đăng xuất');
        
        const customerLink = document.querySelector('footer a[href="index.html"]');
        if (customerLink) {
            customerLink.style.display = 'block';
        }
    } catch (error) {
        console.error('Lỗi đăng xuất admin:', error);
    }
}

// ========== QUẢN LÝ ĐƠN HÀNG VỚI SUPABASE ==========

async function createOrder() {
    if (!currentUser) {
        showMessage('Vui lòng đăng nhập để tạo đơn hàng');
        return;
    }
    
    const orderType = document.getElementById('order-type').value;
    const fontSize = document.getElementById('font-size').value;
    const fontWeight = document.getElementById('font-weight').value;
    const orientation = document.querySelector('input[name="orientation"]:checked').value;
    const pageCount = parseInt(document.getElementById('page-count').value) || 1;
    const tableCount = parseInt(document.getElementById('table-count').value) || 0;
    
    let content = '';
    let fileData = null;
    let tables = [];
    
    // Kiểm tra dữ liệu đầu vào
    if (orderType === 'print') {
        const fileInput = document.getElementById('file-upload');
        if (!fileInput.files[0]) {
            showMessage('Vui lòng chọn file để in');
            return;
        }
        content = fileInput.files[0].name;
        fileData = {
            name: fileInput.files[0].name,
            size: fileInput.files[0].size,
            type: fileInput.files[0].type
        };
    } else {
        const textContent = document.getElementById('text-content');
        if (!textContent.value.trim()) {
            showMessage('Vui lòng nhập nội dung cần in');
            return;
        }
        content = textContent.value;
        
        // Lấy dữ liệu bảng nếu có
        if (tableCount > 0) {
            const tableTitles = document.querySelectorAll('.table-title');
            const tableContents = document.querySelectorAll('.table-content');
            
            for (let i = 0; i < tableCount; i++) {
                if (tableTitles[i] && tableContents[i]) {
                    const title = tableTitles[i].value.trim();
                    const tableContent = tableContents[i].value.trim();
                    
                    if (title || tableContent) {
                        tables.push({
                            title: title || `Bảng ${i + 1}`,
                            content: tableContent || 'Nội dung trống'
                        });
                    }
                }
            }
        }
    }
    
    // Tính giá
    let totalPrice = calculateOrderPrice(orderType, pageCount, tableCount);
    
    try {
        // Thêm đơn hàng vào Supabase
        const { data, error } = await supabase
            .from('orders')
            .insert([
                {
                    user_id: currentUser.id,
                    type: orderType,
                    content: content,
                    font_size: fontSize,
                    font_weight: fontWeight,
                    orientation: orientation,
                    page_count: pageCount,
                    table_count: tableCount,
                    tables: tables,
                    total_price: totalPrice,
                    file_data: fileData,
                    status: 'pending',
                    payment_status: 'pending'
                }
            ])
            .select();
            
        if (error) throw error;
        
        showMessage(`✅ Tạo đơn hàng thành công! Tổng tiền: ${formatCurrency(totalPrice)}`);
        resetOrderForm();
        
        // Tự động chuyển đến trang đơn hàng
        showSection('orders-section');
        loadOrders();
        
    } catch (error) {
        console.error('Lỗi tạo đơn hàng:', error);
        showMessage('Lỗi tạo đơn hàng: ' + error.message);
    }
}

async function loadOrders() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    if (!currentUser) {
        ordersList.innerHTML = '<p>Vui lòng đăng nhập để xem đơn hàng</p>';
        return;
    }
    
    try {
        // Lấy đơn hàng từ Supabase
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        displayOrders(data || [], ordersList);
        
    } catch (error) {
        console.error('Lỗi tải đơn hàng:', error);
        ordersList.innerHTML = '<p>Lỗi tải đơn hàng</p>';
    }
}

async function loadAdminOrders() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    if (!currentUser || currentUser.role !== 'admin') {
        ordersList.innerHTML = '<p>Vui lòng đăng nhập với quyền admin</p>';
        return;
    }
    
    try {
        // Lấy tất cả đơn hàng từ Supabase
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                users (name, email)
            `)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        displayAdminOrders(data || [], ordersList);
        
    } catch (error) {
        console.error('Lỗi tải đơn hàng admin:', error);
        ordersList.innerHTML = '<p>Lỗi tải đơn hàng</p>';
    }
}

// ========== CÁC HÀM HIỂN THỊ (giữ nguyên từ code cũ) ==========

function displayOrders(userOrders, ordersList) {
    if (userOrders.length === 0) {
        ordersList.innerHTML = '<p>Bạn chưa có đơn hàng nào</p>';
        return;
    }
    
    ordersList.innerHTML = userOrders.map(order => {
        let paymentSection = '';
        if (order.status === 'processing' && order.payment_status === 'pending') {
            paymentSection = `
                <div class="payment-section">
                    <h4>💳 Thanh Toán</h4>
                    <div class="payment-info">
                        <p><strong>Số tiền:</strong> ${formatCurrency(order.total_price)}</p>
                        <p><strong>Ngân hàng:</strong> Vietcombank</p>
                        <p><strong>Số tài khoản:</strong> 1234567890123</p>
                        <p><strong>Chủ tài khoản:</strong> NGUYEN VAN A</p>
                        <div class="payment-image-upload">
                            <label>Tải lên ảnh chuyển khoản:</label>
                            <input type="file" id="payment-image-${order.id}" accept="image/*">
                            <button onclick="uploadPaymentImage('${order.id}')" class="payment-btn">Tải lên ảnh & Xác nhận</button>
                        </div>
                        ${order.payment_image ? `
                            <div class="payment-image-preview">
                                <p>Ảnh đã tải lên:</p>
                                <img src="${order.payment_image}" alt="Ảnh chuyển khoản" style="max-width: 200px;">
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else if (order.payment_status === 'paid') {
            paymentSection = `
                <div class="payment-section paid">
                    <p>✅ Đã thanh toán</p>
                    ${order.payment_image ? `
                        <div class="payment-image-preview">
                            <p>Ảnh chuyển khoản:</p>
                            <img src="${order.payment_image}" alt="Ảnh chuyển khoản" style="max-width: 200px;">
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        // Hiển thị thông tin bảng nếu có
        let tablesInfo = '';
        if (order.tables && order.tables.length > 0) {
            tablesInfo = order.tables.map((table, index) => `
                <div class="table-info">
                    <p><strong>Bảng ${index + 1}:</strong> ${table.title}</p>
                    <p><em>${table.content}</em></p>
                </div>
            `).join('');
        }
        
        return `
            <div class="order-item">
                <div class="order-header">
                    <span class="order-id">Đơn hàng #${order.id}</span>
                    <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-details">
                    <p><strong>Loại:</strong> ${order.type === 'print' ? 'In ấn' : 'In chữ'}</p>
                    <p><strong>Nội dung:</strong> ${order.content}</p>
                    <p><strong>Số trang:</strong> ${order.page_count}</p>
                    <p><strong>Số bảng:</strong> ${order.table_count || 0}</p>
                    <p><strong>Thành tiền:</strong> ${formatCurrency(order.total_price)}</p>
                    <p><strong>Cỡ chữ:</strong> ${order.font_size}pt</p>
                    <p><strong>Độ đậm:</strong> ${getFontWeightText(order.font_weight)}</p>
                    <p><strong>Hướng in:</strong> ${order.orientation === 'portrait' ? 'Nằm thẳng' : 'Nằm ngang'}</p>
                    <p><strong>Ngày tạo:</strong> ${formatDate(order.created_at)}</p>
                    ${tablesInfo}
                </div>
                ${paymentSection}
                <div class="order-actions">
                    ${order.status === 'pending' ? `
                        <button class="danger" onclick="cancelOrder('${order.id}')">Huỷ</button>
                        <button class="secondary" onclick="remakeOrder('${order.id}')">Làm Lại</button>
                    ` : ''}
                    <button class="secondary" onclick="showCopyOptions('${order.id}', 'customer')">Sao chép</button>
                </div>
            </div>
        `;
    }).join('');
}

function displayAdminOrders(ordersToDisplay, ordersList) {
    if (ordersToDisplay.length === 0) {
        ordersList.innerHTML = '<p>Chưa có đơn hàng nào</p>';
        return;
    }
    
    ordersList.innerHTML = ordersToDisplay.map(order => {
        const user = order.users || { name: 'Khách hàng', email: 'N/A' };
        
        let priceSettingsBtn = '';
        if (order.status === 'pending') {
            priceSettingsBtn = `<button class="secondary" onclick="showPriceSettings('${order.id}')">Điều chỉnh giá</button>`;
        }
        
        return `
            <div class="order-item">
                <div class="order-header">
                    <span class="order-id">Đơn hàng #${order.id}</span>
                    <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                    <span class="payment-status ${order.payment_status}">${order.payment_status === 'paid' ? '✅ Đã TT' : '⏳ Chờ TT'}</span>
                </div>
                <div class="order-details">
                    <p><strong>Khách hàng:</strong> ${user.name} (${user.email})</p>
                    <p><strong>Loại:</strong> ${order.type === 'print' ? 'In ấn' : 'In chữ'}</p>
                    <p><strong>Nội dung:</strong> ${order.content}</p>
                    <p><strong>Số trang:</strong> ${order.page_count}</p>
                    <p><strong>Số bảng:</strong> ${order.table_count || 0}</p>
                    <p><strong>Thành tiền:</strong> ${formatCurrency(order.total_price)}</p>
                    <p><strong>Cỡ chữ:</strong> ${order.font_size}pt</p>
                    <p><strong>Độ đậm:</strong> ${getFontWeightText(order.font_weight)}</p>
                    <p><strong>Hướng in:</strong> ${order.orientation === 'portrait' ? 'Nằm thẳng' : 'Nằm ngang'}</p>
                    <p><strong>Ngày tạo:</strong> ${formatDate(order.created_at)}</p>
                    ${order.payment_image ? `
                        <div class="payment-image-preview">
                            <p><strong>Ảnh chuyển khoản:</strong></p>
                            <img src="${order.payment_image}" alt="Ảnh chuyển khoản" style="max-width: 200px;">
                        </div>
                    ` : ''}
                </div>
                <div class="order-actions">
                    ${priceSettingsBtn}
                    ${order.file_data ? `
                        <button class="secondary" onclick="downloadFile('${order.id}')">Tải file</button>
                    ` : ''}
                    <button class="secondary" onclick="showCopyOptions('${order.id}', 'admin')">Sao chép</button>
                    ${order.status === 'pending' ? `
                        <button onclick="acceptOrder('${order.id}')">Nhận đơn</button>
                        <button class="danger" onclick="cancelOrderAdmin('${order.id}')">Huỷ</button>
                    ` : ''}
                    ${order.status === 'processing' ? `
                        <button onclick="completeOrder('${order.id}')">Hoàn thành</button>
                        <button class="danger" onclick="cancelOrderAdmin('${order.id}')">Huỷ</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ========== CÁC HÀM QUẢN LÝ ĐƠN HÀNG (cập nhật với Supabase) ==========

async function uploadPaymentImage(orderId) {
    const fileInput = document.getElementById(`payment-image-${orderId}`);
    if (!fileInput || !fileInput.files[0]) {
        showMessage('Vui lòng chọn ảnh chuyển khoản');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        const imageData = e.target.result;
        
        try {
            // Cập nhật ảnh thanh toán trong Supabase
            const { error } = await supabase
                .from('orders')
                .update({
                    payment_image: imageData,
                    payment_status: 'paid'
                })
                .eq('id', orderId);
                
            if (error) throw error;
            
            showMessage('✅ Đã tải lên ảnh chuyển khoản và xác nhận thanh toán');
            loadOrders();
            
        } catch (error) {
            console.error('Lỗi upload ảnh:', error);
            showMessage('Lỗi upload ảnh: ' + error.message);
        }
    };
    
    reader.readAsDataURL(file);
}

async function cancelOrder(orderId) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId);
            
        if (error) throw error;
        
        showMessage('Đã huỷ đơn hàng');
        loadOrders();
        
    } catch (error) {
        console.error('Lỗi huỷ đơn hàng:', error);
        showMessage('Lỗi huỷ đơn hàng: ' + error.message);
    }
}

async function acceptOrder(orderId) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'processing' })
            .eq('id', orderId);
            
        if (error) throw error;
        
        showMessage('Đã nhận đơn hàng');
        loadAdminOrders();
        
    } catch (error) {
        console.error('Lỗi nhận đơn hàng:', error);
        showMessage('Lỗi nhận đơn hàng: ' + error.message);
    }
}

async function completeOrder(orderId) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'completed' })
            .eq('id', orderId);
            
        if (error) throw error;
        
        showMessage('Đã hoàn thành đơn hàng');
        loadAdminOrders();
        
    } catch (error) {
        console.error('Lỗi hoàn thành đơn hàng:', error);
        showMessage('Lỗi hoàn thành đơn hàng: ' + error.message);
    }
}

async function cancelOrderAdmin(orderId) {
    try {
        const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId);
            
        if (error) throw error;
        
        showMessage('Đã huỷ đơn hàng');
        loadAdminOrders();
        
    } catch (error) {
        console.error('Lỗi huỷ đơn hàng:', error);
        showMessage('Lỗi huỷ đơn hàng: ' + error.message);
    }
}

// ========== QUẢN LÝ NGƯỜI DÙNG (cập nhật với Supabase) ==========

async function loadUserStatistics() {
    const usersTable = document.getElementById('users-table');
    if (!usersTable) return;
    
    const tbody = usersTable.querySelector('tbody');
    if (!tbody) return;
    
    if (!currentUser || currentUser.role !== 'admin') {
        tbody.innerHTML = '<tr><td colspan="7">Vui lòng đăng nhập với quyền admin</td></tr>';
        return;
    }
    
    try {
        await loadUsersFromSupabase();
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Chưa có người dùng nào</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map((user, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td>${user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</td>
                <td>${user.status === 'active' ? 'Hoạt động' : 'Bị khoá'}</td>
                <td>
                    <button onclick="manageUser('${user.id}')">Quản lý</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Lỗi tải thống kê user:', error);
        tbody.innerHTML = '<tr><td colspan="7">Lỗi tải dữ liệu</td></tr>';
    }
}

async function manageUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('user-management-modal');
    const form = document.getElementById('user-management-form');
    
    if (!modal || !form) return;
    
    form.innerHTML = `
        <div class="form-group">
            <label>Họ tên: ${user.name}</label>
        </div>
        <div class="form-group">
            <label>Email: ${user.email}</label>
        </div>
        <div class="form-group">
            <label>Vai trò:</label>
            <select id="user-role">
                <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Khách hàng</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Quản trị viên</option>
            </select>
        </div>
        <div class="form-group">
            <label>Trạng thái:</label>
            <select id="user-status">
                <option value="active" ${user.status === 'active' ? 'selected' : ''}>Hoạt động</option>
                <option value="locked" ${user.status === 'locked' ? 'selected' : ''}>Bị khoá</option>
            </select>
        </div>
        <div class="form-actions">
            <button onclick="saveUserChanges('${userId}')">Lưu thay đổi</button>
            <button class="danger" onclick="deleteUser('${userId}')">Xoá tài khoản</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

async function saveUserChanges(userId) {
    const newRole = document.getElementById('user-role').value;
    const newStatus = document.getElementById('user-status').value;
    
    try {
        const { error } = await supabase
            .from('users')
            .update({
                role: newRole,
                status: newStatus
            })
            .eq('id', userId);
            
        if (error) throw error;
        
        const modal = document.getElementById('user-management-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        showMessage('Đã cập nhật thông tin người dùng');
        loadUserStatistics();
        
    } catch (error) {
        console.error('Lỗi cập nhật user:', error);
        showMessage('Lỗi cập nhật: ' + error.message);
    }
}

async function deleteUser(userId) {
    if (confirm('Bạn có chắc chắn muốn xoá tài khoản này?')) {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);
                
            if (error) throw error;
            
            const modal = document.getElementById('user-management-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            showMessage('Đã xoá tài khoản');
            loadUserStatistics();
            
        } catch (error) {
            console.error('Lỗi xoá user:', error);
            showMessage('Lỗi xoá user: ' + error.message);
        }
    }
}

// ========== CÀI ĐẶT GIÁ (cập nhật với Supabase) ==========

async function showPriceSettings() {
    const modal = document.getElementById('user-management-modal');
    const form = document.getElementById('user-management-form');
    
    if (!modal || !form) return;
    
    form.innerHTML = `
        <h3>Cài đặt giá in ấn toàn hệ thống</h3>
        <div class="form-group">
            <label for="price-text">Giá in chữ (trang đầu):</label>
            <input type="number" id="price-text" value="${printPrices.text}" min="0">
        </div>
        <div class="form-group">
            <label for="price-print">Giá in ảnh/tài liệu (trang đầu):</label>
            <input type="number" id="price-print" value="${printPrices.print}" min="0">
        </div>
        <div class="form-group">
            <label for="price-extra">Giá trang thêm:</label>
            <input type="number" id="price-extra" value="${printPrices.extra_page}" min="0">
        </div>
        <div class="form-actions">
            <button onclick="saveSystemPriceSettings()">Lưu cài đặt giá</button>
            <button class="secondary" onclick="resetSystemPriceSettings()">Đặt lại mặc định</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

async function saveSystemPriceSettings() {
    const priceText = parseInt(document.getElementById('price-text').value);
    const pricePrint = parseInt(document.getElementById('price-print').value);
    const priceExtra = parseInt(document.getElementById('price-extra').value);
    
    if (isNaN(priceText) || isNaN(pricePrint) || isNaN(priceExtra) || 
        priceText < 0 || pricePrint < 0 || priceExtra < 0) {
        showMessage('Vui lòng nhập giá hợp lệ (số không âm)');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('print_prices')
            .insert([
                {
                    price_text: priceText,
                    price_print: pricePrint,
                    price_extra_page: priceExtra
                }
            ]);
            
        if (error) throw error;
        
        // Cập nhật giá hiện tại
        printPrices = {
            text: priceText,
            print: pricePrint,
            extra_page: priceExtra
        };
        
        const modal = document.getElementById('user-management-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        showMessage('Đã cập nhật giá hệ thống thành công!');
        
        if (!document.querySelector('h1').textContent.includes('ADMIN')) {
            updatePriceDisplay();
            calculateTotalPrice();
        }
        
    } catch (error) {
        console.error('Lỗi lưu giá:', error);
        showMessage('Lỗi lưu giá: ' + error.message);
    }
}

// ========== CÁC HÀM HỖ TRỢ (giữ nguyên) ==========

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
}

function showMessage(message) {
    const modal = document.getElementById('message-modal');
    const messageElement = document.getElementById('modal-message');
    
    if (modal && messageElement) {
        messageElement.textContent = message;
        modal.style.display = 'block';
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
}

function formatCurrency(amount) {
    try {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    } catch (e) {
        return amount + '₫';
    }
}

function toggleOrderOptions() {
    const orderType = document.getElementById('order-type');
    const printOptions = document.getElementById('print-options');
    const textOptions = document.getElementById('text-options');
    const tableSection = document.getElementById('table-section');
    
    if (!orderType || !printOptions || !textOptions || !tableSection) return;
    
    if (orderType.value === 'print') {
        printOptions.style.display = 'block';
        textOptions.style.display = 'none';
        tableSection.style.display = 'none';
    } else {
        printOptions.style.display = 'none';
        textOptions.style.display = 'block';
        tableSection.style.display = 'block';
    }
}

function generateTableInputs() {
    const tableCount = document.getElementById('table-count');
    const tableInputsContainer = document.getElementById('table-inputs-container');
    
    if (!tableCount || !tableInputsContainer) return;
    
    const count = parseInt(tableCount.value) || 0;
    tableInputsContainer.innerHTML = '';
    
    if (count > 0) {
        tableInputsContainer.innerHTML = `
            <h4>Nhập tiêu đề và nội dung cho các bảng:</h4>
            <div id="tables-container"></div>
        `;
        
        const tablesContainer = document.getElementById('tables-container');
        for (let i = 1; i <= count; i++) {
            const tableDiv = document.createElement('div');
            tableDiv.className = 'table-input-group';
            tableDiv.innerHTML = `
                <div class="form-group">
                    <label>Tiêu đề bảng ${i}:</label>
                    <input type="text" class="table-title" placeholder="Nhập tiêu đề bảng ${i}">
                </div>
                <div class="form-group">
                    <label>Nội dung bảng ${i}:</label>
                    <textarea class="table-content" rows="3" placeholder="Nhập nội dung bảng ${i}"></textarea>
                </div>
            `;
            tablesContainer.appendChild(tableDiv);
        }
    }
}

function updatePriceDisplay() {
    const priceDisplay = document.getElementById('price-display');
    if (priceDisplay) {
        priceDisplay.innerHTML = `
            <div class="price-info">
                <h3>💰 Bảng Giá In Ấn</h3>
                <div class="price-list">
                    <div class="price-item">
                        <span class="price-label">In chữ (trang đầu):</span>
                        <span class="price-value">${formatCurrency(printPrices.text)}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">In ảnh/tài liệu (trang đầu):</span>
                        <span class="price-value">${formatCurrency(printPrices.print)}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">Trang thêm:</span>
                        <span class="price-value">${formatCurrency(printPrices.extra_page)}/trang</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">Phí mỗi bảng:</span>
                        <span class="price-value">${formatCurrency(500)}/bảng</span>
                    </div>
                </div>
            </div>
        `;
    }
}

function calculateOrderPrice(orderType, pageCount, tableCount) {
    let price = 0;
    
    if (orderType === 'text') {
        price = (printPrices.text || 0) + ((pageCount - 1) * (printPrices.extra_page || 0));
    } else if (orderType === 'print') {
        price = (printPrices.print || 0) + ((pageCount - 1) * (printPrices.extra_page || 0));
    }
    
    // Thêm phí cho bảng nếu có
    if (tableCount > 0) {
        price += tableCount * 500;
    }
    
    return price;
}

function calculateTotalPrice() {
    const orderType = document.getElementById('order-type');
    const pageCount = document.getElementById('page-count');
    const tableCount = document.getElementById('table-count');
    const totalPrice = document.getElementById('total-price');
    
    if (!orderType || !pageCount || !totalPrice) return;
    
    const type = orderType.value;
    const pages = parseInt(pageCount.value) || 1;
    const tables = parseInt(tableCount ? tableCount.value : 0) || 0;
    
    const price = calculateOrderPrice(type, pages, tables);
    totalPrice.textContent = formatCurrency(price);
}

function resetOrderForm() {
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.reset();
        toggleOrderOptions();
        generateTableInputs();
        calculateTotalPrice();
    } else {
        const textContent = document.getElementById('text-content');
        if (textContent) textContent.value = '';
        generateTableInputs();
        calculateTotalPrice();
    }
}

function checkLoginStatus() {
    if (currentUser) {
        // Nếu là admin đang ở trang khách hàng, chuyển hướng
        if (currentUser.role === 'admin') {
            console.log('Phát hiện admin ở trang khách hàng, chuyển hướng...');
            window.location.href = 'admin.html';
            return;
        }
        
        updateAccountDisplay();
    }
}

function checkAdminLoginStatus() {
    if (currentUser) {
        // Nếu không phải admin đang ở trang admin, chuyển hướng
        if (currentUser.role !== 'admin') {
            console.log('Phát hiện người dùng thường ở trang admin, chuyển hướng...');
            window.location.href = 'index.html';
            return;
        }
        
        updateAdminAccountDisplay();
    }
}

function updateAccountDisplay() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const accountInfo = document.getElementById('account-info');
    const userDetails = document.getElementById('user-details');
    
    if (currentUser && loginForm && registerForm && accountInfo && userDetails) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        accountInfo.style.display = 'block';
        
        userDetails.innerHTML = `
            <p><strong>Họ tên:</strong> ${currentUser.name}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>SĐT:</strong> ${currentUser.phone}</p>
            <p><strong>Vai trò:</strong> Khách hàng</p>
        `;
    } else if (loginForm && registerForm && accountInfo) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        accountInfo.style.display = 'none';
    }
}

function updateAdminAccountDisplay() {
    const loginForm = document.getElementById('admin-login-form');
    const accountInfo = document.getElementById('admin-account-info');
    const adminDetails = document.getElementById('admin-details');
    
    if (currentUser && loginForm && accountInfo && adminDetails) {
        loginForm.style.display = 'none';
        accountInfo.style.display = 'block';
        
        adminDetails.innerHTML = `
            <p><strong>Họ tên:</strong> ${currentUser.name}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Vai trò:</strong> Quản trị viên</p>
        `;
    } else if (loginForm && accountInfo) {
        loginForm.style.display = 'block';
        accountInfo.style.display = 'none';
    }
}

function updateAdminLinkVisibility() {
    const adminLink = document.querySelector('footer a[href="admin.html"]');
    if (!adminLink) return;
    if (currentUser && currentUser.role !== 'admin') {
        adminLink.style.display = 'none';
    } else {
        adminLink.style.display = 'block';
    }
}

function updateCustomerLinkVisibility() {
    const customerLink = document.querySelector('footer a[href="index.html"]');
    if (customerLink && currentUser) {
        customerLink.style.display = 'none';
    }
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function searchOrders(searchTerm) {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList || !searchTerm) {
        loadOrders();
        return;
    }
    
    // Tìm kiếm sẽ được xử lý ở client-side
    // Trong thực tế, bạn có thể triển khai tìm kiếm server-side
    loadOrders(); // Tạm thời reload tất cả
}

function searchAdminOrders(searchTerm) {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList || !searchTerm) {
        loadAdminOrders();
        return;
    }
    
    // Tìm kiếm sẽ được xử lý ở client-side
    loadAdminOrders(); // Tạm thời reload tất cả
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Chờ xử lý',
        'processing': 'Đang xử lý',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã huỷ'
    };
    return statusMap[status] || status;
}

function getFontWeightText(weight) {
    const weightMap = {
        'normal': 'Bình thường',
        'bold': 'Đậm',
        'bolder': 'Rất đậm'
    };
    return weightMap[weight] || weight;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN');
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN');
}

// Các hàm remakeOrder, showCopyOptions, downloadFile, v.v... 
// có thể được thêm tương tự như trong code gốc

// ========== ÂM THANH ẨN ==========
document.addEventListener('DOMContentLoaded', (event) => {
    const sound = document.getElementById("hiddenSound");

    function playHiddenSound() {
        if (sound) {
            sound.play().then(() => {
                console.log("Âm thanh đang chạy ẩn!");
            }).catch(error => {
                console.error("Không thể phát âm thanh:", error);
            });
        }
        
        document.removeEventListener('click', playHiddenSound);
        document.removeEventListener('touchstart', playHiddenSound);
    }

    document.addEventListener('click', playHiddenSound, { once: true });
    document.addEventListener('touchstart', playHiddenSound, { once: true });
});