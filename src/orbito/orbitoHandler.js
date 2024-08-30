const authMiddleware = require('../authMiddleware');

function getRandId(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = chars.length;
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

module.exports = function (io) {
    let people = {}
    let rooms = {}
    const orbitoIo = io.of('/orbito');

    orbitoIo.use(authMiddleware);
    orbitoIo.on('connection', (socket) => {
        console.log('User connected to Orbito:', socket.decoded.username);
        people[socket.decoded.username] = { name: socket.decoded.username, socketId: socket.id };
        // people.push({ name: socket.decoded.username })

        socket.on('getPeople', () => {
            console.log('getPeople');
            orbitoIo.emit('updatePeople', people);

        });

        socket.on('requestPair', (sourceName, targetName) => {
            const target = people[targetName].socketId;
            if (target) {
                orbitoIo.to(target).emit('pairRequest', { sourceName: sourceName, state: 0 });
            }
        });

        socket.on('acceptPair', ({ sourceName, roomId, me }) => {
            rooms[roomId] = { id: roomId, people: [] }
            const target = people[sourceName].socketId;
            orbitoIo.to(target).emit('pairAccepted', roomId);

        });

        socket.on('rejectPair', ({ sourceName, me }) => {
            const target = people[sourceName].socketId;
            console.log("拒絕", sourceName, me)
            orbitoIo.to(target).emit('pairRejected', me);
        });

        socket.on('creatRoom', (sourceName, roomId) => {
            rooms[roomId] = { id: roomId, people: [] }
            console.log('getPeople');
            orbitoIo.emit('updatePeople', people);
        });

        socket.on('joinRoom', (sourceName, roomId) => {
            const target = people[sourceName].socketId;
            console.log('joinRoom', sourceName, roomId, rooms[roomId]);

            if (!rooms[roomId]) {
                orbitoIo.to(target).emit('invalidRoom', roomId);
                return
            }

            if (!rooms[roomId].people.includes(sourceName)) {
                rooms[roomId].people.push(sourceName)
            }
            console.log('joinRoom', sourceName, roomId, rooms[roomId]);


            orbitoIo.to(target).emit('joinedRoom', rooms[roomId]);
            people[sourceName].state = 1
            people[sourceName].room = roomId
            orbitoIo.emit('updataRoomInfo', rooms);
            orbitoIo.emit('updatePeople', people);
        });

        // socket.on('leaveRoom', (sourceName, roomId) => {
        //     console.log("leaveRoom", rooms[roomId], sourceName, roomId);
        //     if (!rooms[roomId]) {
        //         return
        //     }

        //     rooms[roomId].people = rooms[roomId].people.filter(e => e != sourceName)
        //     console.log("leaveRoom", rooms[roomId].people, sourceName, roomId);

        //     if (rooms[roomId].people.length==0) {
        //         delete rooms[roomId]
        //         console.log("!!")
        //     }
        //     orbitoIo.emit('updataRoomInfo', rooms);
        // });

        socket.on('disconnect', () => {
            console.log('User disconnected from Orbito:', socket.decoded.username);
            const playerName = socket.decoded.username

            if (people[playerName] && people[playerName].room && rooms[people[playerName].room]) {
                const room = rooms[people[playerName].room]
                room.people = room.people.filter(e => e != playerName)
                console.log("leaveRoom", people[playerName].room, playerName, room);

                if (room.people.length == 0) {
                    console.log("!!0")
                    delete rooms[people[playerName].room]
                }
            }
            // people = people.filter(e => e.name !== socket.decoded.username)
            delete people[playerName]
            orbitoIo.emit('updataRoomInfo', rooms);
            orbitoIo.emit('updatePeople', people);
        });
    });
};