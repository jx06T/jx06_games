let socket;

// 頁面加載時檢查認證狀態
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logout').addEventListener('click', logout)
    checkAuth()
})

function checkAuth() {
    fetch('/check-auth')
        .then(response => response.json())
        .then(data => {
            showLoggedInState(data.username || null);
        });
}

function showLoggedInState(username) {
    document.getElementById('loggedUser').textContent = username || "Not Logged In";
    if (username) {
        document.getElementById('logout').style.display = 'block';
        document.getElementById('login').style.display = 'none';
        // connectSocket();
    }
}

function logout() {
    fetch('/logout').then(response => {
        if (response.ok) {
            // alert('Logged out successfully');
            createSimpleModal('Logged out successfully',`"${document.getElementById('loggedUser').textContent}" has been logged out from this computer `)
            if (socket) socket.disconnect();
            document.getElementById('loggedUser').textContent = "Not Logged In";
            document.getElementById('logout').style.display = 'none';
            document.getElementById('login').style.display = 'block';
        }
    });
}

