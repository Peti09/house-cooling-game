const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// --- JSON adatbázisok ---
const USERS_FILE = './users.json';
let users = {};
if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE));

function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// --- Kinti hőmérséklet ---
let outsideTemp = 25 + Math.random() * 10;
function randomWalk(temp) {
    const drift = (Math.random() - 0.5) * 1.2;
    if (Math.random() < 0.02) return temp + (Math.random() - 0.5) * 10;
    return temp + drift;
}
setInterval(() => {
    outsideTemp = randomWalk(outsideTemp);
    io.emit('outside', { outside: Number(outsideTemp.toFixed(2)), ts: Date.now() });
}, 2000);

// --- Helper ranglista ---
function getLeaderboardArray() {
    return Object.entries(users)
        .map(([u, d]) => ({ user: u, inside: d.inside }))
        .sort((a, b) => a.inside - b.inside)
        .slice(0, 50);
}

// --- Socket kapcsolat ---
io.on('connection', (socket) => {
    // küldés az aktuális állapotról
    socket.emit('state', {
        outside: Number(outsideTemp.toFixed(2)),
        leaderboard: getLeaderboardArray()
    });

    // --- Regisztráció ---
    socket.on('register', ({ username, password }) => {
        username = username.trim().slice(0,32);
        if (users[username]) {
            socket.emit('registerResult', { success: false, message: 'A felhasználónév már létezik' });
            return;
        }
        users[username] = { password: password, inside: 30, doorOpen: false, lastUpdated: Date.now() };
        saveUsers();
        socket.emit('registerResult', { success: true });
        io.emit('leaderboard', getLeaderboardArray());
    });

    // --- Bejelentkezés ---
    socket.on('login', ({ username, password }) => {
        username = username.trim().slice(0,32);
        if (!users[username] || users[username].password !== password) {
            socket.emit('loginResult', { success: false, message: 'Hibás felhasználónév vagy jelszó' });
            return;
        }
        socket.emit('loginResult', { success: true, inside: users[username].inside, doorOpen: users[username].doorOpen });
    });

    // --- Ajtó nyitás/zárás ---
    socket.on('toggleDoor', ({ username }) => {
        if (!users[username]) return;
        users[username].doorOpen = !users[username].doorOpen;
        saveUsers();
    });

    // --- Szerver számolja a benti hőmérsékletet ---
    setInterval(() => {
        for (const [username, u] of Object.entries(users)) {
            if (u.doorOpen) {
                const diff = outsideTemp - u.inside;
                u.inside += diff * 0.02;
                u.lastUpdated = Date.now();
            }
        }
        io.emit('leaderboard', getLeaderboardArray());
    }, 200);

});
server.listen(PORT, () => console.log(`Szerver fut: http://localhost:${PORT}`));
