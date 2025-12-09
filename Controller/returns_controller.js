toastr.options = {
    "closeButton": true,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "timeOut": "5000"
};

let currentEmployee = null;
let currentMoveData = null;
let refreshInterval = null;

function checkAuth() {
    const employee = JSON.parse(sessionStorage.getItem('employee'));
    
    if (!employee) {
        window.location.href = '../View/index.html';
        return null;
    }
    
    // Block Store Clerks from accessing Returns page
    if (employee.employee_role === 'Store Clerk') {
        toastr.error('Access Denied - Only Managers and Admins can view Returns');
        window.location.href = '../View/front_display.html';
        return null;
    }
    
    currentEmployee = employee;
    
    document.getElementById('welcome-text').innerHTML = `
        Welcome, <strong>${employee.employee_name}</strong>
        <span class="role-badge">${employee.employee_role}</span>
    `;
    // For Store Clerks - disable both
    if (employee.employee_role === 'Store Clerk') {
        const returnsLink = document.getElementById('returns-link');
        const employeesLink = document.getElementById('employees-link');
        const addItemLink = document.getElementById('add-item-link');
        
        if (returnsLink) {
            returnsLink.classList.add('disabled');
            returnsLink.onclick = (e) => { e.preventDefault(); toastr.error('Access Denied'); };
        }
        if (employeesLink) {
            employeesLink.classList.add('disabled');
            employeesLink.onclick = (e) => { e.preventDefault(); toastr.error('Access Denied'); };
        }
        if (addItemLink) {
            addItemLink.classList.add('disabled');
            addItemLink.onclick = (e) => { e.preventDefault(); toastr.error('Access Denied'); };
        }
    }

    // For Managers - disable only Manage Employees
    if (employee.employee_role === 'Manager') {
        const employeesLink = document.getElementById('employees-link');
        if (employeesLink) {
            employeesLink.classList.add('disabled');
            employeesLink.onclick = (e) => { e.preventDefault(); toastr.error('Only Admins can manage employees'); };
        }
    }
    
    return employee;
}

function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div class="error-message">
            <strong>Error:</strong> ${message}<br>
            <small>Make sure the server is running on http://localhost:3000</small>
        </div>
    `;
}

async function loadInventory() {
    try {
        const response = await fetch('/api/inventory/Returns');
        if (!response.ok) throw new Error('Failed to fetch Returns items');
        
        const items = await response.json();
        
        displayItems('returns-items', items, 'Returns');
        document.getElementById('returns-count').textContent = items.length;
        document.getElementById('error-container').innerHTML = '';
        
    } catch (error) {
        console.error('Error loading inventory:', error);
        showError('Failed to load inventory. ' + error.message);
        document.getElementById('returns-items').innerHTML = '<div class="empty-state">Failed to load items</div>';
    }
}

function displayItems(containerId, items, location) {
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state">No items in this section</div>';
        return;
    }

    const now = new Date().toLocaleTimeString();
    const timestamp = `<div style="color: #666; font-size: 0.9em; margin-bottom: 10px;">Last updated: ${now}</div>`;

    
    container.innerHTML = timestamp + items.map(item => `
        <div class="item">
            <h4>${item.item_name}</h4>
            <p><strong>Category:</strong> ${item.item_category}</p>
            <p><strong>Quantity:</strong> ${item.quantity}</p>
            <p><strong>Last Updated:</strong> ${new Date(item.last_updated).toLocaleDateString()}</p>
            <div class="item-actions">
                ${getActionButtons(item, location)}
            </div>
        </div>
    `).join('');
}

function getActionButtons(item, location) {
    const role = currentEmployee.employee_role;
    let buttons = '';
    
    // Edit button for Admin and Manager
    if (role === 'Admin' || role === 'Manager') {
        buttons += `<button class="btn btn-warning" onclick="editItem(${item.item_id}, '${item.item_name}', '${item.item_category}', ${item.quantity}, '${location}', 'returns')">Edit</button>`;
    }
    
    if (role === 'Admin' || role === 'Manager') {
        buttons += `<button class="btn btn-primary" onclick="moveItem(${item.item_id}, '${location}', 'Storage', ${item.quantity}, '${item.item_name}')">Return to Storage</button>`;
    }
    
    return buttons || '<span style="color: #999;">No actions available</span>';
}

// Add this new function
function editItem(itemId, itemName, itemCategory, quantity, location, from) {
    const url = `edit_item.html?id=${itemId}&name=${encodeURIComponent(itemName)}&category=${encodeURIComponent(itemCategory)}&quantity=${quantity}&location=${location}&from=${from}`;
    window.location.href = url;
}

function moveItem(itemId, fromLocation, toLocation, maxQty, itemName) {
    currentMoveData = { itemId, fromLocation, toLocation, maxQty, itemName };
    
    document.getElementById('modal-item-name').value = itemName;
    document.getElementById('modal-from').value = fromLocation;
    document.getElementById('modal-to').value = toLocation;
    document.getElementById('modal-quantity').value = 1;
    document.getElementById('modal-quantity').max = maxQty;
    
    document.getElementById('moveModal').classList.add('active');
}

function closeModal() {
    document.getElementById('moveModal').classList.remove('active');
    currentMoveData = null;
}

async function confirmMove() {
    if (!currentMoveData) return;
    
    const quantity = parseInt(document.getElementById('modal-quantity').value);
    
    if (quantity <= 0 || quantity > currentMoveData.maxQty) {
        toastr.error(`Please enter a valid quantity (1-${currentMoveData.maxQty})`);
        return;
    }
    
    try {
        const response = await fetch('/api/inventory/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_id: currentMoveData.itemId,
                from_location: currentMoveData.fromLocation,
                to_location: currentMoveData.toLocation,
                quantity: quantity,
                employee_role: currentEmployee.employee_role,
                employee_id: currentEmployee.employee_id,     
                employee_name: currentEmployee.employee_name
            })
        });
        
        const text = await response.text();
        if (!text) throw new Error('Empty response');
        const result = JSON.parse(text);
        
        if (result.success) {
            toastr.success('Item moved successfully!');
            closeModal();
            loadInventory();
        } else {
            toastr.error('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error moving item:', error);
        toastr.error('Failed to move item. Check if server is running.');
    }
}

function logout() {
    // Clear the interval when logging out
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    sessionStorage.clear();
    window.location.href = '../View/index.html';
}

// Initialize page with auto-refresh
if (checkAuth()) {
    loadInventory(); // Load immediately
    
    // Set up auto-refresh every 1 minute (60000 milliseconds)
    refreshInterval = setInterval(() => {
        console.log('Auto-refreshing Returns inventory...');
        loadInventory();
    }, 60000); // 60000 ms = 1 minute
}

// Clean up interval when page is closed/unloaded
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});