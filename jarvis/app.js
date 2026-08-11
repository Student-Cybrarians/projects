const views = { command: 'Command Center', memory: 'Memory', systems: 'Systems', tasks: 'Tasks' };
const nav = document.querySelectorAll('.nav-item');
const viewEls = document.querySelectorAll('.view');
const title = document.querySelector('#viewTitle');
const messages = document.querySelector('#messages');
const prompt = document.querySelector('#prompt');
const composer = document.querySelector('#composer');
const state = document.querySelector('#voiceState');
const talk = document.querySelector('#talkBtn');
const API_URL = (window.JARVIS_API_URL || '').trim();
const conversation = [];

nav.forEach(btn => btn.addEventListener('click', () => {
  nav.forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  viewEls.forEach(v => v.classList.remove('active-view'));
  document.querySelector('#' + btn.dataset.view + 'View').classList.add('active-view');
  title.textContent = btn.dataset.view === 'command' ? 'Good evening, Cybrarian.' : views[btn.dataset.view] + '.';
}));

function addMessage(text, type = 'jarvis') {
  const wrap = document.createElement('div');
  wrap.className = 'message ' + type;
  wrap.innerHTML = type === 'jarvis'
    ? `<div class="message-head"><span class="mini-orb">J</span><strong>JARVIS</strong><time>NOW</time></div><p></p>`
    : `<div class="message-head"><strong>YOU</strong><time>NOW</time></div><p></p>`;
  wrap.querySelector('p').textContent = text;
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
  return wrap;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.96;
  u.pitch = 0.92;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

async function askBackend(value) {
  if (!API_URL) throw new Error('Backend URL is not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ message: value, messages: conversation.slice(-12) }),
      signal: controller.signal
    });

    let data = {};
    try { data = await r.json(); } catch {}
    if (!r.ok) throw new Error(data?.error || `Backend returned HTTP ${r.status}`);
    return data.reply || data.message || data.output || data.choices?.[0]?.message?.content;
  } finally {
    clearTimeout(timeout);
  }
}

function runLocalAction(value) {
  const text = value.toLowerCase().trim();

  if (text === 'give me a system briefing') return 'All systems nominal. Core services are online, memory is synchronized, and the automation bridge is standing by.';
  if (text === 'what should i focus on next?') return 'Your highest-leverage next move is to finish the tomorrow briefing. I can structure it around priorities, blockers, and decisions.';
  if (text === 'run a diagnostics check') return 'Diagnostics complete. CPU, memory, network, voice interface, and memory index are operating within normal parameters.';
  if (text === 'play music') return 'Certainly. Tell me an artist, song, playlist, or genre and I can open a music search for it.';

  const play = text.match(/^play (.+)$/);
  if (play && play[1] && !text.startsWith('play music')) {
    const query = encodeURIComponent(play[1]);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank', 'noopener');
    return `Opening a music search for ${play[1]}.`;
  }

  return null;
}

async function send(text) {
  const value = text.trim();
  if (!value) return;

  addMessage(value, 'user');
  prompt.value = '';
  state.textContent = 'Processing command…';

  try {
    const localReply = runLocalAction(value);
    let reply = localReply;

    if (!reply) {
      conversation.push({ role: 'user', content: value });
      reply = await askBackend(value);
    }

    if (!reply) throw new Error('The AI server returned an empty response');

    conversation.push({ role: 'assistant', content: reply });
    addMessage(reply);
    speak(reply);
    state.textContent = 'Listening for your command';
  } catch (error) {
    console.error('JARVIS request failed:', error);
    let message = 'JARVIS cannot reach the AI server right now.';
    if (!API_URL) message = 'JARVIS backend URL is not configured.';
    else if (error?.name === 'AbortError') message = 'JARVIS timed out waiting for the AI server.';
    else if (error?.message) message = `JARVIS backend error: ${error.message}`;
    addMessage(message);
    speak(message);
    state.textContent = 'Backend unavailable';
  }
}

composer.addEventListener('submit', e => { e.preventDefault(); send(prompt.value); });
document.querySelectorAll('[data-command]').forEach(b => b.addEventListener('click', () => send(b.dataset.command)));
document.querySelector('#clearChat').addEventListener('click', () => {
  conversation.length = 0;
  messages.innerHTML = '<div class="message jarvis"><div class="message-head"><span class="mini-orb">J</span><strong>JARVIS</strong><time>NOW</time></div><p>Conversation cleared. Ready when you are.</p></div>';
});

let listening = false;
let recognition = null;
function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    const msg = 'Voice input is not supported by this browser. You can still type to JARVIS.';
    addMessage(msg); speak(msg); return;
  }
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onstart = () => {
    listening = true;
    talk.querySelector('span:last-of-type').textContent = 'Listening…';
    state.textContent = 'Microphone active — speak your command';
  };
  recognition.onresult = e => send(e.results[0][0].transcript);
  recognition.onerror = e => { console.error('Speech recognition error:', e); state.textContent = 'Voice input error'; };
  recognition.onend = () => {
    listening = false;
    talk.querySelector('span:last-of-type').textContent = 'Activate JARVIS';
    if (state.textContent !== 'Processing command…') state.textContent = 'Listening for your command';
  };
  recognition.start();
}

talk.addEventListener('click', () => {
  if (listening) { recognition?.stop(); return; }
  startListening();
});

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && document.activeElement !== prompt) {
    e.preventDefault(); talk.click();
  }
});

setInterval(() => {
  const n = Math.floor(20 + Math.random() * 15);
  const cpu = document.querySelector('#cpu');
  if (cpu) { cpu.textContent = n + '%'; cpu.nextElementSibling.firstElementChild.style.width = n + '%'; }
}, 3000);
