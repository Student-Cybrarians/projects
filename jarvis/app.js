const views={command:'Command Center',memory:'Memory',systems:'Systems',tasks:'Tasks'};
const nav=document.querySelectorAll('.nav-item');
const viewEls=document.querySelectorAll('.view');
const title=document.querySelector('#viewTitle');
nav.forEach(btn=>btn.addEventListener('click',()=>{nav.forEach(x=>x.classList.remove('active'));btn.classList.add('active');viewEls.forEach(v=>v.classList.remove('active-view'));document.querySelector('#'+btn.dataset.view+'View').classList.add('active-view');title.textContent=btn.dataset.view==='command'?'Good evening, Cybrarian.':views[btn.dataset.view]+'.';}));

const messages=document.querySelector('#messages');
const prompt=document.querySelector('#prompt');
const composer=document.querySelector('#composer');
const state=document.querySelector('#voiceState');

// The browser must never contain the NVIDIA API key. When you provide the key,
// connect /api/chat on a server-side backend and set JARVIS_API_URL if needed.
const API_URL=window.JARVIS_API_URL||'/api/chat';
const localCommands={
  'play music':()=>({reply:'What would you like to listen to? You can say an artist, song, playlist, or genre.',action:'music'}),
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
    addMessage(result.reply);
    state.textContent='Listening for your command';
    return;
  }
  try{
    const reply=await askBackend(value);
    if(!reply)throw new Error('Empty response');
    addMessage(reply);state.textContent='Listening for your command';
  }catch(error){
    console.error(error);
    addMessage('I can handle that once the JARVIS AI backend is connected. Add the NVIDIA Nemotron key to the server-side backend — never to this page — and I’ll respond here.');
    state.textContent='Backend not connected';
  }
}

composer.addEventListener('submit',e=>{e.preventDefault();send(prompt.value)});
document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>send(b.dataset.command)));
document.querySelector('#clearChat').addEventListener('click',()=>{messages.innerHTML='<div class="message jarvis"><div class="message-head"><span class="mini-orb">J</span><strong>JARVIS</strong><time>NOW</time></div><p>Conversation cleared. Ready when you are.</p></div>';});

let listening=false;const talk=document.querySelector('#talkBtn');
talk.addEventListener('click',()=>{listening=!listening;talk.querySelector('span:last-of-type').textContent=listening?'Listening…':'Activate JARVIS';state.textContent=listening?'Microphone active — speak your command':'Listening for your command';talk.style.borderColor=listening?'rgba(93,240,173,.5)':'';if(listening&&'webkitSpeechRecognition' in window){const r=new webkitSpeechRecognition();r.lang='en-US';r.interimResults=false;r.onresult=e=>send(e.results[0][0].transcript);r.onend=()=>{listening=false;talk.querySelector('span:last-of-type').textContent='Activate JARVIS';state.textContent='Listening for your command'};r.start();}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&document.activeElement!==prompt){e.preventDefault();talk.click()}});
setInterval(()=>{const n=Math.floor(20+Math.random()*15);document.querySelector('#cpu').textContent=n+'%';document.querySelector('#cpu').nextElementSibling.firstElementChild.style.width=n+'%'},3000);
