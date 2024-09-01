let socket;
let MyUsername;
let MyPlayers = {};
let Mystate = 0
let currentRoom = null;
let MyColor = 0

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logout').addEventListener('click', logout)
    document.getElementById('login').href = `/start?returnUrl=${window.location.pathname}`;
    document.getElementById('close').addEventListener("click", () => {
        document.getElementById('players-in-room').classList.toggle('open')
        document.getElementById('close').textContent = document.getElementById('players-in-room').classList.contains('open') ? "close" : "<"
    });
    const pathParts = window.location.pathname.split('/');

    if (pathParts.length === 3 && pathParts[1] === 'orbito') {
        currentRoom = pathParts[2];
    };

    checkAuth();
})

function getRandId(length = 8, letter = true) {
    const chars = '0123456789' + (letter ? "abcdefghijklmnopqrstuvwxyz" : "");
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
    document.getElementById('loggedUser').textContent = username || "Not Logged In";
    MyUsername = username
    if (username) {
        document.getElementById('logout').style.display = 'block';
        document.getElementById('login').style.display = 'none';
        connectSocket();
    }
}

function connectSocket() {
    socket = io('/orbito');
    console.log(socket)

    socket.emit('getPeople');

    socket.on('connect', () => {
        console.log('Connected to server', currentRoom);
        if (currentRoom) {
            socket.emit('joinRoom', currentRoom);
        }
    });

    socket.on('connect_error', (err) => {
        console.log('Connection error:', err.message);
    });

    socket.on('peopleUpdated', (people) => {
        console.log(people, MyUsername);
        MyPlayers = people
        const div = document.createElement("div");
        Object.keys(people).forEach(username => {
            const aPerson = username == MyUsername ? username + " (You)" : username;
            const state = people[username].state

            const aPersonDiv = document.createElement("div");
            aPersonDiv.className = "person";

            if (state == 1) {
                aPersonDiv.classList.add("busy");
            }

            const nameP = document.createElement("p");
            nameP.textContent = aPerson;
            nameP.style.cursor = "pointer";

            aPersonDiv.addEventListener("click", () => pair(username));

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

    socket.on('roomJoined', (room) => {
        // currentRoom = room.id;
        // document.getElementById('current-room').textContent = currentRoom + "/" + room.people.join("/");
        gameStarts(room.checkerboard)
        document.getElementById('roomInfo').classList.remove('hidden');
        document.getElementById('game').classList.remove('hidden');
        document.getElementById('player-list').classList.add('hidden');
    });

    socket.on('roomUpdatad', (rooms) => {
        // console.log(rooms)
        if (!rooms[currentRoom]) {
            return
        }

        const div = document.createElement("div");

        // console.log(rooms[currentRoom], MyPlayers)
        Object.keys(MyPlayers).forEach(username => {
            const aPerson = username == MyUsername ? username + " (You)" : username;

            if (!rooms[currentRoom].people.includes(username)) {
                return
            }

            const aPersonDiv = document.createElement("div");
            aPersonDiv.className = "person";

            if (rooms[currentRoom].players.includes(username)) {
                aPersonDiv.classList.add("busy");
            }

            const nameP = document.createElement("p");
            nameP.textContent = aPerson;
            nameP.style.cursor = "pointer";

            // aPersonDiv.addEventListener("click", () => pair(username));

            const levelP = document.createElement("p");
            const scoreP = document.createElement("p");
            levelP.textContent = "Lv.0";
            scoreP.textContent = "9999";

            aPersonDiv.appendChild(nameP);
            aPersonDiv.appendChild(levelP);
            aPersonDiv.appendChild(scoreP);
            div.appendChild(aPersonDiv);
        })

        const peopleContainer = document.getElementById("people-in-room");
        peopleContainer.replaceChildren(...div.children);

        const p1 = rooms[currentRoom].players[0]
        const p2 = rooms[currentRoom].players[1]

        if (rooms[currentRoom].people.includes(p1) && rooms[currentRoom].people.includes(p2)) {
            const color = (p1 == MyUsername) ? 0 : 1
            if (Mystate == 0 && (rooms[currentRoom].count % 2) != color) {
                Mystate = rooms[currentRoom].count2 % 3 + 1
                MyColor = color
            }
        } else {
            Mystate = 0
        }

        console.log(Mystate, p1, p2)
        document.getElementById('current-room').textContent = `${currentRoom}`;
        document.getElementById('against-players').textContent = `${rooms[currentRoom].people.includes(p1) ? p1 : p1 + '(Offline)'} vs. ${rooms[currentRoom].people.includes(p2) ? p2 : p2 + "(Offline)"}`;
    });

    socket.on('leftRoom', () => {
        currentRoom = null;
        document.getElementById('current-room').textContent = '';
        document.getElementById('roomInfo').classList.add('hidden');
    });

    socket.on('pairRequest', (sourceName) => {

        createConfirmModal("pair request confirmation", `Do you want to accept ${sourceName}'s pair request?`, () => {
            const roomId = getRandId(12, false);
            socket.emit('acceptPair', roomId, sourceName);
            window.location.href = `/orbito/${roomId}`;
        }, () => {
            socket.emit('rejectPair', sourceName);
        })

    });

    socket.on('pairAccepted', (roomId) => {
        window.location.href = `/orbito/${roomId}`;
    });

    socket.on('pairRejected', (sourceName) => {
        createSimpleModal('Invitation declined', `"${sourceName}" refuses your invitation`)
        // alert(`${sourceName} 拒絕你的邀請`)
    });

    socket.on('invalidRoom', (roomId) => {
        createSimpleModal('invalidRoom', `This room is closed`)
        // alert("invalidRoom")
        window.location.href = `/orbito`;
    });

}

function logout() {
    fetch('/logout').then(response => {
        if (response.ok) {
            // alert('Logged out successfully');
            createSimpleModal('Logged out successfully', `"${document.getElementById('loggedUser').textContent}" has been logged out from this computer `)
            if (socket) socket.disconnect();
            document.getElementById('loggedUser').textContent = "Not Logged In";
            document.getElementById('logout').style.display = 'none';
            document.getElementById('login').style.display = 'block';
        }
    });
}

function pair(otherPlayer) {
    if (otherPlayer === MyUsername) {
        // alert("You will create a private room,You can invite friends to join through the link");
        // createSimpleModal('Create a private room', `You can invite friends to join through the link `)
        createConfirmModal('Create a private room', `You can invite friends to join through the link `, () => {
            const roomId = getRandId(12, false)
            socket.emit('creatRoom', roomId);
            window.location.href = `/orbito/${roomId}`;
        }, () => {

        })
        return

    } else {
        console.log("邀請", otherPlayer)
        createConfirmModal("Invitation confirmation", `Do you want to invite "${otherPlayer}"?`, () => {
            socket.emit('requestPair', otherPlayer);
        }, () => {

        })
    }
}

document.getElementById('leaveRoom').addEventListener('click', () => {
    if (currentRoom) {
        history.pushState({ page: 'orbito' }, "Orbito", '/orbito');//操作歷史紀錄，讓返回時觸發重新連線
        window.location.href = '/orbito';
    }
});

window.addEventListener('scroll', function () {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
    if (distanceFromBottom < 100) {
        document.getElementById('header').style.display = 'none'
    }
    if (scrollTop < 100) {
        document.getElementById('header').style.display = 'flex'
    }
});
