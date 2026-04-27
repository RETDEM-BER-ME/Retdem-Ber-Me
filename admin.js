import { db, collection, getDocs, doc, deleteDoc, updateDoc, auth, onAuthStateChanged, getDoc } from './retdem_firebase.js';

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function (c) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'})[c];
    });
}

let allUsers = [];

function renderUserList(users, container) {
    if (!container) return;
    if (!users.length) {
        container.innerHTML = '<p style="color:#6b7280; text-align:center; padding: 2rem;">No users found.</p>';
        return;
    }
    container.innerHTML = users.map(data => {
        let studentDetails = '';
        let editButton = '';

        if (data.role === 'student') {
            // Using exactly 'studentID' (capital D) to match your Firebase data
            const studentIdBadge = data.studentID ? `<div class="user-detail-badge">ID: ${escapeHtml(data.studentID)}</div>` : '';
            const yearBadge = data.yearLevel ? `<div class="user-detail-badge year-badge">Year: ${escapeHtml(String(data.yearLevel))}</div>` : '';
            
            studentDetails = `<div class="student-details-container">${studentIdBadge}${yearBadge}</div>`;
            
            editButton = `<button class="edit-btn" data-id="${data.id}" data-year="${data.yearLevel || ''}">Edit Year</button>`;
        }

        return `<div class="user-card">
            <div class="user-info">
                <strong>${escapeHtml(data.fullName || data.email || 'No Name')}</strong>
                <div class="user-email">${escapeHtml(data.email || '')}</div>
                ${studentDetails}
            </div>
            
            <div class="user-actions">
                ${editButton}
                <button class="delete-btn" data-id="${data.id}">Delete</button>
            </div>
        </div>`;
    }).join('');
}

function sortUsers(usersArray, sortOrder) {
    return usersArray.sort((a, b) => {
        const nameA = (a.fullName || a.email || '').toLowerCase();
        const nameB = (b.fullName || b.email || '').toLowerCase();
        
        if (sortOrder === 'asc') return nameA.localeCompare(nameB);
        if (sortOrder === 'desc') return nameB.localeCompare(nameA);
        return 0;
    });
}

function filterAndRender() {
    // --- Students ---
    const studentSearch = document.getElementById('student-search').value.trim().toLowerCase();
    const studentIdSearch = document.getElementById('student-id-search').value.trim().toLowerCase();
    const yearFilter = document.getElementById('student-year-filter').value;
    const studentSort = document.getElementById('student-sort').value;

    let students = allUsers.filter(u => u.role === 'student' &&
        (!studentSearch || (u.fullName && u.fullName.toLowerCase().includes(studentSearch))) &&
        (!studentIdSearch || (u.studentID && String(u.studentID).toLowerCase().includes(studentIdSearch))) &&
        (!yearFilter || (u.yearLevel && String(u.yearLevel).startsWith(yearFilter)))
    );
    students = sortUsers(students, studentSort);
    renderUserList(students, document.getElementById('student-list'));

    // --- CI ---
    const ciSearch = document.getElementById('ci-search').value.trim().toLowerCase();
    const ciSort = document.getElementById('ci-sort').value;

    let cis = allUsers.filter(u => u.role === 'ci' &&
        (!ciSearch || (u.fullName && u.fullName.toLowerCase().includes(ciSearch)))
    );
    cis = sortUsers(cis, ciSort);
    renderUserList(cis, document.getElementById('ci-list'));

    // --- DR ---
    const drSearch = document.getElementById('dr-search').value.trim().toLowerCase();
    const drSort = document.getElementById('dr-sort').value;

    let drs = allUsers.filter(u => u.role === 'dr' &&
        (!drSearch || (u.fullName && u.fullName.toLowerCase().includes(drSearch)))
    );
    drs = sortUsers(drs, drSort);
    renderUserList(drs, document.getElementById('dr-list'));
}

async function loadAllUsers() {
    const studentList = document.getElementById('student-list');
    const ciList = document.getElementById('ci-list');
    const drList = document.getElementById('dr-list');
    studentList.innerHTML = ciList.innerHTML = drList.innerHTML = '<p>Loading...</p>';
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        allUsers = [];
        usersSnap.forEach(userDoc => { 
            const data = userDoc.data();
            data.id = userDoc.id; 
            allUsers.push(data);
        });
        filterAndRender();
    } catch (e) {
        console.error("Error loading users:", e);
        studentList.innerHTML = ciList.innerHTML = drList.innerHTML = '<p style="color:red">Failed to load users.</p>';
    }
}

function setupTabNav() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.user-tab-panel');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabPanels.forEach(panel => {
                panel.style.display = (panel.id === 'tab-' + btn.dataset.tab) ? 'block' : 'none';
            });
        });
    });
}

function setupFilters() {
    // Student Listeners
    document.getElementById('student-search').addEventListener('input', filterAndRender);
    document.getElementById('student-id-search').addEventListener('input', filterAndRender);
    document.getElementById('student-year-filter').addEventListener('change', filterAndRender);
    document.getElementById('student-sort').addEventListener('change', filterAndRender);

    // CI Listeners
    document.getElementById('ci-search').addEventListener('input', filterAndRender);
    document.getElementById('ci-sort').addEventListener('change', filterAndRender);

    // DR Listeners
    document.getElementById('dr-search').addEventListener('input', filterAndRender);
    document.getElementById('dr-sort').addEventListener('change', filterAndRender);
}

// Listen for clicks on dynamically created Edit and Delete buttons
document.addEventListener('click', async (e) => {
    
    // --- DELETE USER LOGIC ---
    if (e.target.classList.contains('delete-btn')) {
        const userId = e.target.getAttribute('data-id');
        
        if (confirm("Are you sure you want to permanently delete this user?")) {
            e.target.innerText = "Deleting..."; 
            try {
                await deleteDoc(doc(db, 'users', userId));
                alert("User successfully deleted.");
                loadAllUsers(); 
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Failed to delete user. Please check console for details.");
                e.target.innerText = "Delete";
            }
        }
    }

    // --- EDIT YEAR LEVEL LOGIC ---
    if (e.target.classList.contains('edit-btn')) {
        const userId = e.target.getAttribute('data-id');
        const currentYear = e.target.getAttribute('data-year');
        
        const newYear = prompt("Enter new Year Level (e.g., 1st Yr, 2nd Yr, 3rd Yr, 4th Yr):", currentYear);
        
        if (newYear !== null && newYear.trim() !== "" && newYear.trim() !== currentYear) {
            e.target.innerText = "Saving...";
            try {
                await updateDoc(doc(db, 'users', userId), {
                    yearLevel: newYear.trim()
                });
                alert("Year level updated!");
                loadAllUsers(); 
            } catch (error) {
                console.error("Error updating year level:", error);
                alert("Failed to update year level. Please check console for details.");
                e.target.innerText = "Edit Year";
            }
        }
    }
});

// Initialize Tabs and Filters immediately
window.addEventListener('DOMContentLoaded', () => {
    setupTabNav();
    setupFilters();
    // Notice we removed loadAllUsers() from here!
});

// --- AUTH GUARD: Protect the Admin Page ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, check their role in Firestore
        const userDocSnap = await getDoc(doc(db, 'users', user.uid));
        
        if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
            // They are an admin! Load the user list.
            loadAllUsers();
        } else {
            // Logged in, but NOT an admin. Kick them out.
            alert("Access Denied: You do not have admin privileges.");
            window.location.href = 'index.html'; // Adjust this if your login page is named differently
        }
    } else {
        // Not logged in at all. Kick them out.
        window.location.href = 'index.html'; 
    }
});