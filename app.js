// State Management
let state = {
    transactions: [],
    vaultTotal: 0,
    goal: 10000,
    theme: 'light'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initializeTheme();
    initializeDateInput();
    renderAll();
    setupEventListeners();
});

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem('phAlkansyaState');
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading state:', e);
        }
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('phAlkansyaState', JSON.stringify(state));
}

// Initialize theme
function initializeTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
}

// Update theme icon
function updateThemeIcon() {
    const icon = document.querySelector('.theme-icon');
    icon.textContent = state.theme === 'dark' ? '☀️' : '🌙';
}

// Initialize date input with today's date
function initializeDateInput() {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Format currency
function formatCurrency(amount) {
    return '₱' + parseFloat(amount).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Calculate current balance
function getCurrentBalance() {
    return state.transactions.reduce((sum, t) => sum + (t.amount * t.quantity), 0);
}

// Render everything
function renderAll() {
    renderBalance();
    renderGoal();
    renderProgress();
    renderTransactions();
    renderPiggyFill();
}

// Render balance
function renderBalance() {
    const balance = getCurrentBalance();
    document.getElementById('currentBalance').textContent = formatCurrency(balance);
    document.getElementById('vaultTotal').textContent = formatCurrency(state.vaultTotal);
}

// Render goal
function renderGoal() {
    document.getElementById('goalAmount').textContent = formatCurrency(state.goal);
}

// Render progress
function renderProgress() {
    const balance = getCurrentBalance();
    const percentage = state.goal > 0 ? Math.min((balance / state.goal) * 100, 100) : 0;
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressFill.style.width = percentage + '%';
    progressFill.setAttribute('aria-valuenow', percentage);
    progressText.textContent = percentage.toFixed(1) + '%';
}

// Render piggy fill animation
function renderPiggyFill() {
    const balance = getCurrentBalance();
    const percentage = state.goal > 0 ? Math.min((balance / state.goal) * 100, 100) : 0;
    
    const piggyFill = document.getElementById('piggyFill');
    const maxHeight = 100;
    const fillHeight = (percentage / 100) * maxHeight;
    const yPosition = 140 - fillHeight;
    
    piggyFill.setAttribute('height', fillHeight);
    piggyFill.setAttribute('y', yPosition);
}

// Render transactions
function renderTransactions() {
    const container = document.getElementById('transactionList');
    
    if (state.transactions.length === 0) {
        container.innerHTML = '<p class="empty-state">No transactions yet. Start saving!</p>';
        return;
    }
    
    // Sort by date (newest first)
    const sorted = [...state.transactions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    container.innerHTML = sorted.map(t => {
        const total = t.amount * t.quantity;
        const dateObj = new Date(t.date);
        const formattedDate = dateObj.toLocaleDateString('en-PH', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-amount">${formatCurrency(total)}</div>
                    <div class="transaction-details">
                        ${t.quantity} × ${formatCurrency(t.amount)}
                        ${t.note ? ` • ${t.note}` : ''}
                        • ${formattedDate}
                    </div>
                </div>
                <div class="transaction-actions">
                    <button class="btn-icon edit" onclick="openEditModal('${t.id}')" aria-label="Edit transaction">
                        ✏️
                    </button>
                    <button class="btn-icon delete" onclick="deleteTransaction('${t.id}')" aria-label="Delete transaction">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Quick add buttons
    document.querySelectorAll('.denom-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseFloat(btn.dataset.amount);
            quickAdd(amount);
        });
    });
    
    // Add transaction form
    document.getElementById('addTransactionForm').addEventListener('submit', handleAddTransaction);
    
    // Empty alkansya
    document.getElementById('emptyAlkansyaBtn').addEventListener('click', emptyAlkansya);
    
    // Export/Import
    document.getElementById('exportBtn').addEventListener('click', exportCSV);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importCSV);
    
    // Goal modal
    document.getElementById('editGoalBtn').addEventListener('click', openGoalModal);
    document.getElementById('cancelGoalBtn').addEventListener('click', closeGoalModal);
    document.getElementById('goalForm').addEventListener('submit', handleGoalSubmit);
    
    // Edit modal
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
    
    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
            }
        });
    });
}

// Toggle theme
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
    saveState();
}

// Quick add
function quickAdd(amount) {
    const transaction = {
        id: generateId(),
        amount: amount,
        quantity: 1,
        note: '',
        date: new Date().toISOString().split('T')[0]
    };
    
    state.transactions.push(transaction);
    saveState();
    renderAll();
    showNotification(`Added ${formatCurrency(amount)} to alkansya!`);
}

// Handle add transaction
function handleAddTransaction(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('amount').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    const note = document.getElementById('note').value.trim();
    const date = document.getElementById('date').value;
    
    // Validation
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount greater than 0');
        return;
    }
    
    if (!quantity || quantity < 1) {
        alert('Quantity must be at least 1');
        return;
    }
    
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    const transaction = {
        id: generateId(),
        amount,
        quantity,
        note,
        date
    };
    
    state.transactions.push(transaction);
    saveState();
    renderAll();
    
    // Reset form
    document.getElementById('amount').value = '';
    document.getElementById('quantity').value = '1';
    document.getElementById('note').value = '';
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    showNotification(`Added ${formatCurrency(amount * quantity)} to alkansya!`);
}

// Delete transaction
function deleteTransaction(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    const total = transaction.amount * transaction.quantity;
    const confirmed = confirm(`Delete ${formatCurrency(total)} transaction?`);
    
    if (confirmed) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveState();
        renderAll();
        showNotification('Transaction deleted');
    }
}

// Open edit modal
function openEditModal(id) {
    const transaction = state.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    document.getElementById('editId').value = id;
    document.getElementById('editAmount').value = transaction.amount;
    document.getElementById('editQuantity').value = transaction.quantity;
    document.getElementById('editNote').value = transaction.note;
    document.getElementById('editDate').value = transaction.date;
    
    const modal = document.getElementById('editModal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('editAmount').focus();
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

// Handle edit submit
function handleEditSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('editId').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const quantity = parseInt(document.getElementById('editQuantity').value);
    const note = document.getElementById('editNote').value.trim();
    const date = document.getElementById('editDate').value;
    
    // Validation
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount greater than 0');
        return;
    }
    
    if (!quantity || quantity < 1) {
        alert('Quantity must be at least 1');
        return;
    }
    
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    const index = state.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        state.transactions[index] = { id, amount, quantity, note, date };
        saveState();
        renderAll();
        closeEditModal();
        showNotification('Transaction updated');
    }
}

// Empty alkansya
function emptyAlkansya() {
    const balance = getCurrentBalance();
    
    if (balance === 0) {
        alert('Alkansya is already empty!');
        return;
    }
    
    const confirmed = confirm(
        `Transfer ${formatCurrency(balance)} to vault?\n\nThis will clear all transactions and add the total to your vault.`
    );
    
    if (confirmed) {
        state.vaultTotal += balance;
        state.transactions = [];
        saveState();
        renderAll();
        showNotification(`${formatCurrency(balance)} transferred to vault!`);
    }
}

// Open goal modal
function openGoalModal() {
    document.getElementById('goalInput').value = state.goal;
    const modal = document.getElementById('goalModal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('goalInput').focus();
}

// Close goal modal
function closeGoalModal() {
    const modal = document.getElementById('goalModal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

// Handle goal submit
function handleGoalSubmit(e) {
    e.preventDefault();
    
    const goal = parseFloat(document.getElementById('goalInput').value);
    
    if (!goal || goal <= 0) {
        alert('Please enter a valid goal amount greater than 0');
        return;
    }
    
    state.goal = goal;
    saveState();
    renderAll();
    closeGoalModal();
    showNotification('Goal updated!');
}

// Export CSV
function exportCSV() {
    if (state.transactions.length === 0) {
        alert('No transactions to export!');
        return;
    }
    
    const headers = ['Date', 'Amount', 'Quantity', 'Total', 'Note'];
    const rows = state.transactions.map(t => [
        t.date,
        t.amount,
        t.quantity,
        t.amount * t.quantity,
        t.note || ''
    ]);
    
    let csv = headers.join(',') + '\n';
    csv += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    // Add metadata
    csv += `\n\nVault Total,${state.vaultTotal}\n`;
    csv += `Goal,${state.goal}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alkansya-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('CSV exported successfully!');
}

// Import CSV
function importCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const csv = event.target.result;
            const lines = csv.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                alert('Invalid CSV file');
                return;
            }
            
            const confirmed = confirm(
                'Import CSV?\n\nThis will replace all current transactions. Make sure to export first if you want to keep your data!'
            );
            
            if (!confirmed) return;
            
            const transactions = [];
            
            // Skip header, process data rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                
                // Check for metadata
                if (line.startsWith('Vault Total,')) {
                    const value = parseFloat(line.split(',')[1]);
                    if (!isNaN(value)) state.vaultTotal = value;
                    continue;
                }
                if (line.startsWith('Goal,')) {
                    const value = parseFloat(line.split(',')[1]);
                    if (!isNaN(value)) state.goal = value;
                    continue;
                }
                
                // Parse transaction
                const match = line.match(/"([^"]*)"|([^,]+)/g);
                if (!match || match.length < 4) continue;
                
                const date = match[0].replace(/"/g, '');
                const amount = parseFloat(match[1].replace(/"/g, ''));
                const quantity = parseInt(match[2].replace(/"/g, ''));
                const note = match[4] ? match[4].replace(/"/g, '') : '';
                
                if (date && !isNaN(amount) && !isNaN(quantity)) {
                    transactions.push({
                        id: generateId(),
                        date,
                        amount,
                        quantity,
                        note
                    });
                }
            }
            
            if (transactions.length > 0) {
                state.transactions = transactions;
                saveState();
                renderAll();
                showNotification(`Imported ${transactions.length} transactions!`);
            } else {
                alert('No valid transactions found in CSV');
            }
        } catch (error) {
            alert('Error importing CSV: ' + error.message);
        }
    };
    
    reader.readAsText(file);
    e.target.value = ''; // Reset input
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Show notification
function showNotification(message) {
    // Simple alert for now - could be enhanced with toast notifications
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}