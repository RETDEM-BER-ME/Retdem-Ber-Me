import { auth, db, collection, getDocs, doc, updateDoc, deleteDoc, onAuthStateChanged, getDoc, signOut } from './retdem_firebase.js';

let calendarInstance;
let currentUserRole = 'viewer';

const body = document.body;
const pageRole = body.dataset.calendarRole || 'viewer';
const dashboardHref = body.dataset.dashboardHref || 'index.html';
const refreshButtons = document.querySelectorAll('[data-calendar-refresh]');

refreshButtons.forEach((button) => {
    button.addEventListener('click', () => {
        loadEvents();
    });
});

document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    setupCalendar();
});

async function initAuth() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            currentUserRole = userDoc.data().role || 'viewer';

            if (pageRole !== 'viewer' && currentUserRole !== pageRole) {
                if (currentUserRole === 'student') {
                    window.location.href = 'student_calendar.html';
                } else if (currentUserRole === 'dr') {
                    window.location.href = 'dr_calendar.html';
                } else {
                    window.location.href = dashboardHref;
                }
                return;
            }

            resolve();
        });
    });
}

function setupCalendar() {
    const calendarEl = document.getElementById('calendar-container');
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        editable: currentUserRole === 'dr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        height: 600,
        eventClick: handleEventClick,
        events: []
    });
    calendarInstance.render();
    loadEvents();
}

async function loadEvents() {
    try {
        const snapshot = await getDocs(collection(db, 'calendar'));
        const events = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                title: data.items,
                start: data.dateBorrowed,
                extendedProps: data
            };
        });
        calendarInstance.removeAllEvents();
        calendarInstance.addEventSource(events);
    } catch (error) {
        console.error('Error:', error);
    }
}

function handleEventClick(info) {
    const ev = info.event.extendedProps;
    alert(`Student: ${ev.studentName}\nItems: ${info.event.title}\nBorrow: ${ev.dateBorrowed}\nReturn: ${ev.expectedReturn}\nHandler: ${ev.handlerName}`);
    if (currentUserRole === 'dr') {
        const action = prompt('e=edit, d=delete');
        if (action === 'd') {
            if (confirm('Delete?')) deleteEvent(info.event.id);
        } else if (action === 'e') {
            const newDate = prompt('New return date YYYY-MM-DD:');
            if (newDate) updateEvent(info.event.id, newDate);
        }
    }
}

async function updateEvent(id, date) {
    await updateDoc(doc(db, 'calendar', id), { expectedReturn: date });
    loadEvents();
}

async function deleteEvent(id) {
    await deleteDoc(doc(db, 'calendar', id));
    loadEvents();
}
