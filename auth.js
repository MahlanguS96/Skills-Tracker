
import { saveLearner, saveStaff, isLearnerAllowed } from "./firestore-Config.js";

const statusBox = document.getElementById('status');

function setStatus(msg, type=''){
  if(!statusBox) return;
  statusBox.textContent = msg;
  statusBox.className = 'status-box' + (type ? ' ' + type : '');
  console.log('[STATUS]', msg);
}

function showTab(which){
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabReg = document.getElementById('tabRegister');
  if(!loginForm || !regForm) return;
  loginForm.classList.toggle('hidden', which!=='login');
  regForm.classList.toggle('hidden', which!=='register');
  if(tabLogin) tabLogin.classList.toggle('active', which==='login');
  if(tabReg) tabReg.classList.toggle('active', which==='register');
  setStatus(which==='register' ? 'Register: Choose role and create account.' : 'Login: Enter name and ID.', '');
}

function getRolePage(role){
  role = String(role||'').toLowerCase().trim();
  const map = {admin:'admin.html', assessor:'assessor.html', learner:'learner.html'};
  // Also support capital file names if team used them: Admin.html etc
  // Try lowercase first, fallback will still work on case-insensitive systems
  return map[role] || 'learner.html';
}

// Expose showTab for onclick in HTML
window.showTab = showTab;

// REGISTER - Pseudocode registerUser()
const registerForm = document.getElementById('registerForm');
if(registerForm){
  registerForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const roleEl = document.getElementById('regRole');
    const nameEl = document.getElementById('regName');
    const idEl = document.getElementById('regId');
    const emailEl = document.getElementById('regEmail');
    const passEl = document.getElementById('regPass');

    const role = (roleEl?.value||'learner').toLowerCase().trim();
    const name = (nameEl?.value||'').trim();
    const id = (idEl?.value||'').trim();
    const email = (emailEl?.value||'').trim();
    const pass = (passEl?.value||'');

    if(!name || !id){
      setStatus('Name and ID required','error');
      alert('⚠️ Registration failed!\n\nPlease enter Full Name and User ID.');
      return;
    }
    if(pass && pass.length < 6){
      setStatus('Password min 6','error');
      alert('⚠️ Password too short! Min 6 chars.');
      return;
    }

    setStatus(`Registering ${name} as ${role}...`,'');
    
    try{
      const payload = {fullName:name, learnerId:id, studentId:id, email, role, active:true, createdAt:new Date().toISOString()};
      
      if(role === 'learner'){
        await saveLearner(payload);
      } else {
        await saveStaff({...payload, staffId:id});
      }

      localStorage.setItem('currentUserName', name);
      localStorage.setItem('currentUserId', id);
      localStorage.setItem('currentUserRole', role);
      localStorage.setItem('currentUserEmail', email);
      document.cookie = `theme=light; max-age=2592000; path=/`;
      document.cookie = `lastRole=${role}; max-age=2592000; path=/`;

      setStatus(`Registration successful as ${role}!`,'success');

      // Ethical popup + redirect by role
      alert(`✅ User Registered Successfully!\n\nName: ${name}\nID: ${id}\nRole: ${role.toUpperCase()}\n\nYou will now go to ${role} dashboard.`);

      const target = getRolePage(role);
      console.log('Redirecting to', target);
      // Force redirect - use both href and replace to ensure it works
      window.location.href = target;
      
    }catch(err){
      console.error('Register error', err);
      // Offline fallback - still register locally and redirect
      localStorage.setItem('currentUserName', name);
      localStorage.setItem('currentUserId', id);
      localStorage.setItem('currentUserRole', role);
      
      alert(`⚠️ Registered locally (Firestore: ${err.message})\n\nName: ${name}\nID: ${id}\nRole: ${role}\n\nRedirecting to dashboard...`);
      window.location.href = getRolePage(role);
    }
  });
}

// LOGIN - Pseudocode loginUser()
const loginForm = document.getElementById('loginForm');
if(loginForm){
  loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const role = (document.getElementById('roleSelect')?.value||'learner').toLowerCase().trim();
    const name = (document.getElementById('userName')?.value||'').trim();
    const id = (document.getElementById('userId')?.value||'').trim();

    if(!name || !id){
      setStatus('Enter name and ID','error');
      alert('Please enter Full Name and User ID');
      return;
    }

    setStatus(`Checking access for ${name}...`,'');
    
    try{
      if(role === 'learner'){
        const allowed = await isLearnerAllowed(name, id);
        if(!allowed){
          setStatus('Access denied. Please register first.','error');
          alert(`❌ Access Denied!\n\nLearner "${name}" ID "${id}" not found.\n\nGo to Register tab first.`);
          return;
        }
      }

      localStorage.setItem('currentUserName', name);
      localStorage.setItem('currentUserId', id);
      localStorage.setItem('currentUserRole', role);
      
      setStatus(`Login successful as ${role}!`,'success');
      alert(`✅ Login Successful!\nWelcome ${name} (${role.toUpperCase()})\n\nRedirecting to ${role} dashboard.`);

      window.location.href = getRolePage(role);
      
    }catch(err){
      setStatus('Login error: '+err.message,'error');
      alert('Login error: '+err.message);
    }
  });
}

console.log('auth.js loaded - DOM ready');
