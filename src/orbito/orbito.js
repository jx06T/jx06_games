let socket;
let MyUsername;
let currentRoom = null;
// 頁面加載時檢查認證狀態
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logout').addEventListener('click', logout)
    const pathParts = window.location.pathname.split('/');

    if (pathParts.length === 3 && pathParts[1] === 'orbito') {
        currentRoom = pathParts[2];
    };

    checkAuth();
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
        console.log('Connected to server',currentRoom);
        if (currentRoom) {
            socket.emit('joinRoom', MyUsername, currentRoom);
        }
    });

    socket.on('connect_error', (err) => {
        console.log('Connection error:', err.message);
    });

    socket.on('updatePeople', (people) => {
        console.log(people, MyUsername);
        const div = document.createElement("div");
        Object.keys(people).forEach(username => {
            console.log('Username:', username);
            console.log('Socket ID:', people[username].socketId);

            const aPerson = username == MyUsername ? username + "(你)" : username;
            const state = people[username].state

            const aPersonDiv = document.createElement("div");
            aPersonDiv.className = "person";

            if (state == 1) {
                aPersonDiv.classList.add("busy");
            }

            const nameP = document.createElement("p");
            nameP.textContent = aPerson;
            nameP.style.cursor = "pointer";

            aPersonDiv.addEventListener("click", () => joinRoom(username));

            const levelP = document.createElement("p");
            const scoreP = document.createElement("p");
            levelP.textContent = "Lv.0";
            scoreP.textContent = "9999";

            aPersonDiv.appendChild(nameP);
            aPersonDiv.appendChild(levelP);
            aPersonDiv.appendChild(scoreP);
            div.appendChild(aPersonDiv);
        })

        const peopleContainer = document.getElementById("people");
        peopleContainer.replaceChildren(...div.children);
    });

    socket.on('joinedRoom', (room) => {
        console.log(room, room.people.join("/"))
        currentRoom = room.id;
        document.getElementById('currentRoom').textContent = currentRoom + "/" + room.people.join("/");
        document.getElementById('roomInfo').classList.remove('hidden');
        document.getElementById('player-list').classList.add('hidden');
    });

    socket.on('updataRoomInfo', (rooms) => {
        console.log(rooms)
        if (!rooms[currentRoom]) {
            return
        }
        document.getElementById('currentRoom').textContent = currentRoom + "/" + rooms[currentRoom].people.join("/");
    });

    socket.on('leftRoom', () => {
        currentRoom = null;
        document.getElementById('currentRoom').textContent = '';
        document.getElementById('roomInfo').classList.add('hidden');
    });

    socket.on('pairRequest', ({ sourceName }) => {
        if (confirm(`Accept ${sourceName}'s pair request?`)) {
            const roomId = getRandId(12);
            socket.emit('acceptPair', { sourceName, me: MyUsername, roomId });
            window.location.href = `/orbito/${roomId}`;
        } else {
            socket.emit('rejectPair', { sourceName, me: MyUsername });
        }
    });

    socket.on('pairAccepted', (roomId) => {
        window.location.href = `/orbito/${roomId}`;
    });

    socket.on('pairRejected', (sourceName) => {
        alert(`${sourceName} 拒絕你的邀請`)
    });

    socket.on('invalidRoom', (roomId) => {
        alert("invalidRoom")
        window.location.href = `/orbito`;
    });

}

function joinRoom(otherPlayer) {
    if (otherPlayer === MyUsername) {
        alert("You will create a private room,You can invite friends to join through the link");
        const roomId = getRandId(12)
        socket.emit('creatRoom', MyUsername, roomId);
        window.location.href = `/orbito/${roomId}`;
        return
    } else if (confirm(`邀請 ${otherPlayer}?`)) {
        console.log(otherPlayer)
        socket.emit('requestPair', MyUsername, otherPlayer);
    }
}

document.getElementById('leaveRoom').addEventListener('click', () => {
    if (currentRoom) {
        // socket.emit('leaveRoom', MyUsername, currentRoom);
        history.pushState({ page: 'orbito' }, "Orbito", '/orbito');
        window.location.href = '/orbito'; // 重定向回主頁面
    }
});

window.addEventListener('load', () => {
    if (window.location.pathname === '/orbito') {
        console.log('Page loaded: /orbito');
        // 执行相关逻辑
    }
});

// window.addEventListener('beforeunload', () => {
//     if (currentRoom) {
//         socket.emit('leaveRoom', MyUsername, currentRoom);
//     }
// })