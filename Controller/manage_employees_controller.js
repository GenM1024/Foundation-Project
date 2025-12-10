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
    
    // Only Admin can manage employees
    if (employee.employee_role !== 'Admin') {
        toastr.error('Access Denied - Only Admins can manage employees');
        window.location.href = '../View/front_display.html';
        return null;
    }
    
    currentEmployee = employee;
    
    document.getElementById('welcome-text').innerHTML = `
        Welcome, <strong>${employee.employee_name}</strong>
        <span class="role-badge">${employee.employee_role}</span>
    `;
    
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

async function loadEmployees() {
    try {
        const response = await fetch('http://localhost:3000/api/employees/all');
        if (!response.ok) throw new Error('Failed to fetch employees');
        
        const text = await response.text();
        if (!text) throw new Error('Empty response');
        const employees = JSON.parse(text);
        displayEmployees(employees);
        
    } catch (error) {
        console.error('Error loading employees:', error);
        showError('Failed to load employees. ' + error.message);
    }
}

function displayEmployees(employees) {
    const container = document.getElementById('employees-container');
    
    const now = new Date().toLocaleTimeString();
    const timestamp = `<div style="color: #666; font-size: 0.9em; margin-bottom: 10px;">Last updated: ${now}</div>`;

    if (employees.length === 0) {
        container.innerHTML = '<div class="empty-state">No employees found</div>';
        return;
    }
    
    container.innerHTML = timestamp + employees.map(emp => {
        const roleClass = emp.employee_role === 'Admin' ? 'role-admin-badge' :
                         emp.employee_role === 'Manager' ? 'role-manager-badge' : 'role-clerk-badge';
        
        return `
            <div class="employee-card">
                <h5>${emp.employee_name}</h5>
                <p><strong>Email:</strong> ${emp.employee_email}</p>
                <p><strong>ID:</strong> ${emp.employee_id}</p>
                <span class="employee-role-badge ${roleClass}">${emp.employee_role}</span>
            </div>
        `;
    }).join('');
}

async function addEmployee(event) {
    event.preventDefault();
    
    const name = document.getElementById('emp-name').value;
    const email = document.getElementById('emp-email').value;
    const role = document.getElementById('emp-role').value;
    const password = document.getElementById('emp-password').value;
    
    try {
        const response = await fetch('http://localhost:3000/api/employees/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_name: name,
                employee_email: email,
                employee_role: role,
                employee_password: password,
                admin_role: currentEmployee.employee_role
            })
        });
        
        const text = await response.text();
        if (!text) throw new Error('Empty response');
        const result = JSON.parse(text);
        
        if (result.success) {
            showSuccess('Employee added successfully!');
            document.getElementById('addEmployeeForm').reset();
            loadEmployees();
        } else {
            showError(result.message);
        }
    } catch (error) {
        console.error('Error adding employee:', error);
        showError('Failed to add employee. Check if server is running.');
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


if (checkAuth()) {
    loadEmployees(); // Load immediately
    // Set up auto-refresh every 1 minute (60000 milliseconds)
    refreshInterval = setInterval(() => {
        console.log('Auto-refreshing employee list...'); // Optional: for debugging
        loadEmployees();
    }, 60000); // 60000 ms = 1 minute
}

// Clean up interval when page is closed/unloaded
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});