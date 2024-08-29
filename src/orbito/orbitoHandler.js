const authMiddleware = require('../authMiddleware');

module.exports = function (io) {
    const orbitoIo = io.of('/orbito');
    
    orbitoIo.use(authMiddleware);
    orbitoIo.on('connection', (socket) => {
        console.log('User connected to Orbito:', socket.decoded.username);

        socket.on('orbitoMove', (data) => {
            console.log('Orbito move:', data);
            // 處理移動邏輯並廣播
            orbitoIo.emit('orbitoUpdate', { /* 更新數據 */ });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected from Orbito:', socket.decoded.username);
        });
    });
};