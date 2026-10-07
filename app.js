
import {
  saveLearner, saveStaff, deleteLearnerRecord, deleteStaffRecord,
  saveTask, getTasks, deleteTaskRecord, db
} from "./firestore-Config.js";

// OOP Requirement - PDF Q10
class Task {
  constructor(title, type, description, dueDate, totalMarks, creatorId) {
    this.title = title;
    this.type = type;
    this.description = description;
    this.dueDate = dueDate;
    this.totalMarks = Number(totalMarks)||0;
    this.status = "Not Started";
    this.creatorId = creatorId;
    this.createdAt = new Date().toISOString();
  }
  markComplete(){ this.status = "completed"; }
}

const state = {
  currentUserName: localStorage.getItem("currentUserName")||"",
  currentUserId: localStorage.getItem("currentUserId")||"",
  currentUserRole: localStorage.getItem("currentUserRole")||"learner",
  tasks: JSON.parse(localStorage.getItem("portalTasks")||"[]"),
  submissions: JSON.parse(localStorage.getItem("portalSubmissions")||"[]"),
  learners: JSON.parse(localStorage.getItem("portalLearners")||"[]"),
  staff: JSON.parse(localStorage.getItem("portalStaff")||"[]"),
  editingTaskId: null
};

// Role guard - ethical redirect if wrong role
function checkRoleGuard(){
  const role = (localStorage.getItem('currentUserRole')||'').toLowerCase();
  const page = window.location.pathname.toLowerCase();
  const userDisplay = document.getElementById('userDisplay');
  if(!role){
    console.warn('No role found, redirecting to index.html');
    // If not logged in and not on index, bounce to login
    if(!page.includes('index.html') && page.includes('.html')){
      // Uncomment to force login: window.location.href='index.html';
    }
  }
  if(userDisplay && localStorage.getItem('currentUserName')){
    userDisplay.textContent = `${localStorage.getItem('currentUserName')} (${role}) - ${localStorage.getItem('currentUserId')}`;
  }
}

function saveLocal(){
  localStorage.setItem("portalTasks", JSON.stringify(state.tasks));
  localStorage.setItem("portalSubmissions", JSON.stringify(state.submissions));
}

window.logoutUser = function(){
  if(confirm("Are you sure you want to log out?")){
    localStorage.removeItem("currentUserName");
    localStorage.removeItem("currentUserId");
    localStorage.removeItem("currentUserRole");
    window.location.href="index.html";
  }
};

window.loadDashboard = async function(){
  try{
    if(state.currentUserId){
      try{
        const fb = await getTasks(state.currentUserId);
        if(fb.length) { state.tasks = fb; saveLocal(); }
      }catch(e){}
    }
    renderAll();
  }catch(e){ console.error(e); }
  finally{ console.log("Dashboard loaded"); }
};

function renderAll(){
  checkRoleGuard();
  renderStats();
  renderTaskLists();
  renderLearner();
  renderAdmin();
  populateSelectors();
  const disp = document.getElementById("userDisplay");
  if(disp) disp.textContent = `${state.currentUserName} (${state.currentUserRole}) - ${state.currentUserId}`;
}

function renderStats(){
  const total = state.tasks.length;
  const subs = state.submissions.length;
  const scores = state.submissions.map(s=>Number(s.score)).filter(n=>!isNaN(n));
  const avg = scores.length? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  const t1 = document.getElementById("totalTasks"); if(t1) t1.textContent=`Total Tasks: ${total}`;
  const t2 = document.getElementById("totalSubmissions"); if(t2) t2.textContent=`Total Submissions: ${subs}`;
  const t3 = document.getElementById("avgResult"); if(t3) t3.textContent=`Average Result: ${avg}%`;
}

function renderTaskLists(){
  const list = document.getElementById("tasksList");
  if(list){
    list.innerHTML="";
    if(!state.tasks.length){ list.innerHTML="<p>No tasks yet.</p>"; }
    else state.tasks.forEach(task=>{
      const div=document.createElement("div");
      div.className="task-card";
      div.style.cssText="background:#fff;padding:10px;margin:6px 0;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.1);";
      div.innerHTML=`<h4>${task.title}</h4><p><span style="background:#222;color:#fff;padding:2px 6px;border-radius:4px;font-size:0.7rem;">${task.type}</span> Due: ${task.dueDate||"No date"} | ${task.totalMarks} marks | ${task.status}</p><p style="font-size:0.8rem;">${task.description||""}</p><button data-action="edit-task" data-id="${task.id}">Edit</button> <button data-action="delete-task" data-id="${task.id}">Delete</button>`;
      list.appendChild(div);
    });
  }
  const adminList = document.getElementById("adminTasksList");
  if(adminList && adminList!==list){
    adminList.innerHTML = list? list.innerHTML : "<p>No tasks</p>";
  }
  const avail = document.getElementById("availableTasks");
  if(avail){
    avail.innerHTML="";
    state.tasks.forEach(task=>{
      const d=document.createElement("div");
      d.style.cssText="background:#fff;padding:10px;margin:6px 0;border-radius:6px;";
      d.innerHTML=`<h4>${task.title}</h4><p>${task.type} - ${task.totalMarks} marks</p><button data-action="choose-task" data-id="${task.id}">Choose Task</button>`;
      avail.appendChild(d);
    });
  }
}

function renderLearner(){
  const name = state.currentUserName||"Guest";
  const mySubs = state.submissions.filter(s=>s.learnerName===name);
  const written = mySubs.filter(s=>["Written","Submitted","Graded"].includes(s.status)).length;
  const submitted = mySubs.filter(s=>s.status==="Submitted").length;
  const scores = mySubs.map(s=>Number(s.score)).filter(n=>!isNaN(n));
  const avg = scores.length? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  const e1=document.getElementById("learnerTotal"); if(e1) e1.textContent=`Tasks Chosen: ${mySubs.length}`;
  const e2=document.getElementById("learnerWritten"); if(e2) e2.textContent=`Written: ${written}`;
  const e3=document.getElementById("learnerSubmitted"); if(e3) e3.textContent=`Submitted: ${submitted}`;
  const e4=document.getElementById("learnerAvg"); if(e4) e4.textContent=`My Average: ${avg}%`;

  const stepsEl=document.getElementById("learnerSteps");
  if(stepsEl){
    stepsEl.innerHTML="";
    state.tasks.forEach(task=>{
      const sub = state.submissions.find(s=>s.learnerName===name && s.taskTitle===task.title);
      const status = sub?.status||"Not Started";
      const row=document.createElement("div");
      row.style.cssText="display:flex;justify-content:space-between;align-items:center;padding:8px;background:#fff;margin:4px 0;border-radius:4px;";
      row.innerHTML=`<div><b>${task.title}</b><br><small>${status}</small></div><div><button data-action="step-select" data-step="choose-task" data-id="${task.id}">Choose</button> <button data-action="step-select" data-step="mark-written" data-id="${task.id}" ${!sub?"disabled":""}>Written</button> <button data-action="step-select" data-step="submit-task" data-id="${task.id}" ${!sub?"disabled":""}>Submit</button> <button data-action="step-select" data-step="view-result" data-id="${task.id}">Result</button></div>`;
      stepsEl.appendChild(row);
    });
  }
  const myEl=document.getElementById("myTasks");
  if(myEl){
    myEl.innerHTML="";
    if(!mySubs.length) myEl.innerHTML="<p>No tasks chosen yet.</p>";
    else mySubs.forEach(s=>{
      const d=document.createElement("div");
      d.style.cssText="background:#fff;padding:8px;margin:4px 0;border-radius:4px;";
      d.innerHTML=`<b>${s.taskTitle}</b> - ${s.status} - Score: ${s.score??"Pending"}<br><small>${s.feedback||"Awaiting feedback"}</small>`;
      myEl.appendChild(d);
    });
  }
}

function renderAdmin(){
  const learners = JSON.parse(localStorage.getItem("portalLearners")||"[]").filter(l=>(l.role||"").toLowerCase()==="learner");
  const staff = JSON.parse(localStorage.getItem("portalStaff")||"[]");
  const el1=document.getElementById("adminTotalLearners"); if(el1) el1.textContent=`Total registered learners: ${learners.length}`;
  const el2=document.getElementById("adminTotalStaff"); if(el2) el2.textContent=`Total registered staff: ${staff.length}`;
  const el3=document.getElementById("adminCompletedLearners");
  if(el3){
    const allTitles=state.tasks.map(t=>t.title);
    const completed = learners.filter(l=>{
      const titles=new Set(state.submissions.filter(s=>s.learnerName===l.fullName).map(s=>s.taskTitle));
      return allTitles.length>0 && allTitles.every(t=>titles.has(t));
    }).length;
    el3.textContent=`Learners who submitted all tasks: ${completed}`;
  }
  const usersList=document.getElementById("adminUsersList");
  if(usersList){
    usersList.innerHTML="";
    const all = JSON.parse(localStorage.getItem("portalLearners")||"[]");
    all.forEach(l=>{
      const row=document.createElement("div");
      row.style.cssText="display:flex;justify-content:space-between;padding:6px;background:#f5f5f5;margin:3px 0;border-radius:4px;";
      row.innerHTML=`<div><b>${l.fullName}</b><br><small>${l.learnerId} - ${l.role} ${l.active===false?"(Inactive)":""}</small></div><div><button data-action="delete-user" data-user-id="${l.learnerId}">Remove</button></div>`;
      usersList.appendChild(row);
    });
  }
  const staffList=document.getElementById("adminStaffList");
  if(staffList){
    staffList.innerHTML="";
    staff.forEach(s=>{
      const row=document.createElement("div");
      row.style.cssText="display:flex;justify-content:space-between;padding:6px;background:#f5f5f5;margin:3px 0;border-radius:4px;";
      row.innerHTML=`<div><b>${s.fullName}</b><br><small>${s.staffId||s.learnerId} - ${s.role}</small></div><div><button data-action="delete-staff" data-user-id="${s.staffId||s.learnerId}">Remove</button></div>`;
      staffList.appendChild(row);
    });
  }
}

function populateSelectors(){
  const learnerSel=document.getElementById("assessorLearnerSelect");
  const taskSel=document.getElementById("assessorTaskSelect");
  if(!learnerSel||!taskSel) return;
  const learners=[...new Set([...JSON.parse(localStorage.getItem("portalLearners")||"[]").map(l=>l.fullName), ...state.submissions.map(s=>s.learnerName)])].filter(Boolean);
  learnerSel.innerHTML='<option value="">Select learner</option>'+learners.map(n=>`<option value="${n}">${n}</option>`).join("");
  const tasks=[...new Set(state.tasks.map(t=>t.title))];
  taskSel.innerHTML='<option value="">Select task</option>'+tasks.map(t=>`<option value="${t}">${t}</option>`).join("");
}

window.createTask = async function(){
  const title=document.getElementById("taskTitle")?.value.trim();
  const type=document.getElementById("taskType")?.value;
  const desc=document.getElementById("taskDesc")?.value.trim();
  const due=document.getElementById("dueDate")?.value;
  const marks=document.getElementById("totalMarks")?.value;
  if(!title||!desc){ alert("Title and instructions required"); return; }
  try{
    const task = new Task(title, type, desc, due, marks, state.currentUserId);
    if(state.editingTaskId){
      const idx=state.tasks.findIndex(t=>String(t.id)===String(state.editingTaskId));
      if(idx>=0){ task.id=state.editingTaskId; state.tasks[idx]={...state.tasks[idx], ...task, id:state.editingTaskId}; await saveTask(state.currentUserId, state.tasks[idx]); }
      state.editingTaskId=null;
      const btn=document.getElementById("addTaskBtn"); if(btn) btn.textContent="Add Task";
      document.getElementById("cancelEditBtn")?.classList.add("hidden");
    }else{
      task.id=Date.now();
      state.tasks.unshift(task);
      await saveTask(state.currentUserId, task);
    }
    saveLocal(); clearForm(); renderAll();
  }catch(e){ alert(e.message); }
};

function clearForm(){
  ["taskTitle","taskDesc","dueDate","totalMarks"].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=""; });
  const te=document.getElementById("taskType"); if(te) te.value="Written";
  state.editingTaskId=null;
}
window.clearTaskForm=clearForm;
window.editTask=function(id){
  const task=state.tasks.find(t=>String(t.id)===String(id)); if(!task) return;
  state.editingTaskId=id;
  document.getElementById("taskTitle").value=task.title;
  document.getElementById("taskType").value=task.type;
  document.getElementById("taskDesc").value=task.description;
  document.getElementById("dueDate").value=task.dueDate||"";
  document.getElementById("totalMarks").value=task.totalMarks||"";
  document.getElementById("cancelEditBtn")?.classList.remove("hidden");
  window.scrollTo({top:0, behavior:"smooth"});
};
window.deleteTask=async function(id){
  if(!confirm("Do you want to delete this task? This cannot be undone.")) return;
  state.tasks=state.tasks.filter(t=>String(t.id)!==String(id));
  saveLocal();
  try{ await deleteTaskRecord(state.currentUserId, String(id)); }catch(e){}
  renderAll();
};
window.applyLearnerStep=function(taskId, step){
  const name=state.currentUserName;
  const task=state.tasks.find(t=>String(t.id)===String(taskId)); if(!task) return;
  let sub=state.submissions.find(s=>s.learnerName===name && s.taskTitle===task.title);
  if(step==="choose-task"){ if(!sub){ sub={id:Date.now(), learnerName:name, taskTitle:task.title, status:"Chosen", score:null, feedback:""}; state.submissions.push(sub);} else sub.status="Chosen"; }
  if(step==="mark-written"){ if(!sub){ alert("Choose task first"); return; } sub.status="Written"; }
  if(step==="submit-task"){ if(!sub){ alert("Choose and mark written first"); return; } sub.status="Submitted"; }
  if(step==="view-result"){ if(!sub){ alert("Not chosen yet"); return; } alert(`${task.title}: Score ${sub.score??"Pending"} - ${sub.feedback||"No feedback"}`); return; }
  saveLocal(); renderAll();
};
window.addSchoolUser=async function(){
  const fullName=document.getElementById("adminStudentName")?.value.trim();
  const learnerId=document.getElementById("adminStudentId")?.value.trim();
  const role=document.getElementById("adminStudentRole")?.value||"learner";
  const active=document.getElementById("adminStudentActive")?.checked;
  if(!fullName||!learnerId){ alert("Name and ID required"); return; }
  const { saveLearner } = await import("./firestore-Config.js");
  await saveLearner({fullName, learnerId, studentId:learnerId, role, active});
  renderAll();
  document.getElementById("adminStudentName").value=""; document.getElementById("adminStudentId").value="";
};
window.addStaffMember=async function(){
  const fullName=document.getElementById("adminStaffName")?.value.trim();
  const staffId=document.getElementById("adminStaffId")?.value.trim();
  const role=document.getElementById("adminStaffRole")?.value||"assessor";
  const active=document.getElementById("adminStaffActive")?.checked;
  if(!fullName||!staffId){ alert("Staff name and ID required"); return; }
  const { saveStaff } = await import("./firestore-Config.js");
  await saveStaff({fullName, staffId, learnerId:staffId, studentId:staffId, role, active});
  renderAll();
  document.getElementById("adminStaffName").value=""; document.getElementById("adminStaffId").value="";
};
window.saveAssessment=function(){
  const learnerName=document.getElementById("assessorLearnerSelect")?.value;
  const taskTitle=document.getElementById("assessorTaskSelect")?.value;
  const score=Number(document.getElementById("assessorMarks")?.value);
  const feedback=document.getElementById("assessorFeedback")?.value.trim();
  if(!learnerName||!taskTitle){ alert("Select learner and task"); return; }
  if(isNaN(score)||score<0||score>100){ alert("Marks 0-100"); return; }
  const sub=state.submissions.find(s=>s.learnerName===learnerName && s.taskTitle===taskTitle);
  if(!sub){ alert("Learner hasn't submitted this task yet."); return; }
  sub.score=score; sub.status="Graded"; sub.feedback=feedback||"Marked by assessor";
  saveLocal(); renderAll();
  document.getElementById("assessorMarks").value=""; document.getElementById("assessorFeedback").value="";
};

document.addEventListener("click", (e)=>{
  const btn=e.target.closest("button"); if(!btn) return;
  const action=btn.dataset.action;
  const id=btn.dataset.id;
  const userId=btn.dataset.userId;
  const step=btn.dataset.step;
  if(action==="delete-task") window.deleteTask(id);
  if(action==="edit-task") window.editTask(id);
  if(action==="choose-task") window.applyLearnerStep(id,"choose-task");
  if(action==="step-select") window.applyLearnerStep(id, step);
  if(action==="delete-user"){ if(confirm("Remove learner?")){ import("./firestore-Config.js").then(m=>m.deleteLearnerRecord(userId).then(()=>renderAll())); } }
  if(action==="delete-staff"){ if(confirm("Remove staff?")){ import("./firestore-Config.js").then(m=>m.deleteStaffRecord(userId).then(()=>renderAll())); } }
});

window.addEventListener("DOMContentLoaded", ()=>{ window.loadDashboard(); });
