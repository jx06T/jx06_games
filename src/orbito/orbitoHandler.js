const authMiddleware = require('../authMiddleware');

module.exports = function (io) {
    let people = {}
    // let rooms = { 842551332708: { id: 842551332708, people: [], players: [], playerLimit: 2 } }
    let rooms = {}
    const orbitoIo = io.of('/orbito');

    const newRoom = { people: [], players: [], playerLimit: 2, count2: 0, count: 0, checkerboard: [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]] }

    const rotationMatrix = (matrix) => {
        const n = matrix.length;
        const rotatedMatrix = [];

        for (let i = 0; i < n; i++) {
            rotatedMatrix.push([]);
        }

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const t = getPreviousCoordinate(i, j)
                // console.log(i, j, t)
                rotatedMatrix[i][j] = matrix[t[0]][t[1]];
            }
        }

        return rotatedMatrix;
    }

    const getPreviousCoordinate = (x, y, t = 1) => {
        const big = [
            [0, 0],
            [0, 1],
            [0, 2],
            [0, 3],
            [1, 3],
            [2, 3],
            [3, 3],
            [3, 2],
            [3, 1],
            [3, 0],
            [2, 0],
            [1, 0],
            [0, 0]
        ]
        const small = [
            [1, 1],
            [1, 2],
            [2, 2],
            [2, 1],
            [1, 1],
        ]
        if (small.some(item => item[0] == x && item[1] == y)) {
            return small[small.findIndex((item, i) => item[0] == x && item[1] == y && (t == 1 || i != 0)) + t]
        } else {
            return big[big.findIndex((item, i) => item[0] == x && item[1] == y && (t == 1 || i != 0)) + t]
        }
    }

    orbitoIo.use(authMiddleware);
    orbitoIo.on('connection', (socket) => {
        console.log('User connected to Orbito:', socket.decoded.username);
        people[socket.decoded.username] = { name: socket.decoded.username, socketId: socket.id };

        socket.on('getPeople', () => {
            console.log('getPeople');
            orbitoIo.emit('peopleUpdated', people);

        });

        socket.on('requestPair', targetName => {
            const playerName = socket.decoded.username
            const target = people[targetName].socketId;
            if (target) {
                orbitoIo.to(target).emit('pairRequest', playerName);
            }
        });

        socket.on('acceptPair', (roomId, sourceName) => {
            console.log(sourceName)
            const playerName = socket.decoded.username

            rooms[roomId] = { ...newRoom, id: roomId }

            const target = people[sourceName].socketId;
            orbitoIo.to(target).emit('pairAccepted', roomId);
        });

        socket.on('rejectPair', (sourceName) => {
            const playerName = socket.decoded.username
            const target = people[sourceName].socketId;
            orbitoIo.to(target).emit('pairRejected', playerName);
        });

        socket.on('creatRoom', roomId => {
            rooms[roomId] = { ...newRoom, id: roomId }

            orbitoIo.emit('roomUpdatad', rooms);
        });

        socket.on('joinRoom', roomId => {
            const playerName = socket.decoded.username
            const target = people[playerName].socketId;

            if (!rooms[roomId] && roomId == "000000000000") {
                rooms[roomId] = { ...newRoom, id: roomId }
            }

            const currentRoom = rooms[roomId]

            if (!currentRoom) {
                orbitoIo.to(target).emit('invalidRoom', roomId);
                return
            }

            if (!currentRoom.people.includes(playerName)) {
                currentRoom.people.push(playerName)
                console.log("!!", currentRoom.players, currentRoom.playerLimit)
            }
            if (currentRoom.players.length < currentRoom.playerLimit && !currentRoom.players.includes(playerName)) {
                currentRoom.players.push(playerName)
                console.log("!!?")
            }

            orbitoIo.to(target).emit('roomJoined', currentRoom);

            people[playerName].state = 1
            people[playerName].room = roomId

            orbitoIo.emit('roomUpdatad', rooms);
            orbitoIo.emit('peopleUpdated', people);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected from Orbito:', socket.decoded.username);
            const playerName = socket.decoded.username
            const player = people[playerName]

            if (player && player.room && rooms[player.room]) {
                const room = rooms[player.room]
                room.people = room.people.filter(e => e != playerName)
                // room.players = room.players.filter(e => e != playerName)

                if (room.people.length == 0) {
                    delete rooms[player.room]
                }
                console.log("leaveRoom", player, rooms);
            }

            delete people[playerName]

            orbitoIo.emit('roomUpdatad', rooms);
            orbitoIo.emit('peopleUpdated', people);
        });

        // ---------------------------------------------------------------------

        socket.on('movePiece', (x, y, nx, ny) => {
            const playerName = socket.decoded.username
            const roomId = people[playerName].room;
            const players = rooms[roomId].players;
            const color = players.indexOf(playerName)

            if (!players.includes(playerName) || rooms[roomId].count % 2 == color || rooms[roomId].count2 % 3 + 1 != 1) {
                console.log("數據竄改")
                return
            }

            const checkerboard = rooms[roomId].checkerboard;

            console.log(x, y, nx, ny)
            console.log(checkerboard[y][x] == -1, checkerboard[ny][nx] != -1, Math.abs(ny - y) != 1, Math.abs(nx - x) != 1, (Math.abs(ny - y) == 1 && Math.abs(nx - x) == 1))

            if (checkerboard[y][x] == -1 || checkerboard[ny][nx] != -1 || Math.abs(ny - y) > 1 || Math.abs(nx - x) > 1 || (Math.abs(ny - y) == 1 && Math.abs(nx - x) == 1)) {
                console.log("蝦")
                return
            }

            rooms[roomId].count2 += 1;

            checkerboard[ny][nx] = checkerboard[y][x]
            checkerboard[y][x] = -1

            const otherName = players.find(e => e != playerName)
            const target = people[otherName].socketId;
            orbitoIo.to(target).emit('pieceMoved', checkerboard, x, y, nx, ny, color);

            console.log(rooms[roomId], roomId, players, playerName, otherName, checkerboard, "mp")
        });

        socket.on('skipMovePiece', () => {
            const playerName = socket.decoded.username
            const roomId = people[playerName].room;
            const players = rooms[roomId].players;
            const color = players.indexOf(playerName)

            if (!players.includes(playerName) || rooms[roomId].count % 2 == color || rooms[roomId].count2 % 3 + 1 != 1) {
                console.log("數據竄改")
                return
            }

            rooms[roomId].count2 += 1;

            console.log(rooms[roomId], roomId, players, playerName, "smp")
        });

        socket.on('putPiece', (x, y) => {
            const playerName = socket.decoded.username
            const roomId = people[playerName].room;
            const players = rooms[roomId].players;
            const color = players.indexOf(playerName)

            if (!players.includes(playerName) || rooms[roomId].count % 2 == color || rooms[roomId].count2 % 3 + 1 != 2) {
                console.log("數據竄改")
                return
            }

            const checkerboard = rooms[roomId].checkerboard;

            if (checkerboard[y][x] != -1) {
                console.log("蝦")
                return
            }

            rooms[roomId].count2 += 1;

            checkerboard[y][x] = players.indexOf(playerName)

            const otherName = players.find(e => e != playerName)
            const target = people[otherName].socketId;
            orbitoIo.to(target).emit('piecePut', checkerboard, x, y, color);

            console.log(rooms[roomId], roomId, players, playerName, otherName, checkerboard, "pp")
        });

        socket.on('rotatePiece', () => {
            const playerName = socket.decoded.username
            const roomId = people[playerName].room;
            const players = rooms[roomId].players;
            const color = players.indexOf(playerName)

            console.log(!players.includes(playerName), rooms[roomId].count % 2 == color, rooms[roomId].count2 % 3 + 1 != 3)
            if (!players.includes(playerName) || rooms[roomId].count % 2 == color || rooms[roomId].count2 % 3 + 1 != 3) {
                console.log("數據竄改")
                return
            }

            rooms[roomId].count += 1;
            rooms[roomId].count2 += 1;

            const checkerboard = rooms[roomId].checkerboard
            rooms[roomId].checkerboard = rotationMatrix(rooms[roomId].checkerboard)

            const otherName = players.find(e => e != playerName)
            const target = people[otherName].socketId;
            orbitoIo.to(target).emit('pieceRotated', checkerboard);
            orbitoIo.to(target).emit('roomUpdatad', rooms);

            console.log("rp", rooms[roomId].checkerboard)
        });

    });
};