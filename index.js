// 1. Updated Imports
import { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    doc, 
    setDoc, 
    getDoc,
    sendPasswordResetEmail,      // Forgot Password
    setPersistence,              // Remember Me
    browserLocalPersistence,     // Remember Me
    browserSessionPersistence    // Remember Me
} from './retdem_firebase.js';

// --- Selectors ---
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const forgotPasswordModal = document.getElementById('forgot-password-modal'); //

// --- Form Toggles (Original Logic Kept) ---
document.getElementById('show-signup').onclick = () => { loginForm.style.display = 'none'; signupForm.style.display = 'block'; };
document.getElementById('show-login').onclick = () => { signupForm.style.display = 'none'; loginForm.style.display = 'block'; };

// --- Forgot Password Logic ---
document.getElementById('forgot-password-link').onclick = (e) => {
    e.preventDefault();
    forgotPasswordModal.style.display = 'flex'; // Show modal
};

document.getElementById('cancel-reset').onclick = () => {
    forgotPasswordModal.style.display = 'none'; // Hide modal
};

document.getElementById('forgot-password-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const resetBtn = document.getElementById('reset-btn');
    const resetMsg = document.getElementById('reset-message');
    const spinner = resetBtn.querySelector('.spinner');

    resetBtn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';

    try {
        await sendPasswordResetEmail(auth, email); //
        resetMsg.style.color = "green";
        resetMsg.textContent = "Reset link sent! Check your email.";
        setTimeout(() => { forgotPasswordModal.style.display = 'none'; }, 3000);
    } catch (error) {
        resetMsg.style.color = "#8a2c00";
        resetMsg.textContent = error.message;
    } finally {
        resetBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
    }
};

// --- Updated Login with Persistence (Remember Me) ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginBtn = document.getElementById('login-btn');
    const spinner = loginBtn.querySelector('.spinner');
    const errorMsg = document.querySelector('#login-form .auth-error-modern');
    const rememberMe = document.getElementById('remember-me').checked; //
    
    loginBtn.disabled = true;
    loginBtn.classList.add('loading');
    if (spinner) spinner.style.display = 'inline-block';
    if (errorMsg) errorMsg.textContent = '';

    const email = document.getElementById('log-email').value;
    const password = document.getElementById('log-pass').value;

    try {
        // Decide how long to stay logged in
        const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence); 

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        
        if (userDoc.exists()) {
            routeUser(userDoc.data().role);
        } else {
            if (errorMsg) errorMsg.textContent = "User profile not found in database.";
        }
    } catch (error) {
        if (errorMsg) errorMsg.textContent = error.message || 'Invalid login credentials.';
    } finally {
        resetForm(loginBtn, spinner);
    }
});

// --- Registration (Original Logic Kept) ---
const isValidDomain = (email) => email.endsWith('@shc.edu.ph'); //

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const signupBtn = document.getElementById('signup-btn');
    const spinner = signupBtn.querySelector('.spinner');
    const errorMsg = document.querySelector('#signup-form .auth-error-modern');
    
    signupBtn.disabled = true;
    signupBtn.classList.add('loading');
    if (spinner) spinner.style.display = 'inline-block';
    if (errorMsg) errorMsg.textContent = '';

    const email = document.getElementById('sign-email').value;
    const password = document.getElementById('sign-pass').value;
    const name = document.getElementById('sign-name').value;
    const year = document.getElementById('sign-year').value;
    const studentId = document.getElementById('sign-id').value;
    const role = document.getElementById('sign-role').value;

    if (!isValidDomain(email)) {
        if (errorMsg) errorMsg.textContent = "Error: Must use a valid @shc.edu.ph domain.";
        resetForm(signupBtn, spinner);
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await setDoc(doc(db, "users", user.uid), {
            fullName: name,
            email: email,
            yearLevel: year,
            studentID: studentId,
            role: role
        });
        
        alert("Registration Successful!");
        routeUser(role);
    } catch (error) {
        if (errorMsg) errorMsg.textContent = error.message || 'Registration failed.';
    } finally {
        resetForm(signupBtn, spinner);
    }
});

// --- Helpers (Original Logic Kept) ---
function resetForm(btn, spinner) {
    btn.disabled = false;
    btn.classList.remove('loading');
    if (spinner) spinner.style.display = 'none';
}

function routeUser(role) {
    switch (role) {
        case 'student': window.location.href = 'student.html'; break;
        case 'ci': window.location.href = 'ci.html'; break;
        case 'dr': window.location.href = 'dr.html'; break;
        case 'admin': window.location.href = 'admin.html'; break;
        default: alert('Invalid role'); break;
    }
}