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
    document.getElementById('login').addEventListener('click', handleLogin)

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
                console.log(data.authenticated)
                window.location.assign('/');
            }
        });
}


function guest() {
    const username = "guest-" + getRandId();
    const password = "guest";

    fetch('/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(response => {
        if (response.ok) {
            alert('Enter as guest');
            login(username, "guest")
        }
    });
}

function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username == "" || password == "") {
        alert('Please fill in the information');
        return
    }

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Registered successfully');
                login(username, password)
            } else {
                alert('Registered failed: ' + data.message);
            }
        });
}

function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    login(username, password)
}

function login(username = null, password = null) {

    if (!username || !password) {
        alert('Login failed: 缺少資料');
        return
    }

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Logged in successfully');
                window.location.assign('/');
            } else {
                alert('Login failed: ' + data.message);
            }
        });
}

