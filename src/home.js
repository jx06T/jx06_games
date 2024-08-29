let socket;

// 頁面加載時檢查認證狀態
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logout').addEventListener('click', logout)
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
            showLoggedInState(data.username || null);
        });
}

function showLoggedInState(username) {
    document.getElementById('loggedUser').textContent = username || "未登入";
    if (username) {
        document.getElementById('logout').style.display = 'block';
        document.getElementById('login').style.display = 'none';
        // connectSocket();
    }
}

function logout() {
    fetch('/logout').then(response => {
        if (response.ok) {
            alert('Logged out successfully');
            if (socket) socket.disconnect();
            document.getElementById('loggedUser').textContent = "未登入";
            document.getElementById('logout').style.display = 'none';
            document.getElementById('login').style.display = 'block';
        }
    });
}

// function connectSocket() {
//     socket = io();

//     socket.on('connect', () => {
//         console.log('Connected to server');
//     });

//     socket.on('connect_error', (err) => {
//         console.log('Connection error:', err.message);
//     });
// }