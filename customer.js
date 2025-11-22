// Biến toàn cục
let currentUser = null;
let orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
let adminOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
let supportMessages = JSON.parse(localStorage.getItem('supportMessages')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];
let printPrices = JSON.parse(localStorage.getItem('printPrices')) || {
    'text': 1000,
    'print': 2000,
    'extra_page': 500
};

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xem đang ở trang nào
    const isAdminPage = document.querySelector('h1').textContent.includes('ADMIN');
    
    if (isAdminPage) {
        initializeAdminPage();
    } else {
        initializeCustomerPage();
    }
});

// ========== TRANG KHÁCH HÀNG ==========
function initializeCustomerPage() {
    checkLoginStatus();
    setupCustomerEventListeners();
    updateAdminLinkVisibility();
    showSection('home-section');
    updatePriceDisplay();
}

function setupCustomerEventListeners() {
    // Navigation
    const navHome = document.getElementById('nav-home');
    const navOrders = document.getElementById('nav-orders');
    const navSupport = document.getElementById('nav-support');
    const navAccount = document.getElementById('nav-account');
    
    if (navHome) navHome.addEventListener('click', () => showSection('home-section'));
    if (navOrders) navOrders.addEventListener('click', () => {
        showSection('orders-section');
        loadOrders();
    });
    if (navSupport) navSupport.addEventListener('click', () => {
        showSection('support-section');
        loadSupportHistory();
    });
    if (navAccount) navAccount.addEventListener('click', () => {
        showSection('account-section');
        updateAccountDisplay();
    });
    
    // Form đơn hàng
    const orderType = document.getElementById('order-type');
    const createOrder = document.getElementById('create-order');
    const resetForm = document.getElementById('reset-form');
    const pageCount = document.getElementById('page-count');
    
    if (orderType) orderType.addEventListener('change', toggleOrderOptions);
    if (createOrder) createOrder.addEventListener('click', createOrder);
    if (resetForm) resetForm.addEventListener('click', resetOrderForm);
    if (pageCount) pageCount.addEventListener('change', calculateTotalPrice);
    
    // Tài khoản
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    
    if (loginBtn) loginBtn.addEventListener('click', login);
    if (registerBtn) registerBtn.addEventListener('click', register);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (showRegister) showRegister.addEventListener('click', showRegisterForm);
    if (showLogin) showLogin.addEventListener('click', showLoginForm);
    
    // Hỗ trợ
    const sendSupport = document.getElementById('send-support');
    if (sendSupport) sendSupport.addEventListener('click', sendSupportMessage);
    
    // Modal
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
    checkAdminLoginStatus();
    setupAdminEventListeners();
    updateCustomerLinkVisibility();
    showSection('orders-section');
}

function setupAdminEventListeners() {
    // Navigation admin
    const navOrders = document.getElementById('nav-orders');
    const navStatistics = document.getElementById('nav-statistics');
    const navSupport = document.getElementById('nav-support');
    const navAccount = document.getElementById('nav-account');
    
    if (navOrders) navOrders.addEventListener('click', () => {
        showSection('orders-section');
        loadAdminOrders();
    });
    if (navStatistics) navStatistics.addEventListener('click', () => {
        showSection('statistics-section');
        loadUserStatistics();
    });
    if (navSupport) navSupport.addEventListener('click', () => {
        showSection('support-section');
        loadAdminSupport();
    });
    if (navAccount) navAccount.addEventListener('click', () => {
        showSection('account-section');
        updateAdminAccountDisplay();
    });
    
    // Đăng nhập admin
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    
    if (adminLoginBtn) adminLoginBtn.addEventListener('click', adminLogin);
    if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', adminLogout);
    
    // Modal
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
}

// ========== HÀM CHUNG ==========
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

// ========== TÍNH NĂNG GIÁ IN MỚI ==========
function updatePriceDisplay() {
    const priceDisplay = document.getElementById('price-display');
    if (priceDisplay) {
        priceDisplay.innerHTML = `
            <h3>Bảng Giá In Ấn</h3>
            <div class="price-list">
                <div class="price-item">
                    <span>In chữ (trang đầu):</span>
                    <span>${formatCurrency(printPrices.text)}</span>
                </div>
                <div class="price-item">
                    <span>In ảnh/tài liệu (trang đầu):</span>
                    <span>${formatCurrency(printPrices.print)}</span>
                </div>
                <div class="price-item">
                    <span>Trang thêm:</span>
                    <span>${formatCurrency(printPrices.extra_page)}/trang</span>
                </div>
            </div>
        `;
    }
}

function calculateTotalPrice() {
    const orderType = document.getElementById('order-type');
    const pageCount = document.getElementById('page-count');
    const totalPrice = document.getElementById('total-price');
    
    if (!orderType || !pageCount || !totalPrice) return;
    
    const type = orderType.value;
    const pages = parseInt(pageCount.value) || 1;
    
    let price = 0;
    if (type === 'text') {
        price = printPrices.text + (pages - 1) * printPrices.extra_page;
    } else if (type === 'print') {
        price = printPrices.print + (pages - 1) * printPrices.extra_page;
    }
    
    totalPrice.textContent = formatCurrency(price);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// ========== HÀM KHÁCH HÀNG ==========
function checkLoginStatus() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        
        if (currentUser.role === 'admin') {
            window.location.href = 'admin.html';
            return;
        }
        
        updateAccountDisplay();
    }
}

function updateAdminLinkVisibility() {
    const adminLink = document.querySelector('footer a[href="admin.html"]');
    if (adminLink && currentUser) {
        adminLink.style.display = 'none';
    }
}

function toggleOrderOptions() {
    const orderType = document.getElementById('order-type').value;
    const printOptions = document.getElementById('print-options');
    const textOptions = document.getElementById('text-options');
    const pageCountGroup = document.getElementById('page-count-group');
    
    if (printOptions && textOptions && pageCountGroup) {
        if (orderType === 'print') {
            printOptions.style.display = 'block';
            textOptions.style.display = 'none';
        } else {
            printOptions.style.display = 'none';
            textOptions.style.display = 'block';
        }
        pageCountGroup.style.display = 'block';
    }
    
    calculateTotalPrice();
}

function createOrder() {
    if (!currentUser) {
        showMessage('Vui lòng đăng nhập để tạo đơn hàng');
        return;
    }
    
    const orderType = document.getElementById('order-type').value;
    const fontSize = document.getElementById('font-size').value;
    const fontWeight = document.getElementById('font-weight').value;
    const orientation = document.querySelector('input[name="orientation"]:checked').value;
    const pageCount = parseInt(document.getElementById('page-count').value) || 1;
    
    let content = '';
    let fileData = null;
    
    if (orderType === 'print') {
        const fileInput = document.getElementById('file-upload');
        if (!fileInput.files[0]) {
            showMessage('Vui lòng chọn file để in');
            return;
        }
        content = fileInput.files[0].name;
        // Lưu thông tin file (trong thực tế cần upload lên server)
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
    }
    
    // Tính giá
    let totalPrice = 0;
    if (orderType === 'text') {
        totalPrice = printPrices.text + (pageCount - 1) * printPrices.extra_page;
    } else if (orderType === 'print') {
        totalPrice = printPrices.print + (pageCount - 1) * printPrices.extra_page;
    }
    
    const newOrder = {
        id: generateOrderId(),
        userId: currentUser.id,
        userName: currentUser.name,
        type: orderType,
        content: content,
        fontSize: fontSize,
        fontWeight: fontWeight,
        orientation: orientation,
        pageCount: pageCount,
        totalPrice: totalPrice,
        fileData: fileData,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    localStorage.setItem('customerOrders', JSON.stringify(orders));
    
    // Thêm vào danh sách admin
    adminOrders.push(newOrder);
    localStorage.setItem('adminOrders', JSON.stringify(adminOrders));
    
    showMessage('Tạo đơn hàng thành công!');
    resetOrderForm();
}

function resetOrderForm() {
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.reset();
        toggleOrderOptions();
        calculateTotalPrice();
    }
}

function loadOrders() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    if (!currentUser) {
        ordersList.innerHTML = '<p>Vui lòng đăng nhập để xem đơn hàng</p>';
        return;
    }
    
    const userOrders = orders.filter(order => order.userId === currentUser.id);
    
    if (userOrders.length === 0) {
        ordersList.innerHTML = '<p>Bạn chưa có đơn hàng nào</p>';
        return;
    }
    
    ordersList.innerHTML = userOrders.map(order => `
        <div class="order-item">
            <div class="order-header">
                <span class="order-id">Đơn hàng #${order.id}</span>
                <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-details">
                <p><strong>Loại:</strong> ${order.type === 'print' ? 'In ấn' : 'In chữ'}</p>
                <p><strong>Nội dung:</strong> ${order.content}</p>
                <p><strong>Số trang:</strong> ${order.pageCount}</p>
                <p><strong>Thành tiền:</strong> ${formatCurrency(order.totalPrice)}</p>
                <p><strong>Cỡ chữ:</strong> ${order.fontSize}pt</p>
                <p><strong>Độ đậm:</strong> ${getFontWeightText(order.fontWeight)}</p>
                <p><strong>Hướng in:</strong> ${order.orientation === 'portrait' ? 'Nằm thẳng' : 'Nằm ngang'}</p>
                <p><strong>Ngày tạo:</strong> ${formatDate(order.createdAt)}</p>
            </div>
            <div class="order-actions">
                ${order.status === 'pending' ? `
                    <button class="danger" onclick="cancelOrder('${order.id}')">Huỷ</button>
                    <button class="secondary" onclick="remakeOrder('${order.id}')">Làm Lại</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function cancelOrder(orderId) {
    const orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
        orders[orderIndex].status = 'cancelled';
        localStorage.setItem('customerOrders', JSON.stringify(orders));
        
        const adminOrderIndex = adminOrders.findIndex(order => order.id === orderId);
        if (adminOrderIndex !== -1) {
            adminOrders[adminOrderIndex].status = 'cancelled';
            localStorage.setItem('adminOrders', JSON.stringify(adminOrders));
        }
        
        showMessage('Đã huỷ đơn hàng');
        loadOrders();
    }
}

function remakeOrder(orderId) {
    const order = orders.find(order => order.id === orderId);
    if (order) {
        showSection('home-section');
        document.getElementById('order-type').value = order.type;
        toggleOrderOptions();
        
        if (order.type === 'text') {
            document.getElementById('text-content').value = order.content;
        }
        
        document.getElementById('font-size').value = order.fontSize;
        document.getElementById('font-weight').value = order.fontWeight;
        document.getElementById('page-count').value = order.pageCount;
        
        const orientationRadio = document.querySelector(`input[name="orientation"][value="${order.orientation}"]`);
        if (orientationRadio) {
            orientationRadio.checked = true;
        }
        
        calculateTotalPrice();
        showMessage('Thông tin đơn hàng đã được điền sẵn. Vui lòng chỉnh sửa và tạo lại.');
    }
}

function register() {
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
    
    if (users.find(user => user.email === email)) {
        showMessage('Email đã được sử dụng');
        return;
    }
    
    const newUser = {
        id: generateUserId(),
        name: name,
        email: email,
        phone: phone,
        password: password,
        role: 'customer',
        status: 'active',
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    showMessage('Đăng ký thành công! Vui lòng đăng nhập.');
    showLoginForm();
}

function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    if (email === 'fuwun123@gmail.com' && password === 'H@chin123') {
        showMessage('Đây là tài khoản admin. Đang chuyển hướng...');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1500);
        return;
    }
    
    const user = users.find(u => u.email === email && u.password === password && u.status === 'active');
    
    if (user) {
        if (user.role === 'admin') {
            showMessage('Đây là tài khoản admin. Đang chuyển hướng...');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1500);
            return;
        }
        
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAccountDisplay();
        showMessage('Đăng nhập thành công!');
        updateAdminLinkVisibility();
    } else {
        showMessage('Email hoặc mật khẩu không đúng');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAccountDisplay();
    showMessage('Đã đăng xuất');
    
    const adminLink = document.querySelector('footer a[href="admin.html"]');
    if (adminLink) {
        adminLink.style.display = 'block';
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

function showRegisterForm(e) {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLoginForm(e) {
    if (e) e.preventDefault();
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function sendSupportMessage() {
    if (!currentUser) {
        showMessage('Vui lòng đăng nhập để gửi yêu cầu hỗ trợ');
        return;
    }
    
    const message = document.getElementById('support-message').value;
    if (!message.trim()) {
        showMessage('Vui lòng nhập nội dung cần hỗ trợ');
        return;
    }
    
    const newMessage = {
        id: generateMessageId(),
        userId: currentUser.id,
        userName: currentUser.name,
        message: message,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    supportMessages.push(newMessage);
    localStorage.setItem('supportMessages', JSON.stringify(supportMessages));
    
    document.getElementById('support-message').value = '';
    showMessage('Đã gửi yêu cầu hỗ trợ');
    loadSupportHistory();
}

function loadSupportHistory() {
    const supportHistory = document.getElementById('support-history');
    if (!supportHistory) return;
    
    if (!currentUser) {
        supportHistory.innerHTML = '<p>Vui lòng đăng nhập để xem lịch sử hỗ trợ</p>';
        return;
    }
    
    const userMessages = supportMessages.filter(msg => msg.userId === currentUser.id);
    
    if (userMessages.length === 0) {
        supportHistory.innerHTML = '<p>Bạn chưa gửi yêu cầu hỗ trợ nào</p>';
        return;
    }
    
    supportHistory.innerHTML = userMessages.map(msg => `
        <div class="order-item">
            <div class="order-header">
                <span>Yêu cầu hỗ trợ #${msg.id}</span>
                <span class="order-status status-${msg.status}">${getStatusText(msg.status)}</span>
            </div>
            <div class="order-details">
                <p><strong>Nội dung:</strong> ${msg.message}</p>
                <p><strong>Ngày gửi:</strong> ${formatDate(msg.createdAt)}</p>
            </div>
        </div>
    `).join('');
}

// ========== HÀM ADMIN ==========
function checkAdminLoginStatus() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        updateAdminAccountDisplay();
        loadPriceSettings();
    }
}

function updateCustomerLinkVisibility() {
    const customerLink = document.querySelector('footer a[href="index.html"]');
    if (customerLink && currentUser) {
        customerLink.style.display = 'none';
    }
}

function adminLogin() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    if (!email || !password) {
        showMessage('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    if (email === 'fuwun123@gmail.com' && password === 'H@chin123') {
        currentUser = {
            id: 'admin',
            name: 'Quản trị viên',
            email: email,
            role: 'admin'
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAdminAccountDisplay();
        showMessage('Đăng nhập admin thành công!');
        updateCustomerLinkVisibility();
        loadPriceSettings();
        return;
    }
    
    const user = users.find(u => u.email === email && u.password === password && u.role === 'admin' && u.status === 'active');
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAdminAccountDisplay();
        showMessage('Đăng nhập admin thành công!');
        updateCustomerLinkVisibility();
        loadPriceSettings();
    } else {
        showMessage('Thông tin đăng nhập không đúng hoặc không có quyền admin');
    }
}

function adminLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAdminAccountDisplay();
    showMessage('Đã đăng xuất');
    
    const customerLink = document.querySelector('footer a[href="index.html"]');
    if (customerLink) {
        customerLink.style.display = 'block';
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
            ${currentUser.role === 'admin' ? `
                <div class="admin-actions">
                    <button onclick="showPriceSettings()" class="secondary">Cài đặt giá</button>
                </div>
            ` : ''}
        `;
    } else if (loginForm && accountInfo) {
        loginForm.style.display = 'block';
        accountInfo.style.display = 'none';
    }
}

// ========== TÍNH NĂNG QUẢN LÝ GIÁ MỚI ==========
function showPriceSettings() {
    const modal = document.getElementById('user-management-modal');
    const form = document.getElementById('user-management-form');
    
    if (!modal || !form) return;
    
    form.innerHTML = `
        <h3>Cài đặt giá in ấn</h3>
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
            <button onclick="savePriceSettings()">Lưu giá</button>
            <button class="secondary" onclick="resetPriceSettings()">Đặt lại mặc định</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function loadPriceSettings() {
    // Đã được load trong biến toàn cục
}

function savePriceSettings() {
    const priceText = parseInt(document.getElementById('price-text').value);
    const pricePrint = parseInt(document.getElementById('price-print').value);
    const priceExtra = parseInt(document.getElementById('price-extra').value);
    
    if (isNaN(priceText) || isNaN(pricePrint) || isNaN(priceExtra)) {
        showMessage('Vui lòng nhập giá hợp lệ');
        return;
    }
    
    printPrices = {
        text: priceText,
        print: pricePrint,
        extra_page: priceExtra
    };
    
    localStorage.setItem('printPrices', JSON.stringify(printPrices));
    
    const modal = document.getElementById('user-management-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    showMessage('Đã cập nhật giá thành công!');
}

function resetPriceSettings() {
    printPrices = {
        'text': 1000,
        'print': 2000,
        'extra_page': 500
    };
    
    document.getElementById('price-text').value = printPrices.text;
    document.getElementById('price-print').value = printPrices.print;
    document.getElementById('price-extra').value = printPrices.extra_page;
    
    showMessage('Đã đặt lại giá mặc định');
}

function loadAdminOrders() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    if (!currentUser || currentUser.role !== 'admin') {
        ordersList.innerHTML = '<p>Vui lòng đăng nhập với quyền admin</p>';
        return;
    }
    
    if (adminOrders.length === 0) {
        ordersList.innerHTML = '<p>Chưa có đơn hàng nào</p>';
        return;
    }
    
    ordersList.innerHTML = adminOrders.map(order => {
        const user = users.find(u => u.id === order.userId) || { name: order.userName || 'Khách hàng', email: 'N/A' };
        
        return `
            <div class="order-item">
                <div class="order-header">
                    <span class="order-id">Đơn hàng #${order.id}</span>
                    <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-details">
                    <p><strong>Khách hàng:</strong> ${user.name} (${user.email})</p>
                    <p><strong>Loại:</strong> ${order.type === 'print' ? 'In ấn' : 'In chữ'}</p>
                    <p><strong>Nội dung:</strong> ${order.content}</p>
                    <p><strong>Số trang:</strong> ${order.pageCount}</p>
                    <p><strong>Thành tiền:</strong> ${formatCurrency(order.totalPrice)}</p>
                    <p><strong>Cỡ chữ:</strong> ${order.fontSize}pt</p>
                    <p><strong>Độ đậm:</strong> ${getFontWeightText(order.fontWeight)}</p>
                    <p><strong>Hướng in:</strong> ${order.orientation === 'portrait' ? 'Nằm thẳng' : 'Nằm ngang'}</p>
                    <p><strong>Ngày tạo:</strong> ${formatDate(order.createdAt)}</p>
                </div>
                <div class="order-actions">
                    ${order.fileData ? `
                        <button class="secondary" onclick="downloadFile('${order.id}')">Tải file</button>
                    ` : ''}
                    <button class="secondary" onclick="copyOrderInfo('${order.id}')">Sao chép</button>
                    ${order.status === 'pending' ? `
                        <button onclick="acceptOrder('${order.id}')">Nhận</button>
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

// ========== TÍNH NĂNG TẢI FILE VÀ SAO CHÉP MỚI ==========
function downloadFile(orderId) {
    const order = adminOrders.find(order => order.id === orderId);
    if (!order || !order.fileData) {
        showMessage('Không có file để tải');
        return;
    }
    
    // Trong thực tế, đây sẽ là API call để tải file từ server
    // Hiện tại chỉ mô phỏng
    showMessage(`Đang tải file: ${order.fileData.name}`);
    
    // Tạo một file tạm để tải xuống (mô phỏng)
    const content = order.type === 'text' ? order.content : 'File in ấn từ khách hàng';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = order.fileData.name || `order_${orderId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function copyOrderInfo(orderId) {
    const order = adminOrders.find(order => order.id === orderId);
    if (!order) return;
    
    const orderInfo = `
ĐƠN HÀNG #${order.id}
Khách hàng: ${order.userName}
Loại: ${order.type === 'print' ? 'In ấn' : 'In chữ'}
Nội dung: ${order.content}
Số trang: ${order.pageCount}
Thành tiền: ${formatCurrency(order.totalPrice)}
Cỡ chữ: ${order.fontSize}pt
Độ đậm: ${getFontWeightText(order.fontWeight)}
Hướng in: ${order.orientation === 'portrait' ? 'Nằm thẳng' : 'Nằm ngang'}
Ngày tạo: ${formatDate(order.createdAt)}
    `.trim();
    
    navigator.clipboard.writeText(orderInfo).then(() => {
        showMessage('Đã sao chép thông tin đơn hàng');
    }).catch(() => {
        showMessage('Không thể sao chép thông tin');
    });
}

function acceptOrder(orderId) {
    const orderIndex = adminOrders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
        adminOrders[orderIndex].status = 'processing';
        localStorage.setItem('adminOrders', JSON.stringify(adminOrders));
        
        const customerOrderIndex = orders.findIndex(order => order.id === orderId);
        if (customerOrderIndex !== -1) {
            orders[customerOrderIndex].status = 'processing';
            localStorage.setItem('customerOrders', JSON.stringify(orders));
        }
        
        showMessage('Đã nhận đơn hàng');
        loadAdminOrders();
    }
}

function completeOrder(orderId) {
    const orderIndex = adminOrders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
        adminOrders[orderIndex].status = 'completed';
        localStorage.setItem('adminOrders', JSON.stringify(adminOrders));
        
        const customerOrderIndex = orders.findIndex(order => order.id === orderId);
        if (customerOrderIndex !== -1) {
            orders[customerOrderIndex].status = 'completed';
            localStorage.setItem('customerOrders', JSON.stringify(orders));
        }
        
        showMessage('Đã hoàn thành đơn hàng');
        loadAdminOrders();
    }
}

function cancelOrderAdmin(orderId) {
    const orderIndex = adminOrders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
        adminOrders[orderIndex].status = 'cancelled';
        localStorage.setItem('adminOrders', JSON.stringify(adminOrders));
        
        const customerOrderIndex = orders.findIndex(order => order.id === orderId);
        if (customerOrderIndex !== -1) {
            orders[customerOrderIndex].status = 'cancelled';
            localStorage.setItem('customerOrders', JSON.stringify(orders));
        }
        
        showMessage('Đã huỷ đơn hàng');
        loadAdminOrders();
    }
}

function loadUserStatistics() {
    const usersTable = document.getElementById('users-table');
    if (!usersTable) return;
    
    const tbody = usersTable.querySelector('tbody');
    if (!tbody) return;
    
    if (!currentUser || currentUser.role !== 'admin') {
        tbody.innerHTML = '<tr><td colspan="7">Vui lòng đăng nhập với quyền admin</td></tr>';
        return;
    }
    
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
}

function manageUser(userId) {
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
        <div id="lock-duration" style="display:${user.status === 'locked' ? 'block' : 'none'}">
            <div class="form-group">
                <label>Thời gian khoá (ngày):</label>
                <input type="number" id="lock-days" min="1" value="7">
            </div>
        </div>
        <div class="form-actions">
            <button onclick="saveUserChanges('${userId}')">Lưu thay đổi</button>
            <button class="danger" onclick="deleteUser('${userId}')">Xoá tài khoản</button>
        </div>
    `;
    
    const userStatus = document.getElementById('user-status');
    if (userStatus) {
        userStatus.addEventListener('change', function() {
            const lockDuration = document.getElementById('lock-duration');
            if (lockDuration) {
                lockDuration.style.display = this.value === 'locked' ? 'block' : 'none';
            }
        });
    }
    
    modal.style.display = 'block';
}

function saveUserChanges(userId) {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return;
    
    const newRole = document.getElementById('user-role').value;
    const newStatus = document.getElementById('user-status').value;
    
    users[userIndex].role = newRole;
    users[userIndex].status = newStatus;
    
    localStorage.setItem('users', JSON.stringify(users));
    
    const modal = document.getElementById('user-management-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    showMessage('Đã cập nhật thông tin người dùng');
    loadUserStatistics();
}

function deleteUser(userId) {
    if (confirm('Bạn có chắc chắn muốn xoá tài khoản này?')) {
        users = users.filter(u => u.id !== userId);
        localStorage.setItem('users', JSON.stringify(users));
        
        const modal = document.getElementById('user-management-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        showMessage('Đã xoá tài khoản');
        loadUserStatistics();
    }
}

function loadAdminSupport() {
    const supportMessagesContainer = document.getElementById('support-messages');
    if (!supportMessagesContainer) return;
    
    if (!currentUser || currentUser.role !== 'admin') {
        supportMessagesContainer.innerHTML = '<p>Vui lòng đăng nhập với quyền admin</p>';
        return;
    }
    
    if (supportMessages.length === 0) {
        supportMessagesContainer.innerHTML = '<p>Chưa có tin nhắn hỗ trợ nào</p>';
        return;
    }
    
    supportMessagesContainer.innerHTML = supportMessages.map(msg => {
        const user = users.find(u => u.id === msg.userId) || { name: msg.userName || 'Khách hàng', email: 'N/A' };
        
        return `
            <div class="order-item">
                <div class="order-header">
                    <span>Yêu cầu hỗ trợ #${msg.id}</span>
                    <span class="order-status status-${msg.status}">${getStatusText(msg.status)}</span>
                </div>
                <div class="order-details">
                    <p><strong>Khách hàng:</strong> ${user.name} (${user.email})</p>
                    <p><strong>Nội dung:</strong> ${msg.message}</p>
                    <p><strong>Ngày gửi:</strong> ${formatDate(msg.createdAt)}</p>
                </div>
                <div class="order-actions">
                    ${msg.status === 'pending' ? `
                        <button onclick="resolveSupport('${msg.id}')">Đã xử lý</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function resolveSupport(messageId) {
    const msgIndex = supportMessages.findIndex(msg => msg.id === messageId);
    if (msgIndex !== -1) {
        supportMessages[msgIndex].status = 'completed';
        localStorage.setItem('supportMessages', JSON.stringify(supportMessages));
        
        showMessage('Đã đánh dấu tin nhắn đã xử lý');
        loadAdminSupport();
    }
}

// ========== HÀM TIỆN ÍCH ==========
function generateOrderId() {
    return 'ORD' + Date.now();
}

function generateUserId() {
    return 'USER' + Date.now();
}

function generateMessageId() {
    return 'MSG' + Date.now();
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