const socket = io();
let username = '';
let inside = 30;
let doorOpen = false;

const authDiv = document.getElementById('auth');
const gameDiv = document.getElementById('game');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const authMsg = document.getElementById('authMsg');

const outsideEl = document.getElementById('outsideTemp');
const insideEl = document.getElementById('insideTemp');
const doorStateEl = document.getElementById('doorState');
const doorVisual = document.getElementById('doorVisual');
const toggleBtn = document.getElementById('toggleDoor');
const boardList = document.getElementById('boardList');

function updateUI() {
    insideEl.textContent = inside.toFixed(2);
    doorStateEl.textContent = doorOpen?'Nyitva':'Zárva';
    toggleBtn.textContent = doorOpen?'Ajtó bezárása':'Ajtó kinyitása';
    doorVisual.className = 'door '+(doorOpen?'open':'');
}

loginBtn.onclick = ()=>{
    const u=usernameInput.value.trim(), p=passwordInput.value;
    socket.emit('login',{username:u,password:p});
};
registerBtn.onclick = ()=>{
    const u=usernameInput.value.trim(), p=passwordInput.value;
    socket.emit('register',{username:u,password:p});
};

toggleBtn.onclick = ()=>{
    socket.emit('toggleDoor',{username});
};

socket.on('loginResult', d=>{
    if(d.success){
        username = usernameInput.value.trim();
        inside = d.inside;
        doorOpen = d.doorOpen;
        authDiv.style.display='none';
        gameDiv.style.display='block';
        updateUI();
    } else authMsg.textContent = d.message;
});

socket.on('registerResult', d=>{
    authMsg.textContent = d.success?'Regisztráció sikeres!':'Hiba: '+d.message;
});

socket.on('outside', d=>{
    document.getElementById('outsideTemp').textContent=d.outside.toFixed(2);
});

socket.on('leaderboard', arr=>{
    boardList.innerHTML='';
    if(!arr||arr.length==0){boardList.innerHTML='<li>Üres</li>';return;}
    for(const item of arr){
        const li=document.createElement('li');
        li.textContent=`${item.user} — ${Number(item.inside).toFixed(2)} °C`;
        boardList.appendChild(li);
        if(item.user===username) inside=item.inside;
    }
    updateUI();
});
