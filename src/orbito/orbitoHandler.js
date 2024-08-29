const authMiddleware = require('../authMiddleware');

module.exports = function (io) {
    let people = []
    const orbitoIo = io.of('/orbito');

    orbitoIo.use(authMiddleware);
    orbitoIo.on('connection', (socket) => {
        console.log('User connected to Orbito:', socket.decoded.username);
        people.push({ name: socket.decoded.username })

        socket.on('getPeople', () => {
            console.log('getPeople');
            orbitoIo.emit('updatePeople', people);

        });

        socket.on('disconnect', () => {
            console.log('User disconnected from Orbito:', socket.decoded.username);
            people = people.filter(e => e.name !== socket.decoded.username)
            orbitoIo.emit('updatePeople', people);
        });
    });
};