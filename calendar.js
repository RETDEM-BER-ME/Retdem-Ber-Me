import { auth, db, collection, getDocs, doc, getDoc, updateDoc, deleteDoc, onAuthStateChanged, query, where } from './retdem_firebase.js';

let currentUserRole = 'student';
let currentDate = new Date();
let eventsMap = new Map(); // date -> events array

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    const userDoc = await getDoc(doc(db, "users", user.uid));
    currentUserRole = userDoc.data().role;
    await loadEvents();
    renderCalendar();
    setupNav();
});

async function loadEvents() {
    eventsMap.clear();
    try {
        const snapshot = await getDocs(collection(db, "calendar"));
        snapshot.forEach(docSnap => {
            const ev = docSnap.data();
            ev.id = docSnap.id;
            const borrowKey = ev.dateBorrowed;
            if (!eventsMap.has(borrowKey)) eventsMap.set(borrowKey, []);
            eventsMap.get(borrowKey).push(ev);
        });
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function setupNav() {
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('main section').forEach(s => s.style.display = 'none');
            document.querySelector(link.getAttribute('href')).style.display = 'block';
        };
    });
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    document.getElementById('current-month').textContent = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let html = '<div class="calendar-weekdays">';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        html += `<div>${day}</div>`;
    });
    html += '</div><div class="calendar-days">';

    // Empty cells for previous month
    for (let i = 0; i < startingDay; i++) {
        html += '<div class="calendar-day other-month"></div>';
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = eventsMap.get(dateStr) || [];
        const isToday = dateStr === new Date().toISOString().split('T')[0] ? 'today' : '';

        let cellContent = day;
        if (dayEvents.length > 0) {
            const tooltip = dayEvents.map(ev => `${ev.studentName}: ${ev.items}`).join('\\n');
            cellContent = `<div class="event-day" title="${tooltip}">${day}<div class="events-count">${dayEvents.length}</div></div>`;
        }

        html += `<div class="calendar-day ${isToday}" onclick="showDayEvents('${dateStr}')">${cellContent}</div>`;
    }

    // Fill remaining cells with next month
    const remaining = 42 - (startingDay + daysInMonth);
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="calendar-day other-month">${i}</div>`;
    }

    html += '</div>';
    document.getElementById('calendar-grid').innerHTML = html;
}

window.showDayEvents = (dateStr) => {
    const dayEvents = eventsMap.get(dateStr) || [];
    const details = document.getElementById('event-details');
    if (dayEvents.length === 0) {
        details.innerHTML = '<p>No events on this day.</p>';
        details.style.display = 'block';
        return;
    }

    let html = `<h4>Events on ${new Date(dateStr).toLocaleDateString()}</h4>`;
    dayEvents.forEach(ev => {
        html += `
            <div style="border: 1px solid var(--light-beige); padding: 1rem; margin-bottom: 1rem; border-radius: 8px; background: var(--cream);">
                <h5>${ev.studentName}</h5>
                <p><strong>Items:</strong> ${ev.items}</p>
                <p><strong>Borrow:</strong> ${ev.dateBorrowed} @ ${ev.timeBorrowed}</p>
                <p><strong>Expected Return:</strong> ${ev.expectedReturn}</p>
                <p><strong>Procedure:</strong> ${ev.procedure}</p>
                <p><strong>Handler:</strong> ${ev.handlerName}</p>
                ${currentUserRole === 'dr' ? 
                    `<button onclick="editReturn('${ev.id}')" class="btn" style="background: var(--muted-mustard);">Edit Return</button>
                     <button onclick="deleteEvent('${ev.id}')" class="btn" style="background: var(--warm-coral);">Delete</button>` : 
                    ''
                }
            </div>
        `;
    });
    details.innerHTML = html;
    details.style.display = 'block';
};

window.editReturn = async (eventId) => {
    const newDate = prompt('New expected return date (YYYY-MM-DD):');
    if (newDate) {
        try {
            await updateDoc(doc(db, "calendar", eventId), { expectedReturn: newDate });
            await loadEvents();
            renderCalendar();
            showDayEvents(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0]);
            alert('Updated!');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }
};

window.deleteEvent = async (eventId) => {
    if (confirm('Delete this borrowing event?')) {
        try {
            await deleteDoc(doc(db, "calendar", eventId));
            await loadEvents();
            renderCalendar();
            alert('Deleted!');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }
};

document.getElementById('prev-month').onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
};

document.getElementById('next-month').onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
};

