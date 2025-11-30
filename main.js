// --- KẾT NỐI ---
// --- 1. CẤU HÌNH SUPABASE ---
const SUPABASE_URL = 'https://tzfxvjrbzbfhrdnjcgza.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6Znh2anJiemJmaHJkbmpjZ3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1MDk2NzgsImV4cCI6MjA4MDA4NTY3OH0.ZVYoX4BRgLm-yHGQz5D7jIiEo4fMJzP5DCjpmzwxisA';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. ĐỐI TƯỢNG ỨNG DỤNG CHUNG (NAMESPACE) ---
const app = {
    userId: null,
    userRole: null,

    // Khởi chạy khi load trang
    init: async () => {
        // Kiểm tra session hiện tại
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            // Đã đăng nhập -> Lấy thông tin Role
            app.userId = session.user.id;
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', app.userId).single();
            app.userRole = profile.role;
            
            // Xử lý điều hướng nếu ngồi sai trang
            const currentPage = document.body.id; // page-customer, page-seller, page-admin
            
            // Logic bảo vệ trang
            if (currentPage === 'page-customer' && app.userRole !== 'customer') window.location.href = (app.userRole === 'admin' ? 'admin.html' : 'nguoi_ban.html');
            else if (currentPage === 'page-seller' && app.userRole !== 'seller') window.location.href = 'khach.html';
            else if (currentPage === 'page-admin' && app.userRole !== 'admin') window.location.href = 'login.html'; // Admin sai thì đá về login
            else {
                // Đúng trang -> Hiện Dashboard
                app.showDashboard(session.user.email);
            }
        } else {
            // Chưa đăng nhập -> Hiện Form Login
            document.getElementById('auth-view').classList.remove('hidden');
            document.getElementById('dashboard-view').classList.add('hidden');
        }
    },

    // Hiển thị Dashboard và tải dữ liệu riêng từng trang
    showDashboard: (email) => {
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('dashboard-view').classList.remove('hidden');
        document.getElementById('user-display').innerText = email;

        // Chạy logic riêng cho từng trang
        const pageId = document.body.id;
        if (pageId === 'page-customer') app.customerLogic.init();
        if (pageId === 'page-seller') app.sellerLogic.init();
        if (pageId === 'page-admin') app.adminLogic.init();
    },

    // Xử lý Login
    login: async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;
        const msg = document.getElementById('auth-msg');
        msg.innerText = "Đang xử lý...";

        const { data, error } = await supabase.auth.signInWithPassword({ email: email, password: pass });
        if (error) {
            msg.innerText = error.message;
        } else {
            // Login thành công -> Check role để chuyển trang
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
            if (profile.role === 'admin') window.location.href = 'admin.html';
            else if (profile.role === 'seller') window.location.href = 'nguoi_ban.html';
            else window.location.href = 'khach.html';
        }
    },

    // Xử lý Register
    register: async () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;
        const { error } = await supabase.auth.signUp({ email: email, password: pass });
        if (error) document.getElementById('auth-msg').innerText = error.message;
        else alert("Đăng ký thành công! Hãy đăng nhập.");
    },

    logout: async () => {
        await supabase.auth.signOut();
        window.location.reload(); // Tải lại trang để hiện form login
    },

    switchTab: (tabId) => {
        document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
        document.getElementById('tab-' + tabId).classList.remove('hidden');
        // Reload data khi switch tab
        const pageId = document.body.id;
        if (pageId === 'page-customer' && tabId === 'orders') app.customerLogic.loadOrders();
        if (pageId === 'page-seller' && tabId === 'market') app.sellerLogic.loadMarket();
        if (pageId === 'page-seller' && tabId === 'working') app.sellerLogic.loadWorking();
        if (pageId === 'page-admin' && tabId === 'all') app.adminLogic.loadAll();
        if (pageId === 'page-admin' && tabId === 'stats') app.adminLogic.loadStats();
    },
    
    // --- 3. LOGIC RIÊNG: KHÁCH HÀNG ---
    customerLogic: {
        init: () => { app.customerLogic.loadOrders(); },
        
        renderForms: () => {
            const qty = document.getElementById('c-qty').value;
            const div = document.getElementById('c-forms-area');
            div.innerHTML = '';
            for(let i=1; i<=qty; i++){
                div.innerHTML += `
                <div class="form-dynamic-item" id="frm-${i}">
                    <strong>Bảng ${i}</strong>
                    <input type="text" class="auth-input inp-sub" placeholder="Môn học">
                    <textarea class="auth-input inp-cont" rows="2" placeholder="Nội dung tự luận"></textarea>
                </div>`;
            }
        },

        createOrder: async () => {
            const qty = document.getElementById('c-qty').value;
            if(qty==0) return alert("Chọn số lượng!");
            let formData = [];
            for(let i=1; i<=qty; i++){
                const box = document.getElementById(`frm-${i}`);
                formData.push({
                    mon: box.querySelector('.inp-sub').value,
                    noi_dung: box.querySelector('.inp-cont').value
                });
            }
            const { error } = await supabase.from('orders').insert({
                customer_id: app.userId,
                form_data: formData,
                shipping: document.getElementById('c-ship').checked,
                status: 'pending'
            });
            if(error) alert(error.message);
            else { alert("Thành công!"); app.switchTab('orders'); }
        },

        loadOrders: async () => {
            const div = document.getElementById('c-order-list');
            div.innerHTML = 'Loading...';
            const { data } = await supabase.from('orders').select('*').eq('customer_id', app.userId).order('created_at',{ascending:false});
            div.innerHTML = '';
            data.forEach(o => {
                let link = o.result_image ? `<a href="${o.result_image}" target="_blank" style="color:green;font-weight:bold">[XEM MÃ]</a>` : '';
                div.innerHTML += `<div class="card status-${o.status}">
                    <b>#${o.id}</b> | Status: ${o.status} | Giá: ${o.total_price}đ <br> ${link}
                </div>`;
            });
        }
    },

    // --- 4. LOGIC RIÊNG: NGƯỜI BÁN ---
    sellerLogic: {
        init: () => { app.sellerLogic.loadMarket(); },
        
        loadMarket: async () => {
            const div = document.getElementById('s-market-list');
            const { data } = await supabase.from('orders').select('*').eq('status', 'pending');
            div.innerHTML = data.length ? '' : 'Không có đơn mới';
            data.forEach(o => {
                div.innerHTML += `<div class="card status-pending">
                    #${o.id} | Ship: ${o.shipping} 
                    <button class="btn-primary" onclick="app.sellerLogic.accept(${o.id})">NHẬN ĐƠN</button>
                </div>`;
            });
        },
        
        loadWorking: async () => {
            const div = document.getElementById('s-working-list');
            const { data } = await supabase.from('orders').select('*').eq('handler_id', app.userId).neq('status','completed').neq('status','cancelled');
            div.innerHTML = '';
            data.forEach(o => {
                let content = JSON.stringify(o.form_data);
                div.innerHTML += `<div class="card status-processing">
                    <b>#${o.id}</b> <br> <textarea style="width:100%" rows="3" readonly>${content}</textarea>
                    <button class="btn-secondary" onclick="navigator.clipboard.writeText('${content}')">Copy</button>
                    <hr>
                    <input id="p-${o.id}" placeholder="Giá tiền" class="auth-input">
                    <input id="img-${o.id}" placeholder="Link ảnh" class="auth-input">
                    <button class="btn-primary" onclick="app.sellerLogic.complete(${o.id})">Hoàn Thành</button>
                    <button class="btn-secondary" style="color:red" onclick="app.sellerLogic.cancel(${o.id})">Hủy</button>
                </div>`;
            });
        },

        accept: async (id) => {
            await supabase.from('orders').update({status:'processing', handler_id: app.userId}).eq('id',id).eq('status','pending');
            app.sellerLogic.loadMarket();
        },
        complete: async (id) => {
            const p = document.getElementById(`p-${id}`).value;
            const img = document.getElementById(`img-${id}`).value;
            if(!img) return alert("Thiếu link ảnh!");
            await supabase.from('orders').update({status:'completed', total_price:p, result_image:img}).eq('id',id);
            alert("Xong!"); app.switchTab('market');
        },
        cancel: async (id) => {
            if(confirm('Hủy?')) await supabase.from('orders').update({status:'cancelled'}).eq('id',id);
            app.switchTab('market');
        }
    },

    // --- 5. LOGIC RIÊNG: ADMIN ---
    adminLogic: {
        init: () => { app.adminLogic.loadAll(); },
        
        loadAll: async () => {
            const div = document.getElementById('a-all-list');
            div.innerHTML = 'Loading...';
            const { data } = await supabase.from('orders').select('*').order('created_at',{ascending:false});
            div.innerHTML = '';
            data.forEach(o => {
                div.innerHTML += `<div class="card status-${o.status}">
                    #${o.id} | ${o.status} | User: ${o.customer_id}
                    <button onclick="app.adminLogic.del(${o.id})" style="float:right;color:red;border:none;background:none;cursor:pointer">XÓA</button>
                </div>`;
            });
        },
        
        loadStats: async () => {
            const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
            const { data } = await supabase.from('orders').select('total_price').eq('status','completed');
            let total = 0;
            if(data) data.forEach(d => total += (d.total_price || 0));
            document.getElementById('a-count').innerText = count;
            document.getElementById('a-rev').innerText = total.toLocaleString();
        },
        
        del: async (id) => {
            if(confirm("Xóa vĩnh viễn?")) {
                await supabase.from('orders').delete().eq('id',id);
                app.adminLogic.loadAll();
            }
        }
    }
};

// --- 6. KHỞI TẠO EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Gắn sự kiện cho nút login/register (vì nút này có mặt ở cả 3 trang)
    const btnLogin = document.getElementById('btn-login');
    const btnReg = document.getElementById('btn-register');
    if(btnLogin) btnLogin.addEventListener('click', app.login);
    if(btnReg) btnReg.addEventListener('click', app.register);
    
    // Chạy init
    app.init();
});
