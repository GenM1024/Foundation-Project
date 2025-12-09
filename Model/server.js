const Database = require("better-sqlite3-multiple-ciphers");
const Express = require("express");
const cors = require("cors");
const path = require("path");

const app = Express();
const employeeDatabase = new Database("employees.db");
app.use(cors());
app.use(Express.json());
app.use(Express.static(path.join(__dirname, '../View')));

//CREATE employees TABLE
employeeDatabase.exec(
    `CREATE TABLE IF NOT EXISTS employees(
        employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_name TEXT NOT NULL,
        employee_email TEXT NOT NULL,
        employee_role TEXT NOT NULL,
        employee_password TEXT NOT NULL
    )`
);
//CREATE inventory table
employeeDatabase.exec(
    `CREATE TABLE IF NOT EXISTS inventory(
        item_id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT NOT NULL,
        item_category TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        location TEXT NOT NULL CHECK(location IN ('Display', 'Storage', 'Returns')),
        added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
);
//CREATE NEW movement_log
employeeDatabase.exec(
    `CREATE TABLE IF NOT EXISTS movement_log(
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        employee_id INTEGER NOT NULL,
        employee_name TEXT NOT NULL,
        from_location TEXT NOT NULL,
        to_location TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
    )`
);
// INSERT SAMPLE EMPLOYEE
const employeeCount = employeeDatabase.prepare('SELECT COUNT(*) as count FROM employees').get();
if (employeeCount.count === 0) {
    const insertEmployee = employeeDatabase.prepare(
        'INSERT INTO employees (employee_name, employee_email, employee_role, employee_password) VALUES (?, ?, ?, ?)'
    );
    insertEmployee.run('Alice Johnson', 'alice@example.com', 'Admin', 'AlJ741');
    insertEmployee.run('Bob Smith', 'bob@example.com', 'Store Clerk', 'BoS963');
    insertEmployee.run('Carol Williams', 'carol@example.com', 'Manager', 'CaW789');
}
// INSERT SAMPLE ITEM
const itemCount = employeeDatabase.prepare('SELECT COUNT(*) as count FROM inventory').get();
if (itemCount.count === 0) {
    const insertItem = employeeDatabase.prepare(
        'INSERT INTO inventory (item_name, item_category, quantity, location) VALUES (?, ?, ?, ?)'
    );
    insertItem.run('Laptop Dell XPS', 'Electronics', 5, 'Display');
    insertItem.run('Office Chair', 'Furniture', 15, 'Display');
    insertItem.run('Notebook A4', 'Stationery', 200, 'Storage');
    insertItem.run('Printer HP LaserJet', 'Electronics', 8, 'Storage');
    insertItem.run('Damaged Monitor', 'Electronics', 2, 'Returns');
}
//HELPER FUNCTIONS
function checkMovePermission(role, from, to) {
    const rules = {
        'Admin': { 
            allowed: true, 
            reason: '' 
        },
        'Manager': {
            allowed: true,
            reason: ''
        },
        'Store Clerk': {
            allowed: (from === 'Storage' && to === 'Display') || (from === 'Display' && to === 'Returns'),
            reason: 'Store Clerks can only move FROM Storage TO Display or FROM Display TO Returns'
        }
    };
    return rules[role];
}

//Log movement function
function logMovement(itemId, itemName, employeeId, employeeName, fromLocation, toLocation, quantity) {
    try {
        const insert = employeeDatabase.prepare(
            'INSERT INTO movement_log (item_id, item_name, employee_id, employee_name, from_location, to_location, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        insert.run(itemId, itemName, employeeId, employeeName, fromLocation, toLocation, quantity);
    } catch (error) {
        console.error('Error logging movement:', error);
    }
}

// EMPLOYEE ENDPOINTS
// GET ALL EMPLOYEES
app.get('/api/employees/all', (req, res) => {
    try {
        const employees = employeeDatabase.prepare(
            'SELECT employee_id, employee_name, employee_email, employee_role FROM employees'
        ).all();
        res.json(employees);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET EMPLOYEE LIST FOR DROP DOWN 
app.get('/api/employees', (req, res) => {
    try {
        const employees = employeeDatabase.prepare(
            'SELECT employee_id, employee_name FROM employees'
        ).all();
        res.json(employees);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET EMPLOYEE DETAIL BY ID
app.get('/api/employees/:id', (req, res) => {
    try {
        const employee = employeeDatabase.prepare(
            'SELECT employee_id, employee_name, employee_email, employee_role FROM employees WHERE employee_id = ?'
        ).get(req.params.id);
        
        if (employee) {
            res.json(employee);
        } else {
            res.status(404).json({ success: false, message: 'Employee not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

//ADD NEW EMPLOYEE
app.post('/api/employees/add', (req, res) => {
    const { employee_name, employee_email, employee_role, employee_password, admin_role } = req.body;
    
    if (admin_role !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Only Admins can add employees' });
    }
    try {
        const insert = employeeDatabase.prepare(
            'INSERT INTO employees (employee_name, employee_email, employee_role, employee_password) VALUES (?, ?, ?, ?)'
        );
        const result = insert.run(employee_name, employee_email, employee_role, employee_password);
        res.json({ 
            success: true, 
            message: 'Employee added successfully',
            employee_id: result.lastInsertRowid
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding employee: ' + error.message });
    }
});

// LOGIN POINT
app.post('/api/login', (req, res) => {
    const { employee_id, password } = req.body;
    try {
        const employee = employeeDatabase.prepare(
            'SELECT employee_id, employee_name, employee_email, employee_role FROM employees WHERE employee_id = ? AND employee_password = ?'
        ).get(employee_id, password);
        
        if (employee) {
            res.json({ 
                success: true, 
                message: 'Login successful',
                employee: employee 
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: 'Invalid username or password' 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

///////INVENTORY ENDPOINTS
//GET ALL LOCATIONS
app.get('/api/inventory', (req, res) => {
    try {
        const items = employeeDatabase.prepare('SELECT * FROM inventory').all();
        res.json(items);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

//GET ITEM BY LOCATONS
app.get('/api/inventory/:location', (req, res) => {
    try {
        const items = employeeDatabase.prepare(
            'SELECT * FROM inventory WHERE location = ?'
        ).all(req.params.location);
        res.json(items);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

//ADD NEW ITEM
app.post('/api/inventory/add', (req, res) => {
    const { item_name, item_category, quantity, location, employee_role } = req.body;
    if (employee_role !== 'Admin' && employee_role !== 'Manager') {
        return res.status(403).json({ success: false, message: 'Only Admins and Managers can add items' });
    }
    try {
        const insert = employeeDatabase.prepare(
            'INSERT INTO inventory (item_name, item_category, quantity, location) VALUES (?, ?, ?, ?)'
        );
        const result = insert.run(item_name, item_category, quantity, location);
        res.json({ 
            success: true, 
            message: 'Item added successfully',
            item_id: result.lastInsertRowid
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error adding item: ' + error.message });
    }
});

// UPDATE ITEM 
app.put('/api/inventory/update/:id', (req, res) => {
    const { item_name, item_category, quantity, location, employee_role } = req.body;
    const item_id = req.params.id;
    if (employee_role !== 'Admin' && employee_role !== 'Manager') {
        return res.status(403).json({ success: false, message: 'Only Admins and Managers can edit items' });
    }
    try {
        const update = employeeDatabase.prepare(
            'UPDATE inventory SET item_name = ?, item_category = ?, quantity = ?, location = ?, last_updated = CURRENT_TIMESTAMP WHERE item_id = ?'
        );
        const result = update.run(item_name, item_category, quantity, location, item_id);
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.json({ 
            success: true, 
            message: 'Item updated successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating item: ' + error.message });
    }
});

// MOVE ITEMS BETWEEN LOCATIONS
app.post('/api/inventory/move', (req, res) => {
    const { item_id, from_location, to_location, quantity, employee_role, employee_id, employee_name } = req.body;
    // Check permissions
    const canMove = checkMovePermission(employee_role, from_location, to_location);
    
    if (!canMove.allowed) {
        return res.status(403).json({ success: false, message: canMove.reason });
    }
    try {
        const item = employeeDatabase.prepare(
            'SELECT * FROM inventory WHERE item_id = ? AND location = ?'
        ).get(item_id, from_location);
        
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in source location' });
        }
        if (item.quantity < quantity) {
            return res.status(400).json({ success: false, message: 'Insufficient quantity' });
        }
        // Update source location
        const newSourceQty = item.quantity - quantity;
        if (newSourceQty === 0) {
            employeeDatabase.prepare('DELETE FROM inventory WHERE item_id = ?').run(item_id);
        } else {
            employeeDatabase.prepare(
                'UPDATE inventory SET quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE item_id = ?'
            ).run(newSourceQty, item_id);
        }
        // Check if item exists in destination
        const destItem = employeeDatabase.prepare(
            'SELECT * FROM inventory WHERE item_name = ? AND location = ?'
        ).get(item.item_name, to_location);
        
        if (destItem) {
            // Update existing item in destination
            employeeDatabase.prepare(
                'UPDATE inventory SET quantity = quantity + ?, last_updated = CURRENT_TIMESTAMP WHERE item_id = ?'
            ).run(quantity, destItem.item_id);
        } else {
            // Create new item in destination
            employeeDatabase.prepare(
                'INSERT INTO inventory (item_name, item_category, quantity, location) VALUES (?, ?, ?, ?)'
            ).run(item.item_name, item.item_category, quantity, to_location);
        }
        logMovement(item_id, item.item_name, employee_id, employee_name, from_location, to_location, quantity);
        res.json({ success: true, message: 'Item moved successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error moving item: ' + error.message });
    }
});

////////MOVEMENT LOG
//GET ALL THE MOVEMENT LOGS
app.get('/api/movement-logs', (req, res) => {
    try {
        const logs = employeeDatabase.prepare(
            'SELECT * FROM movement_log ORDER BY movement_date DESC LIMIT 100'
        ).all();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GET EMPLOYEE LOGS BY ID
app.get('/api/movement-logs/employee/:id', (req, res) => {
    try {
        const logs = employeeDatabase.prepare(
            'SELECT * FROM movement_log WHERE employee_id = ? ORDER BY movement_date DESC'
        ).all(req.params.id);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// GETS THE LOG BY ID
app.get('/api/movement-logs/item/:id', (req, res) => {
    try {
        const logs = employeeDatabase.prepare(
            'SELECT * FROM movement_log WHERE item_id = ? ORDER BY movement_date DESC'
        ).all(req.params.id);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(3000, () => {
    console.log("Server listening on port 3000");
});