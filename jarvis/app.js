const views={command:'Command Center',memory:'Memory',systems:'Systems',tasks:'Tasks'};
const nav=document.querySelectorAll('.nav-item');
const viewEls=document.querySelectorAll('.view');
const title=document.querySelector('#viewTitle');
nav.forEach(btn=>btn.addEventListener('click',()=>{nav.forEach(x=>x.classList.remove('active'));btn.classList.add('active');viewEls.forEach(v=>v.classList.remove('active-view'));document.querySelector('#'+btn.dataset.view+'View').classList.add('active-view');title.textContent=btn.dataset.view==='command'?'Good evening, Cybrarian.':views[btn.dataset.view]+'.';}));

const messages=document.querySelector('#messages');
const prompt=document.querySelector('#prompt');
const composer=document.querySelector('#composer');
const state=document.querySelector('#voiceState');

// Never put the NVIDIA API key in this browser bundle.
const API_URL=window.JARVIS_API_URL||'/api/chat';
const localCommands={
  'play music':()=>({reply:'What would you like to listen to? You can say an artist, song, playlist, or genre.',action:'music'}),
  'give me a system briefing':()=>({reply:'All systems nominal. Core services are online, memory is synchronized, and the automation bridge is standing by.'}),
  'what should i focus on next?':()=>({reply:'Your highest-leverage next move is to finish the tomorrow briefing. I can structure it around priorities, blockers, and decisions.'}),
  'run a diagnostics check':()=>({reply:'Diagnostics complete. CPU, memory, network, voice interface, and memory index are operating within normal parameters.'})
};

// Live voice output: JARVIS speaks every assistant response using the browser's
// native speech engine. No voice API key is required.
let voiceEnabled=true;
let speaking=false;
function speak(text){
  if(!voiceEnabled||!('speechSynthesis' in window)||!text)return;
  window.speechSynthesis.cancel();
  const clean=text.replace(/[*_`#>]/g,' ').replace(/\s+/g,' ').trim();
  const utterance=new SpeechSynthesisUtterance(clean);
  utterance.lang='en-US';
  utterance.rate=0.98;
  utterance.pitch=0.88;
  utterance.volume=1;
  utterance.onstart=()=>{speaking=true;state.textContent='JARVIS is speaking…';};
  utterance.onend=()=>{speaking=false;state.textContent=listening?'Microphone active — speak your command':'Voice ready — press Activate JARVIS';};
  utterance.onerror=()=>{speaking=false;state.textContent='Voice ready — press Activate JARVIS';};
  window.speechSynthesis.speak(utterance);
}

function addMessage(text,type='jarvis',shouldSpeak=false){
  const wrap=document.createElement('div');wrap.className='message '+type;
  wrap.innerHTML=type==='jarvis'?`<div class="message-head"><span class="mini-orb">J</span><strong>JARVIS</strong><time>NOW</time></div><p></p>`:`<div class="message-head"><strong>YOU</strong><time>NOW</time></div><p></p>`;
  wrap.querySelector('p').textContent=text;
  messages.appendChild(wrap);messages.scrollTop=messages.scrollHeight;
  if(type==='jarvis'&&shouldSpeak)speak(text);
}

async function askBackend(value){
  const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:value})});
  if(!response.ok)throw new Error(`Backend returned ${response.status}`);
  const data=await response.json();
  return data.reply||data.message||data.output||data.choices?.[0]?.message?.content;
}

async function send(text){
  const value=text.trim();if(!value)return;
  addMessage(value,'user');prompt.value='';state.textContent='Processing command…';
  const key=value.toLowerCase();
  const local=localCommands[key];
  if(local){
    const result=local();
    addMessage(result.reply,'jarvis',true);
    return;
  }
  try{
    const reply=await askBackend(value);
    if(!reply)throw new Error('Empty response');
    addMessage(reply,'jarvis',true);
    state.textContent='Voice ready — press Activate JARVIS';
  }catch(error){
    console.error(error);
    const fallback='I cannot reach my AI backend yet. The voice interface is working, but the server-side NVIDIA connection needs to be configured.';
    addMessage(fallback,'jarvis',true);
    state.textContent='Backend not connected';
  }
}

composer.addEventListener('submit',e=>{e.preventDefault();send(prompt.value)});
document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>send(b.dataset.command)));
document.querySelector('#clearChat').addEventListener('click',()=>{window.speechSynthesis?.cancel();messages.innerHTML='<div class="message jarvis"><div class="message-head"><span class="mini-orb">J</span><strong>JARVIS</strong><time>NOW</time></div><p>Conversation cleared. Ready when you are.</p></div>';});

let listening=false;
let recognition=null;
const talk=document.querySelector('#talkBtn');
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;

function stopListening(){
  listening=false;
  if(recognition){try{recognition.stop();}catch(e){}}
  talk.querySelector('span:last-of-type').textContent='Activate JARVIS';
  state.textContent='Voice ready — press Activate JARVIS';
}

function startListening(){
  if(!SpeechRecognition){
    state.textContent='Live voice input is not supported by this browser';
    return;
  }
  listening=true;
  recognition=new SpeechRecognition();
  recognition.lang='en-US';
  recognition.continuous=false;
  recognition.interimResults=false;
  recognition.maxAlternatives=1;
  recognition.onstart=()=>{talk.querySelector('span:last-of-type').textContent='Listening…';state.textContent='Microphone active — speak to JARVIS';};
  recognition.onresult=e=>{const heard=e.results[0][0].transcript;send(heard);};
  recognition.onerror=e=>{console.warn('Speech recognition:',e.error);if(e.error==='not-allowed'||e.error==='service-not-allowed'){state.textContent='Microphone permission is required';}else state.textContent='Voice input stopped — press Activate JARVIS';listening=false;talk.querySelector('span:last-of-type').textContent='Activate JARVIS';};
  recognition.onend=()=>{if(listening){listening=false;talk.querySelector('span:last-of-type').textContent='Activate JARVIS';state.textContent='Voice ready — press Activate JARVIS';}};
  recognition.start();
}

talk.addEventListener('click',()=>{
  if(listening)stopListening();
  else startListening();
});

document.addEventListener('keydown',e=>{if(e.code==='Space'&&document.activeElement!==prompt){e.preventDefault();talk.click()}});
setInterval(()=>{const n=Math.floor(20+Math.random()*15);document.querySelector('#cpu').textContent=n+'%';document.querySelector('#cpu').nextElementSibling.firstElementChild.style.width=n+'%'},3000);
