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
let supportChats = JSON.parse(localStorage.getItem('supportChats')) || [];

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
    console.log('Đang khởi tạo trang...');
    
    // Kiểm tra xem đang ở trang nào (an toàn nếu không có h1)
    const h1 = document.querySelector('h1');
    const isAdminPage = h1 && typeof h1.textContent === 'string' && h1.textContent.toUpperCase().includes('ADMIN');
    
    if (isAdminPage) {
        console.log('Đang ở trang ADMIN');
        initializeAdminPage();
    } else {
        console.log('Đang ở trang KHÁCH HÀNG');
        initializeCustomerPage();
    }
    
    // Thêm listener để đồng bộ giữa các tab
    setupStorageSync();
});

// ========== ĐỒNG BỘ GIỮA CÁC TAB ==========
function setupStorageSync() {
    window.addEventListener('storage', function(e) {
        console.log('Storage changed:', e.key);
        
        if (e.key === 'currentUser') {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                currentUser = JSON.parse(storedUser);
                console.log('Đồng bộ currentUser:', currentUser);
                
                // Kiểm tra trang hiện tại và chuyển hướng nếu cần
                const isAdminPage = document.querySelector('h1')?.textContent.toUpperCase().includes('ADMIN');
                
                if (currentUser.role === 'admin' && !isAdminPage) {
                    window.location.href = 'admin.html';
                    return;
                } else if (currentUser.role !== 'admin' && isAdminPage) {
                    window.location.href = 'index.html';
                    return;
                }
                
                // Cập nhật giao diện
                if (isAdminPage) {
                    updateAdminAccountDisplay();
                } else {
                    updateAccountDisplay();
                    updateAdminLinkVisibility();
                }
            } else {
                currentUser = null;
                if (document.querySelector('h1')?.textContent.toUpperCase().includes('ADMIN')) {
                    updateAdminAccountDisplay();
                } else {
                    updateAccountDisplay();
                    updateAdminLinkVisibility();
                }
            }
        }
        
        // Đồng bộ dữ liệu đơn hàng
        if (e.key === 'customerOrders' || e.key === 'adminOrders') {
            orders = JSON.parse(localStorage.getItem('customerOrders')) || [];
            adminOrders = JSON.parse(localStorage.getItem('adminOrders')) || [];
            
            const currentSection = document.querySelector('.section.active');
            if (currentSection?.id === 'orders-section') {
                if (document.querySelector('h1')?.textContent.toUpperCase().includes('ADMIN')) {
                    loadAdminOrders();
                } else {
                    loadOrders();
                }
            }
        }
        
        // Đồng bộ chat
        if (e.key === 'supportChats') {
            supportChats = JSON.parse(localStorage.getItem('supportChats')) || [];
            
            const currentSection = document.querySelector('.section.active');
            if (currentSection?.id === 'support-section') {
                if (document.querySelector('h1')?.textContent.toUpperCase().includes('ADMIN')) {
                    loadAdminSupportChats();
                } else {
                    loadSupportChat();
                }
            }
        }
    });
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
    const navHome = document.getElementById('nav-home');
    const navOrders = document.getElementById('nav-orders');
    const navSupport = document.getElementById('nav-support');
    const navAccount = document.getElementById('nav-account');
    
    if (navHome) {
        navHome.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('home-section');
        });
    }
    if (navOrders) {
        navOrders.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('orders-section');
            loadOrders();
        });
    }
    if (navSupport) {
        navSupport.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('support-section');
            loadSupportChat();
        });
    }
    if (navAccount) {
        navAccount.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('account-section');
            updateAccountDisplay();
        });
    }
    
    // Form đơn hàng
    const orderType = document.getElementById('order-type');
    const createOrderBtn = document.getElementById('create-order');
    const resetForm = document.getElementById('reset-form');
    const tableCount = document.getElementById('table-count');
    const pageCount = document.getElementById('page-count');
    
    if (orderType) {
        orderType.addEventListener('change', () => {
            toggleOrderOptions();
            calculateTotalPrice();
        });
    }
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            createOrder();
        });
    }
    if (resetForm) {
        resetForm.addEventListener('click', (e) => {
            e.preventDefault();
            resetOrderForm();
        });
    }
    if (tableCount) {
        tableCount.addEventListener('change', () => {
            generateTableInputs();
            calculateTotalPrice();
        });
    }
    if (pageCount) {
        pageCount.addEventListener('change', (e) => {
            calculateTotalPrice();
        });
    }
    
    // Tài khoản
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');
    
    if (loginBtn) loginBtn.addEventListener('click', (e) => { e.preventDefault(); handleLogin(); });
    if (registerBtn) registerBtn.addEventListener('click', (e) => { e.preventDefault(); register(); });
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    if (showRegisterBtn) showRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
    if (showLoginBtn) showLoginBtn.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
    
    // Tìm kiếm
    const searchInput = document.getElementById('search-orders');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchOrders(e.target.value);
        });
    }
    
    // Modal đóng
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
}

// ========== HIỂN THỊ GIÁ ==========
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

// ========== TẠO BẢNG NHẬP SỐ ==========
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
    const navOrders = document.getElementById('nav-orders');
    const navStatistics = document.getElementById('nav-statistics');
    const navSupport = document.getElementById('nav-support');
    const navAccount = document.getElementById('nav-account');
    
    if (navOrders) navOrders.addEventListener('click', (e) => { e.preventDefault(); showSection('orders-section'); loadAdminOrders(); });
    if (navStatistics) navStatistics.addEventListener('click', (e) => { e.preventDefault(); showSection('statistics-section'); loadUserStatistics(); });
    if (navSupport) navSupport.addEventListener('click', (e) => { e.preventDefault(); showSection('support-section'); loadAdminSupportChats(); });
    if (navAccount) navAccount.addEventListener('click', (e) => { e.preventDefault(); showSection('account-section'); updateAdminAccountDisplay(); });
    
    // Đăng nhập admin
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    
    if (adminLoginBtn) adminLoginBtn.addEventListener('click', (e) => { e.preventDefault(); handleAdminLogin(); });
    if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', (e) => { e.preventDefault(); adminLogout(); });
    
    // Tìm kiếm admin
    const adminSearchInput = document.getElementById('search-orders');
    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', (e) => {
            searchAdminOrders(e.target.value);
        });
    }
    
    // Modal đóng
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
        try {
            alert(message);
        } catch (e) {
            console.log('Message:', message);
        }
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

// ========== TÌM KIẾM ĐƠN HÀNG ==========
function searchOrders(searchTerm) {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList || !searchTerm) {
        loadOrders();
        return;
    }
    
    if (!currentUser) return;
    
    const userOrders = orders.filter(order => 
        order.userId === currentUser.id && 
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (userOrders.length === 0) {
        ordersList.innerHTML = '<p>Không tìm thấy đơn hàng phù hợp</p>';
        return;
    }
    
    displayOrders(userOrders, ordersList);
}

function searchAdminOrders(searchTerm) {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList || !searchTerm) {
        loadAdminOrders();
        return;
    }
    
    const filteredOrders = adminOrders.filter(order => 
        order.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (filteredOrders.length === 0) {
        ordersList.innerHTML = '<p>Không tìm thấy đơn hàng phù hợp</p>';
        return;
    }
    
    displayAdminOrders(filteredOrders, ordersList);
}

// ========== HÀM KHÁCH HÀNG ==========
function checkLoginStatus() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        
        // Nếu là admin đang ở trang khách hàng, chuyển hướng
        if (currentUser.role === 'admin') {
            console.log('Phát hiện admin ở trang khách hàng, chuyển hướng...');
            window.location.href = 'admin.html';
            return;
        }
        
        updateAccountDisplay();
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

function createOrder() {
    if (!currentUser) {
        showMessage('Vui lòng đăng nhập để tạo đơn hàng');
        return;
    }
    
    const orderTypeEl = document.getElementById('order-type');
    if (!orderTypeEl) {
        showMessage('Form đơn hàng không tìm thấy');
        return;
    }
    
    const orderType = orderTypeEl.value;
    const fontSizeEl = document.getElementById('font-size');
    const fontWeightEl = document.getElementById('font-weight');
    const orientationEl = document.querySelector('input[name="orientation"]:checked');
    const pageCountEl = document.getElementById('page-count');
    const tableCountEl = document.getElementById('table-count');
    
    const fontSize = fontSizeEl ? fontSizeEl.value : '12';
    const fontWeight = fontWeightEl ? fontWeightEl.value : 'normal';
    const orientation = orientationEl ? orientationEl.value : 'portrait';
    const pageCount = pageCountEl ? (parseInt(pageCountEl.value) || 1) : 1;
    const tableCount = tableCountEl ? (parseInt(tableCountEl.value) || 0) : 0;
    
    let content = '';
    let fileData = null;
    let tables = [];
    
    // Kiểm tra dữ liệu đầu vào
    if (orderType === 'print') {
        const fileInput = document.getElementById('file-upload');
        if (!fileInput || !fileInput.files || !fileInput.files[0]) {
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
        if (!textContent || !textContent.value.trim()) {
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
        tableCount: tableCount,
        tables: tables,
        totalPrice: totalPrice,
        fileData: fileData,
        status: 'pending',
        paymentStatus: 'pending',
        paymentImage: null,
        createdAt: new Date().toISOString()
    };
    
    // Lưu đơn hàng
    orders.push(newOrder);
    localStorage.setItem('customerOrders', JSON.stringify(orders));
    
    // Thêm vào danh sách admin
    adminOrders.push(newOrder);
    localStorage.setItem('adminOrders', JSON.stringify(adminOrders));
    
    showMessage(`✅ Tạo đơn hàng thành công! Tổng tiền: ${formatCurrency(totalPrice)}`);
    resetOrderForm();
    
    // Tự động chuyển đến trang đơn hàng
    showSection('orders-section');
    loadOrders();
}

// Hàm tính giá đơn hàng
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

function loadOrders() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    if (!currentUser) {
        ordersList.innerHTML = '<p>Vui lòng đăng nhập để xem đơn hàng</p>';
        return;
    }
    
    const userOrders = orders.filter(order => order.userId === currentUser.id);
    displayOrders(userOrders, ordersList);
}

function displayOrders(userOrders, ordersList) {
    if (userOrders.length === 0) {
        ordersList.innerHTML = '<p>Bạn chưa có đơn hàng nào</p>';
        return;
    }
    
    ordersList.innerHTML = userOrders.map(order => {
        let paymentSection = '';
        if (order.status === 'processing' && order.paymentStatus === 'pending') {
            paymentSection = `
                <div class="payment-section">
                    <h4>💳 Thanh Toán</h4>
                    <div class="payment-info">
                        <p><strong>Số tiền:</strong> ${formatCurrency(order.totalPrice)}</p>
                        <p><strong>Ngân hàng:</strong> Vietcombank</p>
                        <p><strong>Số tài khoản:</strong> 1234567890123</p>
                        <p><strong>Chủ tài khoản:</strong> NGUYEN VAN A</p>
                        <div class="payment-image-upload">
                            <label>Tải lên ảnh chuyển khoản:</label>
                            <input type="file" id="payment-image-${order.id}" accept="image/*">
                            <button onclick="uploadPaymentImage('${order.id}')" class="payment-btn">Tải lên ảnh & Xác nhận</button>
                        </div>
                        ${order.paymentImage ? `
                            <div class="payment-image-preview">
                                <p>Ảnh đã tải lên:</p>
                                <img src="${order.paymentImage}" alt="Ảnh chuyển khoản" style="max-width: 200px;">
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else if (order.paymentStatus === 'paid') {
            paymentSection = `
                <div class="payment-section paid">
                    <p>✅ Đã thanh toán</p>
                    ${order.paymentImage ? `
                        <div class="payment-image-preview">
                            <p>Ảnh chuyển khoản:</p>
                            <img src="${order.paymentImage}" alt="Ảnh chuyển khoản" style="max-width: 200px;">
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
                    <p><strong>Số trang:</strong> ${order.pageCount}</p>
                    <p><strong>Số bảng:</strong> ${order.tableCount || 0}</p>
                    <p><strong>Thành tiền:</strong> ${formatCurrency(order.totalPrice)}</p>
                    <p><strong>Cỡ chữ:</strong> ${order.fontSize}pt</p>
                    <p><strong>Độ đậm:</strong> ${getFontWeightText(order.fontWeight)}</p>
                    <p><strong>Hướng in:</strong> ${order.orientation === 'portrait' ? 'Nằm thẳng' : 'Nằm ngang'}</p>
                    <p><strong>Ngày tạo:</strong> ${formatDate(order.createdAt)}</p>
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

function uploadPaymentImage(orderId) {
    const fileInput = document.getElementById(`payment-image-${orderId}`);
    if (!fileInput || !fileInput.files[0]) {
        showMessage('Vui lòng chọn ảnh chuyển khoản');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imageData = e.target.result;
        
        // Cập nhật trong orders
        const orderIndex = orders.findIndex(order => order.id === orderId);
        if (orderIndex !== -1) {
            orders[orderIndex].paymentImage = imageData;
            orders[orderIndex].paymentStatus = 'paid';
            localStorage.setItem('customerOrders', JSON.stringify(orders));
        }
        
        // Cập nhật trong adminOrders
        const adminOrderIndex = adminOrders.findIndex(order => order.id === orderId);
        if (adminOrderIndex !== -1) {
            adminOrders[adminOrderIndex].paymentImage = imageData;
            adminOrders[adminOrderIndex].paymentStatus = 'paid';
            localStorage.setItem('adminOrders', JSON.stringify(adminOrders));
        }
        
        showMessage('✅ Đã tải lên ảnh chuyển khoản và xác nhận thanh toán');
        loadOrders();
    };
    
    reader.readAsDataURL(file);
}

function showCopyOptions(orderId, userType) {
    const order = userType === 'admin' 
        ? adminOrders.find(order => order.id === orderId)
        : orders.find(order => order.id === orderId && order.userId === currentUser.id);
    
    if (!order) {
        showMessage('Không tìm thấy đơn hàng');
        return;
    }
    
    const modal = document.getElementById('copy-options-modal');
    const copyOptions = document.getElementById('copy-options');
    
    if (!modal || !copyOptions) return;
    
    copyOptions.innerHTML = `
        <h3>Chọn nội dung cần sao chép</h3>
        <div class="copy-option-item">
            <input type="checkbox" id="copy-content" checked>
            <label for="copy-content">Nội dung chính</label>
        </div>
        <div class="copy-option-item">
            <input type="checkbox" id="copy-tables" checked>
            <label for="copy-tables">Nội dung bảng</label>
        </div>
        <div class="copy-option-item">
            <input type="checkbox" id="copy-settings" checked>
            <label for="copy-settings">Cài đặt in</label>
        </div>
        <div class="copy-option-item">
            <input type="checkbox" id="copy-price" checked>
            <label for="copy-price">Thông tin giá</label>
        </div>
        <div class="form-actions">
            <button onclick="copySelectedContent('${orderId}', '${userType}')">Sao chép</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function copySelectedContent(orderId, userType) {
    const order = userType === 'admin' 
        ? adminOrders.find(order => order.id === orderId)
        : orders.find(order => order.id === orderId && order.userId === currentUser.id);
    
    if (!order) return;
    
    const copyContent = document.getElementById('copy-content').checked;
    const copyTables = document.getElementById('copy-tables').checked;
    const copySettings = document.getElementById('copy-settings').checked;
    const copyPrice = document.getElementById('copy-price').checked;
    
    let textToCopy = '';
    
    if (copyContent) {
        textToCopy += `ĐƠN HÀNG #${order.id}\n`;
        if (userType === 'admin') {
            textToCopy += `Khách hàng: ${order.userName}\n`;
        }
        textToCopy += `Loại: ${order.type === 'print' ? 'In ấn' : 'In chữ'}\n`;
        textToCopy += `Nội dung: ${order.content}\n`;
    }
    
    if (copySettings) {
        textToCopy += `Cỡ chữ: ${order.fontSize}pt\n`;
        textToCopy += `Độ đậm: ${getFontWeightText(order.fontWeight)}\n`;
        textToCopy += `Hướng in: ${order.orientation === 'portrait' ? 'Nằm thẳng' : 'Nằm ngang'}\n`;
    }
    
    if (copyPrice) {
        textToCopy += `Số trang: ${order.pageCount}\n`;
        textToCopy += `Số bảng: ${order.tableCount || 0}\n`;
        textToCopy += `Thành tiền: ${formatCurrency(order.totalPrice)}\n`;
    }
    
    if (copyTables && order.tables && order.tables.length > 0) {
        textToCopy += `\nCÁC BẢNG:\n`;
        order.tables.forEach((table, index) => {
            textToCopy += `\nBảng ${index + 1}: ${table.title}\n`;
            textToCopy += `Nội dung: ${table.content}\n`;
        });
    }
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showMessage('✅ Đã sao chép nội dung đã chọn');
        }).catch(err => {
            fallbackCopyText(textToCopy);
        });
    } else {
        fallbackCopyText(textToCopy);
    }
    
    const modal = document.getElementById('copy-options-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showMessage('✅ Đã sao chép thông tin đơn hàng');
        } else {
            showMessage('❌ Không thể sao chép, vui lòng sao chép thủ công');
        }
    } catch (err) {
        showMessage('❌ Lỗi sao chép: ' + err);
    }
    
    document.body.removeChild(textArea);
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
        const orderTypeEl = document.getElementById('order-type');
        if (orderTypeEl) orderTypeEl.value = order.type;
        toggleOrderOptions();
        
        if (order.type === 'text' && document.getElementById('text-content')) {
            document.getElementById('text-content').value = order.content;
        }
        
        if (document.getElementById('font-size')) document.getElementById('font-size').value = order.fontSize;
        if (document.getElementById('font-weight')) document.getElementById('font-weight').value = order.fontWeight;
        if (document.getElementById('page-count')) document.getElementById('page-count').value = order.pageCount;
        if (document.getElementById('table-count')) document.getElementById('table-count').value = order.tableCount || 0;
        
        const orientationRadio = document.querySelector(`input[name="orientation"][value="${order.orientation}"]`);
        if (orientationRadio) {
            orientationRadio.checked = true;
        }
        
        generateTableInputs();
        calculateTotalPrice();
        showMessage('Thông tin đơn hàng đã được điền sẵn. Vui lòng chỉnh sửa và tạo lại.');
    }
}

// ========== HỆ THỐNG CHAT HỖ TRỢ ==========
function loadSupportChat() {
    const supportChat = document.getElementById('support-chat');
    if (!supportChat) return;
    
    if (!currentUser) {
        supportChat.innerHTML = '<p>Vui lòng đăng nhập để sử dụng hỗ trợ</p>';
        return;
    }
    
    // Tìm hoặc tạo chat cho user
    let chat = supportChats.find(chat => chat.userId === currentUser.id);
    if (!chat) {
        chat = {
            id: generateChatId(),
            userId: currentUser.id,
            userName: currentUser.name,
            messages: [],
            status: 'active',
            createdAt: new Date().toISOString()
        };
        supportChats.push(chat);
        localStorage.setItem('supportChats', JSON.stringify(supportChats));
    }
    
    displayChat(chat, supportChat);
}

function displayChat(chat, container) {
    container.innerHTML = `
        <div class="chat-header">
            <h3>💬 Hỗ trợ trực tuyến</h3>
            <p>Đang chat với: <strong>Admin</strong></p>
        </div>
        <div class="chat-messages" id="chat-messages">
            ${chat.messages.map(msg => `
                <div class="message ${msg.sender === 'user' ? 'user-message' : 'admin-message'}">
                    <div class="message-sender">${msg.sender === 'user' ? 'Bạn' : 'Admin'}</div>
                    <div class="message-content">${msg.content}</div>
                    <div class="message-time">${formatTime(msg.timestamp)}</div>
                </div>
            `).join('')}
        </div>
        <div class="chat-input">
            <textarea id="chat-input-message" placeholder="Nhập tin nhắn của bạn..."></textarea>
            <button onclick="sendChatMessage()">Gửi</button>
        </div>
    `;
    
    // Cuộn xuống tin nhắn mới nhất
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function sendChatMessage() {
    const messageInput = document.getElementById('chat-input-message');
    if (!messageInput || !messageInput.value.trim()) {
        showMessage('Vui lòng nhập tin nhắn');
        return;
    }
    
    if (!currentUser) return;
    
    const chat = supportChats.find(chat => chat.userId === currentUser.id);
    if (!chat) return;
    
    const newMessage = {
        id: generateMessageId(),
        sender: 'user',
        content: messageInput.value.trim(),
        timestamp: new Date().toISOString()
    };
    
    chat.messages.push(newMessage);
    localStorage.setItem('supportChats', JSON.stringify(supportChats));
    
    messageInput.value = '';
    loadSupportChat();
}

function loadAdminSupportChats() {
    const supportChatsContainer = document.getElementById('support-chats');
    if (!supportChatsContainer) return;
    
    if (!currentUser || currentUser.role !== 'admin') {
        supportChatsContainer.innerHTML = '<p>Vui lòng đăng nhập với quyền admin</p>';
        return;
    }
    
    if (supportChats.length === 0) {
        supportChatsContainer.innerHTML = '<p>Chưa có cuộc trò chuyện nào</p>';
        return;
    }
    
    supportChatsContainer.innerHTML = `
        <div class="chats-list">
            ${supportChats.map(chat => `
                <div class="chat-item" onclick="openAdminChat('${chat.id}')">
                    <div class="chat-user-info">
                        <strong>${chat.userName}</strong>
                        <span class="chat-status ${chat.status}">${chat.status === 'active' ? 'Đang hoạt động' : 'Đã đóng'}</span>
                    </div>
                    <div class="chat-last-message">
                        ${chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content : 'Chưa có tin nhắn'}
                    </div>
                    <div class="chat-time">
                        ${chat.messages.length > 0 ? formatTime(chat.messages[chat.messages.length - 1].timestamp) : formatTime(chat.createdAt)}
                    </div>
                </div>
            `).join('')}
        </div>
        <div id="admin-chat-detail" class="admin-chat-detail"></div>
    `;
}

function openAdminChat(chatId) {
    const chat = supportChats.find(chat => chat.id === chatId);
    if (!chat) return;
    
    const chatDetail = document.getElementById('admin-chat-detail');
    if (!chatDetail) return;
    
    chatDetail.innerHTML = `
        <div class="chat-header">
            <h3>💬 Chat với ${chat.userName}</h3>
            <button onclick="closeAdminChat()" class="secondary">Đóng</button>
        </div>
        <div class="chat-messages" id="admin-chat-messages">
            ${chat.messages.map(msg => `
                <div class="message ${msg.sender === 'user' ? 'user-message' : 'admin-message'}">
                    <div class="message-sender">${msg.sender === 'user' ? chat.userName : 'Bạn'}</div>
                    <div class="message-content">${msg.content}</div>
                    <div class="message-time">${formatTime(msg.timestamp)}</div>
                </div>
            `).join('')}
        </div>
        <div class="chat-input">
            <textarea id="admin-chat-input" placeholder="Nhập tin nhắn phản hồi..."></textarea>
            <button onclick="sendAdminChatMessage('${chatId}')">Gửi</button>
        </div>
    `;
    
    // Cuộn xuống tin nhắn mới nhất
    const chatMessages = document.getElementById('admin-chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function sendAdminChatMessage(chatId) {
    const messageInput = document.getElementById('admin-chat-input');
    if (!messageInput || !messageInput.value.trim()) {
        showMessage('Vui lòng nhập tin nhắn');
        return;
    }
    
    const chat = supportChats.find(chat => chat.id === chatId);
    if (!chat) return;
    
    const newMessage = {
        id: generateMessageId(),
        sender: 'admin',
        content: messageInput.value.trim(),
        timestamp: new Date().toISOString()
    };
    
    chat.messages.push(newMessage);
    localStorage.setItem('supportChats', JSON.stringify(supportChats));
    
    messageInput.value = '';
    openAdminChat(chatId);
}

function closeAdminChat() {
    const chatDetail = document.getElementById('admin-chat-detail');
    if (chatDetail) {
        chatDetail.innerHTML = '';
    }
}

// ========== CÁC HÀM ĐĂNG KÝ/ĐĂNG NHẬP ĐÃ SỬA ==========
function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    // Kiểm tra admin mặc định
    if (email === 'fuwun123@gmail.com' && password === 'H@chin123') {
        const adminUser = {
            id: 'admin',
            name: 'Quản trị viên',
            email: email,
            role: 'admin'
        };
        
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
        showMessage('Đăng nhập admin thành công! Đang chuyển hướng...');
        
        // Đảm bảo chuyển hướng ngay lập tức
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1000);
        return;
    }
    
    const user = users.find(u => u.email === email && u.password === password && u.status === 'active');
    
    if (user) {
        if (user.role === 'admin') {
            localStorage.setItem('currentUser', JSON.stringify(user));
            showMessage('Đăng nhập admin thành công! Đang chuyển hướng...');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
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

function handleAdminLogin() {
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    if (!email || !password) {
        showMessage('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    // Kiểm tra admin mặc định
    if (email === 'fuwun123@gmail.com' && password === 'H@chin123') {
        const adminUser = {
            id: 'admin',
            name: 'Quản trị viên',
            email: email,
            role: 'admin'
        };
        
        localStorage.setItem('currentUser', JSON.stringify(adminUser));
        updateAdminAccountDisplay();
        showMessage('Đăng nhập admin thành công!');
        updateCustomerLinkVisibility();
        return;
    }
    
    const user = users.find(u => u.email === email && u.password === password && u.role === 'admin' && u.status === 'active');
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAdminAccountDisplay();
        showMessage('Đăng nhập admin thành công!');
        updateCustomerLinkVisibility();
    } else {
        showMessage('Thông tin đăng nhập không đúng hoặc không có quyền admin');
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

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

// ========== HÀM ADMIN ==========
function checkAdminLoginStatus() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        
        // Nếu không phải admin đang ở trang admin, chuyển hướng
        if (currentUser.role !== 'admin') {
            console.log('Phát hiện người dùng thường ở trang admin, chuyển hướng...');
            window.location.href = 'index.html';
            return;
        }
        
        updateAdminAccountDisplay();
    }
}

function updateCustomerLinkVisibility() {
    const customerLink = document.querySelector('footer a[href="index.html"]');
    if (customerLink && currentUser) {
        customerLink.style.display = 'none';
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
        `;
    } else if (loginForm && accountInfo) {
        loginForm.style.display = 'block';
        accountInfo.style.display = 'none';
    }
}

function loadAdminOrders() {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
    if (!currentUser || currentUser.role !== 'admin') {
        ordersList.innerHTML = '<p>Vui lòng đăng nhập với quyền admin</p>';
        return;
    }
    
    displayAdminOrders(adminOrders, ordersList);
}

function displayAdminOrders(ordersToDisplay, ordersList) {
    if (ordersToDisplay.length === 0) {
        ordersList.innerHTML = '<p>Chưa có đơn hàng nào</p>';
        return;
    }
    
    ordersList.innerHTML = ordersToDisplay.map(order => {
        const user = users.find(u => u.id === order.userId) || { name: order.userName || 'Khách hàng', email: 'N/A' };
        
        let priceSettingsBtn = '';
        if (order.status === 'pending') {
            priceSettingsBtn = `<button class="secondary" onclick="showPriceSettings('${order.id}')">Điều chỉnh giá</button>`;
        }
        
        return `
            <div class="order-item">
                <div class="order-header">
                    <span class="order-id">Đơn hàng #${order.id}</span>
                    <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                    <span class="payment-status ${order.paymentStatus}">${order.paymentStatus === 'paid' ? '✅ Đã TT' : '⏳ Chờ TT'}</span>
                </div>
                <div class="order-details">
                    <p><strong>Khách hàng:</strong> ${user.name} (${user.email})</p>
                    <p><strong>Loại:</strong> ${order.type === 'print' ? 'In ấn' : 'In chữ'}</p>
                    <p><strong>Nội dung:</strong> ${order.content}</p>
                    <p><strong>Số trang:</strong> ${order.pageCount}</p>
                    <p><strong>Số bảng:</strong> ${order.tableCount || 0}</p>
                    <p><strong>Thành tiền:</strong> ${formatCurrency(order.totalPrice)}</p>
                    <p><strong>Cỡ chữ:</strong> ${order.fontSize}pt</p>
                    <p><strong>Độ đậm:</strong> ${getFontWeightText(order.fontWeight)}</p>
                    <p><strong>Hướng in:</strong> ${order.orientation === 'portrait' ? 'Nằm thẳng' : 'Nằm ngang'}</p>
                    <p><strong>Ngày tạo:</strong> ${formatDate(order.createdAt)}</p>
                    ${order.paymentImage ? `
                        <div class="payment-image-preview">
                            <p><strong>Ảnh chuyển khoản:</strong></p>
                            <img src="${order.paymentImage}" alt="Ảnh chuyển khoản" style="max-width: 200px;">
                        </div>
                    ` : ''}
                </div>
                <div class="order-actions">
                    ${priceSettingsBtn}
                    ${order.fileData ? `
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

// ========== TÍNH NĂNG ĐIỀU CHỈNH GIÁ CHO ADMIN ==========
function showPriceSettings() {
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

function saveSystemPriceSettings() {
    const priceText = parseInt(document.getElementById('price-text').value);
    const pricePrint = parseInt(document.getElementById('price-print').value);
    const priceExtra = parseInt(document.getElementById('price-extra').value);
    
    if (isNaN(priceText) || isNaN(pricePrint) || isNaN(priceExtra) || 
        priceText < 0 || pricePrint < 0 || priceExtra < 0) {
        showMessage('Vui lòng nhập giá hợp lệ (số không âm)');
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
    
    showMessage('Đã cập nhật giá hệ thống thành công!');
    
    if (!document.querySelector('h1').textContent.includes('ADMIN')) {
        updatePriceDisplay();
        calculateTotalPrice();
    }
}

function resetSystemPriceSettings() {
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

function showOrderPriceSettings(orderId) {
    const order = adminOrders.find(order => order.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('user-management-modal');
    const form = document.getElementById('user-management-form');
    
    if (!modal || !form) return;
    
    form.innerHTML = `
        <h3>Điều chỉnh giá cho đơn hàng #${orderId}</h3>
        <div class="form-group">
            <label for="adjust-price">Giá điều chỉnh:</label>
            <input type="number" id="adjust-price" value="${order.totalPrice}" min="0">
        </div>
        <div class="form-actions">
            <button onclick="saveAdjustedPrice('${orderId}')">Lưu giá</button>
            <button class="secondary" onclick="calculateAutoPrice('${orderId}')">Tính giá tự động</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function saveAdjustedPrice(orderId) {
    const adjustedPrice = parseInt(document.getElementById('adjust-price').value);
    
    if (isNaN(adjustedPrice) || adjustedPrice < 0) {
        showMessage('Vui lòng nhập giá hợp lệ');
        return;
    }
    
    const adminOrderIndex = adminOrders.findIndex(order => order.id === orderId);
    if (adminOrderIndex !== -1) {
        adminOrders[adminOrderIndex].totalPrice = adjustedPrice;
        localStorage.setItem('adminOrders', JSON.stringify(adminOrders));
    }
    
    const customerOrderIndex = orders.findIndex(order => order.id === orderId);
    if (customerOrderIndex !== -1) {
        orders[customerOrderIndex].totalPrice = adjustedPrice;
        localStorage.setItem('customerOrders', JSON.stringify(orders));
    }
    
    const modal = document.getElementById('user-management-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    showMessage('Đã cập nhật giá thành công!');
    loadAdminOrders();
}

function calculateAutoPrice(orderId) {
    const order = adminOrders.find(order => order.id === orderId);
    if (!order) return;
    
    let calculatedPrice = 0;
    if (order.type === 'text') {
        calculatedPrice = printPrices.text + (order.pageCount - 1) * printPrices.extra_page;
    } else if (order.type === 'print') {
        calculatedPrice = printPrices.print + (order.pageCount - 1) * printPrices.extra_page;
    }
    
    if (order.tableCount > 0) {
        calculatedPrice += order.tableCount * 500;
    }
    
    document.getElementById('adjust-price').value = calculatedPrice;
    showMessage(`Giá tự động: ${formatCurrency(calculatedPrice)}`);
}

function downloadFile(orderId) {
    const order = adminOrders.find(order => order.id === orderId);
    if (!order || !order.fileData) {
        showMessage('Không có file để tải');
        return;
    }
    
    showMessage(`Đang tải file: ${order.fileData.name}`);
    
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

function generateChatId() {
    return 'CHAT' + Date.now();
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