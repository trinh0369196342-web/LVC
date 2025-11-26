// ========== KẾT NỐI SUPABASE ==========
const SUPABASE_URL = 'https://gvsbcjhohvrgaowflcwc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2c2JjamhvaHZyZ2Fvd2ZsY3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzIyNTYsImV4cCI6MjA3OTY0ODI1Nn0.TMkVz82efXxfOazfhzKuWP-DYqVZY8M60WrtA4O77Xc';

// Khởi tạo Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Biến toàn cục
let currentUser = null;
let printPrices = {
    'text': 1000,
    'print': 2000,
    'extra_page': 500
};

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Đang khởi tạo trang...');
    initializeApp();
});

// Khởi tạo ứng dụng
async function initializeApp() {
    try {
        // Kiểm tra trạng thái đăng nhập
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔐 Session check:', session);
        
        if (session) {
            console.log('✅ Đã đăng nhập:', session.user.email);
            await ensureUserProfile(session.user);
        } else {
            console.log('❌ Chưa đăng nhập');
        }

        // Tải giá in
        await loadPrintPrices();
        
        // Kiểm tra trang và khởi tạo
        const isAdminPage = document.querySelector('h1')?.textContent.includes('ADMIN');
        
        if (isAdminPage) {
            console.log('🛠️ Đang ở trang ADMIN');
            initializeAdminPage();
        } else {
            console.log('🏠 Đang ở trang KHÁCH HÀNG');
            initializeCustomerPage();
        }
        
    } catch (error) {
        console.error('❌ Lỗi khởi tạo:', error);
        showMessage('Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại.');
    }
}

// ĐẢM BẢO USER PROFILE TỒN TẠI - HÀM QUAN TRỌNG NHẤT
async function ensureUserProfile(authUser) {
    try {
        console.log('🔍 Đang kiểm tra user profile cho:', authUser.email);
        
        // Kiểm tra xem user profile đã tồn tại chưa
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (checkError) {
            console.log('📝 User profile chưa tồn tại, đang tạo mới...');
            
            const userData = {
                id: authUser.id,
                name: authUser.user_metadata?.name || authUser.email.split('@')[0],
                email: authUser.email,
                phone: authUser.user_metadata?.phone || '',
                role: 'customer', // Mặc định là customer
                status: 'active'
            };

            console.log('📦 User data to insert:', userData);

            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([userData])
                .select()
                .single();

            if (createError) {
                console.error('❌ Lỗi tạo user profile:', createError);
                return;
            }
            
            currentUser = newUser;
            console.log('✅ Đã tạo user profile:', currentUser);
            
        } else {
            // User profile đã tồn tại
            currentUser = existingUser;
            console.log('✅ Đã tải user profile:', currentUser);
        }
        
    } catch (error) {
        console.error('❌ Lỗi ensureUserProfile:', error);
    }
}

// ========== TRANG KHÁCH HÀNG ==========
function initializeCustomerPage() {
    console.log('🏠 Khởi tạo trang khách hàng');
    setupCustomerEventListeners();
    updateUI();
    showSection('home-section');
    updatePriceDisplay();
    calculateTotalPrice();
}

function setupCustomerEventListeners() {
    console.log('🎯 Thiết lập sự kiện cho khách hàng');
    
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
    console.log('🛠️ Khởi tạo trang admin');
    setupAdminEventListeners();
    updateUI();
    showSection('orders-section');
}

function setupAdminEventListeners() {
    console.log('🎯 Thiết lập sự kiện cho admin');
    
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
            .order('created_at', { ascending: false })
            .limit(1);
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            printPrices = {
                text: data[0].text_price || 1000,
                print: data[0].print_price || 2000,
                extra_page: data[0].extra_page_price || 500
            };
        }
        console.log('💰 Đã tải giá in:', printPrices);
    } catch (error) {
        console.error('❌ Lỗi tải giá in:', error);
    }
}

// ========== ĐĂNG KÝ/ĐĂNG NHẬP ==========

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showMessage('Vui lòng điền đầy đủ thông tin');
        return;
    }
    
    try {
        showMessage('Đang đăng nhập...');
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        console.log('✅ Đăng nhập auth thành công:', data.user.email);
        
        // Đợi một chút để đảm bảo session được lưu
        setTimeout(async () => {
            // Đảm bảo user profile tồn tại
            await ensureUserProfile(data.user);
            
            showMessage('Đăng nhập thành công!');
            
            // Kiểm tra và chuyển hướng
            if (currentUser && currentUser.role === 'admin') {
                console.log('🔄 Chuyển hướng đến trang admin');
                window.location.href = 'admin.html';
            } else {
                console.log('🔄 Tải lại trang khách hàng');
                location.reload();
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Lỗi đăng nhập:', error);
        showMessage('Email hoặc mật khẩu không đúng: ' + error.message);
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
        showMessage('Đang đăng nhập admin...');
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        console.log('✅ Đăng nhập auth thành công:', data.user.email);
        
        // Đợi một chút để đảm bảo session được lưu
        setTimeout(async () => {
            // Đảm bảo user profile tồn tại
            await ensureUserProfile(data.user);
            
            if (!currentUser) {
                showMessage('❌ Lỗi: Không thể tải thông tin user');
                return;
            }
            
            console.log('👤 Current user role:', currentUser.role);
            
            if (currentUser.role !== 'admin') {
                showMessage('❌ Tài khoản không có quyền admin. Vui lòng liên hệ quản trị viên.');
                await supabase.auth.signOut();
                return;
            }
            
            showMessage('✅ Đăng nhập admin thành công!');
            console.log('🔄 Tải lại trang admin');
            location.reload();
            
        }, 1000);
        
    } catch (error) {
        console.error('❌ Lỗi đăng nhập admin:', error);
        showMessage('Thông tin đăng nhập không đúng: ' + error.message);
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
    
    if (password.length < 6) {
        showMessage('Mật khẩu phải có ít nhất 6 ký tự');
        return;
    }
    
    try {
        showMessage('Đang đăng ký...');
        
        // Đăng ký với Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    phone: phone
                }
            }
        });
        
        if (error) throw error;
        
        if (data.user) {
            showMessage('✅ Đăng ký thành công! Vui lòng đăng nhập.');
            showLoginForm();
        }
        
    } catch (error) {
        console.error('❌ Lỗi đăng ký:', error);
        showMessage('Lỗi đăng ký: ' + error.message);
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        showMessage('Đã đăng xuất');
        
        // Tải lại trang để cập nhật trạng thái
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Lỗi đăng xuất:', error);
    }
}

async function adminLogout() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        showMessage('Đã đăng xuất');
        
        // Tải lại trang để cập nhật trạng thái
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Lỗi đăng xuất admin:', error);
    }
}

// ========== CẬP NHẬT GIAO DIỆN ==========

function updateUI() {
    console.log('🔄 Đang cập nhật UI, currentUser:', currentUser);
    
    // Cập nhật cả hai trang
    updateAccountDisplay();
    updateAdminAccountDisplay();
    updateAdminLinkVisibility();
    updateCustomerLinkVisibility();
}

function updateAccountDisplay() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const accountInfo = document.getElementById('account-info');
    const userDetails = document.getElementById('user-details');
    
    if (!loginForm || !accountInfo) return;
    
    if (currentUser) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        accountInfo.style.display = 'block';
        
        userDetails.innerHTML = `
            <p><strong>Họ tên:</strong> ${currentUser.name}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>SĐT:</strong> ${currentUser.phone || 'Chưa cập nhật'}</p>
            <p><strong>Vai trò:</strong> ${currentUser.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</p>
        `;
        
        console.log('✅ Đã hiển thị thông tin user trong account section');
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        accountInfo.style.display = 'none';
        console.log('✅ Đã hiển thị form đăng nhập');
    }
}

function updateAdminAccountDisplay() {
    const loginForm = document.getElementById('admin-login-form');
    const accountInfo = document.getElementById('admin-account-info');
    const adminDetails = document.getElementById('admin-details');
    
    if (!loginForm || !accountInfo) return;
    
    if (currentUser && currentUser.role === 'admin') {
        loginForm.style.display = 'none';
        accountInfo.style.display = 'block';
        
        adminDetails.innerHTML = `
            <p><strong>Họ tên:</strong> ${currentUser.name}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Vai trò:</strong> Quản trị viên</p>
        `;
        
        console.log('✅ Đã hiển thị thông tin admin');
    } else {
        loginForm.style.display = 'block';
        accountInfo.style.display = 'none';
        console.log('✅ Đã hiển thị form đăng nhập admin');
    }
}

function updateAdminLinkVisibility() {
    const adminLink = document.querySelector('footer a[href="admin.html"]');
    if (adminLink) {
        adminLink.style.display = (currentUser && currentUser.role === 'admin') ? 'block' : 'none';
        console.log('🔗 Admin link visibility:', adminLink.style.display);
    }
}

function updateCustomerLinkVisibility() {
    const customerLink = document.querySelector('footer a[href="index.html"]');
    if (customerLink && currentUser) {
        customerLink.style.display = 'none';
    }
}

// ========== CÁC HÀM HỖ TRỢ ==========

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
    const orderType = document.getElementById('order-type').value;
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

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

// ========== CÁC HÀM QUẢN LÝ ĐƠN HÀNG (GIỮ NGUYÊN) ==========

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
                    user_name: currentUser.name,
                    type: orderType,
                    content: content,
                    font_size: fontSize,
                    font_weight: fontWeight,
                    orientation: orientation,
                    page_count: pageCount,
                    table_count: tableCount,
                    tables_data: tables,
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
        console.error('❌ Lỗi tạo đơn hàng:', error);
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
        console.error('❌ Lỗi tải đơn hàng:', error);
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
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        displayAdminOrders(data || [], ordersList);
        
    } catch (error) {
        console.error('❌ Lỗi tải đơn hàng admin:', error);
        ordersList.innerHTML = '<p>Lỗi tải đơn hàng</p>';
    }
}

// ========== CÁC HÀM KHÁC GIỮ NGUYÊN ==========

// [Các hàm displayOrders, displayAdminOrders, uploadPaymentImage, cancelOrder, acceptOrder, completeOrder, cancelOrderAdmin, loadUserStatistics, manageUser, saveUserChanges, deleteUser, showPriceSettings, saveSystemPriceSettings, resetSystemPriceSettings, loadSupportChat, loadAdminSupportChats, loadSupportStats, searchOrders, searchAdminOrders, getStatusText, getFontWeightText, formatDate, formatTime, remakeOrder, showCopyOptions, downloadFile]

// ========== ÂM THANH ẨN ==========
document.addEventListener('DOMContentLoaded', (event) => {
    const sound = document.getElementById("hiddenSound");

    function playHiddenSound() {
        if (sound) {
            sound.play().then(() => {
                console.log("🔊 Âm thanh đang chạy ẩn!");
            }).catch(error => {
                console.error("❌ Không thể phát âm thanh:", error);
            });
        }
        
        document.removeEventListener('click', playHiddenSound);
        document.removeEventListener('touchstart', playHiddenSound);
    }

    document.addEventListener('click', playHiddenSound, { once: true });
    document.addEventListener('touchstart', playHiddenSound, { once: true });
});

// Thêm các hàm còn lại từ code cũ của bạn ở đây...
// [Paste tất cả các hàm từ displayOrders trở xuống từ code cũ của bạn]