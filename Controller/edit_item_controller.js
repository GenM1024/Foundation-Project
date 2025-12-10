toastr.options = {
    "closeButton": true,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "timeOut": "5000"
};

let currentEmployee = null;
let returnLocation = 'front_display.html'; // Default return location

function checkAuth() {
    const employee = JSON.parse(sessionStorage.getItem('employee'));
    
    if (!employee) {
        window.location.href = '../View/index.html';
        return null;
    }
    
    // Only Manager and Admin can edit items
    if (employee.employee_role === 'Store Clerk') {
        toastr.error('Access Denied - Only Managers and Admins can edit items');
        window.location.href = '../View/front_display.html';
        return null;
    }
    
    currentEmployee = employee;
    
    document.getElementById('welcome-text').innerHTML = `
        Welcome, <strong>${employee.employee_name}</strong>
        <span class="role-badge">${employee.employee_role}</span>
    `;
    
    // Disable links based on role
    if (employee.employee_role === 'Manager') {
        const employeesLink = document.getElementById('employees-link');
        if (employeesLink) {
            employeesLink.classList.add('disabled');
            employeesLink.onclick = (e) => { 
                e.preventDefault(); 
                toastr.error('Only Admins can manage employees'); 
            };
        }
    }
    
    return employee;
}

function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div class="error-message">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

function showSuccess(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div style="background-color: #d4edda; color: #155724; padding: 15px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
            <strong>Success:</strong> ${message}
        </div>
    `;
}

function loadItemData() {
    // Get item data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');
    const itemName = urlParams.get('name');
    const itemCategory = urlParams.get('category');
    const quantity = urlParams.get('quantity');
    const location = urlParams.get('location');
    const from = urlParams.get('from');
    
    if (!itemId) {
        toastr.error('No item selected for editing');
        window.location.href = 'front_display.html';
        return;
    }
    
    // Set return location based on where user came from
    if (from) {
        returnLocation = from + '.html';
    }
    
    // Populate form with existing data
    document.getElementById('item-id').value = itemId;
    document.getElementById('item-name').value = decodeURIComponent(itemName);
    document.getElementById('item-category').value = decodeURIComponent(itemCategory);
    document.getElementById('item-quantity').value = quantity;
    document.getElementById('item-location').value = location;
}

async function updateItem(event) {
    event.preventDefault();
    
    const itemId = document.getElementById('item-id').value;
    const name = document.getElementById('item-name').value;
    const category = document.getElementById('item-category').value;
    const quantity = parseInt(document.getElementById('item-quantity').value);
    const location = document.getElementById('item-location').value;
    
    try {
        const response = await fetch(`http://localhost:3000/api/inventory/update/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_name: name,
                item_category: category,
                quantity: quantity,
                location: location,
                employee_role: currentEmployee.employee_role
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Item updated successfully! Redirecting...');
            setTimeout(() => {
                window.location.href = returnLocation;
            }, 1500);
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error updating item:', error);
        showError('Failed to update item. Check if server is running on port 3000.');
    }
}

function goBack() {
    window.location.href = returnLocation;
}

function logout() {
    sessionStorage.clear();
    window.location.href = '../View/index.html';
}

// Initialize page
if (checkAuth()) {
    loadItemData();
}