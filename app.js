import FirebaseService from './firebase-service.js';

// State
let currentUser = null;
let currentCustomerId = null;
let customers = [];
let transactions = [];
let isAdmin = false;
let currentView = 'login'; // Track current view

// DOM Elements
const views = {
    login: document.getElementById('login-view'),
    signup: document.getElementById('signup-view'),
    dashboard: document.getElementById('dashboard-view'),
    customer: document.getElementById('customer-view'),
    admin: document.getElementById('admin-view')
};

// Login Form
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorMsg = document.getElementById('login-error');
const goToSignupBtn = document.getElementById('go-to-signup');

// Signup Form
const signupForm = document.getElementById('signup-form');
const signupEmailInput = document.getElementById('signup-email');
const signupPasswordInput = document.getElementById('signup-password');
const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');
const signupErrorMsg = document.getElementById('signup-error');
const goToLoginBtn = document.getElementById('go-to-login');

// Dashboard
const logoutBtn = document.getElementById('logout-btn');
const customerListEl = document.getElementById('customer-list');
const customerSearchInput = document.getElementById('customer-search');
const addCustomerBtn = document.getElementById('add-customer-btn');
const totalGiveEl = document.getElementById('total-give');
const totalGetEl = document.getElementById('total-get');
const overallBalanceEl = document.getElementById('overall-balance');
const overallBalanceLabelEl = document.getElementById('overall-balance-label');
const globalReportBtn = document.getElementById('global-report-btn');

// Admin Dashboard
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const adminTotalUsersEl = document.getElementById('admin-total-users');
const adminTotalCustomersEl = document.getElementById('admin-total-customers');
const adminUserListEl = document.getElementById('admin-user-list');

// Customer View
const backToDashboardBtn = document.getElementById('back-to-dashboard');
const customerNameHeader = document.getElementById('customer-name-header');
const customerPhoneHeader = document.getElementById('customer-phone-header');
const customerAvatar = document.getElementById('customer-avatar');
const customerNetBalanceEl = document.getElementById('customer-net-balance');
const transactionsListEl = document.getElementById('transactions-list');
const giveMoneyBtn = document.getElementById('give-money-btn');
const gotMoneyBtn = document.getElementById('got-money-btn');
const reportBtn = document.getElementById('report-btn');

// Modals
const modalOverlay = document.getElementById('modal-overlay');
const addCustomerModal = document.getElementById('add-customer-modal');
const transactionModal = document.getElementById('transaction-modal');
const reportModal = document.getElementById('report-modal');
const closeButtons = document.querySelectorAll('.close-modal');

// Add Customer Form
const addCustomerForm = document.getElementById('add-customer-form');
const newCustomerNameInput = document.getElementById('new-customer-name');
const newCustomerPhoneInput = document.getElementById('new-customer-phone');
const customerIdEditInput = document.getElementById('customer-id-edit');
const customerModalTitle = document.getElementById('customer-modal-title');
const saveCustomerBtn = document.getElementById('save-customer-btn');

// Transaction Form
const transactionForm = document.getElementById('transaction-form');
const transactionAmountInput = document.getElementById('transaction-amount');
const transactionNoteInput = document.getElementById('transaction-note');
const transactionDateInput = document.getElementById('transaction-date');
const transactionTypeInput = document.getElementById('transaction-type');
const transactionIdInput = document.getElementById('transaction-id');
const transactionModalTitle = document.getElementById('transaction-modal-title');

// Report Form
const reportStartDateInput = document.getElementById('report-start-date');
const reportEndDateInput = document.getElementById('report-end-date');
const reportDescriptionInput = document.getElementById('report-description');
const exportPdfBtn = document.getElementById('export-pdf');
const exportExcelBtn = document.getElementById('export-excel');

// Selection Mode
const selectModeRadios = document.querySelectorAll('input[name="select-mode"]');
let selectionMode = 'all'; // 'all', 'selected', 'except'
let selectedCustomerIds = new Set();


// --- Initialization ---

function init() {
    // Auth State Listener
    FirebaseService.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            isAdmin = false;
            loadDashboard('replace'); // Replace login history with dashboard
        } else {
            currentUser = null;
            if (!isAdmin) {
                switchView('login', 'replace'); // Replace current view with login
            }
        }
    });

    setupEventListeners();

    // Initial State Replace
    history.replaceState({ view: 'login', modal: null }, '', '#login');
}


function setupEventListeners() {
    // Auth Navigation
    goToSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('signup');
        clearAuthForms();
    });

    goToLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('login');
        clearAuthForms();
    });

    // Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        // Admin Check
        if (email === 'Admin123' && password === 'Admin@321') {
            isAdmin = true;
            currentUser = { uid: 'admin', email: 'admin@finbook.com' }; // Mock admin user
            loadAdminDashboard('replace');
            showNotification("Welcome back, Admin!", "success");
            return;
        }

        try {
            await FirebaseService.login(email, password);
            showNotification("Login successful!", "success");
            // onAuthStateChanged will handle redirection
        } catch (error) {
            const msg = getFriendlyErrorMessage(error);
            showNotification(msg, "error");
        }
    });

    // Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;
        const confirmPassword = signupConfirmPasswordInput.value;

        if (password !== confirmPassword) {
            showNotification("Passwords do not match.", "error");
            return;
        }

        try {
            await FirebaseService.signUp(email, password);
            showNotification("Account created successfully!", "success");
            // onAuthStateChanged will handle redirection
        } catch (error) {
            const msg = getFriendlyErrorMessage(error);
            showNotification(msg, "error");
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        FirebaseService.logout();
        showNotification("Logged out successfully.", "success");
    });

    adminLogoutBtn.addEventListener('click', () => {
        isAdmin = false;
        currentUser = null;
        switchView('login', 'replace');
        showNotification("Logged out successfully.", "success");
    });

    // --- Notification System ---

    // --- Notification System ---

    function showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) {
            console.error('Notification container not found');
            return;
        }
        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;

        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-exclamation';

        toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <p>${message}</p>
    `;

        container.appendChild(toast);

        // Auto fade out
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    function getFriendlyErrorMessage(error) {
        const code = error.code;
        switch (code) {
            case 'auth/email-already-in-use':
                return "This email is already registered. Please login instead.";
            case 'auth/invalid-email':
                return "Please enter a valid email address.";
            case 'auth/user-not-found':
                return "No account found with this email.";
            case 'auth/wrong-password':
                return "Incorrect password. Please try again.";
            case 'auth/weak-password':
                return "Password should be at least 6 characters.";
            case 'auth/network-request-failed':
                return "Network error. Please check your internet connection.";
            case 'auth/too-many-requests':
                return "Too many failed attempts. Please try again later.";
            case 'auth/invalid-credential':
                return "Invalid credentials. Please check your email and password.";
            default:
                return "An error occurred. Please try again.";
        }
    }

    // Dashboard Actions
    addCustomerBtn.addEventListener('click', () => {
        openAddCustomerModal();
    });

    customerSearchInput.addEventListener('input', (e) => {
        renderCustomerList(e.target.value);
    });

    globalReportBtn.addEventListener('click', () => {
        openReportModal(true); // true for global report
    });

    // Selection Mode
    selectModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectionMode = e.target.value;
            // Re-render to update checkbox states/logic if needed, 
            // though mainly affects report generation
        });
    });

    // Customer View Actions
    backToDashboardBtn.addEventListener('click', () => {
        currentCustomerId = null;
        switchView('dashboard');
    });

    giveMoneyBtn.addEventListener('click', () => {
        openTransactionModal('EXPENSE');
    });

    gotMoneyBtn.addEventListener('click', () => {
        openTransactionModal('INCOME');
    });

    reportBtn.addEventListener('click', () => {
        openReportModal(false); // false for single customer report
    });

    // Modal Actions
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Forms
    addCustomerForm.addEventListener('submit', handleSaveCustomer);
    transactionForm.addEventListener('submit', handleSaveTransaction);

    // Report Generation
    exportPdfBtn.addEventListener('click', () => generateReport('pdf'));
    exportExcelBtn.addEventListener('click', () => generateReport('excel'));
}

// --- View Management ---

window.addEventListener('popstate', (event) => {
    const state = event.state;
    if (!state) return;

    // Restore Context
    if (state.customerId) currentCustomerId = state.customerId;
    if (state.isAdmin !== undefined) isAdmin = state.isAdmin;

    // Restore View
    if (state.view) {
        // Auth Guard
        const protectedViews = ['dashboard', 'customer', 'admin'];
        if (protectedViews.includes(state.view) && !currentUser) {
            switchView('login', false);
            return;
        }

        switchView(state.view, false); // Don't push state on pop
    }

    // Restore Modals
    if (state.modal) {
        const modal = document.getElementById(state.modal);
        if (modal) {
            modalOverlay.classList.remove('hidden');
            modal.classList.remove('hidden');
        }
    } else {
        hideModalsUI();
    }
});

function switchView(viewName, historyAction = 'push') {
    // Backward compatibility for boolean args
    if (historyAction === true) historyAction = 'push';
    if (historyAction === false) historyAction = 'none';

    Object.values(views).forEach(el => el.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
    currentView = viewName;

    const state = {
        view: viewName,
        customerId: currentCustomerId,
        isAdmin: isAdmin,
        modal: null
    };

    if (historyAction === 'push') {
        history.pushState(state, '', `#${viewName}`);
    } else if (historyAction === 'replace') {
        history.replaceState(state, '', `#${viewName}`);
    }

    if (viewName === 'dashboard') {
        loadCustomers();
    }
}

function clearAuthForms() {
    loginForm.reset();
    signupForm.reset();
    loginErrorMsg.textContent = '';
    signupErrorMsg.textContent = '';
}

// --- Dashboard Logic ---

function loadDashboard(historyAction = 'push') {
    switchView('dashboard', historyAction);
    loadCustomers();
}

function loadCustomers() {
    if (!currentUser) return;

    FirebaseService.onCustomersChange(currentUser.uid, (data) => {
        customers = data;
        calculateTotals();
        renderCustomerList(customerSearchInput.value);
    });
}
function calculateTotals() {
    let totalGive = 0;
    let totalGet = 0;

    customers.forEach(c => {
        let cBalance = 0;
        if (c.transactions) {
            Object.values(c.transactions).forEach(t => {
                const amount = parseFloat(t.amount) || 0;
                if (t.type === 'INCOME') {
                    cBalance += amount;
                    totalGet += amount; // Add to global total income
                } else {
                    cBalance -= amount;
                    totalGive += amount; // Add to global total expense
                }
            });
        }
        c.balance = cBalance; // Update local object
    });

    totalGiveEl.textContent = totalGive.toLocaleString('en-IN');
    totalGetEl.textContent = totalGet.toLocaleString('en-IN');

    const overall = totalGet - totalGive;
    overallBalanceEl.textContent = `₹ ${Math.abs(overall).toLocaleString('en-IN')}`;

    if (overall > 0) {
        overallBalanceEl.className = 'green';
        overallBalanceLabelEl.textContent = "You will get";
        overallBalanceLabelEl.className = 'green';
    } else if (overall < 0) {
        overallBalanceEl.className = 'red';
        overallBalanceLabelEl.textContent = "You will give";
        overallBalanceLabelEl.className = 'red';
    } else {
        overallBalanceEl.className = '';
        overallBalanceLabelEl.textContent = "Settled";
        overallBalanceLabelEl.className = '';
    }
}

function renderCustomerList(searchTerm = '') {
    customerListEl.innerHTML = '';
    const term = searchTerm.toLowerCase();

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term)
    );

    if (filteredCustomers.length === 0) {
        customerListEl.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-users-slash"></i>
                <p>No customers found</p>
            </div>`;
        return;
    }

    filteredCustomers.forEach(c => {
        const item = document.createElement('div');
        item.className = 'customer-item';

        const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const balanceClass = c.balance >= 0 ? 'green' : 'red';
        const balanceText = c.balance >= 0 ? `₹ ${c.balance}` : `₹ ${Math.abs(c.balance)}`;
        const balanceLabel = c.balance >= 0 ? 'You will get' : 'You will give';

        // Checkbox state
        const isChecked = selectedCustomerIds.has(c.id) ? 'checked' : '';

        item.innerHTML = `
            <div class="customer-select-area" onclick="event.stopPropagation()">
                <input type="checkbox" class="customer-checkbox" data-id="${c.id}" ${isChecked}>
                <div class="customer-info" onclick="openCustomer('${c.id}')">
                    <div class="avatar">${initials}</div>
                    <div class="details">
                        <h4>${c.name}</h4>
                        <p>${c.phone}</p>
                    </div>
                </div>
            </div>
            <div class="customer-balance" onclick="openCustomer('${c.id}')">
                <span class="val ${balanceClass}">${balanceText}</span>
                <span class="label">${balanceLabel}</span>
            </div>
            <div class="action-icons">
                <i class="fa-solid fa-pen action-icon edit" onclick="event.stopPropagation(); openEditCustomerModal('${c.id}')"></i>
                <i class="fa-solid fa-trash action-icon delete" onclick="event.stopPropagation(); deleteCustomer('${c.id}')"></i>
            </div>
        `;

        // Add event listener for checkbox manually to avoid bubbling issues
        const checkbox = item.querySelector('.customer-checkbox');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedCustomerIds.add(c.id);
            } else {
                selectedCustomerIds.delete(c.id);
            }
        });

        customerListEl.appendChild(item);
    });
}

// --- Customer Detail Logic ---

window.openCustomer = (id) => {
    currentCustomerId = id;
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    customerNameHeader.textContent = customer.name;
    customerPhoneHeader.textContent = customer.phone;
    customerAvatar.textContent = customer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    switchView('customer');
    loadTransactions();
};

function loadTransactions() {
    if (!currentUser || !currentCustomerId) return;

    FirebaseService.onTransactionsChange(currentUser.uid, currentCustomerId, (data) => {
        transactions = data;
        renderTransactions();
        updateCustomerBalanceDisplay();
    });
}

function renderTransactions() {
    transactionsListEl.innerHTML = '';

    if (transactions.length === 0) {
        transactionsListEl.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-note-sticky"></i>
                <p>No transactions yet</p>
            </div>`;
        return;
    }

    transactions.forEach(t => {
        const item = document.createElement('div');
        item.className = 'transaction-item';

        const isIncome = t.type === 'INCOME';
        const colorClass = isIncome ? 'green' : 'red';
        const sign = isIncome ? '+' : '-';
        const formattedDate = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        item.innerHTML = `
            <div class="t-info">
                <div class="t-date">${formattedDate}</div>
                <div class="t-note">
                    ${t.note || 'No description'}
                    <span class="t-type">${t.type}</span>
                </div>
            </div>
            <div class="t-amount ${colorClass}">${sign} ₹ ${t.amount}</div>
            <div class="t-actions">
                <i class="fa-solid fa-pen action-icon edit" onclick="openEditTransactionModal('${t.id}')"></i>
                <i class="fa-solid fa-trash action-icon delete" onclick="deleteTransaction('${t.id}')"></i>
            </div>
        `;
        transactionsListEl.appendChild(item);
    });
}

function updateCustomerBalanceDisplay() {
    let balance = 0;
    transactions.forEach(t => {
        if (t.type === 'INCOME') balance += t.amount;
        else balance -= t.amount;
    });

    customerNetBalanceEl.textContent = `₹ ${Math.abs(balance)}`;
    customerNetBalanceEl.className = balance >= 0 ? 'amount green' : 'amount red';
}

// --- CRUD Operations ---

// Customer CRUD
function openAddCustomerModal() {
    addCustomerForm.reset();
    customerIdEditInput.value = '';
    customerModalTitle.textContent = 'Add New Customer';
    saveCustomerBtn.textContent = 'Save Customer';
    openModal(addCustomerModal);
}

window.openEditCustomerModal = (id) => {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    newCustomerNameInput.value = customer.name;
    newCustomerPhoneInput.value = customer.phone;
    customerIdEditInput.value = id;
    customerModalTitle.textContent = 'Edit Customer';
    saveCustomerBtn.textContent = 'Update Customer';
    openModal(addCustomerModal);
};

async function handleSaveCustomer(e) {
    e.preventDefault();
    const name = newCustomerNameInput.value;
    const phone = newCustomerPhoneInput.value;
    const id = customerIdEditInput.value;

    try {
        if (id) {
            await FirebaseService.updateCustomer(currentUser.uid, id, name, phone);
        } else {
            await FirebaseService.addCustomer(currentUser.uid, name, phone);
        }
        closeModal();
    } catch (error) {
        alert("Error saving customer: " + error.message);
    }
}

window.deleteCustomer = async (id) => {
    if (confirm("Are you sure you want to delete this customer and all their transactions?")) {
        try {
            await FirebaseService.deleteCustomer(currentUser.uid, id);
        } catch (error) {
            alert("Error deleting customer: " + error.message);
        }
    }
};

// Transaction CRUD
function openTransactionModal(type) {
    transactionForm.reset();
    transactionTypeInput.value = type;
    transactionIdInput.value = '';
    transactionDateInput.valueAsDate = new Date();
    transactionModalTitle.textContent = type === 'INCOME' ? 'Add Income' : 'Add Expense';
    openModal(transactionModal);
}

window.openEditTransactionModal = (id) => {
    const t = transactions.find(tr => tr.id === id);
    if (!t) return;

    transactionAmountInput.value = t.amount;
    transactionNoteInput.value = t.note;
    transactionDateInput.value = t.date;
    transactionTypeInput.value = t.type;
    transactionIdInput.value = id;
    transactionModalTitle.textContent = 'Edit Transaction';
    openModal(transactionModal);
};

async function handleSaveTransaction(e) {
    e.preventDefault();
    const amount = transactionAmountInput.value;
    const note = transactionNoteInput.value;
    const date = transactionDateInput.value;
    const type = transactionTypeInput.value;
    const id = transactionIdInput.value;

    try {
        if (id) {
            await FirebaseService.updateTransaction(currentUser.uid, currentCustomerId, id, type, amount, note, date);
        } else {
            await FirebaseService.addTransaction(currentUser.uid, currentCustomerId, type, amount, note, date);
        }
        closeModal();
    } catch (error) {
        alert("Error saving transaction: " + error.message);
    }
}

window.deleteTransaction = async (id) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
        try {
            await FirebaseService.deleteTransaction(currentUser.uid, currentCustomerId, id);
        } catch (error) {
            alert("Error deleting transaction: " + error.message);
        }
    }
};

// --- Admin Logic ---

async function loadAdminDashboard(historyAction = 'push') {
    switchView('admin', historyAction);
    try {
        const users = await FirebaseService.getAllUsers();
        renderAdminUserList(users);

        adminTotalUsersEl.textContent = users.length;
        const totalCustomers = users.reduce((sum, user) => sum + user.customerCount, 0);
        adminTotalCustomersEl.textContent = totalCustomers;

    } catch (error) {
        console.error("Error loading admin data:", error);
        alert("Failed to load admin data");
    }
}

function renderAdminUserList(users) {
    adminUserListEl.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.uid}</td>
            <td>${user.email}</td>
            <td>${user.customerCount}</td>
            <td>${new Date(user.joinedAt).toLocaleDateString()}</td>
        `;
        adminUserListEl.appendChild(row);
    });
}

// --- Report Generation ---

function openReportModal(isGlobal) {
    reportStartDateInput.value = '';
    reportEndDateInput.value = '';
    reportDescriptionInput.value = '';

    // Store context for generation
    reportModal.dataset.isGlobal = isGlobal;

    openModal(reportModal);
}

function generateReport(format) {
    const isGlobal = reportModal.dataset.isGlobal === 'true';
    const startDate = reportStartDateInput.value ? new Date(reportStartDateInput.value) : null;
    const endDate = reportEndDateInput.value ? new Date(reportEndDateInput.value) : null;
    const descriptionFilter = reportDescriptionInput.value.toLowerCase().trim();

    if (isGlobal) {
        generateGlobalReport(format, startDate, endDate, descriptionFilter);
    } else {
        generateCustomerReport(format, startDate, endDate, descriptionFilter);
    }
    closeModal();
}

function generateCustomerReport(format, startDate, endDate, descriptionFilter) {
    const customer = customers.find(c => c.id === currentCustomerId);
    if (!customer) return;

    // Filter transactions
    let filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        if (startDate && tDate < startDate) return false;
        if (endDate && tDate > endDate) return false;
        if (descriptionFilter && !t.note.toLowerCase().includes(descriptionFilter)) return false;
        return true;
    });

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    filteredTransactions.forEach(t => {
        if (t.type === 'INCOME') totalIncome += t.amount;
        else totalExpense += t.amount;
    });
    const netBalance = totalIncome - totalExpense;

    const data = filteredTransactions.map(t => [
        t.date,
        t.note,
        t.type,
        t.amount
    ]);

    // Add Totals Row
    data.push(['', 'TOTALS', '', '']);
    data.push(['', 'Total Income', '', totalIncome]);
    data.push(['', 'Total Expense', '', totalExpense]);
    data.push(['', 'NET BALANCE', '', netBalance]);

    if (format === 'pdf') {
        const doc = new jspdf.jsPDF();
        doc.text(`Statement for ${customer.name}`, 14, 15);
        doc.text(`Phone: ${customer.phone}`, 14, 22);
        if (startDate && endDate) {
            doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 14, 29);
        }
        if (descriptionFilter) {
            doc.text(`Filter: ${descriptionFilter}`, 14, startDate && endDate ? 36 : 29);
        }

        doc.autoTable({
            head: [['Date', 'Description', 'Type', 'Amount']],
            body: data,
            startY: descriptionFilter ? (startDate && endDate ? 42 : 35) : (startDate && endDate ? 35 : 29),
        });
        doc.save(`${customer.name}_Report.pdf`);
    } else {
        const ws = XLSX.utils.aoa_to_sheet([
            [`Statement for ${customer.name}`],
            [`Phone: ${customer.phone}`],
            ['Date', 'Description', 'Type', 'Amount'],
            ...data
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Statement");
        XLSX.writeFile(wb, `${customer.name}_Report.xlsx`);
    }
}

function generateGlobalReport(format, startDate, endDate, descriptionFilter) {
    // Filter customers based on selection mode
    let reportCustomers = [];
    if (selectionMode === 'all') {
        reportCustomers = customers;
    } else if (selectionMode === 'selected') {
        reportCustomers = customers.filter(c => selectedCustomerIds.has(c.id));
    } else if (selectionMode === 'except') {
        reportCustomers = customers.filter(c => !selectedCustomerIds.has(c.id));
    }

    let globalTotalIncome = 0;
    let globalTotalExpense = 0;

    const data = reportCustomers.map(c => {
        // Calculate totals for this customer (considering date range if needed, but usually global report is snapshot)
        // If date range is applied, we need to filter their transactions.
        // Since we don't have all transactions loaded, we rely on 'c.transactions' which we processed in loadCustomers

        let cIncome = 0;
        let cExpense = 0;

        if (c.transactions) {
            Object.values(c.transactions).forEach(t => {
                const tDate = new Date(t.date);
                if (startDate && tDate < startDate) return;
                if (endDate && tDate > endDate) return;
                if (descriptionFilter && !t.note.toLowerCase().includes(descriptionFilter)) return;

                if (t.type === 'INCOME') cIncome += t.amount;
                else cExpense += t.amount;
            });
        }

        globalTotalIncome += cIncome;
        globalTotalExpense += cExpense;

        return [
            c.name,
            c.phone,
            cIncome,
            cExpense,
            cIncome - cExpense
        ];
    });

    const globalNet = globalTotalIncome - globalTotalExpense;

    // Add Global Totals
    data.push(['', '', '', '', '']);
    data.push(['TOTALS', '', globalTotalIncome, globalTotalExpense, globalNet]);

    if (format === 'pdf') {
        const doc = new jspdf.jsPDF();
        doc.text("Global Balance Report", 14, 15);
        if (startDate && endDate) {
            doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 14, 22);
        }

        if (descriptionFilter) {
            doc.text(`Filter: ${descriptionFilter}`, 14, startDate && endDate ? 29 : 22);
        }

        doc.autoTable({
            head: [['Customer', 'Phone', 'Total Income', 'Total Expense', 'Net Balance']],
            body: data,
            startY: descriptionFilter ? (startDate && endDate ? 36 : 29) : (startDate && endDate ? 30 : 22),
        });
        doc.save("Global_Balance_Report.pdf");
    } else {
        const ws = XLSX.utils.aoa_to_sheet([
            ["Global Balance Report"],
            ['Customer', 'Phone', 'Total Income', 'Total Expense', 'Net Balance'],
            ...data
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Global Report");
        XLSX.writeFile(wb, "Global_Balance_Report.xlsx");
    }
}

// --- Utilities ---

function openModal(modal) {
    modalOverlay.classList.remove('hidden');
    modal.classList.remove('hidden');

    // Push Modal State
    history.pushState({
        view: currentView,
        customerId: currentCustomerId,
        isAdmin: isAdmin,
        modal: modal.id
    }, '', `#${currentView}/${modal.id}`);
}

function closeModal() {
    // Logic: Go back in history, which triggers popstate, which calls hideModalsUI
    // Check if current state has a modal before backing to avoid accidental view navigation
    if (history.state && history.state.modal) {
        history.back();
    } else {
        hideModalsUI();
    }
}

function hideModalsUI() {
    modalOverlay.classList.add('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// Start App
init();
