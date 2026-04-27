import { auth, db, onAuthStateChanged, signOut, doc, getDoc } from './retdem_firebase.js';

// Standard header behavior
document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    const nav = header?.querySelector('nav');
    const toggle = header?.querySelector('.menu-toggle');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('header nav a');
    const profileIcon = document.querySelector('.profile-icon');

    // --- Mobile menu ---
    const closeMenu = () => {
        if (!header || !toggle) return;
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
        if (!header || !toggle) return;
        header.classList.add('nav-open');
        toggle.setAttribute('aria-expanded', 'true');
    };

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            const isOpen = header.classList.contains('nav-open');
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) {
                closeMenu();
            }
        });
    }

    links.forEach((link) => {
        const href = link.getAttribute('href') || '';
        if (href === currentPage || href.split('#')[0] === currentPage) {
            link.classList.add('active');
        }

        link.addEventListener('click', () => {
            links.forEach((item) => item.classList.remove('active'));
            link.classList.add('active');
            if (window.innerWidth <= 900) {
                closeMenu();
            }
        });
    });

    // --- Profile modal ---
    if (!profileIcon) return;

    // Prevent old click-to-redirect behavior
    profileIcon.removeAttribute('onclick');

    // Inject modal if not already present
    let modal = document.getElementById('profile-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'profile-modal';
        modal.innerHTML = `
            <div class="profile-modal-backdrop"></div>
            <div class="profile-modal-panel">
                <div class="profile-modal-header">
                    <span class="profile-modal-avatar"><i class="fa-solid fa-user"></i></span>
                    <span class="profile-modal-name" id="profile-modal-name">User</span>
                </div>
                <div class="profile-modal-actions">
                    <button type="button" class="profile-modal-logout" id="profile-modal-logout">
                        Log out
                    </button>
                </div>
        `;
        document.body.appendChild(modal);
    }

    const modalName = document.getElementById('profile-modal-name');
    const modalLogout = document.getElementById('profile-modal-logout');
    const backdrop = modal.querySelector('.profile-modal-backdrop');

    // Fetch user name from Firestore
    onAuthStateChanged(auth, async (user) => {
        if (user && modalName) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    modalName.textContent = userDoc.data().fullName || user.displayName || user.email || 'User';
                } else {
                    modalName.textContent = user.displayName || user.email || 'User';
                }
            } catch {
                modalName.textContent = user.displayName || user.email || 'User';
            }
        }
    });

    // Toggle modal
    const openModal = () => modal.classList.add('active');
    const closeModal = () => modal.classList.remove('active');

    profileIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (modal.classList.contains('active')) {
            closeModal();
        } else {
            openModal();
        }
    });

    if (backdrop) {
        backdrop.addEventListener('click', closeModal);
    }

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Close when clicking outside panel
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Logout
    if (modalLogout) {
        modalLogout.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = 'index.html';
            }).catch(() => {
                window.location.href = 'index.html';
            });
        });
    }
});
