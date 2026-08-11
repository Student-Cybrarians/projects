const views={command:'Command Center',memory:'Memory',systems:'Systems',tasks:'Tasks'};
const nav=document.querySelectorAll('.nav-item');
const viewEls=document.querySelectorAll('.view');
const title=document.querySelector('#viewTitle');
nav.forEach(btn=>btn.addEventListener('click',()=>{nav.forEach(x=>x.classList.remove('active'));btn.classList.add('active');viewEls.forEach(v=>v.classList.remove('active-view'));document.querySelector('#'+btn.dataset.view+'View').classList.add('active-view');title.textContent=btn.dataset.view==='command'?'Good evening, Cybrarian.':views[btn.dataset.view]+'.'}));

const messages=document.querySelector('#messages');
const prompt=document.querySelector('#prompt');
const composer=document.querySelector('#composer');
const state=document.querySelector('#voiceState');

// GitHub Pages is static, so /api/chat cannot execute here. Set this to your
// deployed server-side JARVIS endpoint. The NVIDIA key must remain server-side.
const API_URL=window.JARVIS_API_URL||'https://jarvis-nvidia-backend.vercel.app/api/chat';
const localCommands={
  'play music':()=>({reply:'What would you like to listen to? You can say an artist, song, playlist, or genre.'}),
  'give me a system briefing':()=>({reply:'All systems nominal. Core services are online, memory is synchronized, and the automation bridge is standing by.'}),
  'what should i focus on next?':()=>({reply:'Your highest-leverage next move is to finish the tomorrow briefing. I can structure it around priorities, blockers, and decisions.'}),
  'run a diagnostics check':()=>({reply:'Diagnostics complete. CPU, memory, network, voice interface, and memory index are operating within normal parameters.'})
};

function addMessage(text,type='jarvis'){
  const wrap=document.createElement('div');wrap.className='message '+type;
  wrap.innerHTML=type==='jarvis'?`<div class="message-head"><span class="mini-orb">J</span><strong>JARVIS</strong><time>NOW</time></div><p></p>`:`<div class="message-head"><strong>YOU</strong><time>NOW</time></div><p></p>`;
  wrap.querySelector('p').textContent=text;
  messages.appendChild(wrap);messages.scrollTop=messages.scrollHeight;
}

function speak(text){
  if(!('speechSynthesis' in window))return;
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(text);
  utterance.rate=0.96; utterance.pitch=0.92; utterance.volume=1;
  window.speechSynthesis.speak(utterance);
}

async function askBackend(value){
  const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:value})});
  let data={}; try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(data.error||`Backend returned ${response.status}`);
  return data.reply||data.message||data.output||data.choices?.[0]?.message?.content;
}

async function send(text){
  const value=text.trim();if(!value)return;
  addMessage(value,'user');prompt.value='';state.textContent='Processing command…';
  const local=localCommands[value.toLowerCase()];
  try{
    const reply=local?local().reply:await askBackend(value);
    if(!reply)throw new Error('Empty response');
    addMessage(reply);speak(reply);state.textContent='Listening for your command';
  }catch(error){
    console.error(error);
    const message='JARVIS backend is not reachable yet. Please configure the server endpoint and NVIDIA key.';
    addMessage(message);speak(message);state.textContent='Backend unavailable';
  }
}

composer.addEventListener('submit',e=>{e.preventDefault();send(prompt.value)});
document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>send(b.dataset.command)));
document.querySelector('#clearChat').addEventListener('click',()=>{messages.innerHTML='<div class="message jarvis"><div class="message-head"><span class="mini-orb">J</span><strong>JARVIS</strong><time>NOW</time></div><p>Conversation cleared. Ready when you are.</p></div>';});

let listening=false;let recognition=null;const talk=document.querySelector('#talkBtn');
function startListening(){
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SpeechRecognition){const msg='Voice input is not supported by this browser. You can still type to JARVIS.';addMessage(msg);speak(msg);return;}
  recognition=new SpeechRecognition();recognition.lang='en-US';recognition.interimResults=false;recognition.continuous=false;
  recognition.onstart=()=>{listening=true;talk.querySelector('span:last-of-type').textContent='Listening…';state.textContent='Microphone active — speak your command';};
  recognition.onresult=e=>send(e.results[0][0].transcript);
  recognition.onerror=e=>{console.error(e);state.textContent='Voice input error';};
  recognition.onend=()=>{listening=false;talk.querySelector('span:last-of-type').textContent='Activate JARVIS';if(state.textContent!=='Processing command…')state.textContent='Listening for your command';};
  recognition.start();
}
talk.addEventListener('click',()=>{if(listening){recognition?.stop();return;}startListening();});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&document.activeElement!==prompt){e.preventDefault();talk.click()}});
setInterval(()=>{const n=Math.floor(20+Math.random()*15);document.querySelector('#cpu').textContent=n+'%';document.querySelector('#cpu').nextElementSibling.firstElementChild.style.width=n+'%'},3000);
