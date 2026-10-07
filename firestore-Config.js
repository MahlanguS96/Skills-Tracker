
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, getDoc, setDoc, deleteDoc, doc, addDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCW3kfUNrp08PFl0Xp83-z2ScvTJnq2X-k",
  authDomain: "task-management-5d376.firebaseapp.com",
  projectId: "task-management-5d376",
  storageBucket: "task-management-5d376.firebasestorage.app",
  messagingSenderId: "816084350603",
  appId: "1:816084350603:web:87e9f6e671ae14a0b4068e",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

function saveLocal(key, data){ try{ localStorage.setItem(key, JSON.stringify(data)); }catch(e){} }
function getLocal(key){ try{ return JSON.parse(localStorage.getItem(key)||"[]"); }catch(e){ return []; } }

export async function saveLearner(learner){
  const fullName = String(learner?.fullName||"").trim();
  const learnerId = String(learner?.learnerId||learner?.studentId||"").trim();
  if(!fullName||!learnerId) throw new Error("Learner full name and ID are required.");
  const payload = {...learner, fullName, learnerId, studentId:learnerId, role:learner?.role||"learner", active:learner?.active!==false, createdAt:learner?.createdAt||new Date().toISOString()};
  const stored=getLocal("portalLearners");
  const idx=stored.findIndex(i=>String(i.learnerId).toLowerCase()===learnerId.toLowerCase());
  if(idx>=0) stored[idx]=payload; else stored.push(payload);
  saveLocal("portalLearners", stored);
  try{ await setDoc(doc(db,"learners", learnerId.toLowerCase()), payload); }catch(e){ console.warn('Firestore offline, using local fallback', e); }
  return payload;
}
export async function deleteLearnerRecord(learnerId){
  const id=String(learnerId||"").trim().toLowerCase(); if(!id) return;
  saveLocal("portalLearners", getLocal("portalLearners").filter(i=>String(i.learnerId).toLowerCase()!==id));
  await deleteDoc(doc(db,"learners", id));
}
export async function saveStaff(staff){
  const fullName=String(staff?.fullName||"").trim();
  const staffId=String(staff?.staffId||staff?.learnerId||"").trim();
  if(!fullName||!staffId) throw new Error("Staff full name and ID are required.");
  const payload={...staff, fullName, staffId, learnerId:staffId, studentId:staffId, role:staff?.role||"assessor", active:staff?.active!==false, createdAt:staff?.createdAt||new Date().toISOString()};
  const stored=getLocal("portalStaff");
  const idx=stored.findIndex(i=>String(i.staffId||i.learnerId).toLowerCase()===staffId.toLowerCase());
  if(idx>=0) stored[idx]=payload; else stored.push(payload);
  saveLocal("portalStaff", stored);
  try{ await setDoc(doc(db,"staff", staffId.toLowerCase()), payload); }catch(e){ console.warn('Firestore offline, using local fallback', e); }
  return payload;
}
export async function deleteStaffRecord(staffId){
  const id=String(staffId).trim().toLowerCase();
  saveLocal("portalStaff", getLocal("portalStaff").filter(i=>String(i.staffId||i.learnerId).toLowerCase()!==id));
  await deleteDoc(doc(db,"staff", id));
}
export async function isLearnerAllowed(fullName, learnerId){
  const name=String(fullName||"").trim().toLowerCase();
  const id=String(learnerId||"").trim().toLowerCase();
  if(!name||!id) return false;
  try{
    const snap=await getDoc(doc(db,"learners", id));
    if(!snap.exists()) return false;
    const data=snap.data();
    return data.active!==false && String(data.fullName).toLowerCase()===name;
  }catch(e){
    return getLocal("portalLearners").some(d=>String(d.fullName).toLowerCase()===name && String(d.learnerId).toLowerCase()===id && d.active!==false);
  }
}
export async function saveTask(userId, task){
  const taskRef = task.id? doc(db, `users/${userId}/tasks`, String(task.id)) : doc(collection(db, `users/${userId}/tasks`));
  const payload={...task, updatedAt:new Date().toISOString()};
  await setDoc(taskRef, payload);
  return {id:taskRef.id,...payload};
}
export async function getTasks(userId){
  const snap=await getDocs(collection(db, `users/${userId}/tasks`));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}
export async function deleteTaskRecord(userId, taskId){
  await deleteDoc(doc(db, `users/${userId}/tasks`, taskId));
}
export async function saveBooking(userId, booking){
  await addDoc(collection(db, `users/${userId}/bookings`), {...booking, createdAt:new Date().toISOString()});
}
export async function saveScore(userId, score){
  await addDoc(collection(db, `users/${userId}/scores`), {score, createdAt:new Date().toISOString()});
}
export const saveStaffMember=saveStaff;
export const deleteStaffMemberRecord=deleteStaffRecord;
export const saveStudent=saveLearner;
export const deleteStudentRecord=deleteLearnerRecord;
export const isStudentAllowed=isLearnerAllowed;
export async function getLearners(){
  const s=await getDocs(collection(db,"learners"));
  return s.docs.map(d=>({id:d.id,...d.data()}));
}
export const getStudents=getLearners;
