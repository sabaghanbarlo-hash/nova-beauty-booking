'use strict';
/* Nova Beauty Studio - demo booking engine. 100% client-side, localStorage is the database. */
const KEY='nova_beauty_v1',store=typeof localStorage!=='undefined'?localStorage:{getItem:()=>null,setItem(){}};
const SERVICES=[
{id:'haircut',name:'Haircut',dur:45,price:55,kw:['haircut','hair cut','trim','cut']},
{id:'coloring',name:'Hair Coloring',dur:120,price:140,kw:['colou?r','dye','highlight','balayage']},
{id:'facial',name:'Facial',dur:60,price:85,kw:['facial','skin','face']},
{id:'manicure',name:'Manicure',dur:45,price:40,kw:['manicure','nail']},
{id:'styling',name:'Full Styling',dur:90,price:110,kw:['styling','updo','blowout','blow dry','full style']}];
const SOURCES=['Website','AI Assistant','Phone','Walk-in','Instagram'],STATUSES=['confirmed','completed','cancelled','no-show'];
const pad=n=>String(n).padStart(2,'0'),ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const tm=s=>{const[a,b]=s.split(':');return+a*60+ +b},ft=m=>`${pad(Math.floor(m/60))}:${pad(m%60)}`;
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const svc=id=>SERVICES.find(s=>s.id===id),overlap=(a,b,c,d)=>a<d&&c<b;
let DB;
const save=()=>store.setItem(KEY,JSON.stringify(DB));
const mkid=()=>{let i;do i='NBS-'+Math.random().toString(36).slice(2,8).toUpperCase();while(DB.appts.some(a=>a.id===i));return i};
function defaults(){const w=['09:00','18:00'];return{settings:{step:30,hours:{0:null,1:w,2:w,3:w,4:w,5:w,6:['10:00','16:00']},blocked:[],holidays:[],periods:[]},appts:[]}}
/* Available start times (minutes) for a service on a date. Overlap = a.start < b.end && b.start < a.end, so back-to-back is allowed. */
function slots(date,s,o={}){const c=DB.settings,h=c.hours[new Date(date+'T00:00').getDay()],n=new Date(),today=ymd(n);
 if(!h||c.blocked.includes(date)||c.holidays.some(x=>x.date===date)||(date<today&&!o.past))return[];
 const busy=DB.appts.filter(a=>a.date===date&&a.status!=='cancelled'&&a.id!==o.ignore).map(a=>[tm(a.start),tm(a.start)+a.dur])
  .concat(c.periods.filter(p=>!p.date||p.date===date).map(p=>[tm(p.start),tm(p.end)]));
 const now=n.getHours()*60+n.getMinutes(),out=[];
 for(let t=tm(h[0]);t+s.dur<=tm(h[1]);t+=c.step){if(!o.past&&date===today&&t<=now)continue;if(!busy.some(b=>overlap(t,t+s.dur,b[0],b[1])))out.push(t)}
 return out}
function book(d,o={}){const s=svc(d.service);
 if(!s)return{ok:0,err:'Choose a service.'};
 if(!d.name||d.name.trim().length<2)return{ok:0,err:'Enter your name.'};
 if(!/^[\d\s+()-]{7,}$/.test(d.phone||''))return{ok:0,err:'Enter a valid phone number.'};
 if(!/^\S+@\S+\.\S+$/.test(d.email||''))return{ok:0,err:'Enter a valid email.'};
 if(!d.date||!d.start)return{ok:0,err:'Pick a date and time.'};
 const a={...d,name:d.name.trim(),dur:s.dur,price:s.price,status:d.status||'confirmed',source:d.source||'Website',created:Date.now()};
 if(a.status!=='cancelled'&&!slots(d.date,s,{past:o.past,ignore:o.ignore}).includes(tm(d.start)))return{ok:0,err:'That time is not available (overlap, closed or blocked).'};
 if(o.ignore){const i=DB.appts.findIndex(x=>x.id===o.ignore);a.id=o.ignore;a.created=DB.appts[i].created;DB.appts[i]=a}else{a.id=mkid();DB.appts.push(a)}
 save();return{ok:1,appt:a}}
const digits=s=>(s||'').replace(/\D/g,'');
function find(id,c){c=(c||'').trim().toLowerCase();return DB.appts.find(a=>a.id===(id||'').trim().toUpperCase()&&(a.email.toLowerCase()===c||(digits(c).length>=7&&digits(a.phone)===digits(c))))}
function setStatus(id,st){const a=DB.appts.find(x=>x.id===id);if(a){a.status=st;save()}return a}
/* Local "AI": keyword + rule based natural-language parsing */
const DAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
function parse(q,now=new Date()){q=q.toLowerCase();const r={};
 const s=SERVICES.find(s=>s.kw.some(k=>new RegExp('\\b'+k).test(q)));if(s)r.service=s.id;
 let m;
 if(/\bday after tomorrow\b/.test(q))r.date=ymd(addDays(now,2));
 else if(/\b(tomorrow|tmrw)\b/.test(q))r.date=ymd(addDays(now,1));
 else if(/\b(today|tonight)\b/.test(q))r.date=ymd(now);
 else if(m=q.match(/\d{4}-\d{2}-\d{2}/))r.date=m[0];
 else if(m=q.match(/\bin (\d+) days?\b/))r.date=ymd(addDays(now,+m[1]));
 else if(/\bnext week\b/.test(q))r.date=ymd(addDays(now,7));
 else{const i=DAYS.findIndex(d=>new RegExp('\\b'+d.slice(0,3)+'(day|sday|nesday|rsday|urday)?\\b').test(q)&&new RegExp('\\b'+d).test(q));
  if(i>=0){let n=(i-now.getDay()+7)%7;if(n===0)n=7;r.date=ymd(addDays(now,n))}}
 if(/\bmorning\b/.test(q))r.pref='morning';else if(/\bafternoon\b/.test(q))r.pref='afternoon';else if(/\b(evening|tonight|after work)\b/.test(q))r.pref='evening';
 if(m=q.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)||q.match(/\bat (\d{1,2})(?::(\d{2}))?\b/)){let h=+m[1]%12;if(m[3]?m[3]==='pm':(+m[1]<9))h+=12;if(m[3]||+m[1]<=23)r.time=h*60+(+m[2]||0)}
 return r}
function seed(){DB=defaults();const t=new Date();let r=7;const rnd=()=>(r=(r*9301+49297)%233280)/233280,pick=a=>a[Math.floor(rnd()*a.length)];
 const P=[['Emma Clarke','555-0101','emma.clarke@example.com'],['Olivia Park','555-0102','olivia.p@example.com'],['Sophia Reyes','555-0103','sophia.r@example.com'],['Mia Johnson','555-0104','mia.j@example.com'],['Ava Nguyen','555-0105','ava.n@example.com'],['Liam Foster','555-0106','liam.f@example.com'],['Noah Bennett','555-0107','noah.b@example.com'],['Isabella Rossi','555-0108','bella.r@example.com']];
 DB.settings.holidays.push({date:ymd(addDays(t,9)),name:'Studio Anniversary Closure'});
 DB.settings.periods.push({date:ymd(addDays(t,3)),start:'12:00',end:'14:00',reason:'Staff training'});
 for(let i=0;i<70;i++){const d=ymd(addDays(t,Math.floor(rnd()*30)-14)),s=pick(SERVICES),p=pick(P),sl=slots(d,s,{past:true});if(!sl.length)continue;
  const past=d<ymd(t),x=rnd(),status=past?(x<.12?'cancelled':x<.22?'no-show':'completed'):(x<.1?'cancelled':'confirmed');
  DB.appts.push({id:mkid(),service:s.id,date:d,start:ft(pick(sl)),dur:s.dur,price:s.price,name:p[0],phone:p[1],email:p[2],notes:'',status,source:pick(SOURCES),created:Date.now()})}
 save()}
function load(){try{DB=JSON.parse(store.getItem(KEY));if(!DB||!DB.appts)throw 0}catch(e){seed()}}
load();
if(typeof module!=='undefined')module.exports={slots,book,parse,find,setStatus,seed,svc,ft,tm,ymd,addDays,get DB(){return DB},reset(){DB=defaults()}};

if(typeof document!=='undefined'){
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fd=d=>new Date(d+'T00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
const f12=m=>{const h=Math.floor(m/60);return`${h%12||12}:${pad(m%60)} ${h<12?'AM':'PM'}`};
const range=a=>`${f12(tm(a.start))} - ${f12(tm(a.start)+a.dur)}`,badge=s=>`<span class="badge ${s}">${s}</span>`;
let B={},tab='overview',cal=new Date(),F={date:'',status:'',q:''},last=null;
const bars=o=>{const t=Object.values(o).reduce((a,b)=>a+b,0)||1;return Object.entries(o).map(([k,v])=>`<div class="bar"><span>${esc(k)}</span><i><b style="width:${v/t*100}%"></b></i><em>${v}</em></div>`).join('')};
function renderBook(){const s=svc(B.service);
 $('#svc').innerHTML=SERVICES.map(x=>`<button class="svc${x.id===B.service?' on':''}" data-svc="${x.id}"><b>${x.name}</b><span>${x.dur} min</span><strong>$${x.price}</strong></button>`).join('');
 $('#date').value=B.date||'';const sl=s&&B.date?slots(B.date,s):[];
 $('#slots').innerHTML=!s?'<p class="muted">Select a service first.</p>':!B.date?'<p class="muted">Pick a date to see times.</p>':sl.length?sl.map(t=>`<button class="chip${ft(t)===B.start?' on':''}" data-slot="${ft(t)}">${f12(t)}</button>`).join(''):'<p class="muted">No availability: closed, holiday, blocked or fully booked. Try another date.</p>';
 $('#sum').innerHTML=s?`<h4>${s.name}</h4><p>${s.dur} min &middot; <b>$${s.price}</b></p><p>${B.date?fd(B.date):'Date not chosen'}</p><p>${B.start?f12(tm(B.start))+' - '+f12(tm(B.start)+s.dur):'Time not chosen'}</p>`:'<p class="muted">Your booking summary appears here.</p>'}
function bot(html,me){const l=$('#chat');l.insertAdjacentHTML('beforeend',`<div class="msg ${me?'me':'bot'}">${html}</div>`);l.scrollTop=l.scrollHeight}
function ask(q){bot(esc(q),1);const p=parse(q);if(p.service)B.service=p.service;
 if(!B.service){bot('Which service would you like? '+SERVICES.map(s=>`<button class="chip" data-say="${s.name}">${s.name}</button>`).join(''));renderBook();return}
 const s=svc(B.service),ok=t=>p.time!=null?Math.abs(t-p.time)<=60:!p.pref||(p.pref==='morning'?t<720:p.pref==='afternoon'?t>=720&&t<1020:t>=1020);
 let found=null;const base=p.date?new Date(p.date+'T00:00'):new Date();
 for(let i=0;i<28;i++){const x=ymd(addDays(base,i));if(slots(x,s).some(ok)){found=x;break}}
 if(!found){bot('Sorry, I could not find an opening for that in the next 4 weeks. Try another time of day?');renderBook();return}
 B.date=found;B.start='';const c=slots(found,s).filter(ok).slice(0,8);
 const desc=[s.name,p.date&&p.date!==found?`(${fd(p.date)} is unavailable)`:'',fd(found),p.time!=null?'around '+f12(p.time):p.pref||''].filter(Boolean).join(' &middot; ');
 bot(`${desc}<br>Pick a time:<div>${c.map(t=>`<button class="chip" data-slot="${ft(t)}" data-ai="1">${f12(t)}</button>`).join('')}</div>`);renderBook()}
function confirmed(a){last=a;$('#flow').hidden=true;$('#done').hidden=false;
 $('#done').innerHTML=`<div class="ok">&#10003;</div><h2>You're booked!</h2><p class="id">${a.id}</p><p>${svc(a.service).name} &middot; ${fd(a.date)}<br>${range(a)} &middot; $${a.price}</p><p class="muted">A confirmation would be emailed to ${esc(a.email)}. Keep your ID to manage or cancel.</p><button class="btn" id="again">Book another</button> <button class="btn ghost" data-cancel="${a.id}">Cancel appointment</button>`}
function manage(a){$('#mres').innerHTML=a?`<div class="card"><p class="id">${a.id}</p><p>${svc(a.service).name} &middot; ${fd(a.date)} &middot; ${range(a)}</p><p>${esc(a.name)} ${badge(a.status)}</p>${a.status==='confirmed'&&a.date+a.start>=ymd(new Date())+ft(new Date().getHours()*60+new Date().getMinutes())?`<button class="btn danger" data-cancel="${a.id}">Cancel appointment</button>`:'<p class="muted">Only upcoming confirmed appointments can be cancelled.</p>'}</div>`:'<p class="err">No appointment matches that ID and email/phone.</p>'}
function stats(){const A=DB.appts,n=A.filter(a=>a.status==='cancelled').length,by=k=>A.reduce((o,a)=>(o[k(a)]=(o[k(a)]||0)+1,o),{});return{n,rate:A.length?Math.round(n/A.length*100):0,svc:by(a=>svc(a.service).name),src:by(a=>a.source)}}
const row=a=>`<tr><td>${fd(a.date)}<br><small>${range(a)}</small></td><td>${esc(a.name)}<br><small>${esc(a.phone)}</small></td><td>${svc(a.service).name}</td><td>${badge(a.status)}</td><td class="act"><button data-edit="${a.id}">Edit</button>${a.status==='confirmed'?`<button data-st="completed" data-id="${a.id}">Done</button><button data-st="no-show" data-id="${a.id}">No-show</button><button data-st="cancelled" data-id="${a.id}">Cancel</button>`:''}</td></tr>`;
function renderAdmin(){const t=ymd(new Date()),A=DB.appts,up=A.filter(a=>a.date>t&&a.status==='confirmed').sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)),td=A.filter(a=>a.date===t).sort((a,b)=>a.start.localeCompare(b.start)),S=stats(),el=$('#atab');
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
 if(tab==='overview'){const y=cal.getFullYear(),m=cal.getMonth(),first=new Date(y,m,1).getDay(),dim=new Date(y,m+1,0).getDate();
  let cells='<i></i>'.repeat(first);for(let d=1;d<=dim;d++){const k=`${y}-${pad(m+1)}-${pad(d)}`,c=A.filter(a=>a.date===k&&a.status!=='cancelled').length;cells+=`<button class="day${k===t?' today':''}" data-day="${k}">${d}${c?`<b>${c}</b>`:''}</button>`}
  el.innerHTML=`<div class="kpis"><div><small>Today</small><b>${td.filter(a=>a.status!=='cancelled').length}</b></div><div><small>Upcoming</small><b>${up.length}</b></div><div><small>Cancellation rate</small><b>${S.rate}%</b></div><div><small>Revenue (completed)</small><b>$${A.filter(a=>a.status==='completed').reduce((s,a)=>s+a.price,0)}</b></div></div>
  <div class="cols"><div class="card"><div class="row"><button data-cal="-1">&lsaquo;</button><h3>${cal.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h3><button data-cal="1">&rsaquo;</button></div><div class="cal">${'SMTWTFS'.split('').map(d=>`<u>${d}</u>`).join('')}${cells}</div><p class="muted">Tap a day to filter appointments.</p></div>
  <div class="card"><h3>Today's appointments</h3>${td.length?td.map(a=>`<p class="li"><b>${f12(tm(a.start))}</b> ${esc(a.name)} &middot; ${svc(a.service).name} ${badge(a.status)}</p>`).join(''):'<p class="muted">Nothing scheduled today.</p>'}<h3>Upcoming</h3>${up.slice(0,6).map(a=>`<p class="li"><b>${fd(a.date)} ${f12(tm(a.start))}</b> ${esc(a.name)} &middot; ${svc(a.service).name}</p>`).join('')||'<p class="muted">None.</p>'}</div></div>
  <div class="cols"><div class="card"><h3>Service statistics</h3>${bars(S.svc)}</div><div class="card"><h3>Booking source</h3>${bars(S.src)}</div></div>`}
 else if(tab==='appts'){const q=F.q.toLowerCase(),L=A.filter(a=>(!F.date||a.date===F.date)&&(!F.status||a.status===F.status)&&(!q||(a.name+a.email+a.phone+a.id).toLowerCase().includes(q))).sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start));
  el.innerHTML=`<div class="filters"><input type="date" id="fdate" value="${F.date}"><select id="fstat"><option value="">All statuses</option>${STATUSES.map(s=>`<option${F.status===s?' selected':''}>${s}</option>`).join('')}</select><input id="fq" placeholder="Search name, phone, email, ID" value="${esc(F.q)}"><button class="btn" data-edit="">+ New</button><button class="btn ghost" id="fclr">Clear</button></div><div class="scroll"><table><tr><th>When</th><th>Customer</th><th>Service</th><th>Status</th><th></th></tr>${L.map(row).join('')||'<tr><td colspan=5 class="muted">No matches.</td></tr>'}</table></div>`}
 else if(tab==='customers'){const C={};A.forEach(a=>{const c=C[a.email]||(C[a.email]={n:a.name,p:a.phone,e:a.email,v:0,b:0,s:0,l:''});c.b++;if(a.status==='completed'){c.v++;c.s+=a.price}if(a.date>c.l)c.l=a.date});
  el.innerHTML=`<div class="scroll"><table><tr><th>Customer</th><th>Contact</th><th>Bookings</th><th>Completed</th><th>Spent</th><th>Last</th></tr>${Object.values(C).sort((a,b)=>b.s-a.s).map(c=>`<tr><td>${esc(c.n)}</td><td>${esc(c.p)}<br><small>${esc(c.e)}</small></td><td>${c.b}</td><td>${c.v}</td><td>$${c.s}</td><td>${fd(c.l)}</td></tr>`).join('')}</table></div>`}
 else{const s=DB.settings;el.innerHTML=`<div class="cols"><div class="card"><h3>Business hours</h3><p class="muted">Leave blank to close that day.</p>${DAYS.map((d,i)=>`<div class="hrs"><span>${d.slice(0,3)}</span><input type="time" data-h="${i}0" value="${s.hours[i]?.[0]||''}"><input type="time" data-h="${i}1" value="${s.hours[i]?.[1]||''}"></div>`).join('')}<label>Slot interval<select id="step">${[15,30,60].map(n=>`<option${s.step===n?' selected':''}>${n}</option>`).join('')}</select></label><button class="btn" id="shrs">Save hours</button></div>
  <div class="card"><h3>Blocked dates</h3>${s.blocked.map(d=>`<p class="li">${fd(d)} <button data-rm="blocked:${d}">&times;</button></p>`).join('')}<div class="row"><input type="date" id="nb"><button class="btn" id="ab">Add</button></div>
  <h3>Holidays</h3>${s.holidays.map((h,i)=>`<p class="li">${fd(h.date)} ${esc(h.name)} <button data-rm="holidays:${i}">&times;</button></p>`).join('')}<div class="row"><input type="date" id="nhd"><input id="nhn" placeholder="Name"><button class="btn" id="ah">Add</button></div>
  <h3>Unavailable periods</h3>${s.periods.map((p,i)=>`<p class="li">${p.date?fd(p.date):'Every day'} ${p.start}-${p.end} ${esc(p.reason)} <button data-rm="periods:${i}">&times;</button></p>`).join('')}<div class="row"><input type="date" id="npd"><input type="time" id="nps"><input type="time" id="npe"><input id="npr" placeholder="Reason"><button class="btn" id="ap">Add</button></div><p class="muted">Blank date = every day (e.g. lunch).</p></div></div>`}}
function edit(id){const a=id?DB.appts.find(x=>x.id===id):{service:'haircut',date:ymd(new Date()),start:'',name:'',phone:'',email:'',notes:'',status:'confirmed',source:'Phone'};
 const o=(l,v)=>l.map(x=>`<option value="${x.id||x}"${(x.id||x)===v?' selected':''}>${x.name||x}</option>`).join('');
 $('#dlg').innerHTML=`<form id="ef"><h3>${id?'Edit '+id:'New appointment'}</h3><div class="grid2"><label>Service<select name="service">${o(SERVICES,a.service)}</select></label><label>Date<input type="date" name="date" value="${a.date}"></label><label>Time<select name="start"></select></label><label>Status<select name="status">${o(STATUSES,a.status)}</select></label><label>Name<input name="name" value="${esc(a.name)}"></label><label>Phone<input name="phone" value="${esc(a.phone)}"></label><label>Email<input name="email" value="${esc(a.email)}"></label><label>Source<select name="source">${o(SOURCES,a.source)}</select></label></div><label>Notes<textarea name="notes">${esc(a.notes)}</textarea></label><p class="err" id="ee"></p><div class="row"><button type="button" class="btn ghost" id="dc">Close</button><button class="btn">Save</button></div></form>`;
 const f=$('#ef'),upd=()=>{const s=svc(f.elements.service.value),l=slots(f.elements.date.value,s,{past:true,ignore:id}).map(ft);if(id&&f.elements.date.value===a.date&&f.elements.service.value===a.service&&!l.includes(a.start))l.push(a.start);l.sort();f.elements.start.innerHTML=l.map(t=>`<option${t===(f.elements.start.value||a.start)?' selected':''}>${t}</option>`).join('')||'<option value="">No times</option>'};
 upd();f.elements.service.onchange=f.elements.date.onchange=upd;$('#dc').onclick=()=>$('#dlg').close();
 f.onsubmit=e=>{e.preventDefault();const r=book(Object.fromEntries(new FormData(f)),{past:true,ignore:id||undefined});if(!r.ok){$('#ee').textContent=r.err;return}$('#dlg').close();renderAdmin()};$('#dlg').showModal()}
function go(v){document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!==v);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('on',b.dataset.view===v));if(v==='admin')renderAdmin();scrollTo(0,0)}
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
 if(d.view)go(d.view);
 if(d.svc){B.service=d.svc;B.start='';renderBook()}
 if(d.slot){B.start=d.slot;B.src=d.ai?'AI Assistant':'Website';renderBook();$('#bf').scrollIntoView({behavior:'smooth'})}
 if(d.say)ask(d.say);
 if(t.id==='again'){B={};$('#done').hidden=true;$('#flow').hidden=false;$('#bf').reset();renderBook()}
 if(d.cancel){const a=setStatus(d.cancel,'cancelled');if(a){last=a;if(!$('#done').hidden)$('#done').innerHTML=`<h2>Appointment cancelled</h2><p class="id">${a.id}</p><button class="btn" id="again">Book again</button>`;else manage(a)}}
 if(d.tab){tab=d.tab;renderAdmin()}
 if(d.cal){cal=new Date(cal.getFullYear(),cal.getMonth()+ +d.cal,1);renderAdmin()}
 if(d.day){F.date=d.day;tab='appts';renderAdmin()}
 if(d.edit!==undefined)edit(d.edit);
 if(d.st){setStatus(d.id,d.st);renderAdmin()}
 if(t.id==='fclr'){F={date:'',status:'',q:''};renderAdmin()}
 if(t.id==='reset'&&confirm('Reset all demo data?')){seed();B={};renderBook();renderAdmin();$('#done').hidden=true;$('#flow').hidden=false}
 if(d.rm){const[k,v]=d.rm.split(':'),s=DB.settings;k==='blocked'?s.blocked=s.blocked.filter(x=>x!==v):s[k].splice(+v,1);save();renderAdmin()}
 if(t.id==='ab'&&$('#nb').value){DB.settings.blocked.push($('#nb').value);save();renderAdmin()}
 if(t.id==='ah'&&$('#nhd').value){DB.settings.holidays.push({date:$('#nhd').value,name:$('#nhn').value||'Holiday'});save();renderAdmin()}
 if(t.id==='ap'&&$('#nps').value&&$('#npe').value&&$('#nps').value<$('#npe').value){DB.settings.periods.push({date:$('#npd').value,start:$('#nps').value,end:$('#npe').value,reason:$('#npr').value||'Unavailable'});save();renderAdmin()}
 if(t.id==='shrs'){const s=DB.settings;for(let i=0;i<7;i++){const a=document.querySelector(`[data-h="${i}0"]`).value,b=document.querySelector(`[data-h="${i}1"]`).value;s.hours[i]=a&&b&&a<b?[a,b]:null}s.step=+$('#step').value;save();t.textContent='Saved'}});
document.addEventListener('input',e=>{const i=e.target;if(i.id==='fdate'||i.id==='fstat'||i.id==='fq'){F={date:$('#fdate').value,status:$('#fstat').value,q:$('#fq').value};const p=i.selectionStart;renderAdmin();const n=$('#'+i.id);n.focus();try{n.setSelectionRange(p,p)}catch(x){}}});
$('#date').onchange=e=>{B.date=e.target.value;B.start='';renderBook()};
$('#bf').onsubmit=e=>{e.preventDefault();const r=book({...Object.fromEntries(new FormData(e.target)),service:B.service,date:B.date,start:B.start,source:B.src||'Website'});if(!r.ok){$('#be').textContent=r.err;renderBook();return}$('#be').textContent='';confirmed(r.appt)};
$('#mf').onsubmit=e=>{e.preventDefault();manage(find($('#mid').value,$('#mc').value))};
$('#cf').onsubmit=e=>{e.preventDefault();const q=$('#cq').value.trim();if(q){ask(q);$('#cq').value=''}};
$('#date').min=ymd(new Date());renderBook();bot('Hi! Tell me what you need, e.g. <i>"I want a facial tomorrow afternoon"</i>. I run locally in your browser, no AI API.');
}
