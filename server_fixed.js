const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Banco de dados — usa variável de ambiente ou pasta local
const DB_PATH = process.env.DATABASE_PATH || './sadk_ultra_premium.db';
console.log('Database path:', DB_PATH);

// CORS configurado para permitir tudo
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', '*'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Servir admin_panel como estático em /admin_panel/
app.use('/admin_panel', express.static(path.join(__dirname, 'admin_panel')));
// Rota raiz redireciona para o painel
app.get('/', (req, res) => {
    res.redirect('/admin_panel/minimal_admin.html');
});

// Database
const db = new sqlite3.Database(DB_PATH);

// Criar usuário admin
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE,
        password_hash TEXT,
        hwid TEXT,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        ban_reason TEXT,
        expiry_date TEXT,
        last_login TEXT,
        created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY,
        license_key TEXT UNIQUE,
        used_by TEXT,
        duration_days INTEGER DEFAULT 30,
        created_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY,
        username TEXT,
        action TEXT,
        detail TEXT,
        created_at TEXT
    )`);
    
    // Inserir admin com senha em hash
    const adminHash = require('crypto').createHash('sha256').update('admin123').digest('hex');
    db.run("INSERT OR IGNORE INTO users (username, password_hash, role, status, created_at) VALUES (?, ?, 'admin', 'active', datetime('now'))",
           ['admin', adminHash]);
    // Corrigir senha do admin se ainda estiver em texto puro
    db.run("UPDATE users SET password_hash = ?, status = 'active' WHERE username = 'admin' AND password_hash = 'admin123'",
           [adminHash]);

    // License de teste — use SADK-TEST-0001 para registrar
    db.run("INSERT OR IGNORE INTO licenses (license_key, duration_days, created_at) VALUES ('SADK-TEST-0001', 30, datetime('now'))");
    db.run("INSERT OR IGNORE INTO licenses (license_key, duration_days, created_at) VALUES ('SADK-TEST-0002', 30, datetime('now'))");
    db.run("INSERT OR IGNORE INTO licenses (license_key, duration_days, created_at) VALUES ('SADK-TEST-0003', 30, datetime('now'))");
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SADK Ultra Premium Server is running',
        timestamp: new Date().toISOString()
    });
});

// Login simplificado
app.post('/api/login', (req, res) => {
    const { username, password, hwid } = req.body;
    
    console.log('Login attempt:', { username, hwid });

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user) {
            return res.json({ success: false, message: 'Usuario nao encontrado', code: 'not_found' });
        }

        // Verificar status
        if (user.status === 'banned') {
            const reason = user.ban_reason ? ` | Motivo: ${user.ban_reason}` : '';
            return res.json({ success: false, message: `Conta banida${reason}`, code: 'banned' });
        }

        // Verificar senha (suporta hash SHA256 e texto puro para admin legado)
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        const passOk = (user.password_hash === hash) || (user.password_hash === password);
        if (!passOk) {
            return res.json({ success: false, message: 'Senha incorreta', code: 'wrong_password' });
        }

        // Verificar/registrar HWID (admin não verifica HWID)
        if (user.role !== 'admin') {
            if (user.hwid && user.hwid !== hwid) {
                console.log('hwid_mismatch', { old: user.hwid, new: hwid });
                db.run("INSERT OR IGNORE INTO logs (username, action, detail, created_at) VALUES (?, 'hwid_mismatch', ?, datetime('now'))",
                    [username, `Old: ${user.hwid}, New: ${hwid}`]);
                return res.json({ success: false, message: 'HWID diferente — use o PC original ou contate o suporte', code: 'hwid_mismatch' });
            }
            if (!user.hwid && hwid) {
                db.run("UPDATE users SET hwid = ? WHERE id = ?", [hwid, user.id]);
            }
        }

        // Verificar expiração
        if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
            return res.json({ success: false, message: 'Licenca expirada — renove para continuar', code: 'expired' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);
        db.run("INSERT OR IGNORE INTO logs (username, action, detail, created_at) VALUES (?, 'login_success', ?, datetime('now'))",
            [username, `HWID: ${hwid}`]);

        res.json({
            success: true,
            token: token,
            tokenhash: tokenHash,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
                expiry_date: user.expiry_date || null
            }
        });
    });
});

// Register com license key
app.post('/api/register', (req, res) => {
    const { username, password, license_key, hwid } = req.body;

    if (!username || !password || !license_key) {
        return res.json({ success: false, message: 'Preencha todos os campos' });
    }

    // Verificar license key
    db.get("SELECT * FROM licenses WHERE license_key = ? AND used_by IS NULL", [license_key], (err, license) => {
        if (err || !license) {
            return res.json({ success: false, message: 'License key invalida ou ja usada' });
        }

        const hash = crypto.createHash('sha256').update(password).digest('hex');
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + (license.duration_days || 30));

        db.run(
            "INSERT INTO users (username, password_hash, hwid, role, status, expiry_date, created_at) VALUES (?, ?, ?, 'user', 'active', ?, datetime('now'))",
            [username, hash, hwid || null, expiry.toISOString()],
            function(err) {
                if (err) {
                    return res.json({ success: false, message: 'Username ja existe' });
                }
                // Marcar license como usada
                db.run("UPDATE licenses SET used_by = ? WHERE license_key = ?", [username, license_key]);
                console.log('register_success:', username);
                res.json({ success: true, message: 'Conta criada com sucesso!' });
            }
        );
    });
});

// Users list
app.get('/api/admin/users', (req, res) => {
    db.all("SELECT id, username, role, status FROM users", (err, users) => {
        if (err) {
            res.json({ success: false, message: 'Database error' });
        } else {
            res.json({ success: true, users: users });
        }
    });
});

// Ban user
app.post('/api/admin/ban', (req, res) => {
    const { user_id, ban_reason, action } = req.body;
    
    if (action === 'ban') {
        db.run("UPDATE users SET status = 'banned', ban_reason = ? WHERE id = ?", [ban_reason, user_id], (err) => {
            if (err) {
                res.json({ success: false, message: 'Error banning user' });
            } else {
                res.json({ success: true, message: 'User banned successfully' });
            }
        });
    } else if (action === 'unban') {
        db.run("UPDATE users SET status = 'active', ban_reason = NULL WHERE id = ?", [user_id], (err) => {
            if (err) {
                res.json({ success: false, message: 'Error unbanning user' });
            } else {
                res.json({ success: true, message: 'User unbanned successfully' });
            }
        });
    }
});

// Servir arquivos estáticos
app.get('/admin_panel/:file', (req, res) => {
    const filePath = path.join(__dirname, 'admin_panel', req.params.file);
    res.sendFile(filePath);
});

// Listar licenses
app.get('/api/admin/licenses', (req, res) => {
    db.all("SELECT * FROM licenses ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.json({ success: false, message: 'Database error' });
        res.json({ success: true, licenses: rows });
    });
});

// Criar nova license
app.post('/api/admin/add_license', (req, res) => {
    const { license_key, duration_days } = req.body;
    if (!license_key) return res.json({ success: false, message: 'license_key required' });
    db.run(
        "INSERT INTO licenses (license_key, duration_days, created_at) VALUES (?, ?, datetime('now'))",
        [license_key, duration_days || 30],
        function(err) {
            if (err) return res.json({ success: false, message: 'License ja existe' });
            res.json({ success: true, message: 'License criada!' });
        }
    );
});

// Criar usuário pelo admin
app.post('/api/admin/create_user', (req, res) => {
    const { username, password, role, duration_days } = req.body;
    if (!username || !password) return res.json({ success: false, message: 'username e password obrigatorios' });
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + (parseInt(duration_days) || 30));
    db.run(
        "INSERT INTO users (username, password_hash, role, status, expiry_date, created_at) VALUES (?, ?, ?, 'active', ?, datetime('now'))",
        [username, hash, role || 'user', expiry.toISOString()],
        function(err) {
            if (err) return res.json({ success: false, message: 'Username ja existe' });
            db.run("INSERT OR IGNORE INTO logs (username, action, detail, created_at) VALUES (?, 'user_created', ?, datetime('now'))",
                [username, `Role: ${role}, Days: ${duration_days}`]);
            res.json({ success: true, message: 'Usuario criado!' });
        }
    );
});

// Reset HWID
app.post('/api/admin/reset_hwid', (req, res) => {
    const { user_id } = req.body;
    db.run("UPDATE users SET hwid = NULL WHERE id = ?", [user_id], function(err) {
        if (err) return res.json({ success: false, message: 'Erro ao resetar HWID' });
        res.json({ success: true, message: 'HWID resetado!' });
    });
});

// Logs recentes
app.get('/api/admin/logs', (req, res) => {
    db.all("SELECT * FROM logs ORDER BY created_at DESC LIMIT 100", (err, rows) => {
        if (err) return res.json({ success: false, message: 'Database error' });
        res.json({ success: true, logs: rows });
    });
});

app.listen(PORT, () => {
    console.log(`SADK Auth Server running on port ${PORT}`);
    console.log(`Admin Panel: http://localhost:${PORT}/admin_panel/minimal_admin.html`);
    console.log(`Default admin: admin / admin123`);
});
