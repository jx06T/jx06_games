const authMiddleware = require('../authMiddleware');

function getCurrentDateTime() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}


module.exports = function (io) {
    let people = {}
    // let rooms = { 842551332708: { id: 842551332708, people: [], players: [], playerLimit: 2 } }
    let rooms = {}
    const orbitoIo = io.of('/orbito');

    // const newRoom = { people: [], players: [], playerLimit: 2, over: false, count2: 0, count: 0, checkerboard: [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]] }
    const newRoom = Object.freeze({
        people: [],
        players: [],
        playerLimit: 2,
        over: false,
        count2: 0,
        count: 0,
        checkerboard: [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]]
    });

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

    const getPlayerDetails = (username) => {
        const playerName = username
        const source = people[playerName].socketId
        const roomId = people[playerName].room;
        const room = rooms[roomId];
        const players = room.players;
        const color = players.indexOf(playerName)

        return { playerName, source, roomId, room, players, color };
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

            rooms[roomId] = { ...JSON.parse(JSON.stringify(newRoom)), id: roomId }

            const target = people[sourceName].socketId;
            orbitoIo.to(target).emit('pairAccepted', roomId);
        });

        socket.on('rejectPair', (sourceName) => {
            const playerName = socket.decoded.username
            const target = people[sourceName].socketId;
            orbitoIo.to(target).emit('pairRejected', playerName);
        });

        socket.on('creatRoom', roomId => {
            rooms[roomId] = { ...JSON.parse(JSON.stringify(newRoom)), id: roomId }

            orbitoIo.emit('roomUpdatad', rooms);
        });

        socket.on('joinRoom', roomId => {
            const playerName = socket.decoded.username
            const target = people[playerName].socketId;

            if (roomId == "000000000000") {
                rooms[roomId] = { ...JSON.parse(JSON.stringify(newRoom)), id: roomId }
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
            const { playerName, source, roomId, room, players, color } = getPlayerDetails(socket.decoded.username);

            if (!players.includes(playerName) || room.count % 2 == color || room.count2 % 3 + 1 != 1) {
                orbitoIo.to(source).emit('actIllegal', { source: playerName, event: "movePiece", time: getCurrentDateTime(), errorType: "Authentication or status error" });
                console.log("數據竄改")
                return
            }

            const checkerboard = room.checkerboard;

            console.log(x, y, nx, ny)
            console.log(checkerboard[y][x] == -1, checkerboard[ny][nx] != -1, Math.abs(ny - y) != 1, Math.abs(nx - x) != 1, (Math.abs(ny - y) == 1 && Math.abs(nx - x) == 1))

            if (checkerboard[y][x] == -1 || checkerboard[ny][nx] != -1 || Math.abs(ny - y) > 1 || Math.abs(nx - x) > 1 || (Math.abs(ny - y) == 1 && Math.abs(nx - x) == 1)) {
                orbitoIo.to(source).emit('actIllegal', { source: playerName, event: "movePiece", time: getCurrentDateTime(), errorType: "Request content error" });
                console.log("蝦")
                return
            }

            room.count2 += 1;

            checkerboard[ny][nx] = checkerboard[y][x]
            checkerboard[y][x] = -1

            // const otherName = players.find(e => e != playerName)

            room.people.forEach(otherName => {
                const target = people[otherName].socketId;
                orbitoIo.to(target).emit('roomUpdatad', rooms);
                orbitoIo.to(target).emit('pieceMoved', checkerboard, x, y, nx, ny, color);
            });

            console.log(room, roomId, players, playerName, checkerboard, "mp")
        });

        socket.on('skipMovePiece', () => {
            const { playerName, source, roomId, room, players, color } = getPlayerDetails(socket.decoded.username);

            if (!players.includes(playerName) || room.count % 2 == color || room.count2 % 3 + 1 != 1) {
                orbitoIo.to(source).emit('actIllegal', { source: playerName, event: "skipMovePiece", time: getCurrentDateTime(), errorType: "Authentication or status error" });
                console.log("數據竄改")
                return
            }

            room.count2 += 1;

            console.log(room, roomId, players, playerName, "smp")
        });

        socket.on('again', () => {
            const { playerName, source, roomId, room, players, color } = getPlayerDetails(socket.decoded.username);
            console.log(room, roomId, players, playerName, "aga")

            if (!players.includes(playerName) || !room.over) {
                orbitoIo.to(source).emit('actIllegal', { source: playerName, event: "again", time: getCurrentDateTime(), errorType: "Authentication or status error" });
                console.log("數據竄改")
                return
            }

            room.count2 = 0;
            room.over = false;
            room.count = 0;
            room.checkerboard = [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]];

            room.people.forEach(otherName => {
                const target = people[otherName].socketId;
                orbitoIo.to(target).emit('roomUpdatad', rooms);
                orbitoIo.to(target).emit('reset');
            })

            console.log(room, roomId, players, playerName, "aga")
        });

        socket.on('exchange', () => {
            const { playerName, source, roomId, room, players, color } = getPlayerDetails(socket.decoded.username);

            if (!players.includes(playerName)) {
                orbitoIo.to(source).emit('actIllegal', { source: playerName, event: "skipMovePiece", time: getCurrentDateTime(), errorType: "Authentication or status error" });
                console.log("數據竄改")
                return
            }

            room.players = [players[1], players[0]];
            room.count2 = 0;
            room.over = false;
            room.count = 0;
            room.checkerboard = [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]];

            room.people.forEach(otherName => {
                const target = people[otherName].socketId;
                orbitoIo.to(target).emit('roomUpdatad', rooms);
                orbitoIo.to(target).emit('reset');
            })

            console.log(room, roomId, players, playerName, "exc")
        });

        socket.on('giveUp', () => {
            const playerName = socket.decoded.username
            const source = people[playerName].socketId
            const roomId = people[playerName].room;
            const room = rooms[roomId];
            const players = room.players;
            const color = players.indexOf(playerName)

            if (!players.includes(playerName) || room.count % 2 == color || room.count2 % 3 + 1 != 1) {
                orbitoIo.to(source).emit('actIllegal', { source: playerName, event: "skipMovePiece", time: getCurrentDateTime(), errorType: "Authentication or status error" });
                console.log("數據竄改")
                return
            }

            console.log(room, roomId, players, playerName, "gu")
        });

        socket.on('putPiece', (x, y) => {
            const { playerName, source, roomId, room, players, color } = getPlayerDetails(socket.decoded.username);

            if (!players.includes(playerName) || room.count % 2 == color || room.count2 % 3 + 1 != 2) {
                console.log("數據竄改")
                orbitoIo.to(source).emit('actIllegal', { source: playerName, event: "putPiece", time: getCurrentDateTime(), errorType: "Authentication or status error" });
                return
            }

            const checkerboard = room.checkerboard;

            if (checkerboard[y][x] != -1) {
                orbitoIo.to(source).emit('actIllegal', { source: playerName, event: "putPiece", time: getCurrentDateTime(), errorType: "Request content error" });
                console.log("蝦")
                return
            }

            room.count2 += 1;

            checkerboard[y][x] = players.indexOf(playerName)

            room.people.forEach(otherName => {
                const target = people[otherName].socketId;
                orbitoIo.to(target).emit('roomUpdatad', rooms);
                orbitoIo.to(target).emit('piecePut', checkerboard, x, y, color);
            })

            console.log(room, roomId, players, playerName, checkerboard, "pp")
        });

        socket.on('rotatePiece', () => {
            const { playerName, source, roomId, room, players, color } = getPlayerDetails(socket.decoded.username);

            console.log(!players.includes(playerName), room.count % 2 == color, room.count2 % 3 + 1 != 3)
            if (!players.includes(playerName) || room.count % 2 == color || room.count2 % 3 + 1 != 3) {
                orbitoIo.to(source).emit('actIllegal', { source: playerName, event: "rotatePiece", time: getCurrentDateTime(), errorType: "Authentication or status error" });
                console.log("數據竄改")
                return
            }

            room.count += 1;
            room.count2 += 1;

            if (room.count2 == 48) {
                confirmationEnds(room)
                console.log("!!!")
            }

            const pCheckerboard = JSON.parse(JSON.stringify(room.checkerboard));
            room.checkerboard = rotationMatrix(room.checkerboard)

            // const otherName = players.find(e => e != playerName)
            room.people.forEach(otherName => {
                const target = people[otherName].socketId;
                orbitoIo.to(target).emit('pieceRotated', room.checkerboard, pCheckerboard);
                orbitoIo.to(target).emit('roomUpdatad', rooms);
            })

            const check = checkGameOver(room.checkerboard)
            if (check !== "N") {
                room.over = true
                setTimeout(() => {
                    room.people.forEach(otherName => {
                        const target = people[otherName].socketId;
                        orbitoIo.to(target).emit('gameOver', check);
                    })
                }, 1000);
            }

            console.log("rp", room.checkerboard, pCheckerboard)
        });

    });

    const confirmationEnds = (room) => {
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {

                if (i == 5) {
                    room.people.forEach(otherName => {
                        const target = people[otherName].socketId;
                        orbitoIo.to(target).emit('gameOver', "T");
                    })
                    return
                }

                if (room.over == true) {
                    return
                }

                console.log(i, room)

                const pCheckerboard = JSON.parse(JSON.stringify(room.checkerboard));
                room.checkerboard = rotationMatrix(room.checkerboard)

                room.people.forEach(otherName => {
                    const target = people[otherName].socketId;
                    orbitoIo.to(target).emit('roomUpdatad', rooms);
                    orbitoIo.to(target).emit('pieceRotated', room.checkerboard, pCheckerboard);
                })

                const check = checkGameOver(room.checkerboard)
                if (check !== "N") {
                    room.over = true
                    setTimeout(() => {
                        room.people.forEach(otherName => {
                            const target = people[otherName].socketId;
                            orbitoIo.to(target).emit('gameOver', check);
                        })
                    }, 500);
                }

                console.log("ce", room.checkerboard, pCheckerboard)

            }, 1000 * i);
        }

    }

    const checkGameOver = (board) => {
        let W = 0
        let B = 0

        // 檢查行
        for (let i = 0; i < 4; i++) {
            let blackCount = 0;
            let whiteCount = 0;
            for (let j = 0; j < 4; j++) {
                if (board[i][j] === 0) {
                    blackCount++;
                    whiteCount = 0;
                } else if (board[i][j] === 1) {
                    whiteCount++;
                    blackCount = 0;
                } else {
                    blackCount = 0;
                    whiteCount = 0;
                }
                if (blackCount === 4) {
                    B++
                } else if (whiteCount === 4) {
                    W++
                }
            }
        }

        // 檢查列
        for (let i = 0; i < 4; i++) {
            let blackCount = 0;
            let whiteCount = 0;
            for (let j = 0; j < 4; j++) {
                if (board[j][i] === 0) {
                    blackCount++;
                    whiteCount = 0;
                } else if (board[j][i] === 1) {
                    whiteCount++;
                    blackCount = 0;
                } else {
                    blackCount = 0;
                    whiteCount = 0;
                }
                if (blackCount === 4) {
                    B++
                } else if (whiteCount === 4) {
                    W++
                }
            }
        }

        // 檢查對角線
        let blackCount = 0;
        let whiteCount = 0;
        for (let i = 0; i < 4; i++) {
            if (board[i][i] === 0) {
                blackCount++;
                whiteCount = 0;
            } else if (board[i][i] === 1) {
                whiteCount++;
                blackCount = 0;
            } else {
                blackCount = 0;
                whiteCount = 0;
            }
            if (blackCount === 4) {
                B++
            } else if (whiteCount === 4) {
                W++
            }
        }

        blackCount = 0;
        whiteCount = 0;
        for (let i = 0; i < 4; i++) {
            if (board[i][3 - i] === 0) {
                blackCount++;
                whiteCount = 0;
            } else if (board[i][3 - i] === 1) {
                whiteCount++;
                blackCount = 0;
            } else {
                blackCount = 0;
                whiteCount = 0;
            }
            if (blackCount === 4) {
                B++
            } else if (whiteCount === 4) {
                W++
            }
        }

        if (B == 0 && W == 0) {
            return "N";
        } else if (B > 0 && W == 0) {
            return "B";
        } else if (B == 0 && W > 0) {
            return "W";
        } else if (B > 0 && W > 0) {
            return "T";
        }

    }
};
