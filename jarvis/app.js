const API_URL = (window.JARVIS_API_URL || '').trim();
const conversation = [];
let recognition = null;
let listening = false;

const $ = id => document.getElementById(id);
const messages = $('messages');
const messagesFull = $('messagesFull');
const prompt = $('prompt');
const promptFull = $('promptFull');
const voiceStatus = $('voiceStatus');

function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

function renderMessage(text, role = 'assistant') {
  [messages, messagesFull].filter(Boolean).forEach(box => {
    const el = document.createElement('article');
    el.className = `msg ${role === 'user' ? 'user' : 'assistant'}`;
    el.innerHTML = `<div class="head"><b>${role === 'user' ? 'YOU' : 'JARVIS'}</b><time>${now()}</time></div><p></p>`;
    el.querySelector('p').textContent = text;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  });
  $('messageCount').textContent = conversation.length;
  $('memoryCount').textContent = conversation.length;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.96;
  u.pitch = 0.9;
  u.volume = 1;
  speechSynthesis.speak(u);
}

function localCommand(text) {
  const t = text.toLowerCase().trim();
  if (t === 'what can you do?') return 'I can hold a live conversation, remember the current session context, answer questions through Nemotron, speak responses aloud, run local diagnostics, and open music searches. External actions are only reported when a real tool performs them.';
  if (t === 'give me a system briefing') return 'JARVIS interface is operational. Voice input and speech output are available in this browser. The AI backend is checked separately so I never pretend a disconnected service is online.';
  if (t === 'run a diagnostics check') return `Browser diagnostics complete. API endpoint: ${API_URL ? 'configured' : 'missing'}. Speech synthesis: ${'speechSynthesis' in window ? 'available' : 'unavailable'}. Speech recognition: ${window.SpeechRecognition || window.webkitSpeechRecognition ? 'available' : 'unavailable'}.`;
  if (t === 'play music') return 'Tell me an artist, song, or genre and I will open a music search. I cannot claim playback has started unless a playback integration is connected.';
  const match = t.match(/^play\s+(.+)/);
  if (match) {
    const q = encodeURIComponent(match[1]);
    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank', 'noopener');
    return `I opened a music search for ${match[1]}.`;
  }
  return null;
}

async function backendHealth() {
  if (!API_URL) throw new Error('Backend URL is not configured');
  const started = performance.now();
  const r = await fetch(API_URL, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  $('latency').textContent = `${Math.round(performance.now() - started)} ms`;
  $('modelName').textContent = data.model || 'Nemotron Nano 12B V2 VL';
  return data;
}

async function checkBackend() {
  const badge = $('backendBadge');
  const state = $('apiState');
  badge.textContent = 'BACKEND CHECKING'; badge.className = 'badge warn';
  state.textContent = 'CHECKING';
  try {
    const data = await backendHealth();
    const good = data.ok && data.configured;
    badge.textContent = good ? 'BACKEND ONLINE' : 'SECRET MISSING';
    badge.className = `badge ${good ? 'ok' : 'warn'}`;
    state.textContent = good ? 'ONLINE' : 'NO SECRET';
    return data;
  } catch (e) {
    badge.textContent = 'BACKEND OFFLINE'; badge.className = 'badge bad';
    state.textContent = 'OFFLINE';
    $('latency').textContent = '—';
    return null;
  }
}

async function askBackend(text) {
  if (!API_URL) throw new Error('Backend URL is not configured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ message: text, messages: conversation.slice(-12) }),
      signal: controller.signal
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Backend HTTP ${r.status}`);
    return data.reply || data.message || data.output || data.choices?.[0]?.message?.content || '';
  } finally { clearTimeout(timer); }
}

async function send(text, source = 'typed') {
  const value = String(text || '').trim();
  if (!value) return;
  renderMessage(value, 'user');
  prompt.value = ''; promptFull.value = '';
  voiceStatus.textContent = source === 'voice' ? 'Thinking…' : 'Processing…';
  try {
    const local = localCommand(value);
    let reply = local;
    if (!reply) {
      conversation.push({ role: 'user', content: value });
      reply = await askBackend(value);
    }
    if (!reply) throw new Error('AI server returned an empty response');
    conversation.push({ role: 'assistant', content: reply });
    renderMessage(reply);
    speak(reply);
    voiceStatus.textContent = 'Ready — press Space or speak';
  } catch (e) {
    console.error(e);
    const message = e.name === 'AbortError' ? 'JARVIS timed out waiting for the AI server.' : `JARVIS backend error: ${e.message}`;
    renderMessage(message);
    speak(message);
    voiceStatus.textContent = 'Backend unavailable';
  }
}

function clearConversation() {
  conversation.length = 0;
  [messages, messagesFull].filter(Boolean).forEach(box => box.innerHTML = '');
  renderMessage('Conversation cleared. I am ready.');
  $('messageCount').textContent = '0'; $('memoryCount').textContent = '0';
}

function startListening() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { voiceStatus.textContent = 'Speech recognition is not supported in this browser.'; return; }
  if (listening) return;
  recognition = new SR();
  recognition.lang = 'en-US'; recognition.interimResults = false; recognition.continuous = false;
  recognition.onstart = () => { listening = true; voiceStatus.textContent = 'Listening — speak now'; $('talkBtn').querySelector('span').textContent = 'Listening…'; };
  recognition.onresult = e => send(e.results[0][0].transcript, 'voice');
  recognition.onerror = e => { console.error(e); voiceStatus.textContent = `Microphone error: ${e.error}`; };
  recognition.onend = () => { listening = false; $('talkBtn').querySelector('span').textContent = 'Start listening'; if (!voiceStatus.textContent.includes('error')) voiceStatus.textContent = 'Microphone idle'; };
  recognition.start();
}

function stopListening() { recognition?.stop(); speechSynthesis?.cancel(); listening = false; voiceStatus.textContent = 'Microphone idle'; }

function openPage(page) {
  document.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(`${page}Page`).classList.add('active');
  $('pageTitle').textContent = ({ home: 'Command Deck', chat: 'Conversation', memory: 'Session Memory', tasks: 'Task Board', system: 'System Diagnostics' })[page];
}

document.querySelectorAll('.nav').forEach(b => b.addEventListener('click', () => openPage(b.dataset.page)));
document.querySelectorAll('[data-command]').forEach(b => b.addEventListener('click', () => send(b.dataset.command)));
$('composer').addEventListener('submit', e => { e.preventDefault(); send(prompt.value); });
$('composerFull').addEventListener('submit', e => { e.preventDefault(); send(promptFull.value); });
$('talkBtn').addEventListener('click', startListening);
$('stopBtn').addEventListener('click', stopListening);
$('clearBtn').addEventListener('click', clearConversation);
$('healthBtn').addEventListener('click', checkBackend);
$('musicBtn').addEventListener('click', () => send('play music'));
document.addEventListener('keydown', e => { if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); listening ? stopListening() : startListening(); } });

$('apiUrl').textContent = API_URL || 'Not configured';
$('micStateBadge').textContent = window.SpeechRecognition || window.webkitSpeechRecognition ? 'READY' : 'UNSUPPORTED';
renderMessage('Good evening. I am JARVIS. Ask me anything, or press Start listening.');
checkBackend();
