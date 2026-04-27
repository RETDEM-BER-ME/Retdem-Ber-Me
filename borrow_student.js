import { auth, db, collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from './retdem_firebase.js';
import { onAuthStateChanged } from './retdem_firebase.js';

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    await loadCIs();
    await loadRequests(user.uid);
});

async function loadCIs() {
    const q = query(collection(db, 'users'), where('role', '==', 'ci'));
    const snapshot = await getDocs(q);
    const select = document.getElementById('bor-ci');
    select.innerHTML = '<option value="">Select Instructor...</option>';
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        select.innerHTML += `<option value="${docSnap.id}">${escapeHtml(data.fullName)}</option>`;
    });
}

document.getElementById('borrow-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const requestedBorrowDate = document.getElementById('bor-date').value;
    const requestedBorrowTime = document.getElementById('bor-time').value;
    const expectedReturnDate = document.getElementById('bor-return-date').value;

    if (!requestedBorrowDate || !requestedBorrowTime || !expectedReturnDate) {
        alert('Please complete the requested borrow schedule.');
        return;
    }

    if (expectedReturnDate < requestedBorrowDate) {
        alert('Expected return date cannot be earlier than the requested borrow date.');
        return;
    }

    const formData = {
        studentId: auth.currentUser.uid,
        procedure: document.getElementById('bor-proc').value,
        items: document.getElementById('bor-items').value,
        instructorId: document.getElementById('bor-ci').value,
        requestedBorrowDate,
        requestedBorrowTime,
        expectedReturnDate,
        status: 'Pending',
        studentHidden: false,
        createdAt: Date.now()
    };

    await addDoc(collection(db, 'borrow_requests'), formData);
    alert('Request submitted!');
    e.target.reset();
    await loadRequests(auth.currentUser.uid);
});

async function loadRequests(studentId) {
    const requestContainer = document.getElementById('student-requests-container');
    const returnsContainer = document.getElementById('approved-returns-container');
    const q = query(collection(db, 'borrow_requests'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);

    const requests = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    renderStudentRequests(requests.filter((request) => !request.studentHidden), requestContainer);
    renderApprovedReturns(requests.filter((request) => request.status === 'Approved'), returnsContainer);
}

function renderStudentRequests(requests, container) {
    container.innerHTML = '';

    if (requests.length === 0) {
        container.innerHTML = '<p class="empty-state">No requests to show.</p>';
        return;
    }

    requests.forEach((request) => {
        const statusClass = String(request.status || 'Pending').toLowerCase();
        const card = document.createElement('div');
        card.className = 'request-status-card';
        card.innerHTML = `
            <div class="request-top">
                <h4>${escapeHtml(request.items || 'Unnamed Request')}</h4>
                <span class="status-badge ${statusClass}">${escapeHtml(request.status || 'Pending')}</span>
            </div>
            <p><strong>Procedure:</strong> ${escapeHtml(request.procedure || 'N/A')}</p>
            <p><strong>Borrow Date:</strong> ${escapeHtml(request.requestedBorrowDate || 'N/A')}</p>
            <p><strong>Borrow Time:</strong> ${escapeHtml(request.requestedBorrowTime || 'N/A')}</p>
            <p><strong>Expected Return:</strong> ${escapeHtml(request.expectedReturnDate || 'N/A')}</p>
            ${request.approvedBy ? `<p><strong>Approved By:</strong> ${escapeHtml(request.approvedBy)}</p>` : ''}
        `;

        const actions = document.createElement('div');
        actions.className = 'request-actions';

        if (request.status === 'Pending') {
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'action-btn cancel';
            cancelButton.textContent = 'Cancel Request';
            cancelButton.addEventListener('click', () => cancelRequest(request.id));
            actions.appendChild(cancelButton);
        }

        if (request.status !== 'Pending') {
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'action-btn delete';
            deleteButton.textContent = 'Delete Message';
            deleteButton.addEventListener('click', () => hideRequestMessage(request.id));
            actions.appendChild(deleteButton);
        }

        if (actions.childElementCount > 0) {
            card.appendChild(actions);
        }

        container.appendChild(card);
    });
}

function renderApprovedReturns(requests, container) {
    container.innerHTML = '';

    if (requests.length === 0) {
        container.innerHTML = '<p class="empty-state">No approved items are waiting to be returned.</p>';
        return;
    }

    requests.forEach((request) => {
        const card = document.createElement('div');
        card.className = 'borrow-item';
        card.innerHTML = `
            <h4>${escapeHtml(request.items || 'Unnamed Request')}</h4>
            <p><strong>Procedure:</strong> ${escapeHtml(request.procedure || 'N/A')}</p>
            <p><strong>Status:</strong> <span class="status-badge approved">Approved</span></p>
            <p><strong>Approved Borrow Date:</strong> ${escapeHtml(request.requestedBorrowDate || 'N/A')}</p>
            <p><strong>Approved Borrow Time:</strong> ${escapeHtml(request.requestedBorrowTime || 'N/A')}</p>
            <p><strong>Expected Return Date:</strong> ${escapeHtml(request.expectedReturnDate || 'N/A')}</p>
            <div class="return-form">
                <label for="ret-date-${request.id}" class="field-label">Date Returned</label>
                <input type="date" id="ret-date-${request.id}" required>
                <label for="ret-time-${request.id}" class="field-label">Time Returned</label>
                <input type="time" id="ret-time-${request.id}" required>
                <input type="text" id="ret-remarks-${request.id}" placeholder="Remarks">
                <input type="text" id="ret-damage-${request.id}" placeholder="Damages (if any)">
                <button type="button" class="btn">Confirm Return</button>
            </div>
        `;

        card.querySelector('.btn').addEventListener('click', () => submitReturn(request.id));
        container.appendChild(card);
    });
}

async function cancelRequest(reqId) {
    if (!confirm('Cancel this request?')) return;

    await updateDoc(doc(db, 'borrow_requests', reqId), {
        status: 'Canceled'
    });
    alert('Request canceled.');
    loadRequests(auth.currentUser.uid);
}

async function hideRequestMessage(reqId) {
    await updateDoc(doc(db, 'borrow_requests', reqId), {
        studentHidden: true
    });
    loadRequests(auth.currentUser.uid);
}

async function submitReturn(reqId) {
    const date = document.getElementById(`ret-date-${reqId}`).value;
    const time = document.getElementById(`ret-time-${reqId}`).value;
    const remarks = document.getElementById(`ret-remarks-${reqId}`).value;
    const damage = document.getElementById(`ret-damage-${reqId}`).value;

    if (!date || !time) {
        alert('Date/Time required');
        return;
    }

    await updateDoc(doc(db, 'borrow_requests', reqId), {
        status: 'Returned',
        dateReturned: date,
        timeReturned: time,
        returnRemarks: remarks,
        damages: damage,
        studentHidden: false
    });
    alert('Return confirmed!');
    loadRequests(auth.currentUser.uid);
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.cancelRequest = cancelRequest;
window.hideRequestMessage = hideRequestMessage;
window.submitReturn = submitReturn;
