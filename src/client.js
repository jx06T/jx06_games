let socket;

// 頁面加載時檢查認證狀態
window.addEventListener('DOMContentLoaded', () => {
    const password = document.getElementById('password');
    const username = document.getElementById('username');
    document.getElementById("eye-close").addEventListener("click", () => {
        password.type = "password"
    });
    document.getElementById("eye-open").addEventListener("click", () => {
        password.type = "text"
    });
    password.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleLogin()
        }
    })
    username.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            password.focus()
        }
    })

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
            createSimpleModal('Log in as guest', "Your information will not be saved")
            // alert('Enter as guest');
            login(username, "guest")
        }
    });
}

function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username == "" || password == "") {
        createSimpleModal('Please fill in the information to register', "")
        // alert('Please fill in the information');
        return
    }
    if (username.length < 3 || username.length > 21) {
        createSimpleModal('Username length should be between 3~21 characters', "")
        return 
    }

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                createSimpleModal('Registered successfully', `username：${username}`)
                // alert('Registered successfully');
                setTimeout(() => {
                    login(username, password)
                }, 3000);

            } else {
                createSimpleModal('Registered failed: ', data.message)
                // alert('Registered failed: ' + data.message);
            }
        });
}

function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    createSimpleModal('Logging in', '')
    login(username, password)
}

function login(username = null, password = null) {
    const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || window.location.pathname;

    if (!username || !password) {
        createSimpleModal('Login failed:', 'Unfilled information')
        // alert('Login failed: 缺少資料');
        return
    }

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                // alert('Logged in successfully', returnUrl);
                // window.location.assign('/');
                setTimeout(() => {
                    createSimpleModal('Logged in successfully', `"${username}" has been logged into this computer `)
                }, 500);

                setTimeout(() => {
                    window.location.assign(returnUrl);
                }, 2500);
            } else {
                createSimpleModal('Login failed:', data.message)
                // alert('Login failed: ' + data.message);
            }
        });
}

