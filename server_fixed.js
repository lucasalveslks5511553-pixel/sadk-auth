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

// ── Painel Admin embutido (sem precisar de pasta) ─────────────────────────
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>SADK Admin Panel</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',sans-serif;background:#0f0f13;color:#e0e0e0;min-height:100vh}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#1a1a22}::-webkit-scrollbar-thumb{background:#e02020;border-radius:3px}
#loginPage{display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#0f0f13,#1a0a0a)}
.login-box{background:#1a1a22;border:1px solid #e02020;border-radius:12px;padding:40px;width:360px;box-shadow:0 0 40px rgba(224,32,32,0.2)}
.login-box h1{text-align:center;color:#e02020;font-size:1.8em;margin-bottom:8px}
.login-box p{text-align:center;color:#666;margin-bottom:28px;font-size:.9em}
.field{margin-bottom:16px}
.field label{display:block;margin-bottom:6px;color:#aaa;font-size:.85em;text-transform:uppercase;letter-spacing:.5px}
.field input{width:100%;padding:11px 14px;background:#0f0f13;border:1px solid #333;border-radius:7px;color:#e0e0e0;font-size:.95em}
.field input:focus{outline:none;border-color:#e02020}
.btn{width:100%;padding:12px;border:none;border-radius:7px;font-size:1em;font-weight:600;cursor:pointer}
.btn-red{background:#e02020;color:#fff}.btn-red:hover{background:#ff3333}
.msg{margin-top:14px;padding:10px 14px;border-radius:7px;font-size:.9em;text-align:center}
.msg.err{background:#2a0a0a;color:#ff6666;border:1px solid #5a1a1a}
.msg.ok{background:#0a2a0a;color:#66ff66;border:1px solid #1a5a1a}
.msg.info{background:#0a1a2a;color:#66aaff;border:1px solid #1a3a5a}
#mainPage{display:none;min-height:100vh}
.topbar{background:#1a1a22;border-bottom:1px solid #e02020;padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
.topbar .logo{color:#e02020;font-size:1.2em;font-weight:700;letter-spacing:1px}
.topbar .user{display:flex;align-items:center;gap:12px;color:#aaa;font-size:.9em}
.topbar .user button{padding:6px 14px;background:#e02020;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:.85em}
.layout{display:flex;height:calc(100vh - 56px)}
.sidebar{width:200px;background:#13131a;border-right:1px solid #222;padding:16px 0;flex-shrink:0}
.nav-item{padding:11px 20px;cursor:pointer;color:#888;font-size:.9em;display:flex;align-items:center;gap:10px;transition:.15s;border-left:3px solid transparent}
.nav-item:hover{color:#e0e0e0;background:#1a1a22}
.nav-item.active{color:#e02020;border-left-color:#e02020;background:#1a1a22}
.nav-item .icon{font-size:1.1em;width:18px;text-align:center}
.content{flex:1;overflow-y:auto;padding:24px}
.page{display:none}.page.active{display:block}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px}
.card{background:#1a1a22;border:1px solid #222;border-radius:10px;padding:20px;text-align:center}
.card .num{font-size:2em;font-weight:700;color:#e02020}
.card .lbl{color:#666;font-size:.85em;margin-top:4px}
.section-title{font-size:1.1em;font-weight:600;color:#e0e0e0;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}
.table-wrap{background:#1a1a22;border:1px solid #222;border-radius:10px;overflow:hidden;margin-bottom:24px}
table{width:100%;border-collapse:collapse}
th{background:#13131a;padding:11px 14px;text-align:left;font-size:.8em;text-transform:uppercase;letter-spacing:.5px;color:#666;border-bottom:1px solid #222}
td{padding:11px 14px;font-size:.88em;border-bottom:1px solid #1a1a22;color:#ccc}
tr:last-child td{border-bottom:none}
tr:hover td{background:#1f1f2a}
.badge{padding:3px 9px;border-radius:20px;font-size:.75em;font-weight:600}
.badge.active{background:#0a2a0a;color:#4caf50}
.badge.banned{background:#2a0a0a;color:#f44336}
.badge.admin{background:#1a1a3a;color:#7c7cff}
.badge.user{background:#1a1a22;color:#888}
.badge.used{background:#2a1a0a;color:#ff9800}
.badge.available{background:#0a2a0a;color:#4caf50}
.form-box{background:#1a1a22;border:1px solid #222;border-radius:10px;padding:20px;margin-bottom:24px}
.form-box h3{color:#e02020;margin-bottom:16px;font-size:1em}
.form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:12px}
.form-row .field{margin:0}
.form-row .field label{font-size:.8em}
.btn-sm{padding:8px 16px;border:none;border-radius:6px;font-size:.85em;font-weight:600;cursor:pointer}
.btn-sm.red{background:#e02020;color:#fff}.btn-sm.gray{background:#2a2a35;color:#ccc}
.btn-sm.green{background:#1a4a1a;color:#4caf50;border:1px solid #2a6a2a}
.btn-sm.orange{background:#3a2a0a;color:#ff9800;border:1px solid #5a3a0a}
.action-btns{display:flex;gap:6px}
.empty{text-align:center;padding:30px;color:#444;font-size:.9em}
.refresh-btn{padding:6px 12px;background:#1a1a22;border:1px solid #333;border-radius:5px;color:#888;cursor:pointer;font-size:.8em}
.refresh-btn:hover{border-color:#e02020;color:#e02020}
</style>
</head>
<body>
<div id="loginPage">
  <div class="login-box">
    <h1>⚡ SADK</h1><p>Admin Panel</p>
    <div class="field"><label>Username</label><input id="lUser" value="admin"></div>
    <div class="field"><label>Password</label><input id="lPass" type="password" value="admin123"></div>
    <button class="btn btn-red" onclick="doLogin()">Entrar</button>
    <div id="lMsg"></div>
  </div>
</div>
<div id="mainPage">
  <div class="topbar">
    <div class="logo">⚡ SADK Admin</div>
    <div class="user"><span id="topUser"></span><button onclick="doLogout()">Sair</button></div>
  </div>
  <div class="layout">
    <div class="sidebar">
      <div class="nav-item active" onclick="showPage('dashboard',this)"><span class="icon">📊</span>Dashboard</div>
      <div class="nav-item" onclick="showPage('users',this)"><span class="icon">👥</span>Usuários</div>
      <div class="nav-item" onclick="showPage('licenses',this)"><span class="icon">🔑</span>Licenses</div>
      <div class="nav-item" onclick="showPage('logs',this)"><span class="icon">📋</span>Logs</div>
    </div>
    <div class="content">
      <div id="page-dashboard" class="page active">
        <div class="cards">
          <div class="card"><div class="num" id="statUsers">-</div><div class="lbl">Usuários</div></div>
          <div class="card"><div class="num" id="statLicenses">-</div><div class="lbl">Licenses</div></div>
          <div class="card"><div class="num" id="statAvail">-</div><div class="lbl">Disponíveis</div></div>
          <div class="card"><div class="num" id="statLogs">-</div><div class="lbl">Logs</div></div>
        </div>
        <div class="table-wrap"><table><thead><tr><th>Ação</th><th>Usuário</th><th>Detalhe</th><th>Data</th></tr></thead>
        <tbody id="recentLogs"><tr><td colspan="4" class="empty">Carregando...</td></tr></tbody></table></div>
      </div>
      <div id="page-users" class="page">
        <div class="form-box"><h3>➕ Criar Usuário</h3>
          <div class="form-row">
            <div class="field"><label>Username</label><input id="newUser" placeholder="username"></div>
            <div class="field"><label>Password</label><input id="newPass" type="password" placeholder="senha"></div>
            <div class="field"><label>Role</label><select id="newRole" style="width:100%;padding:11px 14px;background:#0f0f13;border:1px solid #333;border-radius:7px;color:#e0e0e0"><option value="user">User</option><option value="vip">VIP</option><option value="admin">Admin</option></select></div>
            <div class="field"><label>Dias</label><input id="newDays" type="number" value="30"></div>
          </div>
          <button class="btn-sm red" onclick="createUser()">Criar Usuário</button>
          <span id="userMsg" style="margin-left:12px;font-size:.85em"></span>
        </div>
        <div class="section-title">Usuários<button class="refresh-btn" onclick="loadUsers()">↻ Atualizar</button></div>
        <div class="table-wrap"><table><thead><tr><th>ID</th><th>Username</th><th>Role</th><th>Status</th><th>HWID</th><th>Expira</th><th>Ações</th></tr></thead>
        <tbody id="usersTable"><tr><td colspan="7" class="empty">Carregando...</td></tr></tbody></table></div>
      </div>
      <div id="page-licenses" class="page">
        <div class="form-box"><h3>➕ Criar License</h3>
          <div class="form-row">
            <div class="field"><label>License Key</label><input id="licKey" placeholder="SADK-XXXX-XXXX"></div>
            <div class="field"><label>Dias</label><input id="licDays" type="number" value="30"></div>
          </div>
          <button class="btn-sm red" onclick="createLicense()">Criar License</button>
          <button class="btn-sm gray" onclick="genLicense()" style="margin-left:8px">🎲 Gerar</button>
          <span id="licMsg" style="margin-left:12px;font-size:.85em"></span>
        </div>
        <div class="section-title">Licenses<button class="refresh-btn" onclick="loadLicenses()">↻ Atualizar</button></div>
        <div class="table-wrap"><table><thead><tr><th>ID</th><th>Key</th><th>Status</th><th>Usado por</th><th>Dias</th><th>Criada</th></tr></thead>
        <tbody id="licTable"><tr><td colspan="6" class="empty">Carregando...</td></tr></tbody></table></div>
      </div>
      <div id="page-logs" class="page">
        <div class="section-title">Logs<button class="refresh-btn" onclick="loadLogs()">↻ Atualizar</button></div>
        <div class="table-wrap"><table><thead><tr><th>ID</th><th>Usuário</th><th>Ação</th><th>Detalhe</th><th>Data</th></tr></thead>
        <tbody id="logsTable"><tr><td colspan="5" class="empty">Carregando...</td></tr></tbody></table></div>
      </div>
    </div>
  </div>
</div>
<script>
const API = '';
let token = '';
async function doLogin() {
  const u=document.getElementById('lUser').value, p=document.getElementById('lPass').value;
  const msg=document.getElementById('lMsg');
  msg.innerHTML='<div class="msg info">Entrando...</div>';
  try {
    const r=await fetch(API+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,hwid:'admin-panel-fixed-hwid'})});
    const d=await r.json();
    if(d.success){token=d.token;document.getElementById('topUser').textContent=u;document.getElementById('loginPage').style.display='none';document.getElementById('mainPage').style.display='block';loadDashboard();}
    else msg.innerHTML='<div class="msg err">❌ '+d.message+'</div>';
  } catch(e){msg.innerHTML='<div class="msg err">❌ Servidor offline</div>';}
}
function doLogout(){token='';document.getElementById('loginPage').style.display='flex';document.getElementById('mainPage').style.display='none';document.getElementById('lMsg').innerHTML='';}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('lPass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});});
function showPage(name,el){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));document.getElementById('page-'+name).classList.add('active');el.classList.add('active');if(name==='dashboard')loadDashboard();if(name==='users')loadUsers();if(name==='licenses')loadLicenses();if(name==='logs')loadLogs();}
async function loadDashboard(){try{const[u,l,lg]=await Promise.all([fetch(API+'/api/admin/users').then(r=>r.json()),fetch(API+'/api/admin/licenses').then(r=>r.json()),fetch(API+'/api/admin/logs').then(r=>r.json())]);document.getElementById('statUsers').textContent=u.users?.length??0;document.getElementById('statLicenses').textContent=l.licenses?.length??0;document.getElementById('statAvail').textContent=l.licenses?.filter(x=>!x.used_by).length??0;document.getElementById('statLogs').textContent=lg.logs?.length??0;const tbody=document.getElementById('recentLogs');if(!lg.logs?.length){tbody.innerHTML='<tr><td colspan="4" class="empty">Sem logs</td></tr>';return;}tbody.innerHTML=lg.logs.slice(0,10).map(l=>'<tr><td>'+l.action+'</td><td>'+(l.username||'-')+'</td><td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(l.detail||'-')+'</td><td>'+fmt(l.created_at)+'</td></tr>').join('');}catch(e){}}
async function loadUsers(){const tbody=document.getElementById('usersTable');tbody.innerHTML='<tr><td colspan="7" class="empty">Carregando...</td></tr>';try{const d=await fetch(API+'/api/admin/users').then(r=>r.json());if(!d.users?.length){tbody.innerHTML='<tr><td colspan="7" class="empty">Nenhum usuário</td></tr>';return;}tbody.innerHTML=d.users.map(u=>'<tr><td>'+u.id+'</td><td><b>'+u.username+'</b></td><td><span class="badge '+u.role+'">'+u.role+'</span></td><td><span class="badge '+u.status+'">'+u.status+'</span></td><td style="font-size:.75em;color:#555">'+(u.hwid?u.hwid.substring(0,16)+'...':'-')+'</td><td>'+(u.expiry_date?u.expiry_date.substring(0,10):'∞')+'</td><td><div class="action-btns">'+(u.status==='banned'?'<button class="btn-sm green" onclick="banUser('+u.id+',\'unban\')">Desbanir</button>':'<button class="btn-sm orange" onclick="banUser('+u.id+',\'ban\')">Banir</button>')+'<button class="btn-sm gray" onclick="resetHwid('+u.id+')">Reset HWID</button></div></td></tr>').join('');}catch(e){tbody.innerHTML='<tr><td colspan="7" class="empty">Erro</td></tr>';}}
async function createUser(){const u=document.getElementById('newUser').value.trim(),p=document.getElementById('newPass').value.trim(),r=document.getElementById('newRole').value,d=document.getElementById('newDays').value,msg=document.getElementById('userMsg');if(!u||!p){msg.style.color='#f66';msg.textContent='Preencha os campos';return;}try{const res=await fetch(API+'/api/admin/create_user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,role:r,duration_days:parseInt(d)})});const data=await res.json();if(data.success){msg.style.color='#4f4';msg.textContent='✓ Criado!';loadUsers();document.getElementById('newUser').value='';document.getElementById('newPass').value='';}else{msg.style.color='#f66';msg.textContent='✗ '+data.message;}}catch(e){msg.style.color='#f66';msg.textContent='✗ Erro';}}
async function banUser(id,action){const reason=action==='ban'?(prompt('Motivo:')||'Banido pelo admin'):'';try{const d=await fetch(API+'/api/admin/ban',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:id,action,ban_reason:reason})}).then(r=>r.json());if(d.success)loadUsers();else alert(d.message);}catch(e){}}
async function resetHwid(id){if(!confirm('Resetar HWID?'))return;try{const d=await fetch(API+'/api/admin/reset_hwid',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:id})}).then(r=>r.json());if(d.success)loadUsers();else alert(d.message);}catch(e){}}
async function loadLicenses(){const tbody=document.getElementById('licTable');tbody.innerHTML='<tr><td colspan="6" class="empty">Carregando...</td></tr>';try{const d=await fetch(API+'/api/admin/licenses').then(r=>r.json());if(!d.licenses?.length){tbody.innerHTML='<tr><td colspan="6" class="empty">Nenhuma</td></tr>';return;}tbody.innerHTML=d.licenses.map(l=>'<tr><td>'+l.id+'</td><td><code style="color:#e02020">'+l.license_key+'</code></td><td><span class="badge '+(l.used_by?'used':'available')+'">'+(l.used_by?'Usada':'Disponível')+'</span></td><td>'+(l.used_by||'-')+'</td><td>'+l.duration_days+'d</td><td>'+fmt(l.created_at)+'</td></tr>').join('');}catch(e){tbody.innerHTML='<tr><td colspan="6" class="empty">Erro</td></tr>';}}
async function createLicense(){const k=document.getElementById('licKey').value.trim(),d=document.getElementById('licDays').value,msg=document.getElementById('licMsg');if(!k){msg.style.color='#f66';msg.textContent='Digite a key';return;}try{const res=await fetch(API+'/api/admin/add_license',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({license_key:k,duration_days:parseInt(d)})});const data=await res.json();if(data.success){msg.style.color='#4f4';msg.textContent='✓ Criada!';loadLicenses();document.getElementById('licKey').value='';}else{msg.style.color='#f66';msg.textContent='✗ '+data.message;}}catch(e){msg.style.color='#f66';msg.textContent='✗ Erro';}}
function genLicense(){const c='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';const s=()=>Array.from({length:4},()=>c[Math.floor(Math.random()*c.length)]).join('');document.getElementById('licKey').value='SADK-'+s()+'-'+s()+'-'+s();}
async function loadLogs(){const tbody=document.getElementById('logsTable');tbody.innerHTML='<tr><td colspan="5" class="empty">Carregando...</td></tr>';try{const d=await fetch(API+'/api/admin/logs').then(r=>r.json());if(!d.logs?.length){tbody.innerHTML='<tr><td colspan="5" class="empty">Sem logs</td></tr>';return;}tbody.innerHTML=d.logs.map(l=>'<tr><td>'+l.id+'</td><td>'+(l.username||'-')+'</td><td><span class="badge '+(l.action?.includes('success')?'active':l.action?.includes('ban')?'banned':'user')+'">'+l.action+'</span></td><td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#666">'+(l.detail||'-')+'</td><td>'+fmt(l.created_at)+'</td></tr>').join('');}catch(e){tbody.innerHTML='<tr><td colspan="5" class="empty">Erro</td></tr>';}}
function fmt(d){if(!d)return '-';return d.replace('T',' ').substring(0,16);}
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(ADMIN_HTML));
app.get('/admin', (req, res) => res.send(ADMIN_HTML));
app.get('/admin_panel/minimal_admin.html', (req, res) => res.send(ADMIN_HTML));
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
