import { auth, db, collection, addDoc, getDocs, query, where, doc, getDoc } from './retdem_firebase.js';
import { onAuthStateChanged } from './retdem_firebase.js';

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    await loadCIs();
    await loadPastSubmissions(user.uid);
});

async function loadCIs() {
    const q = query(collection(db, "users"), where("role", "==", "ci"));
    const snapshot = await getDocs(q);
    const select = document.getElementById('ret-ci');
    snapshot.forEach(doc => {
        const data = doc.data();
        select.innerHTML += `<option value="${doc.id}">${data.fullName}</option>`;
    });
}

document.getElementById('retdem-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = {
        studentId: auth.currentUser.uid,
        procedure: document.getElementById('ret-proc').value,
        date: document.getElementById('ret-date').value,
        grade: document.getElementById('ret-grade').value,
        instructorId: document.getElementById('ret-ci').value,
        status: "Submitted"
    };
    await addDoc(collection(db, "checklists"), formData);
    alert('RETDEM submitted! You can now wait for your instructor feedback in RETDEM Submissions.');
    e.target.reset();
    await loadPastSubmissions(auth.currentUser.uid);
});

async function loadPastSubmissions(studentId) {
    const container = document.getElementById('past-submissions');
    const q = query(collection(db, "checklists"), where("studentId", "==", studentId));
    const snapshot = await getDocs(q);
    const submissions = await Promise.all(
        snapshot.docs.map(async (submissionDoc) => {
            const data = submissionDoc.data();
            const instructorDoc = await getDoc(doc(db, "users", data.instructorId));
            return {
                id: submissionDoc.id,
                ...data,
                ciName: instructorDoc.exists() ? instructorDoc.data().fullName : 'Unknown Instructor'
            };
        })
    );

    submissions.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    container.innerHTML = '';

    if (submissions.length === 0) {
        container.innerHTML = '<div class="empty-submissions">No RETDEM submissions yet.</div>';
        return;
    }

    submissions.forEach((submission) => {
        const isReviewed = submission.status === 'Reviewed';
        const feedbackText = submission.feedback?.trim()
            ? submission.feedback
            : 'Waiting for your Clinical Instructor to review this submission.';

        container.innerHTML += `
            <div class="submission-item">
                <h4>${submission.procedure}</h4>
                <p><strong>Date:</strong> ${submission.date}</p>
                <p><strong>Grade:</strong> ${submission.grade}</p>
                <p><strong>Instructor:</strong> ${submission.ciName}</p>
                <div class="submission-meta">
                    <span class="submission-badge ${isReviewed ? 'reviewed' : 'pending'}">
                        ${isReviewed ? 'Feedback Available' : 'Waiting for Feedback'}
                    </span>
                </div>
                <div class="feedback-box">
                    <strong>Instructor Feedback</strong>
                    <p>${feedbackText}</p>
                </div>
            </div>
        `;
    });
}
