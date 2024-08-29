let socket;
let MyUsername;

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
    MyUsername = username
    if (username) {
        document.getElementById('logout').style.display = 'block';
        document.getElementById('login').style.display = 'none';
        connectSocket();
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

function connectSocket() {
    socket = io('/orbito');
    console.log(socket)

    socket.emit('getPeople');

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('updatePeople', (people) => {
        console.log(people,MyUsername)
        const div = document.createElement("div")
        for (let i = 0; i < people.length; i++) {
            const aPerson = people[i].name == MyUsername ? people[i].name + "（you）" : people[i].name
            const aPersonDiv = document.createElement("div")
            aPersonDiv.textContent = aPerson
            aPersonDiv.className = "person"
            div.appendChild(aPersonDiv)
        }
        const peopleContainer = document.getElementById("people");
        peopleContainer.replaceChildren(...div.children);

    });

    socket.on('connect_error', (err) => {
        console.log('Connection error:', err.message);
    });
}