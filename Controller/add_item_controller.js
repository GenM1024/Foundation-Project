toastr.options = {
    "closeButton": true,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "timeOut": "5000"
};

let currentEmployee = null;

function checkAuth() {
    const employee = JSON.parse(sessionStorage.getItem('employee'));
    
    if (!employee) {
        window.location.href = '../View/index.html';
        return null;
    }
    
    // Only Admin and Manager can add items
    if (employee.employee_role !== 'Admin' && employee.employee_role !== 'Manager') {
        toastr.error('Access Denied - Only Admins and Managers can add items');
        window.location.href = '../View/front_display.html';
        return null;
    }
    
    currentEmployee = employee;
    
    document.getElementById('welcome-text').innerHTML = `
        Welcome, <strong>${employee.employee_name}</strong>
        <span class="role-badge">${employee.employee_role}</span>
    `;
    
    // Handle navigation links based on role
    if (employee.employee_role === 'Manager') {
        const employeesLink = document.getElementById('employees-link');
        employeesLink.classList.add('disabled');
        employeesLink.onclick = function(e) {
            e.preventDefault();
            toastr.error('Access Denied - Only Admins can manage employees');
        };
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
    setTimeout(() => {
        errorContainer.innerHTML = '';
    }, 3000);
}

async function addItem(event) {
    event.preventDefault();
    
    const name = document.getElementById('item-name').value;
    const category = document.getElementById('item-category').value;
    const quantity = parseInt(document.getElementById('item-quantity').value);
    const location = document.getElementById('item-location').value;
    
    try {
        const response = await fetch('/api/inventory/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_name: name,
                item_category: category,
                quantity: quantity,
                location: location,
                employee_role: currentEmployee.employee_role
            })
        });
        
        const text = await response.text();
        if (!text) throw new Error('Empty response');
        const result = JSON.parse(text);
        
        if (result.success) {
            showSuccess('Item added successfully!');
            document.getElementById('addItemForm').reset();
            
            // Redirect to the location page after 1 second
            setTimeout(() => {
                if (location === 'Storage') {
                    window.location.href = 'storage.html';
                } else {
                    window.location.href = 'front_display.html';
                }
            }, 1000);
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error adding item:', error);
        showError('Failed to add item. Check if server is running.');
    }
}

function logout() {
    sessionStorage.clear();
    window.location.href = '../View/index.html';
}

checkAuth();