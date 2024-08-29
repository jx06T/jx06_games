const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; 

function authMiddleware(socket, next) {
    const token = socket.handshake.headers.cookie?.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error('JWT verification failed:', err);
                return next(new Error('Authentication error'));
            }
            socket.decoded = decoded;
            next();
        });
    } else {
        console.error('No token found in cookie');
        next(new Error('Authentication error'));
    }
}

module.exports = authMiddleware;