let currentEmployee = null;

function checkAuth() {
    const employee = JSON.parse(sessionStorage.getItem('employee'));
    
    if (!employee) {
        window.location.href = '../View/index.html';
        return null;
    }
    
    currentEmployee = employee;
    
    document.getElementById('welcome-text').innerHTML = `
        Welcome, <strong>${employee.employee_name}</strong>
        <span class="role-badge">${employee.employee_role}</span>
    `;
    
    // Handle navigation links based on role
    if (employee.employee_role === 'Store Clerk') {
        const returnsLink = document.getElementById('returns-link');
        const employeesLink = document.getElementById('employees-link');
        const addItemLink = document.getElementById('add-item-link');
        
        if (returnsLink) {
            returnsLink.classList.add('disabled');
            returnsLink.onclick = (e) => { e.preventDefault(); alert('Access Denied'); };
        }
        if (employeesLink) {
            employeesLink.classList.add('disabled');
            employeesLink.onclick = (e) => { e.preventDefault(); alert('Access Denied'); };
        }
        if (addItemLink) {
            addItemLink.classList.add('disabled');
            addItemLink.onclick = (e) => { e.preventDefault(); alert('Access Denied'); };
        }
    }
    
    if (employee.employee_role === 'Manager') {
        const employeesLink = document.getElementById('employees-link');
        if (employeesLink) {
            employeesLink.classList.add('disabled');
            employeesLink.onclick = (e) => { e.preventDefault(); alert('Only Admins can manage employees'); };
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

async function loadLogs() {
    try {
        const response = await fetch('http://localhost:3000/api/movement-logs');
        if (!response.ok) throw new Error('Failed to fetch movement logs');
        
        const text = await response.text();
        if (!text) throw new Error('Empty response');
        const logs = JSON.parse(text);
        
        displayLogs(logs);
        
    } catch (error) {
        console.error('Error loading logs:', error);
        showError('Failed to load movement history. ' + error.message);
    }
}

function displayLogs(logs) {
    const container = document.getElementById('logs-container');
    
    if (logs.length === 0) {
        container.innerHTML = '<div class="empty-state">No movement history found</div>';
        return;
    }
    
    let html = `
        <table class="log-table">
            <thead>
                <tr>
                    <th>Date & Time</th>
                    <th>Item Name</th>
                    <th>Employee</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Quantity</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    logs.forEach(log => {
        const date = new Date(log.movement_date);
        html += `
            <tr>
                <td>${date.toLocaleString()}</td>
                <td>${log.item_name}</td>
                <td>${log.employee_name}</td>
                <td>${log.from_location}</td>
                <td>${log.to_location}</td>
                <td>${log.quantity}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

async function updateFilters() {
    const filterType = document.getElementById('filter-type').value;
    const filterValue = document.getElementById('filter-value');
    
    if (filterType === 'all') {
        filterValue.style.display = 'none';
        return;
    }
    
    filterValue.style.display = 'inline';
    filterValue.innerHTML = '<option value="">Select...</option>';
    
    if (filterType === 'employee') {
        try {
            const response = await fetch('http://localhost:3000/api/employees/all');
            const text = await response.text();
            if (!text) throw new Error('Empty response');
            const employees = JSON.parse(text);
            
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.employee_id;
                option.textContent = emp.employee_name;
                filterValue.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    } else if (filterType === 'location') {
        ['Display', 'Storage', 'Returns'].forEach(loc => {
            const option = document.createElement('option');
            option.value = loc;
            option.textContent = loc;
            filterValue.appendChild(option);
        });
    }
}

async function applyFilter() {
    const filterType = document.getElementById('filter-type').value;
    const filterValue = document.getElementById('filter-value').value;
    
    if (filterType === 'all') {
        loadLogs();
        return;
    }
    
    if (!filterValue) {
        alert('Please select a filter value');
        return;
    }
    
    try {
        if (filterType === 'employee') {
            // Filter by employee
            const response = await fetch(`http://localhost:3000/api/movement-logs/employee/${filterValue}`);
            if (!response.ok) throw new Error('Failed to fetch logs');
            
            const text = await response.text();
            if (!text) throw new Error('Empty response');
            const logs = JSON.parse(text);
            
            displayLogs(logs);
            
        } else if (filterType === 'location') {
            // Filter by location
            const response = await fetch('http://localhost:3000/api/movement-logs');
            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }
            const text = await response.text();
            if (!text){
                throw new Error('Empty response');
            }
            const allLogs = JSON.parse(text);
            
            const filtered = allLogs.filter(log => 
                log.from_location === filterValue
            );
            
            displayLogs(filtered);
        }
        
    } catch (error) {
        console.error('Error applying filter:', error);
        showError('Failed to apply filter. ' + error.message);
    }
}

function logout() {
    sessionStorage.clear();
    window.location.href = '../View/index.html';
}

if (checkAuth()) {
    loadLogs();
}