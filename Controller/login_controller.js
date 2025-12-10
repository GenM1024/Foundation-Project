// Load employees into dropdown
const ENABLE_LOCATION_CHECK = true;

toastr.options = {
    "closeButton": true,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "timeOut": "5000"
};

async function loadEmployee() {
    try {
        const response = await fetch('/api/employees');
        const employees = await response.json();
        
        const userSelect = document.getElementById('username');
        
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.employee_id;
            option.textContent = employee.employee_name;
            userSelect.appendChild(option);
        });
        
        console.log('Employees loaded:', employees);
    } catch (error) {
        console.error('Error loading employees:', error);
        toastr.error('Failed to load employees. Make sure the server is running!');
    }
}

// Get employee details when selected
async function getEmployeeDetails() {
    const employeeId = document.getElementById('username').value;
    
    if (!employeeId) {
        document.getElementById('role').value = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/employees/${employeeId}`);
        const employee = await response.json();
        
        document.getElementById('role').value = employee.employee_role;
        
        console.log('Selected employee:', employee);
    } catch (error) {
        console.error('Error fetching employee details:', error);
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const employeeId = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!employeeId) {
        toastr.error('Please select a username');
        return;
    }
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                employee_id: employeeId,
                password: password
            })
        });
        
        const text = await response.text();
        if (!text) throw new Error('Empty response');
        const result = JSON.parse(text);
        
        if (result.success) {
            // Store user info in session storage
            sessionStorage.setItem('employee', JSON.stringify(result.employee));
            // Redirect to main dashboard
            window.location.href = '../View/front_display.html';
        } else {
            toastr.error('Invalid username or password!');
            document.getElementById('password').value = '';
        }
    } catch (error) {
        console.error('Login error:', error);
        toastr.error('Login failed. Please try again.');
    }
}

// Call when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadEmployee();
    const form = document.querySelector('.login-form');
    form.addEventListener('submit', handleLogin);
});