let socket;

// 頁面加載時檢查認證狀態
window.addEventListener('DOMContentLoaded', () => {
    const password = document.getElementById('password');
    document.getElementById("eye-close").addEventListener("click", () => {
        password.type = "password"
    });
    document.getElementById("eye-open").addEventListener("click", () => {
        password.type = "text"
    });

    document.getElementById('guest').addEventListener('click', guest)
    document.getElementById('register').addEventListener('click', register)
    document.getElementById('login').addEventListener('click', login)

    checkAuth()
})

function getRandId(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = chars.length;
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


function checkAuth() {
    fetch('/check-auth')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                showLoggedInState(data.username);
            }
        });
}

function showLoggedInState(username) {
    //   document.getElementById('auth').style.display = 'none';
    document.getElementById('chat').style.display = 'block';
    document.getElementById('loggedUser').textContent = username;
    connectSocket();
}

function guest() {
    const username = "guest-" + getRandId();
    const password = "guest";

    fetch('/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(response => {
        if (response.ok) alert('Registered successfully');
    });
}

function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(response => {
        if (response.ok) alert('Registered successfully');
    });
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Logged in successfully');
                showLoggedInState(data.username);
            } else {
                alert('Login failed: ' + data.message);
            }
        });
}

function logout() {
    fetch('/logout').then(response => {
        if (response.ok) {
            alert('Logged out successfully');
            if (socket) socket.disconnect();
            document.getElementById('auth').style.display = 'block';
            document.getElementById('chat').style.display = 'none';
        }
    });
}

function connectSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('connect_error', (err) => {
        console.log('Connection error:', err.message);
    });
}