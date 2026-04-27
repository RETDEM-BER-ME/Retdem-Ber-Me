import { auth, db, collection, addDoc, getDocs, query, where, getDoc, doc } from './retdem_firebase.js';
import { onAuthStateChanged, updateDoc } from './retdem_firebase.js';

const retdemForm = document.getElementById('retdem-form');
const borrowForm = document.getElementById('borrow-form');

// Populate CI Dropdowns
async function loadCIs() {
    const q = query(collection(db, "users"), where("role", "==", "ci"));
    const querySnapshot = await getDocs(q);
    const ciSelects = [document.getElementById('ret-ci'), document.getElementById('bor-ci')];

    if (!ciSelects[0] || !ciSelects[1]) {
        return;
    }
    
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const option = `<option value="${doc.id}">${data.fullName}</option>`;
        ciSelects[0].innerHTML += option;
        ciSelects[1].innerHTML += option;
    });
}

// Submit RETDEM Checklist to Firebase
if (retdemForm) {
    retdemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!auth.currentUser) return alert("Please log in first.");
        
        await addDoc(collection(db, "checklists"), {
            studentId: auth.currentUser.uid,
            procedure: document.getElementById('ret-proc').value,
            date: document.getElementById('ret-date').value,
            grade: document.getElementById('ret-grade').value,
            instructorId: document.getElementById('ret-ci').value,
            status: "Submitted"
        });
        alert("RETDEM Submitted to Masterlist!");
        e.target.reset();
    });
}

// Submit Borrowing Request
if (borrowForm) {
    borrowForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!auth.currentUser) return alert("Please log in first.");

        await addDoc(collection(db, "borrow_requests"), {
            studentId: auth.currentUser.uid,
            procedure: document.getElementById('bor-proc').value,
            items: document.getElementById('bor-items').value,
            instructorId: document.getElementById('bor-ci').value,
            status: "Pending"
        });
        alert("Borrowing Request Submitted to DR Handler!");
        e.target.reset();
    });
}


onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.data().role !== 'student') {
        window.location.href = 'index.html';
        return;
    }
    loadCIs();
    loadApprovedReturns(user.uid);
});

async function loadApprovedReturns(studentId) {
    const container = document.getElementById('approved-returns-container');

    if (!container) {
        return;
    }
    
    const q = query(collection(db, "borrow_requests"), where("studentId", "==", studentId), where("status", "==", "Approved"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        container.innerHTML = '<p>You have no pending returns.</p>';
        return;
    }

    container.innerHTML = '';
    snapshot.forEach(docSnapshot => {
        const req = docSnapshot.data();
        const reqId = docSnapshot.id;

        const formHtml = `
            <div class="return-form-box" id="return-box-${reqId}" style="border: 1px solid var(--soft-gray); padding: 15px; margin-bottom: 15px; border-radius: 5px;">
                <h4 style="margin-top:0; color: var(--primary-teal)">Items: ${req.items}</h4>
                <p style="font-size: 0.85rem; margin-bottom: 10px;">Procedure: ${req.procedure}</p>
                
                <input type="date" id="ret-date-${reqId}" required style="width: 45%; display: inline-block;">
                <input type="time" id="ret-time-${reqId}" required style="width: 45%; display: inline-block;">
                <input type="text" id="ret-remarks-${reqId}" placeholder="Remarks (e.g., Cleaned, Good Condition)" style="width: 95%; margin-top: 10px;">
                <input type="text" id="ret-damage-${reqId}" placeholder="Damages/Loss (Type 'None' if NA)" style="width: 95%; margin-top: 10px;">
                
                <button onclick="submitReturn('${reqId}')" class="btn" style="margin-top: 10px;">Confirm Return</button>
            </div>
        `;
        container.innerHTML += formHtml;
    });
}

// Function to process the return
window.submitReturn = async (reqId) => {
    const date = document.getElementById(`ret-date-${reqId}`).value;
    const time = document.getElementById(`ret-time-${reqId}`).value;
    const remarks = document.getElementById(`ret-remarks-${reqId}`).value;
    const damage = document.getElementById(`ret-damage-${reqId}`).value;

    if (!date || !time) return alert("Date and Time are required.");

    try {
        await updateDoc(doc(db, "borrow_requests", reqId), {
            status: "Returned",
            dateReturned: date,
            timeReturned: time,
            returnRemarks: remarks,
            damages: damage
        });
        
        alert("Return details submitted successfully!");
        document.getElementById(`return-box-${reqId}`).remove();
    } catch (err) {
        alert("Error submitting return: " + err.message);
    }
};
