import { auth, db, collection, query, where, getDocs, doc, setDoc, getDoc, addDoc, onAuthStateChanged } from './retdem_firebase.js';

let drName = 'Unknown Handler';

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.data().role !== 'dr') {
        window.location.href = 'index.html';
        return;
    }
    drName = userDoc.data().fullName;
    loadPendingRequests();
        loadReturnedItems();
});

    // Load returned items (status == 'Returned')
    async function loadReturnedItems() {
        const container = document.getElementById('returned-items-container');
        if (!container) return;
        container.innerHTML = '<p>Loading returned items...</p>';
        try {
            const q = query(collection(db, 'borrow_requests'), where('status', '==', 'Returned'));
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                container.innerHTML = '<p style="color: var(--soft-gray)">No returned items.</p>';
                return;
            }
            container.innerHTML = '';
            for (const docSnapshot of snapshot.docs) {
                const req = docSnapshot.data();
                const reqId = docSnapshot.id;
                const studentDoc = await getDoc(doc(db, 'users', req.studentId));
                const studentName = studentDoc.exists() ? studentDoc.data().fullName : 'Unknown Student';
                const card = document.createElement('div');
                card.className = 'request-card';
                card.id = `returned-card-${reqId}`;
                card.innerHTML = `
                    <button type="button" class="btn-delete-red">Delete</button>
                        <div class="request-info">
                            <h4>Student: ${escapeHtml(studentName)}</h4>
                            <p><strong>Procedure:</strong> ${escapeHtml(req.procedure || 'N/A')}</p>
                            <p><strong>Returned Items:</strong> ${escapeHtml(req.items || 'N/A')}</p>
                            <p><strong>Date Borrowed:</strong> ${escapeHtml(req.requestedBorrowDate || 'N/A')}</p>
                            <p><strong>Date Returned:</strong> ${escapeHtml(req.returnedDate || 'N/A')}</p>
                        </div>
                `;
                card.querySelector('.btn-delete-red').addEventListener('click', () => {
                deleteReturnedRequest(reqId);
                });
                container.appendChild(card);
            }
        } catch (error) {
            container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }

    // Delete returned request
    async function deleteReturnedRequest(reqId) {
        if (!confirm('Are you sure you want to delete this returned record?')) return;
        try {
            await setDoc(doc(db, 'borrow_requests', reqId), { deleted: true }, { merge: true });
            // Optionally, you can use deleteDoc(doc(db, 'borrow_requests', reqId)) to fully remove
            document.getElementById(`returned-card-${reqId}`)?.remove();
        } catch (err) {
            alert('Error deleting: ' + err.message);
        }
    }
async function loadPendingRequests() {
    const container = document.getElementById('pending-requests-container');
    if (!container) return; // Element not present on this page
    container.innerHTML = '<p>Loading pending requests...</p>';

    try {
        const q = query(collection(db, 'borrow_requests'), where('status', '==', 'Pending'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<p style="color: var(--soft-gray)">No pending borrowing requests.</p>';
            return;
        }

        container.innerHTML = '';
        for (const docSnapshot of snapshot.docs) {
            const req = docSnapshot.data();
            const reqId = docSnapshot.id;

            const studentDoc = await getDoc(doc(db, 'users', req.studentId));
            const studentName = studentDoc.exists() ? studentDoc.data().fullName : 'Unknown Student';

            const card = document.createElement('div');
            card.className = 'request-card';
            card.id = `card-${reqId}`;

            card.innerHTML = `
                <div class="request-info">
                    <h4>Student: ${escapeHtml(studentName)}</h4>
                    <p><strong>Procedure:</strong> ${escapeHtml(req.procedure || 'N/A')}</p>
                    <p><strong>Requested Items:</strong> ${escapeHtml(req.items || 'N/A')}</p>
                    <p><strong>Requested Borrow Date:</strong> ${escapeHtml(req.requestedBorrowDate || 'N/A')}</p>
                    <p><strong>Requested Borrow Time:</strong> ${escapeHtml(req.requestedBorrowTime || 'N/A')}</p>
                    <p><strong>Expected Return Date:</strong> ${escapeHtml(req.expectedReturnDate || 'N/A')}</p>
                </div>
                <div class="approval-form">
                    <p style="margin-top: 0; color: var(--text-muted); line-height: 1.7;">Review the requested schedule above, then approve or reject the request.</p>
                    <div class="button-group">
                        <button type="button" class="btn-approve">Approve</button>
                        <button type="button" class="btn-reject">Reject</button>
                    </div>
                </div>
            `;

            const approveButton = card.querySelector('.btn-approve');
            const rejectButton = card.querySelector('.btn-reject');

            approveButton.addEventListener('click', () => {
                approveRequest(reqId, {
                    studentName,
                    items: req.items || '',
                    procedure: req.procedure || '',
                    requestedBorrowDate: req.requestedBorrowDate || '',
                    requestedBorrowTime: req.requestedBorrowTime || '',
                    expectedReturnDate: req.expectedReturnDate || ''
                });
            });

            rejectButton.addEventListener('click', () => {
                rejectRequest(reqId);
            });

            container.appendChild(card);
        }
    } catch (error) {
        container.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function approveRequest(reqId, requestData) {
    const {
        studentName,
        items,
        procedure,
        requestedBorrowDate,
        requestedBorrowTime,
        expectedReturnDate
    } = requestData;

    if (!requestedBorrowDate || !requestedBorrowTime || !expectedReturnDate) {
        alert('This request is missing the student schedule details.');
        return;
    }

    try {
        await setDoc(doc(db, 'borrow_requests', reqId), {
            status: 'Approved',
            approvedBy: drName
        }, { merge: true });

        await addDoc(collection(db, 'calendar'), {
            studentName,
            items,
            procedure,
            dateBorrowed: requestedBorrowDate,
            timeBorrowed: requestedBorrowTime,
            expectedReturn: expectedReturnDate,
            handlerName: drName,
            requestId: reqId
        });

        alert('Request approved and added to Calendar!');
        document.getElementById(`card-${reqId}`)?.remove();
    } catch (err) {
        alert('Error approving request: ' + err.message);
    }
}

async function rejectRequest(reqId) {
    if (!confirm('Are you sure you want to reject this request?')) return;
    try {
        await setDoc(doc(db, 'borrow_requests', reqId), { status: 'Rejected' }, { merge: true });
        document.getElementById(`card-${reqId}`)?.remove();
    } catch (err) {
        alert('Error rejecting: ' + err.message);
    }
}
