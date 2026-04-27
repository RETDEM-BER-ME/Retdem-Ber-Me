import { auth, db, collection, query, where, getDocs, doc, setDoc, getDoc, onAuthStateChanged } from './retdem_firebase.js';

const yearFilter = document.getElementById('year-level-filter');
const nameFilter = document.getElementById('student-name-filter');
const filterEmptyState = document.getElementById('year-filter-empty');

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.data().role !== 'ci') {
        window.location.href = 'index.html';
        return;
    }
    loadMasterlist(user.uid);
});

if (yearFilter) {
    yearFilter.addEventListener('change', applyFilters);
}

if (nameFilter) {
    nameFilter.addEventListener('input', applyFilters);
}

async function loadMasterlist(ciId) {
    const container = document.getElementById('student-folders-container');
    container.innerHTML = '<p>Loading masterlist...</p>';

    try {
        const q = query(collection(db, 'checklists'), where('instructorId', '==', ciId));
        const snapshot = await getDocs(q);

        const studentData = {};
        const studentCache = {};

        for (const docSnapshot of snapshot.docs) {
            const item = docSnapshot.data();
            item.id = docSnapshot.id;
            const sId = item.studentId;

            if (!studentData[sId]) {
                studentData[sId] = [];
                if (!studentCache[sId]) {
                    const studentDoc = await getDoc(doc(db, 'users', sId));
                    if (studentDoc.exists()) {
                        studentCache[sId] = studentDoc.data();
                    } else {
                        studentCache[sId] = { fullName: 'Unknown Student', yearLevel: 'N/A' };
                    }
                }
            }
            studentData[sId].push(item);
        }

        container.innerHTML = '';
        if (Object.keys(studentData).length === 0) {
            container.innerHTML = '<p style="color: var(--soft-gray)">No RETDEM submissions have been routed to you yet.</p>';
            if (filterEmptyState) filterEmptyState.style.display = 'none';
            return;
        }

        for (const [sId, records] of Object.entries(studentData)) {
            const student = studentCache[sId];
            const fullName = student.fullName || 'Unknown Student';
            const yearLevel = normalizeYearLevel(student.yearLevel);

            const folderDiv = document.createElement('div');
            folderDiv.className = 'folder-card';
            folderDiv.dataset.yearLevel = yearLevel;
            folderDiv.dataset.studentName = fullName.toLowerCase();

            let html = `
                <div class="folder-header" onclick="toggleFolder('${sId}')">
                    <span class="folder-icon">&#128193;</span>
                    <div class="folder-info">
                        <h4>${escapeHtml(fullName)}</h4>
                        <p>Year Level: ${escapeHtml(student.yearLevel || 'N/A')}</p>
                    </div>
                </div>
                <div class="folder-content" id="content-${sId}" style="display: none;">
            `;

            records.forEach((record) => {
                html += `
                    <div class="retdem-record">
                        <p><strong>Procedure:</strong> ${escapeHtml(record.procedure || 'N/A')}</p>
                        <p><strong>Date:</strong> ${escapeHtml(record.date || 'N/A')}</p>
                        <p><strong>Grade:</strong> ${escapeHtml(record.grade || 'N/A')}</p>
                        <p><strong>Feedback:</strong> <span id="display-fb-${record.id}">${record.feedback ? escapeHtml(record.feedback) : '<em>Pending...</em>'}</span></p>
                        <div class="feedback-form">
                            <input type="text" id="fb-${record.id}" placeholder="Type feedback here...">
                            <button onclick="submitFeedback('${record.id}')" class="btn-small">Send</button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            folderDiv.innerHTML = html;
            container.appendChild(folderDiv);
        }

        applyFilters();
    } catch (error) {
        console.error('Error loading masterlist:', error);
        container.innerHTML = `<p style="color: red;">Error loading data: ${error.message}</p>`;
    }
}

function normalizeYearLevel(yearLevel) {
    const value = String(yearLevel || '').trim().toLowerCase();
    if (value.includes('1')) return '1st Year';
    if (value.includes('2')) return '2nd Year';
    if (value.includes('3')) return '3rd Year';
    if (value.includes('4')) return '4th Year';
    return 'N/A';
}

function applyFilters() {
    const selectedYear = yearFilter ? yearFilter.value : 'all';
    const searchTerm = nameFilter ? nameFilter.value.trim().toLowerCase() : '';
    const cards = document.querySelectorAll('.folder-card');
    let visibleCount = 0;

    cards.forEach((card) => {
        const matchesYear = selectedYear === 'all' || card.dataset.yearLevel === selectedYear;
        const matchesName = !searchTerm || card.dataset.studentName.includes(searchTerm);
        const matches = matchesYear && matchesName;
        card.style.display = matches ? '' : 'none';
        if (matches) visibleCount += 1;
    });

    if (filterEmptyState) {
        filterEmptyState.style.display = visibleCount === 0 ? 'block' : 'none';
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

window.toggleFolder = (sId) => {
    const content = document.getElementById(`content-${sId}`);
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
};

window.submitFeedback = async (recordId) => {
    const feedbackInput = document.getElementById(`fb-${recordId}`).value;
    if (!feedbackInput) return alert('Please type your feedback first.');

    try {
        await setDoc(doc(db, 'checklists', recordId), {
            feedback: feedbackInput,
            status: 'Reviewed'
        }, { merge: true });

        alert('Feedback submitted successfully!');

        document.getElementById(`display-fb-${recordId}`).innerText = feedbackInput;
        document.getElementById(`fb-${recordId}`).value = '';
    } catch (err) {
        console.error('Feedback error:', err);
        alert('Failed to submit feedback. Check console.');
    }
};
