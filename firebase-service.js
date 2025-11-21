// firebase-service.js

// Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBLMyV7piTIwHrfmmXV-BcEkpv1liAhDd8",
    authDomain: "finbook-e7b87.firebaseapp.com",
    databaseURL: "https://finbook-e7b87-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "finbook-e7b87",
    storageBucket: "finbook-e7b87.firebasestorage.app",
    messagingSenderId: "957043413680",
    appId: "1:957043413680:web:26a4f1d017f74047dca175",
    measurementId: "G-K3HRBWF8M8"
};

// Get globally available firebase functions
const {
    initializeApp, getDatabase, ref, set, push, onValue, update, remove, get,
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged
} = window.firebaseModules;

// Initialize
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Service Object
const FirebaseService = {
    auth: auth,

    // --- Authentication ---
    signUp: (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Create user profile in DB
                const user = userCredential.user;
                const userRef = ref(db, `users/${user.uid}/profile`);
                set(userRef, {
                    email: email,
                    joinedAt: new Date().toISOString()
                });
                return user;
            });
    },

    login: (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    },

    logout: () => {
        return signOut(auth);
    },

    onAuthStateChanged: (callback) => {
        onAuthStateChanged(auth, callback);
    },

    // --- Data Management (User Specific) ---

    // Add a new customer
    addCustomer: (userId, name, phone) => {
        const customersRef = ref(db, `users/${userId}/customers`);
        const newCustomerRef = push(customersRef);
        return set(newCustomerRef, {
            name: name,
            phone: phone,
            createdAt: new Date().toISOString(),
            balance: 0
        });
    },

    // Update Customer
    updateCustomer: (userId, id, name, phone) => {
        const customerRef = ref(db, `users/${userId}/customers/${id}`);
        return update(customerRef, {
            name: name,
            phone: phone
        });
    },

    // Delete Customer
    deleteCustomer: (userId, id) => {
        const customerRef = ref(db, `users/${userId}/customers/${id}`);
        return remove(customerRef);
    },

    // Listen to customers (Real-time)
    onCustomersChange: (userId, callback) => {
        const customersRef = ref(db, `users/${userId}/customers`);
        onValue(customersRef, (snapshot) => {
            const data = snapshot.val();
            const customers = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    customers.push({
                        id: key,
                        ...data[key]
                    });
                });
            }
            callback(customers);
        });
    },

    // Add Transaction
    addTransaction: (userId, customerId, type, amount, note, date) => {
        const transactionsRef = ref(db, `users/${userId}/customers/${customerId}/transactions`);
        const newTransactionRef = push(transactionsRef);

        const transactionData = {
            type: type, // 'EXPENSE' or 'INCOME'
            amount: parseFloat(amount),
            note: note,
            date: date,
            timestamp: new Date().toISOString()
        };

        return set(newTransactionRef, transactionData);
    },

    // Update Transaction
    updateTransaction: (userId, customerId, transactionId, type, amount, note, date) => {
        const transactionRef = ref(db, `users/${userId}/customers/${customerId}/transactions/${transactionId}`);
        return update(transactionRef, {
            type: type,
            amount: parseFloat(amount),
            note: note,
            date: date
        });
    },

    // Delete Transaction
    deleteTransaction: (userId, customerId, transactionId) => {
        const transactionRef = ref(db, `users/${userId}/customers/${customerId}/transactions/${transactionId}`);
        return remove(transactionRef);
    },

    // Get Transactions for a customer
    onTransactionsChange: (userId, customerId, callback) => {
        const transactionsRef = ref(db, `users/${userId}/customers/${customerId}/transactions`);
        onValue(transactionsRef, (snapshot) => {
            const data = snapshot.val();
            const transactions = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    transactions.push({
                        id: key,
                        ...data[key]
                    });
                });
            }
            // Sort by date desc
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            callback(transactions);
        });
    },

    // --- Admin Features ---
    getAllUsers: () => {
        const usersRef = ref(db, 'users');
        return get(usersRef).then((snapshot) => {
            const data = snapshot.val();
            const users = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    const user = data[key];
                    const customerCount = user.customers ? Object.keys(user.customers).length : 0;
                    users.push({
                        uid: key,
                        email: user.profile ? user.profile.email : 'Unknown',
                        joinedAt: user.profile ? user.profile.joinedAt : 'Unknown',
                        customerCount: customerCount
                    });
                });
            }
            return users;
        });
    }
};

export default FirebaseService;
