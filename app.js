/* =========================================================
   Salchipaseo · app
   - Modo nube: login con Google vía Supabase, datos en Postgres.
   - Modo demo: sin cuenta, datos de ejemplo en memoria.
   ========================================================= */
(function(){
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const ASSETS=window.SALCHI_ASSETS||{};
const CFG=window.SALCHIPASEO_CONFIG||{};
const CONFIG_OK=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_KEY&&!/TU-PROYECTO/.test(CFG.SUPABASE_URL)&&!/PEGA_AQUI/.test(CFG.SUPABASE_KEY)&&window.supabase);
const DEFAULT_CENTER=[-33.4395,-70.6400];
const NAT=window.AppNativa||null,IS_APP=!!(NAT&&NAT.esApp);   // app iOS (Capacitor) vs navegador
const NATIVE_DIST=10;   // metros mínimos entre lecturas del GPS nativo
const SIM_SPEED=15, DOG_STEP=0.35;
const COLORS={orange:['#FF6B1A','#D9520A'],blue:['#1F5EFF','#1544C2'],pink:['#FF7EB6','#E0558F'],green:['#18B05A','#0E8A44'],yellow:['#FFC629','#D9A300'],ink:['#1E1A1D','#000000'],purple:['#7C5CF0','#5B3FD0']};
const COLOR_ORDER=['orange','blue','pink','green','purple','yellow'];

/* ---------- icons ---------- */
const sv=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I={
  lock:sv('<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  clock:sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  route:sv('<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>'),
  flame:sv('<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.9 3.4-5.9 4.2-9.8 2.8 1.5 3.6 4 3.3 6 1-.6 1.7-1.6 2-2.8 2 1.6 3.5 4 3.5 6.6 0 3.6-2.6 6.2-6.5 6.2z"/>'),
  bowl:sv('<path d="M3 12h18a9 8 0 0 1-18 0z"/><path d="M8.5 8.5c0-1.2 1.2-1.6 1.2-2.8M14 8.5c0-1.2 1.2-1.6 1.2-2.8"/>'),
  walk:sv('<circle cx="13" cy="4.5" r="1.8"/><path d="M9 21l2.5-6 2.5 2v4M7 12l2-4 4-1 3 4 3 1M11.5 15 10 9.5"/>'),
  drop:sv('<path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z"/>'),
  moon:sv('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'),
  sun:sv('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  heart:sv('<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>'),
  trash:sv('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>'),
  map:sv('<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4zM9 4v14M15 6v14"/>'),
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg>',
  alert:sv('<path d="M12 3.5 2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.5v.01"/>'),
  info:sv('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>'),
  check:sv('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  target:sv('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>'),
  trend:sv('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'),
  spine:sv('<path d="M5 15c2-3 5-4.5 7-4.5s5 1.5 7 4.5"/><path d="M7 12.5v-2M10 11v-2M14 11V9M17 12.5v-2"/>'),
  harness:sv('<rect x="5" y="8" width="14" height="9" rx="4.5"/><path d="M12 8V4.5M9 17v2.5M15 17v2.5"/>'),
  scale:sv('<rect x="3.5" y="4" width="17" height="16" rx="4"/><path d="M8.5 10a5 5 0 0 1 7 0L12 13"/>'),
  thermo:sv('<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>'),
  coat:sv('<path d="M8 4h8l4 4-2.5 2.5V20h-11v-9.5L4 8l4-4z"/>'),
  pencil:sv('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>'),
  chev:sv('<path d="m9 6 6 6-6 6"/>'),
  plus:sv('<path d="M12 5v14M5 12h14"/>'),
  x:sv('<path d="M6 6l12 12M18 6 6 18"/>'),
  out:sv('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>'),
  down:sv('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  up:sv('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'),
  phone:sv('<rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M11 18.5h2"/>'),
  sync:sv('<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.6L20 16M20 20v-4h-4"/>'),
  user:sv('<path d="M4 21v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1"/><circle cx="12" cy="8" r="4"/>'),
  bell:sv('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
  camera:sv('<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.6"/>'),
  back:sv('<path d="M15 5l-7 7 7 7"/>'),
  pill:sv('<rect x="3.5" y="8.5" width="17" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="m9.5 8.4 5 7.2"/>'),
  ball:sv('<circle cx="12" cy="12" r="8.5"/><path d="M4 10c4 1 12 1 16 4M5.5 17c3-3 9-4 13-3"/>'),
  bath:sv('<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M6 12V6a2 2 0 0 1 3.6-1.2"/><path d="M8 19l-1 2M16 19l1 2"/>'),
  star:sv('<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>'),
  heartF:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.5s-8-4.9-8-10.9A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8 2.8c0 6-8 10.9-8 10.9z"/></svg>',
  grid:sv('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
  paw:'<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="6" cy="9.5" rx="2.1" ry="2.6"/><ellipse cx="10" cy="5.6" rx="2.1" ry="2.7"/><ellipse cx="14.6" cy="5.6" rx="2.1" ry="2.7"/><ellipse cx="18.4" cy="9.6" rx="2.1" ry="2.6"/><path d="M12.3 11c2.6 0 5.6 3.6 5.6 6.2 0 1.8-1.3 2.6-2.8 2.6-1.2 0-1.8-.6-2.8-.6s-1.7.6-2.9.6c-1.5 0-2.8-.8-2.8-2.6 0-2.6 3-6.2 5.7-6.2z"/></svg>',
  pee:'<svg viewBox="0 0 24 24"><path d="M12 3.2c.3 0 .6.2.8.5 1.9 2.9 5.7 7.3 5.7 10.8a6.5 6.5 0 0 1-13 0c0-3.5 3.8-7.9 5.7-10.8.2-.3.5-.5.8-.5z" fill="#FFC629" stroke="#1E1A1D" stroke-width="1.6"/></svg>',
  poop:'<svg viewBox="0 0 24 24"><path d="M6 20h12a2.5 2.5 0 0 0 .6-4.9A2.6 2.6 0 0 0 16 11.3a2.4 2.4 0 0 0-1.6-3.6c.3-1.8-.8-3.4-2.9-3.7.4 1.3-.3 2.3-1.6 2.6A2.6 2.6 0 0 0 8 11.3a2.6 2.6 0 0 0-2.6 3.8A2.5 2.5 0 0 0 6 20z" fill="#B0682E" stroke="#1E1A1D" stroke-width="1.5" stroke-linejoin="round"/></svg>',
};

/* ---------- helpers ---------- */
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf0=new Intl.NumberFormat('es-CL',{maximumFractionDigits:0});
const nf1=new Intl.NumberFormat('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1});
const nf2=new Intl.NumberFormat('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtKm=(m,d=1)=>(d===2?nf2:nf1).format((m||0)/1000)+' km';
function fmtDur(sec){sec=sec||0;if(sec<60)return Math.round(sec)+' s';const m=Math.round(sec/60);if(m<60)return m+' min';const h=Math.floor(m/60),r=m%60;return h+' h'+(r?' '+pad(r):'');}
function fmtClock(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return (h?h+':'+pad(m):pad(m))+':'+pad(s);}
function fmtPace(distM,sec){if(!distM||distM<40||!sec)return '–';let p=(sec/60)/(distM/1000);if(!isFinite(p)||p>99)return '–';let mm=Math.floor(p),ss=Math.round((p-mm)*60);if(ss===60){mm++;ss=0;}return mm+':'+pad(ss);}
const fmtHM=min=>{min=((Math.round(min)%1440)+1440)%1440;return pad(Math.floor(min/60))+':'+pad(min%60);};
const hm2min=s=>{const [h,m]=(s||'07:30').split(':').map(Number);return (h||0)*60+(m||0);};
const round5=x=>Math.max(5,Math.round(x/5)*5);
const sum=(a,f)=>a.reduce((t,x)=>t+(typeof f==='function'?f(x):x[f]||0),0);
const dayStart=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x;};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const weekStart=d=>{const x=dayStart(d);x.setDate(x.getDate()-((x.getDay()+6)%7));return x;};
const DOW=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],DOW1=['D','L','M','M','J','V','S'];
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function relDay(ts){const d0=dayStart(new Date()).getTime(),d=dayStart(ts).getTime(),diff=Math.round((d0-d)/864e5);if(diff===0)return 'Hoy';if(diff===1)return 'Ayer';if(diff<7&&diff>0)return cap(new Intl.DateTimeFormat('es-CL',{weekday:'long'}).format(ts));const x=new Date(ts);return x.getDate()+' '+MES[x.getMonth()];}
const timeOf=ts=>{const d=new Date(ts);return pad(d.getHours())+':'+pad(d.getMinutes());};
function uuid(){try{if(crypto.randomUUID)return crypto.randomUUID();}catch(e){}const b=new Uint8Array(16);(crypto&&crypto.getRandomValues?crypto.getRandomValues(b):b.forEach((_,i)=>b[i]=Math.random()*256|0));b[6]=b[6]&15|64;b[8]=b[8]&63|128;const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
const isNight=()=>{const h=new Date().getHours();return h>=21||h<6;};

/* ---------- geo ---------- */
function dist(a,b){const R=6371000,t=Math.PI/180;const dLa=(b[0]-a[0])*t,dLo=(b[1]-a[1])*t;const s=Math.sin(dLa/2)**2+Math.cos(a[0]*t)*Math.cos(b[0]*t)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(s)));}
function pathLen(p){let d=0;for(let i=1;i<p.length;i++)d+=dist(p[i-1],p[i]);return d;}
function densify(w,step=10){const out=[w[0]];for(let i=1;i<w.length;i++){const a=w[i-1],b=w[i];const n=Math.max(1,Math.round(dist(a,b)/step));for(let k=1;k<=n;k++)out.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}return out;}
function thin(p,max=400){if(!p||p.length<=max)return (p||[]).slice();const k=p.length/max,out=[];for(let i=0;i<max;i++)out.push(p[Math.floor(i*k)]);out.push(p[p.length-1]);return out;}
const r6=p=>[Math.round(p[0]*1e6)/1e6,Math.round(p[1]*1e6)/1e6];

/* ---------- safe local storage (solo modo nube: sesión, cola offline, respaldo del paseo) ---------- */
const LS={get(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},del(k){try{localStorage.removeItem(k);}catch(e){}}};
const lsKey=k=>`salchipaseo.${k}.${(S.user&&S.user.id)||'x'}`;

/* =========================================================
   Estado
   ========================================================= */
const S={mode:null,user:null,dogs:[],dog:null,walks:[],routes:[],photos:[],view:'perfil',histN:15,galFilter:'all'};
const DEFAULT_DOG=()=>({id:null,name:'',birthDate:'',weight:9,ideal:9,size:'std',neutered:true,activity:'auto',kcal:3600,wake:'07:30',routine:null,goalMin:null,avatarPath:null,walkMin:null});

/* =========================================================
   Capa de datos
   ========================================================= */
let sb=null;
const toDog=r=>({id:r.id,name:r.name,birthDate:r.birth_date||'',weight:+r.weight_kg||9,ideal:+(r.ideal_weight_kg||r.weight_kg)||9,size:r.size||'std',neutered:!!r.neutered,activity:r.activity||'auto',kcal:+r.food_kcal_per_kg||3600,wake:(r.wake_time||'07:30').slice(0,5),routine:Array.isArray(r.routine)?r.routine:null,goalMin:r.goal_minutes||null,avatarPath:r.avatar_path||null,walkMin:r.walk_min_minutes||null,_c4:Object.prototype.hasOwnProperty.call(r,'walk_min_minutes')});
const fromDog=d=>Object.assign({name:d.name,birth_date:d.birthDate||null,weight_kg:d.weight,ideal_weight_kg:d.ideal,size:d.size,neutered:d.neutered,activity:d.activity,food_kcal_per_kg:Math.round(d.kcal),wake_time:d.wake,routine:d.routine&&d.routine.length?d.routine:null,goal_minutes:d.goalMin||null,avatar_path:d.avatarPath||null},(d._c4||d.walkMin)?{walk_min_minutes:d.walkMin||null}:{});
const toWalk=r=>({id:r.id,dogId:r.dog_id,routeId:r.route_id,start:Date.parse(r.started_at),duration:r.duration_s,distance:r.distance_m,preview:r.preview||[],pee:r.pee,poop:r.poop,mode:r.mode});
const fromWalk=w=>({id:w.id,dog_id:w.dogId,route_id:w.routeId||null,started_at:new Date(w.start).toISOString(),duration_s:Math.round(w.duration),distance_m:Math.round(w.distance),points:w.points||null,preview:w.preview||null,pee:!!w.pee,poop:!!w.poop,mode:w.mode||'gps'});
const toRoute=r=>({id:r.id,name:r.name,color:r.color||'orange',points:r.points||[],distance:r.distance_m||0,created:Date.parse(r.created_at)});
const fromRoute=r=>({id:r.id,name:r.name,color:r.color,points:r.points,distance_m:Math.round(r.distance)});
const chk=({data,error})=>{if(error)throw error;return data;};

const toPhoto=r=>({id:r.id,dogId:r.dog_id,path:r.path,thumbPath:r.thumb_path||r.path,caption:r.caption||'',takenAt:Date.parse(r.taken_at),width:r.width,height:r.height,favorite:!!r.favorite});
const MEM={dogs:[],walks:[],routes:[],photos:[]};
const BUCKET='photos';
const DB={
  async listDogs(){if(S.mode==='demo')return MEM.dogs.slice();return chk(await sb.from('dogs').select('*').order('created_at')).map(toDog);},
  async saveDog(d){
    if(S.mode==='demo'){if(!d.id){d.id=uuid();MEM.dogs.push(d);}else{const i=MEM.dogs.findIndex(x=>x.id===d.id);MEM.dogs[i]=d;}return d;}
    if(d.id)return toDog(chk(await sb.from('dogs').update(fromDog(d)).eq('id',d.id).select().single()));
    return toDog(chk(await sb.from('dogs').insert(fromDog(d)).select().single()));
  },
  async deleteDog(id){if(S.mode==='demo'){MEM.dogs=MEM.dogs.filter(d=>d.id!==id);MEM.walks=MEM.walks.filter(w=>w.dogId!==id);MEM.photos=MEM.photos.filter(p=>p.dogId!==id);return;}
    try{const ph=chk(await sb.from('photos').select('path,thumb_path').eq('dog_id',id));const paths=ph.flatMap(p=>[p.path,p.thumb_path]).filter(Boolean);if(paths.length)await sb.storage.from(BUCKET).remove(paths);}catch(e){console.warn(e);}
    chk(await sb.from('dogs').delete().eq('id',id));},
  async listWalks(dogId){if(S.mode==='demo')return MEM.walks.filter(w=>w.dogId===dogId).sort((a,b)=>b.start-a.start);
    return chk(await sb.from('walks').select('id,dog_id,route_id,started_at,duration_s,distance_m,preview,pee,poop,mode').eq('dog_id',dogId).order('started_at',{ascending:false}).limit(3000)).map(toWalk);},
  async addWalk(w){if(S.mode==='demo'){MEM.walks.push(w);return;}const {error}=await sb.from('walks').insert(fromWalk(w));if(error&&error.code!=='23505')throw error;},
  async resetWalks(dogId){if(S.mode==='demo'){MEM.walks=MEM.walks.filter(w=>w.dogId!==dogId);return;}chk(await sb.from('walks').delete().eq('dog_id',dogId));},
  async deleteWalk(id){if(S.mode==='demo'){MEM.walks=MEM.walks.filter(w=>w.id!==id);return;}chk(await sb.from('walks').delete().eq('id',id));},
  async listRoutes(){if(S.mode==='demo')return MEM.routes.slice();return chk(await sb.from('routes').select('*').order('created_at')).map(toRoute);},
  async addRoute(r){if(S.mode==='demo'){MEM.routes.push(r);return;}const {error}=await sb.from('routes').insert(fromRoute(r));if(error&&error.code!=='23505')throw error;},
  async renameRoute(id,name){if(S.mode==='demo'){const r=MEM.routes.find(x=>x.id===id);if(r)r.name=name;return;}chk(await sb.from('routes').update({name}).eq('id',id));},
  async deleteRoute(id){if(S.mode==='demo'){MEM.routes=MEM.routes.filter(r=>r.id!==id);MEM.walks.forEach(w=>{if(w.routeId===id)w.routeId=null;});return;}chk(await sb.from('routes').delete().eq('id',id));},
  async listPhotos(dogId){if(S.mode==='demo')return MEM.photos.filter(p=>p.dogId===dogId).sort((a,b)=>b.takenAt-a.takenAt);
    try{return chk(await sb.from('photos').select('*').eq('dog_id',dogId).order('taken_at',{ascending:false}).limit(2000)).map(toPhoto);}catch(e){console.warn('fotos',e);return [];}},
  async addPhoto(meta,full,thumb){
    if(S.mode==='demo'){const p=Object.assign({},meta,{path:URL.createObjectURL(full),thumbPath:URL.createObjectURL(thumb)});MEM.photos.push(p);return p;}
    const base=`${S.user.id}/${meta.dogId}/${meta.id}`;const opts={contentType:'image/jpeg',cacheControl:'31536000',upsert:false};
    let r=await sb.storage.from(BUCKET).upload(base+'.jpg',full,opts);if(r.error)throw r.error;
    r=await sb.storage.from(BUCKET).upload(base+'_t.jpg',thumb,opts);if(r.error)throw r.error;
    return toPhoto(chk(await sb.from('photos').insert({id:meta.id,dog_id:meta.dogId,path:base+'.jpg',thumb_path:base+'_t.jpg',caption:meta.caption||null,taken_at:new Date(meta.takenAt).toISOString(),width:meta.width,height:meta.height,favorite:false}).select().single()));
  },
  async updatePhoto(p,patch){if(S.mode==='demo'){Object.assign(p,patch);return;}const row={};if('caption' in patch)row.caption=patch.caption||null;if('favorite' in patch)row.favorite=patch.favorite;if('takenAt' in patch)row.taken_at=new Date(patch.takenAt).toISOString();chk(await sb.from('photos').update(row).eq('id',p.id));Object.assign(p,patch);},
  async deletePhoto(p){if(S.mode==='demo'){MEM.photos=MEM.photos.filter(x=>x.id!==p.id);return;}await sb.storage.from(BUCKET).remove([p.path,p.thumbPath].filter(Boolean));chk(await sb.from('photos').delete().eq('id',p.id));},
  async wipe(){if(S.mode==='demo'){MEM.dogs=[];MEM.walks=[];MEM.routes=[];MEM.photos=[];return;}
    try{const ph=chk(await sb.from('photos').select('path,thumb_path'));const paths=ph.flatMap(p=>[p.path,p.thumb_path]).filter(Boolean);for(let i=0;i<paths.length;i+=100)await sb.storage.from(BUCKET).remove(paths.slice(i,i+100));chk(await sb.from('photos').delete().not('id','is',null));}catch(e){console.warn(e);}
    chk(await sb.from('walks').delete().not('id','is',null));chk(await sb.from('routes').delete().not('id','is',null));chk(await sb.from('dogs').delete().not('id','is',null));}
};

/* ---------- cola offline (modo nube) ---------- */
function queueGet(){return S.mode==='cloud'?(LS.get(lsKey('queue'))||[]):[];}
function queueSet(q){if(S.mode==='cloud'){if(q.length)LS.set(lsKey('queue'),q);else LS.del(lsKey('queue'));}updateSyncBar();}
function updateSyncBar(){const n=queueGet().length;const b=$('#syncBar');b.hidden=!n;b.textContent=n?`${n} ${n===1?'paseo pendiente':'paseos pendientes'} de subir · se sincronizan al volver la conexión`:'';}
let flushing=false;
async function flushQueue(){
  if(S.mode!=='cloud'||flushing)return;const q=queueGet();if(!q.length)return;
  flushing=true;const rest=[];
  for(const it of q){try{if(it.route)await DB.addRoute(it.route);await DB.addWalk(it.walk);}catch(e){rest.push(it);}}
  flushing=false;queueSet(rest);
  if(rest.length<q.length)toast(`Sincronizados ${q.length-rest.length} paseos`);
}
window.addEventListener('online',flushQueue);

/* =========================================================
   Datos de ejemplo (modo demo)
   ========================================================= */
const H0=DEFAULT_CENTER;
const SAMPLE_DEFS=[
  {name:'Vuelta al Parque Forestal',color:'orange',wps:[H0,[-33.4372,-70.6402],[-33.4363,-70.6428],[-33.4356,-70.6468],[-33.4369,-70.6481],[-33.4386,-70.6463],[-33.4393,-70.6431],H0]},
  {name:'La cuadra del barrio',color:'blue',wps:[H0,[-33.4396,-70.6374],[-33.4414,-70.6372],[-33.4416,-70.6401],H0]},
  {name:'Aventura al Parque Bustamante',color:'pink',wps:[H0,[-33.4383,-70.6362],[-33.4375,-70.6339],[-33.4399,-70.6322],[-33.4441,-70.6312],[-33.4468,-70.6316],[-33.4471,-70.6337],[-33.4432,-70.6353],[-33.4410,-70.6379],H0]},
];
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function makeDemo(){
  const R=rng(7);
  const dog={id:uuid(),name:'Goku',birthDate:(new Date().getFullYear()-4)+'-03-14',weight:9.4,ideal:9,size:'std',neutered:true,activity:'auto',kcal:3600,wake:'07:30'};
  const routes=SAMPLE_DEFS.map(d=>{const pts=densify(d.wps,10).map(r6);return {id:uuid(),name:d.name,color:d.color,points:pts,distance:Math.round(pathLen(pts)),created:Date.now()-30*864e5};});
  const walks=[];const now=Date.now();const today=dayStart(new Date());
  function add(day,hour,route){
    const start=day.getTime()+hour*3600e3;const speed=(2.5+R()*0.9)/3.6;const distance=route.distance*(0.96+R()*0.08);const dur=distance/speed+R()*150;
    if(start+dur*1000>now)return;
    walks.push({id:uuid(),dogId:dog.id,routeId:route.id,start,duration:Math.round(dur),distance:Math.round(distance),preview:thin(route.points,60),pee:R()<.93,poop:R()<.62,mode:'gps'});
  }
  for(let back=34;back>=0;back--){
    const day=addDays(today,-back);const dow=day.getDay();const we=dow===0||dow===6;
    if(back===0||R()<0.88)add(day,(R()<.15?6.9:7.55)+R()*1.0,we?routes[0]:(R()<.6?routes[1]:routes[0]));
    if(we&&R()<0.45)add(day,12.4+R()*1.4,routes[1]);
    if(R()<0.8)add(day,18.7+R()*1.5,we?routes[2]:(R()<.55?routes[0]:(R()<.5?routes[2]:routes[1])));
  }
  MEM.dogs=[dog];MEM.routes=routes;MEM.walks=walks;
}

/* =========================================================
   Cálculos de salud y estadísticas
   ========================================================= */
function ageMonths(d=S.dog){if(!d||!d.birthDate)return 48;const b=new Date(d.birthDate+'T12:00:00'),n=new Date();let m=(n.getFullYear()-b.getFullYear())*12+(n.getMonth()-b.getMonth());if(n.getDate()<b.getDate())m--;return Math.max(0,m);}
function ageLabel(d=S.dog){const m=ageMonths(d);if(m<12)return m+(m===1?' mes':' meses');const y=Math.floor(m/12);return y+(y===1?' año':' años');}
function stage(){const m=ageMonths();if(m<12)return 'puppy';if(m>=108)return 'senior';return 'adult';}
const STAGE_LABEL={puppy:'cachorro',adult:'adulto',senior:'senior'};
const overweight=()=>S.dog.weight>S.dog.ideal*1.1;
const underweight=()=>S.dog.weight<S.dog.ideal*0.9;
function walkRec(){
  const p=S.dog,m=ageMonths(),st=stage(),mini=p.size==='mini';
  if(st==='puppy'){const each=Math.max(5,Math.min(5*Math.max(1,m),mini?20:30));return {total:each*2,count:2,each,why:`Regla para cachorros: unos 5 minutos por mes de edad, dos veces al día (${m} ${m===1?'mes':'meses'}). Nada de saltos ni escaleras mientras crece.`};}
  let total,count,why;
  if(st==='senior'){total=mini?30:40;count=3;why='Salchicha senior: mejor varios paseos cortos y tranquilos que uno largo.';}
  else{total=mini?40:60;count=2;why=mini?'Una salchicha miniatura adulta necesita cerca de 40 minutos diarios, en dos salidas.':'Una salchicha estándar adulta necesita alrededor de una hora diaria, en dos salidas.';}
  if(overweight()){total+=10;why+=' Sumamos 10 minutos para ayudar a bajar de peso.';}
  return {total,count,each:Math.round(total/count),why};
}
const walksBetween=(a,b)=>S.walks.filter(w=>w.start>=a&&w.start<b);
const walksToday=()=>{const a=dayStart(new Date()).getTime();return walksBetween(a,a+864e5);};
const todayMin=()=>sum(walksToday(),'duration')/60;
function daysSeries(n){const out=[];const t0=dayStart(new Date());for(let i=n-1;i>=0;i--){const d=addDays(t0,-i);const ws=walksBetween(d.getTime(),addDays(d,1).getTime());out.push({date:d,min:sum(ws,'duration')/60,dist:sum(ws,'distance'),count:ws.length});}return out;}
function firstWalkDay(){if(!S.walks.length)return null;return dayStart(Math.min(...S.walks.map(w=>w.start)));}
function avgDaily(n=14){const first=firstWalkDay();if(!first)return {min:0,dist:0,days:0};const days=daysSeries(n+1).slice(0,-1).filter(d=>d.date>=first);if(!days.length){const t=daysSeries(1)[0];return {min:t.min,dist:t.dist,days:1};}return {min:sum(days,'min')/days.length,dist:sum(days,'dist')/days.length,days:days.length};}
function activityLevel(){const a=S.dog.activity;if(a!=='auto')return a;if(!S.walks.length)return 'normal';const r=avgDaily(14).min/walkRec().total;return r<0.6?'low':r>1.25?'high':'normal';}
const ACT_LABEL={low:'baja',normal:'normal',high:'alta'};
function energy(){
  const p=S.dog,st=stage(),m=ageMonths(),ow=overweight();const w=ow?p.ideal:p.weight;const rer=70*Math.pow(Math.max(.5,w),0.75);let f,fl;
  if(st==='puppy'){f=m<4?3.0:2.0;fl=m<4?'cachorro menor de 4 meses':'cachorro de 4 a 12 meses';}
  else if(ow){f=1.0;fl='plan para bajar de peso (con peso ideal)';}
  else if(st==='senior'){f=1.4;fl='senior';}
  else{f=p.neutered?1.6:1.8;fl=p.neutered?'adulto esterilizado':'adulto no esterilizado';}
  const act=activityLevel();let am=act==='low'?0.9:act==='high'?1.15:1;if(st==='puppy')am=1;
  const kcal=rer*f*am,grams=kcal/(Math.max(1000,+p.kcal||3600)/1000),meals=st==='puppy'?(m<4?4:m<6?3:2):2;
  return {rer,f,fl,am,act,kcal,grams,meals,perMeal:grams/meals,treats:kcal*0.1,water:p.weight*60,ow};
}
const MEAL_NAMES={2:['Desayuno','Cena'],3:['Desayuno','Almuerzo','Cena'],4:['Desayuno','Almuerzo','Once','Cena']};
const dayGoal=()=>S.dog.goalMin||walkRec().total;
const RTYPES={walk:{label:'Paseo',color:'#18B05A',icon:'walk'},meal:{label:'Comida',color:'#FF6B1A',icon:'bowl'},rest:{label:'Siesta',color:'#1F5EFF',icon:'moon'},meds:{label:'Remedio',color:'#E0558F',icon:'pill'},play:{label:'Juego',color:'#7C5CF0',icon:'ball'},groom:{label:'Aseo',color:'#19C3A6',icon:'bath'},other:{label:'Otro',color:'#7B7176',icon:'star'}};
const rtype=t=>RTYPES[t]||RTYPES.other;
function recommendedItems(){
  const wr=walkRec(),en=energy(),wake=hm2min(S.dog.wake);
  const walkT=wr.count===3?[wake+15,13*60,19*60]:[wake+15,19*60];
  const names=wr.count===3?['Paseo de la mañana','Paseo de mediodía','Paseo de la tarde']:['Paseo de la mañana','Paseo de la tarde'];
  const items=walkT.map((t,i)=>({t,type:'walk',label:names[i],detail:`${wr.each} min a ritmo tranquilo`}));
  let mealT;if(en.meals===2)mealT=[walkT[0]+wr.each+45,walkT[walkT.length-1]+wr.each+45];else if(en.meals===3)mealT=[walkT[0]+wr.each+45,13*60+30,walkT[walkT.length-1]+wr.each+45];else mealT=[walkT[0]+wr.each+45,12*60,16*60,walkT[walkT.length-1]+wr.each+45];
  mealT.forEach((t,i)=>items.push({t,type:'meal',label:MEAL_NAMES[en.meals][i],detail:`${round5(en.perMeal)} g de alimento`}));
  items.push({t:14*60+30,type:'rest',label:'Siesta larga',detail:'12 a 14 h de sueño al día'});
  return items.sort((a,b)=>a.t-b.t).map(x=>({id:uuid(),time:fmtHM(x.t),type:x.type,label:x.label,detail:x.detail,days:[]}));
}
const customRoutine=()=>Array.isArray(S.dog.routine)&&S.dog.routine.length>0;
function walkCount(){if(!customRoutine())return walkRec().count;const d=new Date().getDay();return S.dog.routine.filter(x=>x.type==='walk'&&(!x.days||!x.days.length||x.days.includes(d))).length||walkRec().count;}
function schedule(){
  const now=new Date(),nowMin=now.getHours()*60+now.getMinutes(),dow=now.getDay();
  const src=customRoutine()?S.dog.routine:recommendedItems();
  const items=src.filter(x=>!x.days||!x.days.length||x.days.includes(dow)).map(x=>({t:hm2min(x.time),type:x.type,label:x.label||rtype(x.type).label,detail:x.detail||''}));
  items.sort((a,b)=>a.t-b.t);
  const slots=items.filter(i=>i.type==='walk');
  walksToday().forEach(w=>{const d=new Date(w.start),m=d.getHours()*60+d.getMinutes();let best=null,bd=1e9;slots.forEach(s=>{const x=Math.abs(s.t-m);if(x<bd){bd=x;best=s;}});if(best)best.done=true;});
  items.forEach(it=>{if(it.type==='walk')it.late=!it.done&&it.t+60<nowMin;else it.done=it.t<nowMin;});
  return {items,nowMin};
}
function nextItems(){const {items,nowMin}=schedule();const late=items.filter(i=>i.type==='walk'&&i.late);const fut=items.filter(i=>i.t>=nowMin&&!i.done);return [...late.slice(-1),...fut].slice(0,3);}
function daySet(){return new Set(S.walks.map(w=>dayStart(w.start).getTime()));}
function streak(){const keys=daySet();let d=dayStart(new Date());if(!keys.has(d.getTime()))d=addDays(d,-1);let n=0;while(keys.has(d.getTime())){n++;d=addDays(d,-1);}return n;}
function streakMax(){const days=[...daySet()].sort((a,b)=>a-b);let best=0,cur=0,prev=null;days.forEach(t=>{cur=(prev!==null&&Math.round((t-prev)/864e5)===1)?cur+1:1;best=Math.max(best,cur);prev=t;});return best;}
const routeById=id=>S.routes.find(r=>r.id===id);
function routeStats(r){const ws=S.walks.filter(w=>w.routeId===r.id);const avg=ws.length?sum(ws,'duration')/ws.length:r.distance/(3/3.6);return {times:ws.length,avg,last:ws.length?Math.max(...ws.map(w=>w.start)):null,est:!ws.length};}
/* nivel: 1 XP por minuto + 10 XP por km */
function levelInfo(){const xp=Math.round(sum(S.walks,'duration')/60+sum(S.walks,'distance')/100);const need=L=>50*L*(L-1);let L=Math.max(1,Math.floor((1+Math.sqrt(1+8*xp/100))/2));while(need(L+1)<=xp)L++;while(L>1&&need(L)>xp)L--;const a=need(L),b=need(L+1);return {xp,level:L,frac:(xp-a)/(b-a),toNext:b-xp};}
const MEDALS=[
  {name:'Primer paseo',desc:'Completa tu primer paseo',color:'#18B05A',icon:'paw',test:s=>s.n>=1},
  {name:'Madrugador',desc:'Un paseo antes de las 7:30',color:'#FFB000',icon:'sun',test:s=>s.early},
  {name:'10 km',desc:'Suma 10 km caminados',color:'#1F5EFF',icon:'route',test:s=>s.km>=10},
  {name:'50 km',desc:'Suma 50 km caminados',color:'#7C5CF0',icon:'route',test:s=>s.km>=50},
  {name:'Racha de 7',desc:'7 días seguidos paseando',color:'#FF6B1A',icon:'flame',test:s=>s.smax>=7},
  {name:'Paseo de 1 h',desc:'Un paseo de una hora o más',color:'#FF7EB6',icon:'clock',test:s=>s.longest>=3600},
  {name:'Explorador',desc:'Guarda 3 rutas',color:'#19C3A6',icon:'map',test:s=>s.routes>=3},
  {name:'Noctámbulo',desc:'Un paseo después de las 21:00',color:'#3A2A8C',icon:'moon',test:s=>s.night},
];
function medalStats(){return {n:S.walks.length,km:sum(S.walks,'distance')/1000,smax:streakMax(),longest:Math.max(0,...S.walks.map(w=>w.duration)),routes:S.routes.length,
  early:S.walks.some(w=>{const d=new Date(w.start);return d.getHours()*60+d.getMinutes()<450;}),night:S.walks.some(w=>new Date(w.start).getHours()>=21)};}

/* =========================================================
   Ilustraciones
   ========================================================= */
function win(x,y,w,h,cols,rows,gx,gy,fill,rx=3){let s='';for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)s+=`<rect x="${x+c*gx}" y="${y+r*gy}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;return s;}
const tree=(x,y,r,fill)=>`<rect x="${x-4}" y="${y}" width="8" height="${r*1.25}" rx="4" fill="#7A4A2A"/><circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const star=(x,y,s,fill='#fff')=>`<path d="M${x} ${y-s}Q${x} ${y} ${x+s} ${y}Q${x} ${y} ${x} ${y+s}Q${x} ${y} ${x-s} ${y}Q${x} ${y} ${x} ${y-s}Z" fill="${fill}"/>`;
const svgUrl=s=>`url("data:image/svg+xml,${encodeURIComponent(s)}")`;
function tileFar(){return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="560" height="170" viewBox="0 0 560 170">
  <rect x="10" y="50" width="80" height="120" rx="12" fill="#1F5EFF"/>${win(24,66,13,16,3,4,22,24,'#9DB8FF')}
  <path d="M104 170V80a38 38 0 0 1 76 0v90Z" fill="#FF7EB6"/>${win(118,84,13,18,3,3,18,26,'#FFD3E6',6)}
  <rect x="196" y="92" width="92" height="78" rx="12" fill="#FF6B1A"/>${win(208,104,16,13,3,3,26,20,'#FFC08F')}
  <rect x="300" y="30" width="70" height="140" rx="35" fill="#1E1A1D"/>${win(314,64,11,15,3,4,16,22,'#FFC629')}
  <rect x="384" y="74" width="66" height="96" rx="10" fill="#9DB8FF"/>${win(396,88,12,14,3,3,18,22,'#E6EDFF')}
  <rect x="462" y="58" width="88" height="112" rx="12" fill="#18B05A"/>${win(474,72,13,15,4,4,19,22,'#9BF0C4')}
</svg>`);}
function tileNear(){return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="120" viewBox="0 0 420 120">
  <path d="M0 96Q60 78 120 92T240 88T420 94V120H0Z" fill="#18B05A"/>
  ${tree(60,62,26,'#0E8A44')}${tree(96,78,16,'#2EE59D')}${tree(250,66,22,'#0E8A44')}
  <rect x="330" y="20" width="6" height="96" rx="3" fill="#1E1A1D"/><rect x="320" y="14" width="26" height="13" rx="6.5" fill="#1E1A1D"/><circle cx="333" cy="31" r="6" fill="#FFE08A"/>
  <g transform="translate(176 92)"><rect x="0" y="8" width="15" height="20" rx="5" fill="#F0483E"/><rect x="-3" y="14" width="21" height="5" rx="2.5" fill="#C9342B"/><circle cx="7.5" cy="7" r="7" fill="#F0483E"/></g>
</svg>`);}
function tileGround(){return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="62" viewBox="0 0 128 62">
  <rect width="128" height="40" fill="#F6E2C6"/><path d="M14 2 2 38M78 2 66 38" stroke="#E7CDA8" stroke-width="3"/>
  <rect y="38" width="128" height="7" fill="#D9B88E"/><rect y="45" width="128" height="17" fill="#3A3640"/><rect x="20" y="52" width="36" height="4" rx="2" fill="#fff" opacity=".85"/>
</svg>`);}
function buildScenes(){
  const sun=`<svg class="ws-sun" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="#FF8A1F"/><path d="M32 46q6 7 12 0M56 46q6 7 12 0" stroke="#1E1A1D" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M36 60q14 12 28 0" stroke="#1E1A1D" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
  const cloud=c=>`<svg class="ws-cloud ${c}" viewBox="0 0 140 60"><rect x="4" y="22" width="130" height="34" rx="17" fill="#fff"/><circle cx="48" cy="24" r="22" fill="#fff"/><circle cx="84" cy="20" r="17" fill="#fff"/></svg>`;
  const far=tileFar(),near=tileNear(),ground=tileGround();
  $$('[data-scene]').forEach(el=>{el.insertAdjacentHTML('afterbegin',`${sun}${cloud('')}${cloud('c2')}<div class="ws-layer ws-far"></div><div class="ws-layer ws-near"></div><div class="ws-layer ws-ground"></div>`);
    $('.ws-far',el).style.backgroundImage=far;$('.ws-near',el).style.backgroundImage=near;$('.ws-ground',el).style.backgroundImage=ground;});
  $('#deskBg').style.backgroundImage=tileFar();
}
function routeSVG(points,o={}){
  const w=o.w||300,h=o.h||200,bg=o.bg||'#FF6B1A',fg=o.fg||'#fff',padX=o.pad||26,padT=o.padT||padX,padB=o.padB||padX;
  let blocks='';
  if(o.blocks!==false){const bw=52,gap=14;let i=0;for(let y=-20;y<h;y+=bw+gap){for(let x=-((i%2)*28);x<w;x+=bw+gap)blocks+=`<rect x="${x}" y="${y}" width="${bw}" height="${bw}" rx="10" fill="#fff" opacity="${((x*7+y*3)%5===0)?'.16':'.09'}"/>`;i++;}}
  if(!points||points.length<2)return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${w}" height="${h}" fill="${bg}"/>${blocks}<g transform="translate(${w/2-12} ${h/2-12})" fill="#fff" opacity=".9">${I.paw.replace('<svg','<svg width="24" height="24"')}</g></svg>`;
  const pts=thin(points,140),lat0=pts.reduce((t,p)=>t+p[0],0)/pts.length,kx=Math.cos(lat0*Math.PI/180);
  const xs=pts.map(p=>p[1]*kx),ys=pts.map(p=>-p[0]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const dx=Math.max(maxX-minX,1e-6),dy=Math.max(maxY-minY,1e-6),sc=Math.min((w-2*padX)/dx,(h-padT-padB)/dy);
  const ox=(w-dx*sc)/2,oy=padT+((h-padT-padB)-dy*sc)/2;
  const P=pts.map((p,i)=>[ox+(xs[i]-minX)*sc,oy+(ys[i]-minY)*sc]);
  const d='M'+P.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L');const sw=o.sw||5,a=P[0],b=P[P.length-1];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${w}" height="${h}" fill="${bg}"/>${blocks}
    <path d="${d}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="${sw+6}" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 3)"/>
    <path d="${d}" fill="none" stroke="${fg}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${b[0]}" cy="${b[1]}" r="${sw+1}" fill="#1E1A1D" stroke="#fff" stroke-width="2.5"/><circle cx="${a[0]}" cy="${a[1]}" r="${sw+1.5}" fill="#fff" stroke="#1E1A1D" stroke-width="3"/></svg>`;
}
const walkPts=w=>(w.preview&&w.preview.length>1)?w.preview:((routeById(w.routeId)||{}).points||[]);
const walkColor=w=>COLORS[(routeById(w.routeId)||{}).color||'ink'][0];

/* ---------- charts ---------- */
let chartSeq=0;
function niceStep(raw){const p=Math.pow(10,Math.floor(Math.log10(Math.max(raw,1e-9))));const n=raw/p;return(n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p;}
function roundTop(x,y,w,h,r){if(h<=0.5)return '';r=Math.min(r,h,w/2);return `M${x} ${y+h}V${y+r}Q${x} ${y} ${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h}Z`;}
function barChart(o){
  const W=Math.max(260,o.width||340),Hh=o.height||220,ml=34,mr=6,mt=26,mb=o.sub?44:28,iw=W-ml-mr,ih=Hh-mt-mb;
  const top=Math.max(...o.data.map(d=>d.value+(d.proj||0)),o.goal||0,1)*1.12;const step=niceStep(top/4),ymax=Math.ceil(top/step)*step;
  const y=v=>mt+ih-(v/ymax)*ih,band=iw/o.data.length,bw=Math.min(o.maxBar||26,band*0.62),pid='hatch'+(++chartSeq);
  const halo='paint-order:stroke;stroke:#fff;stroke-width:5px;stroke-linejoin:round';
  let s=`<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" role="img" aria-label="${esc(o.aria||'')}"><defs><pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fff"/><rect width="2.5" height="6" fill="#9DB8FF"/></pattern></defs>`;
  for(let v=0;v<=ymax+1e-9;v+=step){const yy=y(v).toFixed(1);s+=`<line x1="${ml}" x2="${W-mr}" y1="${yy}" y2="${yy}" stroke="${v===0?'#DCCBB4':'#F3E8D8'}" stroke-width="${v===0?2:1}"/><text x="${ml-7}" y="${+yy+4}" text-anchor="end">${nf0.format(v)}</text>`;}
  o.data.forEach((d,i)=>{const cx=ml+band*i+band/2,x=cx-bw/2;
    if(d.value>0)s+=`<path d="${roundTop(x,y(d.value),bw,(d.value/ymax)*ih,4)}" fill="${o.color}"/>`;
    if(d.proj>0){const y1=y(d.value+d.proj),ph=(d.proj/ymax)*ih-(d.value>0?2:0);if(ph>1)s+=`<path d="${roundTop(x+.75,y1,bw-1.5,ph,4)}" fill="url(#${pid})" stroke="${o.color}" stroke-width="1.5"/>`;}
    s+=`<text x="${cx}" y="${Hh-mb+17}" text-anchor="middle" class="${d.strong?'axis-strong':''}">${esc(d.label)}</text>`;
    if(o.sub&&d.sub!=null)s+=`<text x="${cx}" y="${Hh-mb+32}" text-anchor="middle" class="${d.strong?'axis-strong':''}">${esc(d.sub)}</text>`;
    if(d.showVal&&(d.value+(d.proj||0))>0)s+=`<text x="${cx}" y="${y(d.value+(d.proj||0))-7}" text-anchor="middle" class="axis-strong" style="${halo}">${esc(d.valLabel)}</text>`;});
  if(o.goal){const gy=y(o.goal);s+=`<line x1="${ml}" x2="${W-mr}" y1="${gy}" y2="${gy}" stroke="#4A4247" stroke-width="2" stroke-dasharray="6 6"/><text x="${ml+5}" y="${gy-7}" class="axis-strong" style="${halo}">${esc(o.goalLabel)}</text>`;}
  o.data.forEach((d,i)=>{s+=`<rect x="${ml+band*i}" y="${mt}" width="${band}" height="${ih}" fill="transparent" data-tip="${esc(d.tip)}" data-ax="${ml+band*i+band/2}" data-ay="${y(d.value+(d.proj||0))}"/>`;});
  return s+'</svg>';
}

/* =========================================================
   Pantallas y navegación
   ========================================================= */
function show(scr){$$('.screen').forEach(s=>s.classList.toggle('on',s.id==='scr-'+scr));window.scrollTo(0,0);}
function go(v){
  S.view=v;$$('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+v));
  $$('.bnav [data-go]').forEach(b=>b.classList.toggle('on',b.dataset.go===v||((v==='ajustes'||v==='fotos')&&b.dataset.go==='perfil')));
  if(v==='stats')renderStats();if(v==='ajustes')renderSettings();if(v==='fotos')renderGallery();
  window.scrollTo(0,0);
}
/* Animaciones de Goku como hojas de sprites (Safari no reproduce bien el WebP animado) */
const SPRITE_META={caminando:{n:24,cols:6,rows:4,w:360,h:252,dur:40},ladeando:{n:24,cols:6,rows:4,w:380,h:370,dur:100},durmiendo:{n:25,cols:5,rows:5,w:420,h:248,dur:120}};
const sprites=new Set();
function makeSprite(el,k){const m=SPRITE_META[k];el.style.backgroundImage=`url("${ASSETS[k]}")`;el.style.backgroundSize=`${m.cols*100}% ${m.rows*100}%`;el.style.backgroundPosition='0% 0%';el.style.aspectRatio=`${m.w} / ${m.h}`;el._sp={k,m,f:-1,t0:performance.now()-Math.random()*800};sprites.add(el);}
function bindAssets(root=document){
  $$('[data-asset]',root).forEach(el=>{
    const k=el.dataset.asset;
    if(SPRITE_META[k]&&ASSETS[k]){
      if(el.tagName==='IMG'){const sp=document.createElement('span');sp.className=el.className+' sprite';if(el.id)sp.id=el.id;sp.dataset.asset=k;sp.setAttribute('role','img');if(el.alt)sp.setAttribute('aria-label',el.alt);else sp.setAttribute('aria-hidden','true');el.replaceWith(sp);el=sp;}
      if(!el._sp||el._sp.k!==k)makeSprite(el,k);
    }else if(el.tagName==='IMG'&&ASSETS[k]&&el.getAttribute('src')!==ASSETS[k])el.src=ASSETS[k];
  });
}
function spriteLoop(now){
  sprites.forEach(el=>{if(!el.isConnected){sprites.delete(el);return;}if(!el.offsetParent)return;const s=el._sp,f=Math.floor((now-s.t0)/s.m.dur)%s.m.n;
    if(f!==s.f){s.f=f;const c=f%s.m.cols,r=Math.floor(f/s.m.cols);el.style.backgroundPosition=`${s.m.cols>1?c/(s.m.cols-1)*100:0}% ${s.m.rows>1?r/(s.m.rows-1)*100:0}%`;}});
  requestAnimationFrame(spriteLoop);
}
requestAnimationFrame(spriteLoop);
/* URLs de fotos (firmadas en Supabase Storage, o locales en demo) */
const urlCache=new Map();
function urlFor(path){if(!path)return null;if(/^(blob:|data:|https?:)/.test(path))return path;const c=urlCache.get(path);return c&&c.exp>Date.now()?c.url:null;}
async function ensureUrls(paths){
  const need=[...new Set(paths.filter(p=>p&&!urlFor(p)))];if(!need.length||S.mode!=='cloud')return;
  for(let i=0;i<need.length;i+=100){const {data,error}=await sb.storage.from(BUCKET).createSignedUrls(need.slice(i,i+100),3600);if(error){console.warn(error);continue;}(data||[]).forEach(d=>{if(d.signedUrl)urlCache.set(d.path,{url:d.signedUrl,exp:Date.now()+3300e3});});}
}
const avatarSrc=d=>(d&&urlFor(d.avatarPath))||ASSETS.cara||'';
function renderBinds(){$$('[data-bind="dogname"]').forEach(e=>e.textContent=S.dog?S.dog.name:'');const a=$('#dogSwitch img');if(a&&S.dog)a.src=avatarSrc(S.dog);}
function renderAll(){if(!S.dog)return;renderBinds();renderProfile();renderRoutes();if(S.view==='stats')renderStats();renderHealth();if(S.view==='ajustes')renderSettings();if(S.view==='fotos')renderGallery();$('#demoBar').hidden=S.mode!=='demo';$('#scr-main').classList.toggle('demo',S.mode==='demo');updateSyncBar();}

/* ---------- toast & tooltip ---------- */
let toastT;
function toast(msg,ms=2800){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),ms);}
const tipEl=$('#tooltip');
function showTip(el){const raw=el.getAttribute('data-tip');if(!raw)return;const parts=raw.split('|');tipEl.innerHTML=`<b>${esc(parts[0])}</b>`+parts.slice(1).map(x=>'<br>'+esc(x)).join('');
  const svg=el.ownerSVGElement,r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;const x=r.left+(+el.dataset.ax)*r.width/vb.width,y=r.top+(+el.dataset.ay)*r.height/vb.height;
  tipEl.style.left=Math.max(90,Math.min(window.innerWidth-90,x))+'px';tipEl.style.top=Math.max(70,y)+'px';tipEl.classList.add('show');
  $$('rect[data-tip]',svg).forEach(h=>h.setAttribute('fill','transparent'));el.setAttribute('fill','rgba(31,94,255,.07)');}
function hideTip(){tipEl.classList.remove('show');$$('rect[data-tip]').forEach(h=>h.setAttribute('fill','transparent'));}
document.addEventListener('mouseover',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t);else if(tipEl.classList.contains('show'))hideTip();});
document.addEventListener('touchstart',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t)showTip(t);else hideTip();},{passive:true});
window.addEventListener('scroll',hideTip,{passive:true});

/* ---------- sheets ---------- */
let sheetClose=null;
function openSheet(html,opts={}){
  closeSheet(true);
  const layer=$('#layer');
  layer.innerHTML=`<div class="overlay" data-close></div><div class="sheet ${opts.cls||''}" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  const sh=$('.sheet',layer);bindAssets(sh);
  sheetClose=opts.onClose||null;
  if(!opts.sticky)$('.overlay',layer).onclick=()=>closeSheet();
  return sh;
}
function closeSheet(silent){const layer=$('#layer');if(!layer.innerHTML)return;const cb=sheetClose;sheetClose=null;layer.innerHTML='';if(cb&&!silent)cb();}
document.addEventListener('keydown',e=>{const lb=$('#lightbox');if(lb&&!lb.hidden&&!$('#layer').innerHTML){if(e.key==='Escape')closeLightbox();if(e.key==='ArrowRight'&&lbIdx<lbList.length-1){lbIdx++;renderLightbox();}if(e.key==='ArrowLeft'&&lbIdx>0){lbIdx--;renderLightbox();}return;}if(e.key==='Escape'&&!$('#layer .sheet.sticky'))closeSheet();});
function confirmSheet(title,text,okLabel,onOk,danger=true,onCancel=null,cancelLabel='Cancelar'){
  const sh=openSheet(`<h2>${esc(title)}</h2><p class="sub" style="margin:8px 0 18px">${text}</p><div class="row-actions"><button class="btn btn-ghost" id="cfNo">${esc(cancelLabel)}</button><button class="btn ${danger?'btn-red':'btn-orange'}" id="cfOk">${esc(okLabel)}</button></div>`,{onClose:onCancel});
  $('#cfNo',sh).onclick=()=>closeSheet();
  $('#cfOk',sh).onclick=async()=>{const b=$('#cfOk',sh);b.disabled=true;b.innerHTML='<span class="spin"></span>';try{closeSheet(true);await onOk();}catch(e){console.error(e);toast('No se pudo completar. Revisa tu conexión.');}};
}

/* =========================================================
   PERFIL (ficha con arco de nivel)
   ========================================================= */
function renderProfile(){
  const d=S.dog,lv=levelInfo(),night=isNight();
  const sky=$('#pgSky');sky.classList.toggle('night',night);
  const asset=night?'durmiendo':'ladeando';if($('#pgDog').dataset.asset!==asset){$('#pgDog').dataset.asset=asset;}bindAssets(sky);$('#pgDog').classList.toggle('sleep',night);
  if(!$('#pgBokeh').innerHTML){const R=rng(3);let b='';for(let i=0;i<6;i++){const s=60+R()*120;b+=`<span style="width:${s}px;height:${s}px;left:${R()*90}%;top:${R()*80}%"></span>`;}
    [[12,36],[86,30],[92,60],[7,66],[74,48]].forEach(([x,y],i)=>{b+=`<i style="left:${x}%;top:${y}%;animation-delay:${i*.6}s"></i>`;});$('#pgBokeh').innerHTML=b;}
  $('#pgLvlNum').textContent=lv.level;
  const cx=200,cy=192,r=176,th=Math.PI-Math.PI*Math.max(0.001,Math.min(.999,lv.frac));const px=cx+r*Math.cos(th),py=cy-r*Math.sin(th);
  let sparks='';for(let i=1;i<=5;i++){const t2=th+i*0.035;sparks+=`<circle cx="${(cx+(r+(i%2?6:-6))*Math.cos(t2)).toFixed(1)}" cy="${(cy-(r+(i%2?6:-6))*Math.sin(t2)).toFixed(1)}" r="${2.2-i*.3}" fill="#fff" opacity="${1-i*.15}"/>`;}
  $('#pgArc').innerHTML=`<defs><filter id="glw" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>
    <path d="M${cx-r} ${cy}A${r} ${r} 0 0 1 ${cx+r} ${cy}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>
    <path d="M${cx-r} ${cy}A${r} ${r} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    ${sparks}<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="12" fill="#fff" filter="url(#glw)" opacity=".8"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="8" fill="#fff"/>`;
  const tm=Math.round(todayMin()),goal=dayGoal(),wcount=walkCount();
  const km=sum(S.walks,'distance')/1000,left=Math.max(0,goal-tm),done=walksToday().length;
  const nx=nextItems();
  const ws=weekStart(new Date());const wk=[];for(let i=0;i<7;i++){const a=addDays(ws,i);const m=sum(walksBetween(a.getTime(),addDays(a,1).getTime()),'duration')/60;wk.push({a,m});}
  const wmax=Math.max(goal,...wk.map(x=>x.m),1);const todayKey=dayStart(new Date()).getTime();
  const ms=medalStats();
  $('#pgCard').innerHTML=`
    <div class="pg-name"><h1>${esc(d.name)}</h1><button data-action="edit-dog" aria-label="Editar perfil">${I.pencil}</button></div>
    <div class="pg-hp"><i style="width:${Math.min(100,tm/goal*100)}%"></i></div>
    <button class="pg-hptxt" data-action="edit-goals" aria-label="Editar metas">${tm} / ${goal} MIN HOY ${I.pencil}</button>
    <div class="pg-3">
      <div><b>${nf1.format(d.weight)}kg</b><span>Peso</span></div>
      <div class="mid pg-type"><i>${I.paw}</i><span>Salchicha</span></div>
      <div><b>${ageLabel(d)}</b><span>Edad</span></div>
    </div>
    <hr class="pg-hr">
    <div class="pg-2">
      <div><b><span style="color:var(--blue)">${I.route}</span>${nf1.format(km)}</b><span>Km totales</span></div>
      <div><b><span style="color:var(--tan)">${I.paw}</span>${nf0.format(S.walks.length)}</b><span>Paseos</span></div>
    </div>
    <div class="pg-act"><button class="pg-btn" data-action="start-sheet">Pasear</button><div class="pg-cost"><span>${I.clock}${left?left+' min':'¡listo!'}</span><span style="color:var(--tan)">${I.paw}<b style="color:var(--slate)">${done}/${wcount}</b></span></div></div>
    <div class="pg-act soft"><button class="pg-btn soft" data-go="rutas">Rutas</button><div class="pg-cost"><span>${I.route}${S.routes.length}</span></div></div>
    <div class="pg-sec">
      <div class="xp-row"><span>XP ${nf0.format(lv.xp)}</span><span>faltan ${nf0.format(lv.toNext)} para NV ${lv.level+1}</span></div>
      <div class="goalbar"><i style="width:${lv.frac*100}%;background:linear-gradient(90deg,#9DB8FF,#1F5EFF)"></i></div>
    </div>
    <div class="pg-sec"><h3>${I.camera.replace('<svg','<svg width="20" height="20"')}Álbum<small>${S.photos.length} ${S.photos.length===1?'foto':'fotos'}</small></h3>
      <div class="album-strip">${S.photos.slice(0,8).map((p,i)=>`<button class="polaroid mini" data-photo="${p.id}" style="--r:${[-3,2,-1.5,3,-2,1.5,-2.5,2.5][i%8]}deg"><span class="ph-img"><img data-thumb="${p.id}" alt=""></span></button>`).join('')}
        <button class="polaroid mini add" data-action="add-photo"><span class="ph-img">${I.camera}<b>Subir</b></span></button></div>
      ${S.photos.length?`<button class="btn btn-white btn-block btn-sm" data-go="fotos" style="margin-top:12px">${I.grid}Ver álbum completo</button>`:''}
    </div>
    <div class="pg-sec"><h3>${I.clock.replace('<svg','<svg width="20" height="20"')}Lo que viene hoy<button class="link-btn mini-link" data-action="edit-routine">Editar</button></h3>
      <div class="next-list">${nx.length?nx.map(it=>{const col=rtype(it.type).color;return `<div class="next-item ${it.late?'late':''}"><span class="dot" style="background:${col}"></span><span class="t">${fmtHM(it.t)}</span><span class="l">${esc(it.label)}<small>${it.late?'Pendiente':esc(it.detail)}</small></span></div>`;}).join(''):`<p class="muted" style="font-weight:700">Todo listo por hoy. ¡A descansar!</p>`}</div>
    </div>
    <div class="pg-sec"><h3>${I.trend.replace('<svg','<svg width="20" height="20"')}Esta semana<small>${nf0.format(Math.round(sum(wk,'m')))} min</small></h3>
      <div class="minibars">${wk.map(x=>`<div class="${x.a.getTime()===todayKey?'today':''}"><i class="${x.m>=goal?'met':''}" style="height:${Math.max(3,x.m/wmax*92)}px" title="${Math.round(x.m)} min"></i>${DOW1[x.a.getDay()]}</div>`).join('')}</div>
    </div>
    <div class="pg-sec"><h3>${I.flame.replace('<svg','<svg width="20" height="20"')}Logros<small>${MEDALS.filter(m=>m.test(ms)).length} de ${MEDALS.length}</small></h3>
      <div class="medals">${MEDALS.map((m,i)=>{const ok=m.test(ms);return `<button class="medal ${ok?'':'locked'}" data-medal="${i}"><span class="m" style="background:${m.color}">${I[m.icon]}</span>${esc(m.name)}</button>`;}).join('')}</div>
    </div>`;
  hydratePhotos($('#pgCard'));
}

/* =========================================================
   RUTAS
   ========================================================= */
function renderRoutes(){
  const body=$('#routesBody');
  if(!S.routes.length){body.innerHTML=`<div class="empty"><img data-asset="ladeando" alt=""><h3>Todavía no hay rutas</h3><p>Sal a pasear con el GPS y al terminar guarda el recorrido con un nombre.</p><button class="btn btn-orange btn-block" data-action="start-free">${I.play}Grabar una ruta</button></div>`;bindAssets(body);return;}
  const routes=[...S.routes].sort((a,b)=>routeStats(b).times-routeStats(a).times);
  body.innerHTML=routes.map(r=>{const st=routeStats(r);const [c,cd]=COLORS[r.color]||COLORS.orange;
    return `<article class="route-card"><div class="route-top">${routeSVG(r.points,{w:440,h:150,bg:c,padT:34,padB:58,pad:40})}
      <svg class="hill" viewBox="0 0 340 56" preserveAspectRatio="none"><path d="M0 22Q90 0 180 15T340 11V56H0Z" fill="${cd}"/></svg>
      <span class="times">${I.paw} ${st.times} ${st.times===1?'paseo':'paseos'}</span><h3 style="${r.color==='yellow'?'color:var(--ink)':''}">${esc(r.name)}</h3></div>
      <div class="route-body"><div class="rstats"><div><b>${fmtKm(r.distance)}</b><span>distancia</span></div><div><b>${fmtDur(st.avg)}</b><span>${st.est?'estimado':'promedio'}</span></div><div><b>${st.last?relDay(st.last):'–'}</b><span>última vez</span></div></div>
      <div class="route-actions"><button class="btn btn-white" data-route="${r.id}">${I.map}Ver</button><button class="btn btn-orange" data-walk-route="${r.id}">${I.play}Pasear</button></div></div></article>`;}).join('');
}
function openRouteSheet(id){
  const r=routeById(id);if(!r)return;const st=routeStats(r);
  const sh=openSheet(`<div class="sheet-head"><div style="min-width:0"><h2 style="font-size:26px">${esc(r.name)}</h2><p class="sub">${st.times} ${st.times===1?'paseo':'paseos'} · ${fmtKm(r.distance,2)}</p></div><button class="icon-btn sheet-x" data-close aria-label="Cerrar">${I.x}</button></div>
    <div class="route-map" id="routeMap"></div>
    <div class="rstats" style="margin-bottom:14px"><div><b>${fmtKm(r.distance,2)}</b><span>distancia</span></div><div><b>${fmtDur(st.avg)}</b><span>${st.est?'estimado':'promedio'}</span></div><div><b>${nf0.format(Math.round(r.distance/DOG_STEP))}</b><span>pasitos</span></div></div>
    <div class="row-actions"><button class="btn btn-orange" data-walk-route="${r.id}">${I.play}Pasear esta ruta</button></div>
    <div class="mini-actions"><button class="btn btn-white btn-sm" data-sim-route="${r.id}">Simular</button><button class="btn btn-white btn-sm" id="rnBtn">Renombrar</button><button class="btn btn-white btn-sm" id="rdBtn" style="color:var(--red)">Eliminar</button></div>`);
  $('[data-close]',sh).onclick=()=>closeSheet();
  $('#rnBtn',sh).onclick=()=>renameSheet(r);
  $('#rdBtn',sh).onclick=()=>confirmSheet('¿Eliminar esta ruta?',`Se borra <b>${esc(r.name)}</b>. Los paseos que hiciste por ella se conservan.`,'Eliminar',async()=>{await DB.deleteRoute(r.id);S.routes=S.routes.filter(x=>x.id!==r.id);S.walks.forEach(w=>{if(w.routeId===r.id)w.routeId=null;});renderAll();toast('Ruta eliminada');});
  if(!window.L){$('#routeMap',sh).innerHTML=routeSVG(r.points,{w:440,h:300,bg:COLORS[r.color][0]});return;}
  setTimeout(()=>{const m=L.map($('#routeMap',sh),{zoomControl:true,scrollWheelZoom:false,attributionControl:true});tiles().addTo(m);const c=COLORS[r.color]||COLORS.orange;
    L.polyline(r.points,{color:'#fff',weight:12,lineCap:'round',lineJoin:'round'}).addTo(m);L.polyline(r.points,{color:r.color==='yellow'?'#D9A300':c[0],weight:6,lineCap:'round',lineJoin:'round'}).addTo(m);
    L.marker(r.points[0],{icon:startIcon(),interactive:false}).addTo(m);m.fitBounds(L.latLngBounds(r.points),{padding:[30,30]});},60);
}
function renameSheet(r){
  const sh=openSheet(`<h2>Renombrar ruta</h2><input class="input" id="rnInput" maxlength="60" value="${esc(r.name)}" style="margin:16px 0"><div class="row-actions"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-orange" id="rnOk">Guardar</button></div>`);
  $('[data-close]',sh).onclick=()=>closeSheet();const inp=$('#rnInput',sh);setTimeout(()=>inp.focus(),100);
  $('#rnOk',sh).onclick=async()=>{const name=inp.value.trim();if(!name)return;try{await DB.renameRoute(r.id,name);r.name=name;closeSheet();renderAll();toast('Ruta renombrada');}catch(e){toast('No se pudo guardar. Revisa tu conexión.');}};
}

/* =========================================================
   ESTADÍSTICAS
   ========================================================= */
function renderStats(){
  const body=$('#statsBody');
  if(!S.walks.length){body.innerHTML=`<div class="empty"><img data-asset="durmiendo" alt=""><h3>Aún no hay números</h3><p>Cuando ${esc(S.dog.name)} salga a pasear verás minutos por día, la proyección de la semana y sus horarios favoritos.</p><button class="btn btn-orange btn-block" data-action="start-sheet">${I.play}Primer paseo</button></div>`;bindAssets(body);return;}
  const now=new Date(),goal=dayGoal(),tm=todayMin();
  const w0=weekStart(now),wk=walksBetween(w0.getTime(),addDays(w0,7).getTime()),weekMin=sum(wk,'duration')/60,weekDist=sum(wk,'distance');
  const avg=avgDaily(14),dowMon=(now.getDay()+6)%7,daysLeft=6-dowMon;
  const projWeek=weekMin+Math.max(0,avg.min-tm)+avg.min*daysLeft,projDist=weekDist+Math.max(0,avg.dist-sum(walksToday(),'distance'))+avg.dist*daysLeft;
  const weekGoal=goal*7,met=daysSeries(7).filter(d=>d.min>=goal).length;
  const totDur=sum(S.walks,'duration'),totDist=sum(S.walks,'distance'),speed=totDur?(totDist/1000)/(totDur/3600):0;
  const hours=new Array(24).fill(0);S.walks.forEach(w=>hours[new Date(w.start).getHours()]++);const bh=hours.indexOf(Math.max(...hours));
  const st=streak(),cw=Math.max(250,(body.clientWidth||390)-32-36);
  const series=daysSeries(14);
  const chart1=barChart({width:cw,height:210,color:'#1F5EFF',goal,goalLabel:`Meta ${goal} min`,sub:true,aria:'Minutos por día, últimos 14 días',
    data:series.map((d,i)=>({label:DOW1[d.date.getDay()],sub:d.date.getDate(),value:d.min,strong:i===13,showVal:i===13,valLabel:Math.round(d.min)+'',tip:`${cap(new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'short'}).format(d.date))}|${Math.round(d.min)} min · ${fmtKm(d.dist)}|${d.count} ${d.count===1?'paseo':'paseos'}`}))});
  const weeks=[];for(let i=5;i>=0;i--){const a=addDays(w0,-7*i);const ws=walksBetween(a.getTime(),addDays(a,7).getTime());weeks.push({a,min:sum(ws,'duration')/60,n:ws.length});}
  const chart2=barChart({width:cw,height:220,color:'#1F5EFF',goal:weekGoal,goalLabel:`Meta ${nf0.format(weekGoal)}`,sub:true,maxBar:34,aria:'Minutos por semana',
    data:weeks.map((w,i)=>{const cur=i===5,pr=cur?Math.max(0,projWeek-w.min):0;return {label:cur?'Esta':`${w.a.getDate()} ${MES[w.a.getMonth()]}`,sub:cur?'semana':'',value:w.min,proj:pr,strong:cur,showVal:cur,valLabel:`≈${nf0.format(Math.round(w.min+pr))}`,tip:cur?`Esta semana|${nf0.format(Math.round(w.min))} min hasta ahora|Proyección ≈${nf0.format(Math.round(projWeek))} min`:`Semana del ${w.a.getDate()} ${MES[w.a.getMonth()]}|${nf0.format(Math.round(w.min))} min · ${w.n} paseos`};})});
  const tod=[['Mañana',5,12],['Mediodía',12,17],['Tarde',17,21],['Noche',21,29]].map(([l,a,b])=>({l,n:S.walks.filter(w=>{let h=new Date(w.start).getHours();if(h<5)h+=24;return h>=a&&h<b;}).length}));const todMax=Math.max(...tod.map(t=>t.n),1);
  const rc=S.routes.map(r=>({r,n:S.walks.filter(w=>w.routeId===r.id).length})).filter(x=>x.n).sort((a,b)=>b.n-a.n).slice(0,4);const free=S.walks.filter(w=>!routeById(w.routeId)).length;if(free)rc.push({r:{name:'Paseo libre',color:'ink'},n:free});const rMax=Math.max(...rc.map(x=>x.n),1);
  const hist=S.walks.slice(0,S.histN),pct=Math.round(projWeek/weekGoal*100);
  const w14=walksBetween(addDays(dayStart(now),-13).getTime(),Date.now()+1),minOk={n:w14.length,ok:w14.filter(w=>w.duration>=perWalkMin()*60).length,avg:w14.length?sum(w14,'duration')/w14.length:0};
  body.innerHTML=`
  <div class="g2">
    <div class="card kpi"><span class="label"><span class="ic ic-orange">${I.clock}</span>Hoy</span><span class="big-num">${Math.round(tm)}<small>min</small></span><div class="goalbar"><i style="width:${Math.min(100,tm/goal*100)}%"></i></div><span class="foot">Meta: ${goal} min</span></div>
    <div class="card kpi"><span class="label"><span class="ic ic-blue">${I.trend}</span>Semana</span><span class="big-num">${nf0.format(Math.round(weekMin))}<small>min</small></span><span class="foot">${wk.length} paseos desde el lunes</span></div>
    <div class="card kpi"><span class="label"><span class="ic ic-pink">${I.route}</span>Distancia</span><span class="big-num">${nf1.format(weekDist/1000)}<small>km</small></span><span class="foot">${nf0.format(Math.round(weekDist/DOG_STEP))} pasitos esta semana</span></div>
    <div class="card kpi"><span class="label"><span class="ic ic-green">${I.flame}</span>Racha</span><span class="big-num">${st}<small>${st===1?'día':'días'}</small></span><span class="foot">${met} de 7 días con meta</span></div>
  </div>
  <div class="card"><div class="chart-head"><div><h3>Minutos por día</h3><p>Últimos 14 días · toca una barra</p></div></div><div class="legend"><span><i style="background:#1F5EFF"></i>Minutos</span><span><i class="line"></i>Meta diaria</span></div><div class="chart">${chart1}</div></div>
  <div class="card"><div class="ctitle"><span class="ic ic-blue">${I.trend}</span><h3>Estimaciones</h3><span class="badge ${pct>=100?'good':'warn'}">${pct>=100?I.check:I.alert}${pct}% meta semanal</span></div>
    <div class="est-list">
      <div class="est hl"><span>Proyección semana</span><b>≈ ${nf0.format(Math.round(projWeek))} min</b><small>Meta ${nf0.format(weekGoal)} min</small></div>
      <div class="est"><span>Promedio diario</span><b>${Math.round(avg.min)} min</b><small>últimos ${avg.days} días</small></div>
      <div class="est"><span>Distancia semana</span><b>≈ ${nf1.format(projDist/1000)} km</b><small>${nf1.format(avg.dist/1000)} km por día</small></div>
      <div class="est"><span>Si siguen así, este mes</span><b>≈ ${nf0.format(Math.round(avg.min*30/60))} h</b><small>≈ ${nf0.format(Math.round(avg.dist*30/1000))} km</small></div>
      <div class="est"><span>Velocidad promedio</span><b>${nf1.format(speed)} km/h</b><small>con olfateos incluidos</small></div>
      <div class="est"><span>Horario favorito</span><b>${pad(bh)}:00</b><small>a ${pad((bh+1)%24)}:00 h</small></div>
      <div class="est"><span>Paseos sobre el mínimo</span><b>${minOk.ok} de ${minOk.n}</b><small>últimos 14 días · mínimo ${perWalkMin()} min</small></div>
      <div class="est"><span>Paseo promedio</span><b>${minOk.n?fmtDur(minOk.avg):'–'}</b><small>duración por salida</small></div>
    </div>
    <p class="hint" style="margin-top:12px">${projWeek>=weekGoal?'Van muy bien: a este ritmo terminan la semana sobre la meta.':`Para llegar a la meta semanal necesitan ≈ ${Math.max(0,Math.round((weekGoal-weekMin)/(daysLeft+1)))} min diarios lo que queda de semana.`}</p></div>
  <div class="card"><div class="chart-head"><div><h3>Minutos por semana</h3><p>Últimas 6 semanas</p></div></div><div class="legend"><span><i style="background:#1F5EFF"></i>Real</span><span><i class="proj"></i>Proyección</span><span><i class="line"></i>Meta</span></div><div class="chart">${chart2}</div></div>
  <div class="card"><div class="ctitle"><span class="ic ic-orange">${I.sun}</span><h3>¿A qué hora pasean?</h3></div><div class="hbars">${tod.map(t=>`<div class="hbar"><span>${t.l}</span><div class="track"><i style="width:${t.n/todMax*100}%"></i></div><em>${t.n}</em></div>`).join('')}</div></div>
  <div class="card"><div class="ctitle"><span class="ic ic-pink">${I.route}</span><h3>Rutas más usadas</h3></div><div class="hbars">${rc.map(x=>`<div class="hbar" style="grid-template-columns:120px 1fr 34px"><span title="${esc(x.r.name)}">${esc(x.r.name)}</span><div class="track"><i style="width:${x.n/rMax*100}%;background:${(COLORS[x.r.color]||COLORS.orange)[0]}"></i></div><em>${x.n}</em></div>`).join('')}</div></div>
  <div class="card"><div class="ctitle"><span class="ic ic-green">${I.paw}</span><h3>Historial</h3><span class="badge">${S.walks.length} paseos</span></div>
    <div class="history">${hist.map(w=>{const r=routeById(w.routeId);return `<div class="hrow"><div class="thumb">${routeSVG(walkPts(w),{w:48,h:48,bg:walkColor(w),pad:8,sw:3,blocks:false})}</div>
      <div class="name">${esc(r?r.name:'Paseo libre')}<span class="ico">${w.pee?I.pee:''}${w.poop?I.poop:''}</span><small>${relDay(w.start)} · ${timeOf(w.start)}</small></div>
      <div class="val">${fmtDur(w.duration)}<small>${fmtKm(w.distance)}</small></div><button class="icon-btn" data-del-walk="${w.id}" aria-label="Eliminar paseo">${I.trash}</button></div>`;}).join('')}</div>
    ${S.walks.length>S.histN?`<button class="btn btn-white btn-block btn-sm" id="moreHist" style="margin-top:10px">Ver más</button>`:''}</div>`;
  const mh=$('#moreHist');if(mh)mh.onclick=()=>{S.histN+=20;renderStats();};
}

/* =========================================================
   SALUD
   ========================================================= */
function renderHealth(){
  const p=S.dog,en=energy(),wr=walkRec(),st=stage(),sc=schedule(),tm=Math.round(todayMin()),avg=avgDaily(14),goal=dayGoal(),avgOk=avg.min>=goal*0.9;
  const month=new Date().getMonth(),hot=[10,11,0,1,2].includes(month),cold=[5,6,7].includes(month);
  const alerts=[];
  if(en.ow)alerts.push(['warn',I.scale,`${esc(p.name)} está ${nf1.format(p.weight-p.ideal)} kg sobre su peso ideal. Calculamos la comida con el peso ideal y sumamos 10 min de paseo.`]);
  else if(underweight())alerts.push(['warn',I.scale,`${esc(p.name)} está bajo su peso ideal. Consulta con el veterinario antes de aumentar la porción.`]);
  else alerts.push(['good',I.check,`Peso en rango: ${nf1.format(p.weight)} kg (ideal ${nf1.format(p.ideal)} kg).`]);
  if(hot)alerts.push(['warn',I.thermo,'Temporada de calor: evita pasear entre 12:00 y 17:00. La vereda quema y las salchichas van muy cerca del suelo.']);
  if(cold)alerts.push(['info',I.coat,'Hace frío: con patas cortas y panza cerca del suelo, un abriguito ayuda en los paseos.']);
  if(st==='puppy')alerts.push(['info',I.info,'Cachorro en crecimiento: paseos cortos, nada de saltos y muchas siestas.']);
  if(st==='senior')alerts.push(['info',I.info,'Etapa senior: controles cada 6 meses y atención a rigidez o dolor de espalda.']);
  let tl='',placed=false;
  sc.items.forEach(it=>{if(!placed&&it.t>sc.nowMin){tl+=`<div class="tl-now"><span>${fmtHM(sc.nowMin)}</span><span class="nd"></span><span>Ahora</span></div>`;placed=true;}
    const ic=I[rtype(it.type).icon],bg=rtype(it.type).color;
    const badge=it.type==='walk'?(it.done?`<span class="badge good">${I.check}Hecho</span>`:it.late?`<span class="badge warn">Pendiente</span>`:''):'';
    tl+=`<div class="tl-item ${it.done&&it.type!=='walk'?'past':''}"><span class="time">${fmtHM(it.t)}</span><span class="node" style="background:${bg}">${ic}</span><span class="what">${esc(it.label)}<small>${esc(it.detail)}</small></span>${badge}</div>`;});
  if(!placed)tl+=`<div class="tl-now"><span>${fmtHM(sc.nowMin)}</span><span class="nd"></span><span>Ahora</span></div>`;
  $('#healthBody').innerHTML=`
    <div class="card"><div class="ctitle"><span class="ic ic-orange">${I.bowl}</span><h3>Cuánto comer</h3><span class="badge">${STAGE_LABEL[st]}</span></div>
      <div class="big-num">${round5(en.grams)}<small>g al día</small></div>
      <p class="muted" style="margin-top:6px;font-weight:700">≈ ${nf0.format(Math.round(en.kcal))} kcal · alimento de ${nf0.format(p.kcal)} kcal/kg</p>
      <div class="portion">${MEAL_NAMES[en.meals].map(m=>`<div class="bowl"><span>${m}</span><b>${round5(en.perMeal)} g</b></div>`).join('')}<div class="bowl" style="background:var(--yellow-3)"><span>Premios máx.</span><b>${Math.round(en.treats)} kcal</b></div></div>
      <p class="hint" style="margin-top:12px">Cálculo: 70 × ${nf1.format(en.ow?p.ideal:p.weight)} kg<sup>0,75</sup> × ${nf1.format(en.f)} (${en.fl})${st!=='puppy'?` × ${nf2.format(en.am)} (actividad ${ACT_LABEL[en.act]}${p.activity==='auto'?' según sus paseos':''})`:''}.</p></div>
    <div class="card"><div class="ctitle"><span class="ic ic-green">${I.walk}</span><h3>Paseo ideal</h3><span class="badge ${avgOk?'good':'warn'}">${avgOk?I.check+'Van bien':I.alert+'Falta movimiento'}</span></div>
      <div class="big-num">${goal}<small>min al día${p.goalMin?' · tu meta':''}</small></div><p class="muted" style="margin-top:6px;font-weight:700">${p.goalMin?`Recomendado: ${wr.total} min en ${wr.count} paseos`:`${wr.count} paseos de ~${wr.each} min`}</p>
      <div style="margin-top:14px"><div class="goal-row"><span>Hoy</span><span>${tm} / ${goal} min</span></div><div class="goalbar"><i style="width:${Math.min(100,tm/goal*100)}%"></i></div>
      <div class="goal-row" style="margin-top:10px"><span>Promedio ${avg.days||0} días</span><span>${Math.round(avg.min)} / ${goal} min</span></div><div class="goalbar"><i style="width:${Math.min(100,avg.min/goal*100)}%;background:var(--blue)"></i></div></div>
      <p class="hint" style="margin-top:12px">${esc(wr.why)}</p>
      <div class="goal-chips"><span class="badge">${I.clock}Mínimo por paseo: ${perWalkMin()} min</span><span class="badge">${I.target}Meta diaria: ${goal} min</span></div>
      <button class="btn btn-white btn-block btn-sm" data-action="edit-goals" style="margin-top:12px">${I.target}Editar metas de ${esc(p.name)}</button></div>
    ${alerts.map(([k,ic,t])=>`<div class="alert ${k}">${ic}<span>${t}</span></div>`).join('')}
    <div class="card"><div class="ctitle"><span class="ic ic-yellow">${I.clock}</span><h3>Rutina de hoy</h3><button class="btn btn-white btn-sm right" data-action="edit-routine">${I.pencil}Editar</button></div><div class="timeline">${tl}</div><p class="hint" style="margin-top:8px">${customRoutine()?'Rutina personalizada. Puedes volver a la recomendada cuando quieras.':'Rutina recomendada: paseo primero y comida 45 min después, así evitas ejercicio con la guata llena.'}</p></div>
    <div class="card"><div class="ctitle"><span class="ic ic-blue">${I.drop}</span><h3>Agua</h3></div><div class="big-num">${nf0.format(round5(en.water/10)*10)}<small>ml al día</small></div><p class="muted" style="margin-top:6px;font-weight:700">≈ ${nf1.format(en.water/250)} tazas. Lleva agua en paseos de más de 30 min.</p></div>
    <div class="card sleep-card"><div><div class="ctitle" style="margin-bottom:6px"><span class="ic" style="background:rgba(255,255,255,.2);color:#fff">${I.moon}</span><h3>Descanso</h3></div><div class="big-num" style="color:#fff">12–14<small style="color:rgba(255,255,255,.8)">h</small></div><p class="muted" style="margin-top:6px;font-weight:700">${tm>=goal?'Hoy se ganó una siesta de campeón.':'Cama cómoda y sin escaleras.'}</p></div><img data-asset="durmiendo" alt="Salchicha durmiendo"></div>
    <div class="card"><div class="ctitle"><span class="ic ic-pink">${I.heart}</span><h3>Cuidados de salchicha</h3></div><div class="tips">
      <div class="tip"><span class="ic ic-pink">${I.spine}</span><div><b>Cuida su espalda</b><p>Nada de saltos desde el sillón ni escaleras. Al tomarlo, sujeta pecho y trasero a la vez.</p></div></div>
      <div class="tip"><span class="ic ic-blue">${I.harness}</span><div><b>Arnés, no collar</b><p>El arnés reparte la fuerza en el pecho y protege su cuello y columna.</p></div></div>
      <div class="tip"><span class="ic ic-orange">${I.bowl}</span><div><b>Comer y pasear</b><p>Espera cerca de una hora después de comer antes de jugar fuerte.</p></div></div>
      <div class="tip"><span class="ic ic-green">${I.thermo}</span><div><b>Test de los 7 segundos</b><p>Si no aguantas la mano 7 segundos en la vereda, está muy caliente para sus patas.</p></div></div></div></div>
    <p class="disclaimer">Recomendaciones orientativas basadas en fórmulas veterinarias generales. Ante dudas de dieta, peso o salud, consulta con tu veterinario.</p>`;
  bindAssets($('#healthBody'));
}

/* =========================================================
   AJUSTES
   ========================================================= */
function renderSettings(){
  const u=S.user||{},q=queueGet().length;
  const avatar=u.avatar?`<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer">`:`<span class="ph">${esc((u.name||'?').charAt(0).toUpperCase())}</span>`;
  $('#settingsBody').innerHTML=`
    <div class="card"><div class="acct">${avatar}<div style="min-width:0"><b>${esc(u.name||'Invitado')}</b><small>${S.mode==='demo'?'Modo demo · sin cuenta':esc(u.email||'')}</small></div></div>
      ${S.mode==='cloud'?`<div class="list" style="margin-top:12px"><button class="li" data-action="set-password"><span class="ic ic-orange">${I.lock}</span><span>Contraseña para la app<small>${IS_APP?'Cámbiala cuando quieras':'Para entrar en la app de iPhone con tu correo'}</small></span><span class="chev">${I.chev}</span></button></div>`:''}
      ${S.mode==='demo'?(IS_APP?`<button class="btn btn-orange btn-block" style="margin-top:14px" data-action="to-login">Iniciar sesión</button>`:`<button class="btn-google" style="margin-top:14px" data-action="to-login">${$('#googleBtn svg').outerHTML}Iniciar sesión con Google</button>`):''}</div>
    <div class="card"><div class="ctitle"><span class="ic ic-orange">${I.paw}</span><h3>Mis perros</h3></div><div class="list">
      ${S.dogs.map(d=>`<button class="li ${d.id===S.dog.id?'on':''}" data-switch-dog="${d.id}"><img src="${avatarSrc(d)}" alt=""><span>${esc(d.name)}<small>${ageLabel(d)} · ${nf1.format(d.weight)} kg</small></span><span class="chev">${d.id===S.dog.id?I.check:I.chev}</span></button>`).join('')}
      <button class="li" data-action="add-dog"><span class="ic ic-green">${I.plus}</span><span>Agregar otro perro</span></button>
      <button class="li" data-action="edit-goals"><span class="ic ic-green">${I.target}</span><span>Metas de paseo<small>Mínimo ${perWalkMin()} min por paseo · ${dayGoal()} min al día</small></span><span class="chev">${I.chev}</span></button>
      <button class="li" data-action="edit-routine"><span class="ic ic-yellow">${I.clock}</span><span>Rutina y horarios<small>${customRoutine()?'Personalizada':'Recomendada'} · meta ${dayGoal()} min</small></span><span class="chev">${I.chev}</span></button>
      <button class="li" data-go="fotos"><span class="ic ic-pink">${I.camera}</span><span>Álbum de fotos<small>${S.photos.length} ${S.photos.length===1?'foto':'fotos'} de ${esc(S.dog.name)}</small></span><span class="chev">${I.chev}</span></button></div></div>
    <div class="card"><div class="ctitle"><span class="ic ic-blue">${I.down}</span><h3>Tus datos</h3></div><div class="list">
      <button class="li" data-action="export"><span class="ic ic-blue">${I.down}</span><span>Exportar respaldo<small>Archivo .json con perfiles, rutas y paseos</small></span><span class="chev">${I.chev}</span></button>
      <label class="li" for="importFile" style="cursor:pointer"><span class="ic ic-blue">${I.up}</span><span>Importar respaldo<small>Agrega rutas y paseos desde un .json</small></span><span class="chev">${I.chev}</span></label>
      <button class="li" data-action="reset-stats"><span class="ic" style="background:#FDE3E1;color:var(--red)">${I.sync}</span><span>Reiniciar estadísticas de ${esc(S.dog.name)}<small>Borra el historial de paseos · el perfil se mantiene</small></span><span class="chev">${I.chev}</span></button>
      ${S.mode==='cloud'?`<button class="li" data-action="sync"><span class="ic ic-green">${I.sync}</span><span>Sincronizar ahora<small>${q?q+' pendientes de subir':'Todo al día'}</small></span><span class="chev">${I.chev}</span></button>`:''}
    </div><input type="file" id="importFile" accept="application/json,.json" class="sr"></div>
    ${IS_APP?(()=>{const st=remState(),tm=walkTimes();return `<div class="card"><div class="ctitle"><span class="ic ic-orange">${I.bell}</span><h3>Avisos</h3></div><div class="list">
      ${S.mode==='cloud'?`<button class="li" data-action="rem-toggle" role="switch" aria-checked="${st.on}"><span class="ic ic-green">${I.walk}</span><span>Recordarme los paseos<small>${tm.length?esc(tm.join(' · ')):'Según la rutina de '+esc(S.dog.name)}</small></span><span class="toggle ${st.on?'on':''}"><i></i></span></button>
      ${st.on?`<div class="li static"><span class="ic ic-yellow">${I.clock}</span><span>Avisarme<div class="st-chips rem-chips">${REM_BEFORE.map(m=>`<button type="button" class="st-chip ${st.before===m?'on':''}" data-rem-before="${m}">${m?m+' min antes':'A la hora'}</button>`).join('')}</div></span></div>
      <button class="li" data-action="rem-others" role="switch" aria-checked="${st.others}"><span class="ic ic-orange">${I.bowl}</span><span>También comidas y remedios<small>Según la rutina de ${esc(S.dog.name)}</small></span><span class="toggle ${st.others?'on':''}"><i></i></span></button>`:''}`:''}
      <button class="li" data-action="test-notif"><span class="ic ic-blue">${I.bell}</span><span>Probar un aviso<small>Llega en 1 minuto, aunque cierres la app</small></span><span class="chev">${I.chev}</span></button>
      </div><p class="hint" style="margin-top:8px">Los horarios salen de <b>Rutina y horarios</b>: si los cambias, los avisos se actualizan solos. Durante el paseo verás el tiempo en la pantalla bloqueada y te avisamos cuando se cumpla el mínimo.</p></div>`;})():''}
    <div class="card"><div class="ctitle"><span class="ic ic-pink">${I.phone}</span><h3>${IS_APP?'App de iPhone':'Úsala como app'}</h3></div>
      <p style="font-weight:600;color:var(--ink-2);font-size:14.5px">${IS_APP?'Estás usando la app: el GPS sigue grabando con la pantalla bloqueada (verás un indicador azul arriba). Si iOS cierra la app durante un paseo, al abrirla lo retomamos.':'<b>iPhone:</b> en Safari toca Compartir → «Agregar a inicio».<br><b>Android:</b> en Chrome toca ⋮ → «Instalar app» o «Agregar a la pantalla principal».<br>Durante el paseo mantén la pantalla encendida: el navegador pausa el GPS cuando el teléfono se bloquea.'}</p></div>
    <div class="card"><div class="list">
      ${S.mode==='cloud'?`<button class="li danger" data-action="wipe"><span class="ic" style="background:#FDE3E1;color:var(--red)">${I.trash}</span><span>Borrar todos mis datos<small>Perros, rutas y paseos</small></span></button>`:''}
      <button class="li" data-action="logout"><span class="ic ic-yellow">${I.out}</span><span>${S.mode==='demo'?'Salir del modo demo':'Cerrar sesión'}</span></button></div></div>
    <p class="disclaimer">Salchipaseo · v2.0</p>`;
  bindAssets($('#settingsBody'));
  $('#importFile').onchange=importFile;
}

/* =========================================================
   Formulario del perro (onboarding + editar)
   ========================================================= */
function dogFormHTML(d){
  return `<div class="field full"><label for="fName">Nombre</label><input class="input" id="fName" maxlength="40" value="${esc(d.name)}" placeholder="Ej: Goku"></div>
    <div class="field full"><label for="fBirth">Fecha de nacimiento (aprox.)</label><input class="input" id="fBirth" type="date" value="${esc(d.birthDate)}" max="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label for="fWeight">Peso actual (kg)</label><input class="input" id="fWeight" type="number" inputmode="decimal" min="0.5" max="40" step="0.1" value="${d.weight}"></div>
    <div class="field"><label for="fIdeal">Peso ideal (kg)</label><input class="input" id="fIdeal" type="number" inputmode="decimal" min="0.5" max="40" step="0.1" value="${d.ideal}"></div>
    <div class="field full"><span class="flabel">Tamaño</span><div class="seg" data-seg="size"><button type="button" data-v="mini">Miniatura</button><button type="button" data-v="std">Estándar</button></div></div>
    <div class="field full"><span class="flabel">Esterilizado</span><div class="seg" data-seg="neutered"><button type="button" data-v="1">Sí</button><button type="button" data-v="0">No</button></div></div>
    <div class="field full"><span class="flabel">Nivel de actividad</span><div class="seg" data-seg="activity"><button type="button" data-v="auto">Auto</button><button type="button" data-v="low">Baja</button><button type="button" data-v="normal">Normal</button><button type="button" data-v="high">Alta</button></div></div>
    <div class="field"><label for="fKcal">Alimento (kcal/kg)</label><input class="input" id="fKcal" type="number" inputmode="numeric" min="1500" max="6000" step="50" value="${d.kcal}"></div>
    <div class="field"><label for="fWake">Se despierta</label><input class="input" id="fWake" type="time" value="${esc(d.wake)}"></div>
    <p class="hint full" style="grid-column:1/-1">Las kcal/kg vienen en el saco del alimento (suele estar entre 3.300 y 4.000). «Auto» calcula la actividad según sus paseos reales.</p>`;
}
function mountDogForm(root,d){
  root.innerHTML=dogFormHTML(d);root._seg={size:d.size,neutered:d.neutered?'1':'0',activity:d.activity};
  $$('[data-seg]',root).forEach(seg=>{const k=seg.dataset.seg;const set=v=>{root._seg[k]=v;$$('button',seg).forEach(b=>b.classList.toggle('on',b.dataset.v===v));};set(root._seg[k]);seg.onclick=e=>{const b=e.target.closest('button');if(b)set(b.dataset.v);};});
}
function readDogForm(root,base){
  const num=(id,def,min,max)=>{const v=parseFloat($(id,root).value);return isNaN(v)?def:Math.max(min,Math.min(max,v));};
  const name=$('#fName',root).value.trim();if(!name){toast('Ponle un nombre a tu perro');$('#fName',root).focus();return null;}
  const weight=num('#fWeight',9,0.5,40);
  return Object.assign({},base,{name,birthDate:$('#fBirth',root).value||'',weight,ideal:num('#fIdeal',weight,0.5,40),size:root._seg.size,neutered:root._seg.neutered==='1',activity:root._seg.activity,kcal:num('#fKcal',3600,1500,6000),wake:$('#fWake',root).value||'07:30'});
}
let onbMode='first';
function openOnboarding(mode){
  onbMode=mode;const d=DEFAULT_DOG();if(mode==='first'&&S.mode==='demo')d.name='Goku';
  mountDogForm($('#onbForm'),d);$('#onbCancel').hidden=mode==='first';
  $('#onbTitle').textContent=mode==='first'?'¡Hola! Cuéntanos de tu salchicha':'Nuevo integrante de la manada';
  show('onboard');
}
async function saveOnboarding(){
  const d=readDogForm($('#onbForm'),DEFAULT_DOG());if(!d)return;
  const b=$('#onbSave');b.disabled=true;b.innerHTML='<span class="spin"></span>';
  try{const saved=await DB.saveDog(d);S.dogs.push(saved);await selectDog(saved.id);show('main');go('perfil');renderAll();toast(`¡Bienvenido, ${saved.name}!`);scheduleReminders(true);setTimeout(maybeAskReminders,2500);}
  catch(e){console.error(e);toast('No se pudo guardar. Revisa tu conexión.');}
  b.disabled=false;b.textContent='Crear perfil';
}
function openEditDog(){
  const sh=openSheet(`<div class="sheet-head"><img data-asset="ladeando" alt=""><div><h2>Editar perfil</h2><p class="sub">Las recomendaciones se recalculan al guardar.</p></div></div><form class="form" id="edForm" autocomplete="off"></form>
    <div class="row-actions" style="margin-top:16px"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-orange" id="edSave">Guardar</button></div>
    ${S.dogs.length>1?`<button class="btn btn-white btn-block btn-sm" id="edDel" style="margin-top:12px;color:var(--red)">${I.trash}Eliminar a ${esc(S.dog.name)}</button>`:''}`);
  const f=$('#edForm',sh);mountDogForm(f,S.dog);$('[data-close]',sh).onclick=()=>closeSheet();
  $('#edSave',sh).onclick=async()=>{const d=readDogForm(f,S.dog);if(!d)return;const b=$('#edSave',sh);b.disabled=true;b.innerHTML='<span class="spin"></span>';
    try{const saved=await DB.saveDog(d);Object.assign(S.dog,saved);const i=S.dogs.findIndex(x=>x.id===saved.id);if(i>=0)S.dogs[i]=S.dog;closeSheet();renderAll();scheduleReminders(true);toast('Perfil actualizado');}catch(e){console.error(e);b.disabled=false;b.textContent='Guardar';toast('No se pudo guardar. Revisa tu conexión.');}};
  const del=$('#edDel',sh);if(del)del.onclick=()=>confirmSheet(`¿Eliminar a ${S.dog.name}?`,'Se borran su perfil y todos sus paseos. Las rutas se conservan.','Eliminar',async()=>{const id=S.dog.id;await DB.deleteDog(id);S.dogs=S.dogs.filter(x=>x.id!==id);await selectDog(S.dogs[0].id);renderAll();toast('Perfil eliminado');});
}
function openDogSwitch(){
  const sh=openSheet(`<h2>Tus perros</h2><p class="sub" style="margin-bottom:14px">Elige de quién es el paseo.</p>
    ${S.dogs.map(d=>`<button class="opt" data-switch-dog="${d.id}"><span class="thumb" style="background:var(--yellow)"><img src="${avatarSrc(d)}" alt="" style="width:100%;height:100%;object-fit:cover"></span><span><b>${esc(d.name)}</b><small>${ageLabel(d)} · ${nf1.format(d.weight)} kg</small></span><span class="go-ic">${d.id===S.dog.id?I.check:I.chev}</span></button>`).join('')}
    <button class="opt" data-action="add-dog"><span class="thumb" style="background:var(--green-3);display:grid;place-items:center;color:var(--green-d)">${I.plus}</span><span><b>Agregar otro perro</b><small>Cada uno tiene sus paseos y metas</small></span></button>`);
  bindAssets(sh);
}
async function selectDog(id){
  S.dog=S.dogs.find(d=>d.id===id)||S.dogs[0];S.histN=15;
  if(S.mode==='cloud')LS.set(lsKey('lastDog'),S.dog.id);
  const [routes,walks,photos]=await Promise.all([DB.listRoutes(),DB.listWalks(S.dog.id),DB.listPhotos(S.dog.id)]);S.routes=routes;S.walks=walks;S.photos=photos;
  try{await ensureUrls(S.dogs.map(d=>d.avatarPath));}catch(e){}
}

/* =========================================================
   Exportar / importar
   ========================================================= */
async function exportData(){
  let dogs=S.dogs,walks=S.walks;
  if(S.mode==='cloud'){try{walks=chk(await sb.from('walks').select('*').order('started_at')).map(r=>Object.assign(toWalk(r),{points:r.points}));}catch(e){toast('No se pudo exportar. Revisa tu conexión.');return;}}
  else walks=MEM.walks;
  const data=JSON.stringify({app:'salchipaseo',version:2,exported:new Date().toISOString(),dogs,routes:S.routes,walks});
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=`salchipaseo-respaldo-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
  toast('Respaldo descargado');
}
function importFile(e){
  const f=e.target.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=async()=>{try{const d=JSON.parse(rd.result);if(!Array.isArray(d.walks)||!Array.isArray(d.routes))throw new Error('formato');
      const idMap={};const routes=d.routes.filter(r=>r&&Array.isArray(r.points)&&r.points.length>1).map(r=>{const id=uuid();idMap[r.id]=id;return {id,name:String(r.name||'Ruta').slice(0,60),color:COLORS[r.color]?r.color:'orange',points:thin(r.points,500),distance:Math.round(r.distance||pathLen(r.points))};});
      const walks=d.walks.filter(w=>w&&typeof w.start==='number').map(w=>({id:uuid(),dogId:S.dog.id,routeId:idMap[w.routeId]||null,start:w.start,duration:Math.round(w.duration||0),distance:Math.round(w.distance||0),points:w.points?thin(w.points,500):null,preview:thin(w.preview||w.points||[],60),pee:!!w.pee,poop:!!w.poop,mode:w.mode==='sim'?'sim':'gps'}));
      for(const r of routes)await DB.addRoute(r);
      for(const w of walks)await DB.addWalk(w);
      await selectDog(S.dog.id);renderAll();toast(`Importados ${walks.length} paseos y ${routes.length} rutas para ${S.dog.name}`);
    }catch(err){console.error(err);toast(err.message==='formato'?'Ese archivo no parece de Salchipaseo':'No se pudo importar todo. Revisa tu conexión.');}
    e.target.value='';};
  rd.readAsText(f);
}

/* =========================================================
   Mapas
   ========================================================= */
let liveMap=null,liveLayers=null,livePin=null,trackBg=null,trackFg=null,tailLine=null,accCircle=null;
function tiles(){return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'});}
const dogIcon=()=>L.divIcon({className:'dp-wrap',html:`<div class="dogpin"><img src="${avatarSrc(S.dog)}" alt=""></div>`,iconSize:[46,46],iconAnchor:[23,23]});
const startIcon=()=>L.divIcon({className:'dp-wrap',html:'<div class="startpin"></div>',iconSize:[18,18],iconAnchor:[9,9]});
function ensureLiveMap(center){
  if(!window.L)return;
  if(!liveMap){liveMap=L.map('liveMap',{zoomControl:true}).setView(center,17);tiles().addTo(liveMap);liveLayers=L.layerGroup().addTo(liveMap);liveMap.on('dragstart',()=>{W.follow=false;});}
  else liveMap.setView(center,17);
  liveLayers.clearLayers();livePin=null;accCircle=null;tailLine=null;trackBg=trackFg=null;setTimeout(()=>liveMap.invalidateSize(),80);
}
function drawGhost(route){if(!liveMap||!route)return;L.polyline(route.points,{color:'#1F5EFF',weight:6,opacity:.55,dashArray:'1 12',lineCap:'round'}).addTo(liveLayers);L.marker(route.points[0],{icon:startIcon(),interactive:false}).addTo(liveLayers);}
function resetTrack(){if(!liveMap)return;trackBg=L.polyline([],{color:'#fff',weight:9,lineCap:'round',lineJoin:'round'}).addTo(liveLayers);trackFg=L.polyline([],{color:'#FF6B1A',weight:5,lineCap:'round',lineJoin:'round'}).addTo(liveLayers);tailLine=L.polyline([],{color:'#FF6B1A',weight:4,opacity:.55,dashArray:'2 8',lineCap:'round'}).addTo(liveLayers);}
function movePin(p,acc){if(!liveMap)return;
  if(acc!=null){if(!accCircle)accCircle=L.circle(p,{radius:acc,color:'#1F5EFF',weight:1,opacity:.45,fillColor:'#1F5EFF',fillOpacity:.1,interactive:false}).addTo(liveLayers);else{accCircle.setLatLng(p);accCircle.setRadius(acc);}}
  if(!livePin)livePin=L.marker(p,{icon:dogIcon(),zIndexOffset:1000,interactive:false}).addTo(liveLayers);else livePin.setLatLng(p);if(W.follow)liveMap.panTo(p,{animate:true,duration:.5});}

/* =========================================================
   Paseo en vivo
   ========================================================= */
const W={active:false,paused:false,mode:'gps',elapsed:0,last:0,points:[],distance:0,watchId:null,timer:null,route:null,sim:null,pee:false,poop:false,started:0,follow:true,wakeLock:null,lastTs:0,gotFix:false,errShown:false,lastBackup:0,dogId:null,pausedMs:0,pauseStart:0,kf:null,cur:null,acc:null,lastMove:0,lastAccept:0,rejects:0,minReached:false,hiddenAt:0,minNotif:null};
/* ---------- GPS: filtro de Kalman + umbrales según precisión ---------- */
const GPS={maxAcc:30,relaxAcc:50,minStep:5,maxSpeed:5,q:1.6,stillMs:20000};
function Kalman(q){this.q=q;this.v=-1;}
Kalman.prototype.process=function(lat,lng,acc,ts){acc=Math.max(acc,3);if(this.v<0){this.lat=lat;this.lng=lng;this.v=acc*acc;this.ts=ts;}else{const dt=Math.max(0,(ts-this.ts)/1000);this.ts=ts;this.v+=dt*this.q*this.q;const k=this.v/(this.v+acc*acc);this.lat+=k*(lat-this.lat);this.lng+=k*(lng-this.lng);this.v=(1-k)*this.v;}return [this.lat,this.lng];};
/* Ramer–Douglas–Peucker: deja la línea recta donde caminaste recto (eps en metros) */
function rdp(points,eps){
  if(!points||points.length<3)return (points||[]).slice();
  const lat0=points[0][0]*Math.PI/180,kx=111320*Math.cos(lat0),ky=110540;const P=points.map(p=>[p[1]*kx,p[0]*ky]);
  const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;const st=[[0,points.length-1]];
  while(st.length){const [a,b]=st.pop();let max=0,idx=-1;const [x1,y1]=P[a],[x2,y2]=P[b],dx=x2-x1,dy=y2-y1,L2=dx*dx+dy*dy;
    for(let i=a+1;i<b;i++){const [x,y]=P[i];let t=L2?((x-x1)*dx+(y-y1)*dy)/L2:0;t=Math.max(0,Math.min(1,t));const ex=x1+t*dx-x,ey=y1+t*dy-y,d=ex*ex+ey*ey;if(d>max){max=d;idx=i;}}
    if(idx>0&&max>eps*eps){keep[idx]=1;st.push([a,idx],[idx,b]);}}
  return points.filter((_,i)=>keep[i]);
}
const cleanTrack=pts=>pts.length>2?rdp(pts,3.5):pts.slice();
const perWalkMin=()=>S.dog.walkMin||walkRec().each;
function walkElapsed(){if(W.mode==='sim')return W.elapsed;const now=Date.now();return Math.max(0,(now-W.started-W.pausedMs-(W.paused?now-W.pauseStart:0))/1000);}
function openStartSheet(){
  if(W.active){$('#live').hidden=false;return;}
  const left=Math.max(0,dayGoal()-Math.round(todayMin()));
  const sh=openSheet(`<div class="sheet-head"><img data-asset="caminando" alt=""><div><h2>¿Salimos, ${esc(S.dog.name)}?</h2><p class="sub">Mínimo de este paseo: <b>${perWalkMin()} min</b>. ${left?`Faltan ${left} min para la meta de hoy.`:'La meta de hoy ya está cumplida.'}</p></div></div>
    <button class="opt" data-action="start-free" style="background:var(--green);color:#fff"><span class="thumb" style="background:rgba(255,255,255,.2);display:grid;place-items:center">${I.play.replace('<svg','<svg width="28" height="28"')}</span><span><b>Paseo libre</b><small style="color:rgba(255,255,255,.85)">Graba un recorrido nuevo con GPS</small></span></button>
    ${S.routes.length?`<p class="flabel" style="margin:16px 2px 10px">Seguir una ruta guardada</p>${S.routes.map(r=>`<button class="opt" data-walk-route="${r.id}"><span class="thumb">${routeSVG(r.points,{w:58,h:58,bg:COLORS[r.color][0],pad:9,sw:3,blocks:false})}</span><span style="min-width:0"><b>${esc(r.name)}</b><small>${fmtKm(r.distance)} · ~${fmtDur(routeStats(r).avg)}</small></span><span class="go-ic">${I.chev}</span></button>`).join('')}`:''}
    <div class="row-actions" style="margin-top:8px"><button class="btn btn-white btn-sm" data-action="edit-goals">${I.target}Cambiar metas</button><button class="btn btn-ghost btn-sm" data-action="start-sim">Simular</button></div>`);
}
function simPathFor(route){const base=route?route.points:densify(SAMPLE_DEFS[0].wps,10);const cum=[0];for(let i=1;i<base.length;i++)cum.push(cum[i-1]+dist(base[i-1],base[i]));return {path:base,cum,along:0,idx:0,total:cum[cum.length-1]};}
function setPauseBtn(){$('#pauseBtn').innerHTML=(W.paused?I.play:I.pause)+`<span>${W.paused?'Seguir':'Pausar'}</span>`;}
function watchOpts(){return {enableHighAccuracy:true,maximumAge:1000,timeout:20000};}
function startWatch(){if(!('geolocation' in navigator)){gpsUnavailable('Este navegador no tiene GPS');return;}if(W.watchId!=null){try{navigator.geolocation.clearWatch(W.watchId);}catch(e){}}try{W.watchId=navigator.geolocation.watchPosition(onFix,onGpsErr,watchOpts());}catch(e){gpsUnavailable('No se pudo iniciar el GPS');}}
/* Seguimiento: en la app iOS usa el GPS nativo (sigue con la pantalla bloqueada); en el navegador, la API web */
let stopTrack=null;
async function stopTracking(){const f=stopTrack;stopTrack=null;if(f){try{await f();}catch(e){}}if(W.watchId!=null){try{navigator.geolocation.clearWatch(W.watchId);}catch(e){}W.watchId=null;}}
async function startTracking(){
  await stopTracking();
  if(!NAT){startWatch();return;}
  const onUbi=u=>onFix({coords:{latitude:u.latitude,longitude:u.longitude,accuracy:u.accuracy==null?999:u.accuracy,speed:u.speed==null?null:u.speed},timestamp:u.time||Date.now()});
  try{const f=await NAT.seguirUbicacion(onUbi,onTrackErr,{distanciaMinima:NATIVE_DIST});if(W.active&&W.mode==='gps')stopTrack=f;else{try{await f();}catch(e){}}}
  catch(e){console.error(e);gpsUnavailable('No se pudo iniciar el GPS');}
}
function onTrackErr(err){
  if(!W.active)return;
  if(err&&err.code==='NOT_AUTHORIZED'){setPill('Sin permiso de ubicación · midiendo solo tiempo','warn');if(!W.errShown){W.errShown=true;askLocationSettings();}return;}
  onGpsErr(err||{});
}
function askLocationSettings(){
  if(!IS_APP){toast('Permite la ubicación para este sitio en los ajustes del navegador.',4500);return;}
  confirmSheet('Permite la ubicación','Para registrar el recorrido, SalchiPaseo necesita tu ubicación. En Ajustes toca <b>Ubicación</b> y elige <b>Siempre</b> (o "Al usar la app") para que siga grabando con la pantalla bloqueada.','Abrir Ajustes',async()=>{await NAT.abrirAjustes();},false);
}
function startWalk(mode,route){
  closeSheet(true);
  if(W.active){toast('Ya hay un paseo en curso');$('#live').hidden=false;return;}
  Object.assign(W,{active:true,paused:false,mode,elapsed:0,last:performance.now(),points:[],distance:0,route:route||null,pee:false,poop:false,started:Date.now(),follow:true,lastTs:0,gotFix:false,errShown:false,sim:null,lastBackup:0,dogId:S.dog.id,pausedMs:0,pauseStart:0,kf:null,cur:null,acc:null,lastMove:Date.now(),lastAccept:0,rejects:0,minReached:false,hiddenAt:0});
  setupLiveUI(mode,route);
  if(mode==='sim'){W.sim=simPathFor(route);ensureLiveMap(W.sim.path[0]);drawGhost(route);resetTrack();setPill(`Simulación a velocidad x${SIM_SPEED}`,'ok');addPoint(W.sim.path[0]);}
  else{
    ensureLiveMap(route?route.points[0]:DEFAULT_CENTER);drawGhost(route);resetTrack();
    if(route&&liveMap)liveMap.fitBounds(L.latLngBounds(route.points),{padding:[30,30]});
    setPill('Buscando señal GPS…','warn');startTracking();scheduleMinNotif();liveStart();
  }
  clearInterval(W.timer);W.timer=setInterval(tick,250);requestWakeLock();updateLive();saveLive(true);
}
function setupLiveUI(mode,route){
  $('#live').hidden=false;$('#livePanel').classList.toggle('paused',W.paused);$('#lane').classList.toggle('reached',W.minReached);setPauseBtn();
  $('#liveTitle').textContent='Paseando con '+S.dog.name;
  setFlag('#flagPee',W.pee);setFlag('#flagPoop',W.poop);
  const tag=$('#modeTag');tag.textContent=mode==='sim'?'Simulación':'GPS';tag.classList.toggle('sim',mode==='sim');
  $('#pocketBtn').hidden=IS_APP;
  const tip=$('#liveTip');tip.innerHTML=IS_APP?'Puedes bloquear el teléfono: seguimos grabando. Verás un indicador azul arriba.':'No bloquees el teléfono (pausa el GPS): usa <b>Bolsillo</b>.';
  tip.hidden=mode==='sim';const wid=W.started;setTimeout(()=>{if(W.started===wid)tip.hidden=true;},25000);
  const fn=$('#followNote');if(route){fn.hidden=false;fn.innerHTML=`${I.route}<span>Siguiendo <b>${esc(route.name)}</b> · ${fmtKm(route.distance)}</span>`;}else fn.hidden=true;
}
function setPill(text,kind){$('#gpsText').textContent=text;$('#gpsPill').classList.toggle('warn',kind==='warn');}
function gpsUnavailable(msg){setPill(msg+' · midiendo solo tiempo','warn');if(!W.errShown){W.errShown=true;toast(msg+'. Igual medimos el tiempo.',3800);}}
function accLimit(){const now=Date.now();return (W.lastAccept?now-W.lastAccept:now-W.started)>30000?GPS.relaxAcc:GPS.maxAcc;}
function updatePill(){
  if(W.mode==='sim'||!W.active)return;
  if(!W.gotFix){setPill(W.acc?`Mejorando señal GPS… ±${Math.round(W.acc)} m`:'Buscando señal GPS…','warn');return;}
  if(W.paused){setPill('En pausa · no suma distancia','warn');return;}
  if(W.acc>accLimit()){setPill(`Señal débil · ±${Math.round(W.acc)} m`,'warn');return;}
  if(Date.now()-W.lastMove>GPS.stillMs){setPill('Quieto · no suma distancia','warn');return;}
  setPill(`GPS activo · ±${Math.round(W.acc)} m`,W.acc>20?'warn':'ok');
}
function onFix(pos){
  if(!W.active||W.mode!=='gps')return;
  const c=pos.coords,acc=c.accuracy||999,ts=pos.timestamp||Date.now();W.acc=acc;
  if(acc>80){updatePill();return;}                       // demasiado imprecisa: ni la mostramos
  if(!W.kf)W.kf=new Kalman(GPS.q);
  const sp=W.kf.process(c.latitude,c.longitude,acc,ts);W.cur=sp;
  const limit=accLimit();
  if(acc<=limit&&!W.gotFix){W.gotFix=true;if(liveMap&&!W.route)liveMap.setView(sp,18);}
  movePin(sp,acc);
  if(acc>limit||W.paused||!W.gotFix){updateTail();updatePill();return;}
  const last=W.points[W.points.length-1];
  if(!last){acceptPoint(sp,ts,false);updatePill();return;}
  const d=dist(last,sp),step=Math.max(GPS.minStep,Math.min(15,acc*0.6));
  const stillBySpeed=c.speed!=null&&c.speed>=0&&c.speed<0.35&&d<12;
  if(d<step||stillBySpeed){updateTail();updatePill();return;}
  const dt=(ts-W.lastTs)/1000;
  if(dt>0&&d/dt>GPS.maxSpeed){W.rejects++;if(W.rejects<4){updateTail();updatePill();return;}W.kf=new Kalman(GPS.q);W.cur=W.kf.process(c.latitude,c.longitude,acc,ts);}
  W.rejects=0;acceptPoint(W.cur,ts,true);updatePill();
}
function acceptPoint(p,ts,moved){W.points.push(r6(p));W.lastTs=ts;W.lastAccept=Date.now();if(moved)W.lastMove=Date.now();redrawTrack();saveLive(false);liveTick(false);}
function redrawTrack(){const s=cleanTrack(W.points);W.distance=pathLen(s);if(trackFg){trackBg.setLatLngs(s);trackFg.setLatLngs(s);}updateTail();}
function updateTail(){if(!tailLine)return;const last=W.points[W.points.length-1];tailLine.setLatLngs(last&&W.cur&&!W.paused&&W.mode==='gps'?[last,W.cur]:[]);}
function onGpsErr(err){if(!W.active)return;if(err.code===3&&W.gotFix)return;gpsUnavailable(err.code===1?'Sin permiso de ubicación':err.code===3?'El GPS está tardando':'No encontramos tu ubicación');}
function addPoint(p){W.points.push(r6(p));W.lastMove=Date.now();redrawTrack();movePin(p,null);}
function simStep(dt){const s=W.sim;if(!s)return;s.along+=dt*(0.95+Math.random()*0.25);
  if(s.along>=s.total){addPoint(s.path[s.path.length-1]);toast('¡Llegaron! Fin de la ruta.');stopWalk();return;}
  while(s.idx<s.cum.length-2&&s.cum[s.idx+1]<s.along)s.idx++;
  const a=s.path[s.idx],b=s.path[s.idx+1],seg=s.cum[s.idx+1]-s.cum[s.idx]||1,f=(s.along-s.cum[s.idx])/seg,p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
  const last=W.points[W.points.length-1];if(!last||dist(last,p)>=6)addPoint([p[0]+(Math.random()-.5)*0.000012,p[1]+(Math.random()-.5)*0.000012]);else movePin(p,null);}
function tick(){
  if(!W.active)return;const now=performance.now(),dt=Math.min(2,(now-W.last)/1000);W.last=now;
  if(W.mode==='sim'){if(!W.paused){W.elapsed+=dt*SIM_SPEED;simStep(dt*SIM_SPEED);}}
  else W.elapsed=walkElapsed();
  if(!W.active)return;updateLive();updatePill();
  saveLive(false);liveTick(false);
}
function snapshot(){return {v:2,active:W.active,mode:W.mode,started:W.started,pausedMs:W.pausedMs,paused:W.paused,pauseStart:W.pauseStart,elapsed:walkElapsed(),distance:W.distance,points:thin(W.points,1500),routeId:W.route&&W.route.id,pee:W.pee,poop:W.poop,dogId:W.dogId,minNotif:W.minNotif,minReached:W.minReached,savedAt:Date.now()};}
function saveLive(force){if(S.mode!=='cloud'||!W.active||W.mode!=='gps')return;const n=Date.now();if(!force&&n-W.lastBackup<3000)return;W.lastBackup=n;LS.set(lsKey('live'),snapshot());}
function updateLive(){
  const el=W.elapsed;
  $('#timer').textContent=fmtClock(el);
  $('#lDist').innerHTML=nf2.format(W.distance/1000)+'<small>km</small>';
  const pc=fmtPace(W.distance,el);$('#lPace').innerHTML=pc+(pc==='–'?'':'<small>/km</small>');
  $('#lSteps').textContent=nf0.format(Math.round(W.distance/DOG_STEP));
  const min=perWalkMin(),mins=el/60,pr=Math.min(1,mins/min);
  $('#lGoalLbl').textContent=`Este paseo · mínimo ${min} min`;
  $('#lGoalTxt').textContent=`${Math.floor(mins)} / ${min} min`;$('#lGoalBar').style.width=pr*100+'%';$('#lane').style.setProperty('--p',pr.toFixed(3));
  const goal=dayGoal(),day=todayMin()+mins;$('#lDaySub').textContent=`Hoy: ${Math.round(day)} de ${goal} min${day>=goal?' · ¡meta diaria cumplida!':''}`;
  if(!W.minReached&&mins>=min){W.minReached=true;cancelMinNotif();saveLive(true);$('#lane').classList.add('reached');toast(`¡Mínimo cumplido! ${min} min de paseo con ${S.dog.name}`,3500);try{navigator.vibrate&&navigator.vibrate([180,90,180]);}catch(e){}}
  const pk=$('#pocket');if(pk&&!pk.hidden){$('#pkTime').textContent=fmtClock(el);$('#pkInfo').textContent=`${nf2.format(W.distance/1000)} km · ${Math.floor(mins)} de ${min} min`;}
}
function togglePause(){if(!W.active)return;W.paused=!W.paused;if(W.paused){W.pauseStart=Date.now();cancelMinNotif();}else{W.pausedMs+=Date.now()-W.pauseStart;W.pauseStart=0;W.lastMove=Date.now();scheduleMinNotif();}$('#livePanel').classList.toggle('paused',W.paused);setPauseBtn();updateTail();updatePill();saveLive(true);liveTick(true);toast(W.paused?'Paseo en pausa':'¡Seguimos!');}
function stopWalk(){
  if(!W.active)return;if(W.mode==='gps'){W.elapsed=walkElapsed();const last=W.points[W.points.length-1];if(last&&W.cur&&!W.paused&&dist(last,W.cur)>3){W.points.push(r6(W.cur));redrawTrack();}}W.active=false;clearInterval(W.timer);
  stopTracking();cancelMinNotif();liveEnd();if(S.mode==='cloud'&&W.mode==='gps')LS.set(lsKey('live'),snapshot());
  releaseWakeLock();hidePocket();
  openFinish({mode:W.mode,started:W.started,elapsed:W.elapsed,distance:W.distance,points:cleanTrack(W.points),route:W.route,pee:W.pee,poop:W.poop,dogId:W.dogId});
}
async function requestWakeLock(){if(IS_APP)return;try{if('wakeLock' in navigator&&document.visibilityState==='visible')W.wakeLock=await navigator.wakeLock.request('screen');}catch(e){}}
function releaseWakeLock(){try{W.wakeLock&&W.wakeLock.release();}catch(e){}W.wakeLock=null;}
function setFlag(sel,on){const b=$(sel);b.setAttribute('aria-pressed',on?'true':'false');}
/* ---------- modo bolsillo: pantalla negra que mantiene el GPS activo ---------- */
let pkTap=0;
function showPocket(){const pk=$('#pocket');pk.hidden=false;requestWakeLock();updateLive();toast('Modo bolsillo: toca dos veces la pantalla para volver',3000);}
function hidePocket(){const pk=$('#pocket');if(pk)pk.hidden=true;}
$('#pocket').addEventListener('click',()=>{const n=Date.now();if(n-pkTap<450){hidePocket();pkTap=0;}else pkTap=n;});
$('#pocketBtn').onclick=showPocket;

/* ---------- terminar paseo ---------- */
function openFinish(snap){
  const dog=S.dogs.find(d=>d.id===snap.dogId)||S.dog;
  const canRoute=!snap.route&&snap.points.length>=2&&snap.distance>=50;
  const minG=perWalkMin(),okMin=snap.elapsed/60>=minG;
  const color=COLOR_ORDER[S.routes.length%COLOR_ORDER.length];
  const sh=openSheet(`<div class="sheet-hero"><h2>¡Buen paseo!</h2><p>${fmtDur(snap.elapsed)} de paseo con ${esc(dog.name)}</p><img data-asset="ladeando" alt=""></div>
    <div class="summary"><div class="tile"><span>Tiempo</span><b>${fmtClock(snap.elapsed)}</b></div><div class="tile"><span>Distancia</span><b>${nf2.format(snap.distance/1000)}<small>km</small></b></div><div class="tile"><span>Ritmo</span><b>${fmtPace(snap.distance,snap.elapsed)}</b></div></div>
    <div class="alert ${okMin?'good':'warn'}" style="margin-top:12px">${okMin?I.check:I.clock}<span>${okMin?`Cumpliste el mínimo de ${minG} min.`:`Faltaron ${Math.max(1,Math.ceil(minG-snap.elapsed/60))} min para el mínimo de ${minG} min.`}</span></div>
    <div style="margin:14px 0">${snap.route?`<div class="alert info">${I.route}<span>Paseo por <b>${esc(snap.route.name)}</b>. Lo sumamos a esa ruta.</span></div>`:
      canRoute?`<div style="border-radius:var(--r-sm);overflow:hidden;height:130px">${routeSVG(snap.points,{w:440,h:130,bg:COLORS[color][0],pad:20})}</div><label class="check" style="margin-top:12px"><input type="checkbox" id="saveRouteChk" checked> Guardar como ruta</label><input class="input" id="routeName" style="margin-top:10px" maxlength="60" placeholder="Nombre (ej: Vuelta a la plaza)">`:
      `<div class="alert info">${I.info}<span>No se registró recorrido (sin GPS o muy corto). Guardaremos el tiempo.</span></div>`}</div>
    <div class="flags"><button class="flag" id="fPee" aria-pressed="${snap.pee}">${I.pee}Hizo pipí</button><button class="flag" id="fPoop" aria-pressed="${snap.poop}">${I.poop}Hizo caca</button></div>
    <div class="row-actions" style="margin-top:16px"><button class="btn btn-ghost" id="fDiscard">Descartar</button><button class="btn btn-orange" id="fSave">Guardar paseo</button></div>`,{sticky:true,cls:'sticky'});
  ['#fPee','#fPoop'].forEach(id=>{$(id,sh).onclick=e=>{const b=e.currentTarget;b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')==='true'?'false':'true');};});
  const readFlags=()=>{snap.pee=$('#fPee',sh).getAttribute('aria-pressed')==='true';snap.poop=$('#fPoop',sh).getAttribute('aria-pressed')==='true';};
  $('#fDiscard',sh).onclick=()=>{readFlags();confirmSheet('¿Descartar el paseo?','No se guardará el tiempo ni el recorrido.','Descartar',async()=>{endLive();toast('Paseo descartado');},true,()=>setTimeout(()=>openFinish(snap),30),'Volver');};
  $('#fSave',sh).onclick=async()=>{
    const pts=thin(snap.points,500);let newRoute=null;
    const chkb=$('#saveRouteChk',sh);
    if(canRoute&&chkb&&chkb.checked){const name=($('#routeName',sh).value||'').trim()||`Ruta del ${new Date(snap.started).getDate()} de ${MES[new Date(snap.started).getMonth()]}`;newRoute={id:uuid(),name,color,points:pts,distance:Math.round(snap.distance),created:Date.now()};}
    const walk={id:uuid(),dogId:dog.id,routeId:snap.route?snap.route.id:(newRoute?newRoute.id:null),start:snap.started,duration:Math.round(snap.elapsed),distance:Math.round(snap.distance),points:pts.length>1?pts:null,preview:thin(pts,60),pee:$('#fPee',sh).getAttribute('aria-pressed')==='true',poop:$('#fPoop',sh).getAttribute('aria-pressed')==='true',mode:snap.mode};
    const b=$('#fSave',sh);b.disabled=true;b.innerHTML='<span class="spin"></span>';
    if(newRoute)S.routes.push(newRoute);
    if(dog.id===S.dog.id)S.walks.unshift(walk);
    endLive();
    try{if(newRoute)await DB.addRoute(newRoute);await DB.addWalk(walk);toast(`¡Paseo guardado! ${fmtDur(walk.duration)} con ${dog.name}`);}
    catch(e){console.error(e);const q=queueGet();q.push({route:newRoute,walk:fromLocal(walk)});queueSet(q);toast('Sin conexión: el paseo quedó en el teléfono y se subirá después',4200);}
    renderAll();
  };
}
const fromLocal=w=>Object.assign({},w);
function endLive(){closeSheet(true);$('#live').hidden=true;if(S.mode==='cloud')LS.del(lsKey('live'));renderAll();}
async function checkLiveBackup(){
  if(S.mode!=='cloud'||W.active)return;const b=LS.get(lsKey('live'));if(!b)return;
  if(Date.now()-b.savedAt>12*3600e3||!S.dogs.some(d=>d.id===b.dogId)){LS.del(lsKey('live'));return;}
  if(b.active&&b.mode==='gps'&&Date.now()-b.started<6*3600e3){await resumeWalk(b);return;}
  if(b.v===2)b.elapsed=Math.max(0,((b.savedAt||Date.now())-b.started-(b.pausedMs||0)-(b.paused&&b.pauseStart?(b.savedAt-b.pauseStart):0))/1000);
  confirmSheet('Tienes un paseo sin terminar',`De ${fmtDur(b.elapsed)} (${fmtKm(b.distance,2)}). ¿Quieres guardarlo?`,'Revisar y guardar',async()=>{setTimeout(()=>openFinish({mode:b.mode,started:b.started,elapsed:b.elapsed,distance:b.distance,points:b.points||[],route:routeById(b.routeId)||null,pee:b.pee,poop:b.poop,dogId:b.dogId}),50);},false,()=>{LS.del(lsKey('live'));toast('Paseo descartado');},'Descartar');
}

/* =========================================================
   METAS PERSONALIZADAS
   ========================================================= */
function openGoalsSheet(){
  const rec=walkRec();let per=S.dog.walkMin||rec.each,day=S.dog.goalMin||rec.total;
  const stepper=(id,val,chips,label,hint)=>`<div class="goal-box"><div class="goal-top"><span class="flabel">${label}</span></div>
      <div class="stepper"><button type="button" class="st-btn" data-step="${id}" data-d="-5" aria-label="Menos">−</button><div class="st-val"><b id="${id}V">${val}</b><span>min</span></div><button type="button" class="st-btn" data-step="${id}" data-d="5" aria-label="Más">+</button></div>
      <div class="st-chips">${chips.map(c=>`<button type="button" class="st-chip" data-set="${id}" data-v="${c}">${c} min</button>`).join('')}</div><p class="hint" style="margin-top:8px">${hint}</p></div>`;
  const sh=openSheet(`<div class="sheet-head"><span class="ic ic-green" style="width:56px;height:56px;border-radius:18px">${I.target}</span><div><h2>Metas de ${esc(S.dog.name)}</h2><p class="sub">Define el mínimo que lo vas a sacar a pasear.</p></div></div>
    ${stepper('gPer',per,[15,20,30,45],'Mínimo por paseo',`Durante el paseo te avisamos cuando lo cumplas. Recomendado: ${rec.each} min.`)}
    ${stepper('gDay',day,[30,45,60,90],'Meta diaria (suma de todos los paseos)',`Recomendado para ${esc(S.dog.name)}: ${rec.total} min en ${rec.count} paseos.`)}
    <div class="row-actions" style="margin-top:16px"><button class="btn btn-ghost" id="gReset">Usar recomendadas</button><button class="btn btn-orange" id="gSave">Guardar metas</button></div>`);
  const vals={gPer:per,gDay:day};
  const show=()=>{$('#gPerV',sh).textContent=vals.gPer;$('#gDayV',sh).textContent=vals.gDay;$$('.st-chip',sh).forEach(c=>c.classList.toggle('on',+c.dataset.v===vals[c.dataset.set]));};
  $$('[data-step]',sh).forEach(b=>b.onclick=()=>{const k=b.dataset.step,lim=k==='gPer'?[5,240]:[5,300];vals[k]=Math.max(lim[0],Math.min(lim[1],vals[k]+(+b.dataset.d)));show();});
  $$('[data-set]',sh).forEach(b=>b.onclick=()=>{vals[b.dataset.set]=+b.dataset.v;show();});show();
  const save=async(perV,dayV,btn,msg)=>{const d=Object.assign({},S.dog,{walkMin:perV,goalMin:dayV});btn.disabled=true;btn.innerHTML='<span class="spin"></span>';
    try{const saved=await DB.saveDog(d);Object.assign(S.dog,saved);const i=S.dogs.findIndex(x=>x.id===saved.id);if(i>=0)S.dogs[i]=S.dog;closeSheet(true);renderAll();if(W.active){updateLive();scheduleMinNotif();liveTick(true);}toast(msg);}
    catch(e){console.error(e);btn.disabled=false;btn.textContent='Guardar metas';toast(/walk_min|column/i.test(e.message||'')?'Falta actualizar la base de datos (migración v4)':'No se pudo guardar. Revisa tu conexión.',4500);}};
  $('#gSave',sh).onclick=()=>{let p=vals.gPer,dd=vals.gDay;if(dd<p){dd=p;toast('La meta diaria no puede ser menor al mínimo por paseo: la igualamos.');}save(p,dd,$('#gSave',sh),`Metas guardadas: ${p} min por paseo · ${dd} min al día`);};
  $('#gReset',sh).onclick=()=>save(null,null,$('#gReset',sh),'Volviste a las metas recomendadas');
}

/* =========================================================
   RUTINA PERSONALIZADA
   ========================================================= */
const DAY_ORDER=[1,2,3,4,5,6,0],DAY_L=['D','L','M','M','J','V','S'];
function daysLabel(days){if(!days||!days.length||days.length===7)return 'Todos los días';const s=[...days].sort((a,b)=>DAY_ORDER.indexOf(a)-DAY_ORDER.indexOf(b));if(s.join()==='1,2,3,4,5')return 'Lunes a viernes';if(s.join()==='6,0')return 'Fines de semana';return s.map(d=>DOW[d]).join(', ');}
let rtDraft=null;
function openRoutineEditor(reset){
  if(!rtDraft||reset){const base=customRoutine()?S.dog.routine:recommendedItems();rtDraft={items:base.map(x=>Object.assign({id:uuid(),days:[]},x)),goal:S.dog.goalMin||''};}
  const rec=walkRec(),items=[...rtDraft.items].sort((a,b)=>hm2min(a.time)-hm2min(b.time));
  const sh=openSheet(`<div class="sheet-head"><span class="ic ic-yellow" style="width:56px;height:56px;border-radius:18px">${I.clock}</span><div><h2>Rutina de ${esc(S.dog.name)}</h2><p class="sub">Ajusta horarios de paseos, comidas y todo lo que necesite.</p></div></div>
    <div class="field"><label for="rtGoal">Meta diaria de paseo (minutos)</label><input class="input" id="rtGoal" type="number" inputmode="numeric" min="5" max="300" step="5" value="${esc(rtDraft.goal)}" placeholder="${rec.total} (recomendado)"></div>
    <p class="flabel" style="margin:16px 2px 8px">Actividades del día</p>
    <div class="rt-list">${items.length?items.map(it=>{const t=rtype(it.type);return `<button class="rt-item" data-rt="${it.id}"><span class="time">${esc(it.time)}</span><span class="node" style="background:${t.color}">${I[t.icon]}</span><span class="what">${esc(it.label||t.label)}<small>${esc(it.detail||'')}${it.detail?' · ':''}${daysLabel(it.days)}</small></span><span class="chev">${I.chev}</span></button>`;}).join(''):`<p class="muted" style="font-weight:700;padding:8px 2px">Sin actividades. Agrega la primera.</p>`}</div>
    <button class="btn btn-white btn-block btn-sm" id="rtAdd" style="margin-top:10px">${I.plus}Agregar actividad</button>
    <div class="row-actions" style="margin-top:16px"><button class="btn btn-ghost" id="rtReset">Usar recomendada</button><button class="btn btn-orange" id="rtSave">Guardar</button></div>`,{onClose:()=>{rtDraft=null;}});
  const g=$('#rtGoal',sh);g.oninput=()=>{rtDraft.goal=g.value;};
  $$('[data-rt]',sh).forEach(b=>b.onclick=()=>openRoutineItem(b.dataset.rt));
  $('#rtAdd',sh).onclick=()=>openRoutineItem(null);
  $('#rtReset',sh).onclick=()=>confirmSheet('¿Volver a la rutina recomendada?',`Se reemplazan tus horarios por los calculados según la edad, el peso y el alimento de ${esc(S.dog.name)}.`,'Usar recomendada',async()=>{await saveRoutine(null,null);},false,()=>setTimeout(()=>openRoutineEditor(),30));
  $('#rtSave',sh).onclick=async()=>{const b=$('#rtSave',sh);b.disabled=true;b.innerHTML='<span class="spin"></span>';const gv=parseInt(rtDraft.goal,10);await saveRoutine(rtDraft.items,isNaN(gv)?null:Math.max(5,Math.min(300,gv)),b);};
}
async function saveRoutine(items,goal,btn){
  const d=Object.assign({},S.dog,{routine:items&&items.length?items.map(({id,time,type,label,detail,days})=>({id,time,type,label,detail,days:days||[]})):null,goalMin:goal});
  try{const saved=await DB.saveDog(d);Object.assign(S.dog,saved);const i=S.dogs.findIndex(x=>x.id===saved.id);if(i>=0)S.dogs[i]=S.dog;rtDraft=null;closeSheet(true);renderAll();scheduleReminders(true);toast(items?'Rutina guardada':'Volviste a la rutina recomendada');}
  catch(e){console.error(e);if(btn){btn.disabled=false;btn.textContent='Guardar';}toast(/routine|goal_minutes|column/i.test(e.message||'')?'Falta actualizar la base de datos (migración v3)':'No se pudo guardar. Revisa tu conexión.',4200);}
}
function openRoutineItem(id){
  const isNew=!id;const it=isNew?{id:uuid(),time:'12:00',type:'walk',label:'',detail:'',days:[]}:Object.assign({},rtDraft.items.find(x=>x.id===id));
  const sh=openSheet(`<h2>${isNew?'Nueva actividad':'Editar actividad'}</h2>
    <p class="flabel" style="margin:14px 2px 8px">Tipo</p>
    <div class="type-grid">${Object.entries(RTYPES).map(([k,t])=>`<button type="button" class="type-chip ${it.type===k?'on':''}" data-type="${k}" style="--c:${t.color}">${I[t.icon]}<span>${t.label}</span></button>`).join('')}</div>
    <div class="form" style="margin-top:14px">
      <div class="field"><label for="riTime">Hora</label><input class="input" id="riTime" type="time" value="${esc(it.time)}"></div>
      <div class="field"><label for="riLabel">Nombre</label><input class="input" id="riLabel" maxlength="40" value="${esc(it.label)}" placeholder="${rtype(it.type).label}"></div>
      <div class="field full"><label for="riDetail">Detalle (opcional)</label><input class="input" id="riDetail" maxlength="60" value="${esc(it.detail)}" placeholder="Ej: 30 min, 85 g, 1 pastilla"></div>
      <div class="field full"><span class="flabel">Días</span><div class="days">${DAY_ORDER.map(d=>`<button type="button" class="day ${(!it.days||!it.days.length||it.days.includes(d))?'on':''}" data-day="${d}">${DAY_L[d]}</button>`).join('')}</div></div>
    </div>
    <div class="row-actions" style="margin-top:18px">${isNew?'':`<button class="btn btn-white" id="riDel" style="color:var(--red)">${I.trash}Eliminar</button>`}<button class="btn btn-orange" id="riOk">Listo</button></div>`,{onClose:()=>setTimeout(()=>openRoutineEditor(),30)});
  let type=it.type;
  $$('[data-type]',sh).forEach(b=>b.onclick=()=>{type=b.dataset.type;$$('[data-type]',sh).forEach(x=>x.classList.toggle('on',x===b));$('#riLabel',sh).placeholder=rtype(type).label;});
  $$('[data-day]',sh).forEach(b=>b.onclick=()=>b.classList.toggle('on'));
  $('#riOk',sh).onclick=()=>{
    const days=$$('[data-day].on',sh).map(b=>+b.dataset.day);if(!days.length){toast('Elige al menos un día');return;}
    Object.assign(it,{type,time:$('#riTime',sh).value||'12:00',label:$('#riLabel',sh).value.trim()||rtype(type).label,detail:$('#riDetail',sh).value.trim(),days:days.length===7?[]:days});
    if(isNew)rtDraft.items.push(it);else rtDraft.items=rtDraft.items.map(x=>x.id===it.id?it:x);
    closeSheet();
  };
  const del=$('#riDel',sh);if(del)del.onclick=()=>{rtDraft.items=rtDraft.items.filter(x=>x.id!==it.id);closeSheet();};
}

/* =========================================================
   ÁLBUM DE FOTOS
   ========================================================= */
const TAPES=['#FFC629','#FF7EB6','#9DB8FF','#2EE59D','#FFB37F'];
const tilt=i=>[-2.2,1.6,-1,2.4,-1.8,1.2,-2.6,2][i%8];
const fmtDate=ts=>{const d=new Date(ts);return d.getDate()+' '+MES[d.getMonth()]+' '+d.getFullYear();};
async function hydratePhotos(root){
  const imgs=$$('img[data-thumb],img[data-full]',root);if(!imgs.length)return;
  const byId=new Map(S.photos.map(p=>[p.id,p]));
  const paths=imgs.map(i=>{const p=byId.get(i.dataset.thumb||i.dataset.full);return p?(i.dataset.full?p.path:p.thumbPath):null;});
  try{await ensureUrls(paths);}catch(e){}
  imgs.forEach((i,k)=>{const u=urlFor(paths[k]);if(u&&i.getAttribute('src')!==u){i.onload=()=>i.classList.add('ok');i.src=u;}});
}
function renderGallery(){
  const body=$('#galBody');if(!body||!S.dog)return;const all=S.photos;
  const favs=all.filter(p=>p.favorite),list=S.galFilter==='fav'?favs:all;
  if(!all.length){body.innerHTML=`<div class="empty gal-empty"><img data-asset="ladeando" alt=""><h3>El álbum está vacío</h3><p>Sube las mejores fotos de ${esc(S.dog.name)}: siestas, paseos, poses de modelo…</p><button class="btn btn-orange btn-block" data-action="add-photo">${I.camera}Subir fotos</button></div><div id="galProgress" class="gal-progress" hidden><span class="spin"></span><span id="galProgressTxt">Subiendo…</span><i><b id="galProgressBar"></b></i></div>`;bindAssets(body);return;}
  const cover=favs.concat(all.filter(p=>!p.favorite)).slice(0,3);
  const groups=[];list.forEach(p=>{const d=new Date(p.takenAt),key=d.getFullYear()+'-'+d.getMonth();let g=groups[groups.length-1];if(!g||g.key!==key){g={key,label:cap(new Intl.DateTimeFormat('es-CL',{month:'long',year:'numeric'}).format(d)),items:[]};groups.push(g);}g.items.push(p);});
  let idx=0;
  body.innerHTML=`
    <div class="gal-hero"><div class="gal-stack">${cover.map((p,i)=>`<span class="polaroid st" style="--r:${[-9,7,-2][i]}deg;--x:${[-40,36,0][i]}px"><span class="ph-img"><img data-thumb="${p.id}" alt=""></span></span>`).join('')}</div>
      <div class="gal-hero-txt"><b>${all.length}</b><span>${all.length===1?'recuerdo':'recuerdos'} de ${esc(S.dog.name)}</span></div></div>
    <div class="seg gal-seg"><button data-gal="all" class="${S.galFilter==='all'?'on':''}">Todas · ${all.length}</button><button data-gal="fav" class="${S.galFilter==='fav'?'on':''}">Favoritas · ${favs.length}</button></div>
    <div id="galProgress" class="gal-progress" hidden><span class="spin"></span><span id="galProgressTxt">Subiendo…</span><i><b id="galProgressBar"></b></i></div>
    ${list.length?groups.map(g=>`<section class="gal-month"><h3>${esc(g.label)}<small>${g.items.length} ${g.items.length===1?'foto':'fotos'}</small></h3><div class="gal-grid">${g.items.map(p=>{const i=idx++;return `<button class="polaroid" data-photo="${p.id}" style="--r:${tilt(i)}deg"><span class="tape" style="background:${TAPES[i%TAPES.length]}"></span><span class="ph-img"><img data-thumb="${p.id}" alt="${esc(p.caption)}"></span><span class="cap">${esc(p.caption)||fmtDate(p.takenAt)}</span>${p.favorite?`<i class="fav">${I.heartF}</i>`:''}</button>`;}).join('')}</div></section>`).join(''):`<p class="muted" style="text-align:center;font-weight:700;padding:30px 0">Aún no marcas favoritas. Abre una foto y toca el corazón.</p>`}`;
  $$('[data-gal]',body).forEach(b=>b.onclick=()=>{S.galFilter=b.dataset.gal;renderGallery();});
  hydratePhotos(body);
}
function pickPhotos(){const inp=$('#photoInput');inp.value='';inp.click();}
async function processImage(file){
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('formato'));i.src=url;});
    const W=img.naturalWidth,H=img.naturalHeight;
    const make=(max,q)=>new Promise((res,rej)=>{const s=Math.min(1,max/Math.max(W,H));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(W*s));c.height=Math.max(1,Math.round(H*s));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);c.toBlob(b=>b?res(b):rej(new Error('canvas')),'image/jpeg',q);});
    return {full:await make(1600,.85),thumb:await make(560,.8),width:W,height:H};
  }finally{URL.revokeObjectURL(url);}
}
let uploading=false;
async function uploadPhotos(files){
  const list=[...files].filter(f=>/^image\//.test(f.type)||/\.(heic|heif|jpe?g|png|webp|gif)$/i.test(f.name)).slice(0,30);
  if(!list.length||uploading)return;uploading=true;
  if(S.view!=='fotos')go('fotos');
  let ok=0,fail=0,lastErr='';
  for(let i=0;i<list.length;i++){
    const pg=$('#galProgress');if(pg){pg.hidden=false;$('#galProgressTxt').textContent=`Subiendo ${i+1} de ${list.length}…`;$('#galProgressBar').style.width=Math.round((i+.5)/list.length*100)+'%';}
    try{const f=list[i];const im=await processImage(f);const meta={id:uuid(),dogId:S.dog.id,caption:'',takenAt:(f.lastModified&&f.lastModified<Date.now()+6e4)?f.lastModified:Date.now(),width:im.width,height:im.height,favorite:false};
      const saved=await DB.addPhoto(meta,im.full,im.thumb);S.photos.unshift(saved);ok++;}
    catch(e){console.error(e);fail++;lastErr=e.message||'';}
    S.photos.sort((a,b)=>b.takenAt-a.takenAt);
    if(S.view==='fotos')renderGallery();
  }
  uploading=false;renderAll();
  if(!fail)toast(`¡${ok} ${ok===1?'foto agregada':'fotos agregadas'} al álbum!`,3000);
  else toast(/bucket|not found|policy|row-level|photos/i.test(lastErr)?'Falta activar el álbum en Supabase (migración v3)':`Se subieron ${ok} de ${list.length}. Revisa tu conexión.`,4500);
}
let lbIdx=0,lbList=[];
function openLightbox(id){
  lbList=S.view==='fotos'&&S.galFilter==='fav'?S.photos.filter(p=>p.favorite):S.photos.slice();
  lbIdx=Math.max(0,lbList.findIndex(p=>p.id===id));
  let lb=$('#lightbox');if(!lb){lb=document.createElement('div');lb.id='lightbox';lb.className='lightbox';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');document.body.appendChild(lb);}
  lb.hidden=false;document.body.style.overflow='hidden';renderLightbox();
}
function closeLightbox(){const lb=$('#lightbox');if(lb){lb.hidden=true;lb.innerHTML='';}document.body.style.overflow='';}
function renderLightbox(){
  const lb=$('#lightbox');const p=lbList[lbIdx];if(!lb||!p){closeLightbox();return;}
  const isAvatar=!!S.dog.avatarPath&&S.dog.avatarPath===p.thumbPath;
  lb.innerHTML=`<div class="lb-top"><span>${lbIdx+1} / ${lbList.length}</span><button class="icon-btn" id="lbClose" aria-label="Cerrar">${I.x}</button></div>
    <div class="lb-stage" id="lbStage">${lbIdx>0?`<button class="lb-nav prev" id="lbPrev" aria-label="Anterior">${I.back}</button>`:''}<img class="lb-ph" data-thumb="${p.id}" alt=""><img class="lb-img" data-full="${p.id}" alt="${esc(p.caption)}">${lbIdx<lbList.length-1?`<button class="lb-nav next" id="lbNext" aria-label="Siguiente">${I.chev}</button>`:''}</div>
    <div class="lb-card"><p class="lb-cap">${esc(p.caption)||'<span class="muted">Sin descripción</span>'}</p><p class="lb-date">${fmtDate(p.takenAt)}</p>
      <div class="lb-actions">
        <button id="lbFav" class="${p.favorite?'on':''}">${p.favorite?I.heartF:I.heart}<span>Favorita</span></button>
        <button id="lbEdit">${I.pencil}<span>Editar</span></button>
        <button id="lbAvatar" class="${isAvatar?'on':''}">${I.user}<span>${isAvatar?'Su foto':'De perfil'}</span></button>
        <button id="lbDown">${I.down}<span>Guardar</span></button>
        <button id="lbDel">${I.trash}<span>Eliminar</span></button>
      </div></div>`;
  hydratePhotos(lb);
  $('#lbClose').onclick=closeLightbox;
  const pv=$('#lbPrev'),nx=$('#lbNext');if(pv)pv.onclick=()=>{lbIdx--;renderLightbox();};if(nx)nx.onclick=()=>{lbIdx++;renderLightbox();};
  const st=$('#lbStage');let x0=null;st.ontouchstart=e=>{x0=e.touches[0].clientX;};st.ontouchend=e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(dx<-50&&lbIdx<lbList.length-1){lbIdx++;renderLightbox();}else if(dx>50&&lbIdx>0){lbIdx--;renderLightbox();}};
  $('#lbFav').onclick=async()=>{try{await DB.updatePhoto(p,{favorite:!p.favorite});renderLightbox();renderAll();}catch(e){toast('No se pudo guardar. Revisa tu conexión.');}};
  $('#lbEdit').onclick=()=>editPhotoSheet(p);
  $('#lbAvatar').onclick=async()=>{if(isAvatar)return;const d=Object.assign({},S.dog,{avatarPath:p.thumbPath});try{const saved=await DB.saveDog(d);Object.assign(S.dog,saved);await ensureUrls([S.dog.avatarPath]);renderLightbox();renderAll();toast(`Nueva foto de perfil para ${S.dog.name}`);}catch(e){console.error(e);toast(/avatar_path|column/i.test(e.message||'')?'Falta actualizar la base de datos (migración v3)':'No se pudo guardar. Revisa tu conexión.',4000);}};
  $('#lbDown').onclick=async()=>{try{await ensureUrls([p.path]);const blob=await (await fetch(urlFor(p.path))).blob();const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${(S.dog.name||'perro').toLowerCase()}-${new Date(p.takenAt).toISOString().slice(0,10)}.jpg`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);}catch(e){toast('No se pudo descargar');}};
  $('#lbDel').onclick=()=>confirmSheet('¿Eliminar esta foto?','Se borra del álbum para siempre.','Eliminar',async()=>{await DB.deletePhoto(p);S.photos=S.photos.filter(x=>x.id!==p.id);lbList=lbList.filter(x=>x.id!==p.id);if(S.dog.avatarPath===p.thumbPath){S.dog.avatarPath=null;try{await DB.saveDog(S.dog);}catch(e){}}if(lbIdx>=lbList.length)lbIdx=lbList.length-1;renderAll();if(lbList.length)renderLightbox();else closeLightbox();toast('Foto eliminada');});
}
function editPhotoSheet(p){
  const local=new Date(p.takenAt-new Date(p.takenAt).getTimezoneOffset()*6e4).toISOString().slice(0,10);
  const sh=openSheet(`<h2>Editar foto</h2><div class="form" style="margin-top:14px"><div class="field full"><label for="peCap">Descripción</label><textarea class="input" id="peCap" maxlength="200" rows="3" placeholder="Ej: Primera vez en la playa">${esc(p.caption)}</textarea></div>
    <div class="field full"><label for="peDate">Fecha</label><input class="input" id="peDate" type="date" value="${local}"></div></div>
    <div class="row-actions" style="margin-top:16px"><button class="btn btn-ghost" id="peNo">Cancelar</button><button class="btn btn-orange" id="peOk">Guardar</button></div>`);
  $('#peNo',sh).onclick=()=>closeSheet();
  $('#peOk',sh).onclick=async()=>{const capt=$('#peCap',sh).value.trim(),dv=$('#peDate',sh).value,t=dv?new Date(dv+'T12:00:00').getTime():p.takenAt;
    try{await DB.updatePhoto(p,{caption:capt,takenAt:t});S.photos.sort((a,b)=>b.takenAt-a.takenAt);lbList.sort((a,b)=>b.takenAt-a.takenAt);lbIdx=Math.max(0,lbList.findIndex(x=>x.id===p.id));closeSheet();renderLightbox();renderAll();toast('Foto actualizada');}catch(e){toast('No se pudo guardar. Revisa tu conexión.');}};
}
async function makeDemoPhotos(){
  const defs=[['ladeando','#FFC629','Pose oficial de modelo',0,5],['caminando','#2EE59D','Rumbo al Parque Forestal',3,3],['durmiendo','#9DB8FF','Siesta de campeón',8,10],['ladeando','#FF7EB6','¿Dijiste galleta?',15,14],['caminando','#FFB37F','Paseo de sábado',38,9]];
  const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});
  for(const [k,bg,capt,daysAgo,f] of defs){
    try{const m=SPRITE_META[k];const img=await load(ASSETS[k]);const c=document.createElement('canvas');c.width=c.height=720;const x=c.getContext('2d');
      x.fillStyle=bg;x.fillRect(0,0,720,720);x.fillStyle='rgba(255,255,255,.35)';for(let j=0;j<6;j++){x.beginPath();x.arc(80+j*120,90+(j%2)*520,36+j*8,0,7);x.fill();}
      const sx=(f%m.cols)*m.w,sy=Math.floor(f/m.cols)*m.h,dw=620,dh=dw*m.h/m.w;x.drawImage(img,sx,sy,m.w,m.h,50,(720-dh)/2+30,dw,dh);
      const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.85));
      await DB.addPhoto({id:uuid(),dogId:MEM.dogs[0].id,caption:capt,takenAt:Date.now()-daysAgo*864e5,width:720,height:720,favorite:daysAgo===0||daysAgo===8},blob,blob);
    }catch(e){console.warn(e);}
  }
}

/* Retomar un paseo en curso si iOS recargó la vista (o se cerró la app) */
async function resumeWalk(b){
  if(b.dogId!==S.dog.id){try{await selectDog(b.dogId);renderAll();}catch(e){console.warn(e);}}
  closeSheet(true);
  Object.assign(W,{active:true,mode:'gps',paused:!!b.paused,pauseStart:b.pauseStart||0,pausedMs:b.pausedMs||0,started:b.started,elapsed:0,last:performance.now(),points:(b.points||[]).slice(),distance:b.distance||0,route:routeById(b.routeId)||null,pee:!!b.pee,poop:!!b.poop,follow:true,lastTs:0,gotFix:false,errShown:false,sim:null,lastBackup:0,dogId:b.dogId,kf:null,cur:null,acc:null,lastMove:Date.now(),lastAccept:Date.now(),rejects:0,minReached:!!b.minReached,minNotif:b.minNotif||null,hiddenAt:0});
  W.elapsed=walkElapsed();
  setupLiveUI('gps',W.route);
  const last=W.points[W.points.length-1];
  ensureLiveMap(last||(W.route?W.route.points[0]:DEFAULT_CENTER));drawGhost(W.route);resetTrack();redrawTrack();if(last)movePin(last,null);
  setPill('Retomando el GPS…','warn');startTracking();scheduleMinNotif();liveStart();
  clearInterval(W.timer);W.timer=setInterval(tick,250);updateLive();saveLive(true);
  toast(`Retomamos el paseo con ${S.dog.name} (${fmtDur(W.elapsed)})`,3800);
}

/* =========================================================
   AVISOS NATIVOS (app iOS)
   ========================================================= */
async function notifAllowed(){if(!IS_APP)return false;try{return await NAT.pedirPermisoAvisos();}catch(e){return false;}}
async function cancelMinNotif(){const id=W.minNotif;W.minNotif=null;if(id&&NAT){try{await NAT.cancelarAviso(id);}catch(e){}}}
async function scheduleMinNotif(){
  await cancelMinNotif();
  if(!IS_APP||!W.active||W.mode!=='gps'||W.minReached||W.paused)return;
  const remain=perWalkMin()*60-walkElapsed();if(remain<=5)return;
  if(!(await notifAllowed()))return;
  try{W.minNotif=await NAT.programarAviso('¡Mínimo cumplido!',`Llevan ${perWalkMin()} min de paseo con ${S.dog.name}. Puedes seguir o terminar el paseo.`,Math.round(remain),{datos:{tipo:'min'}});saveLive(true);}catch(e){console.warn(e);}
}
const remKey=()=>lsKey('reminders');
const REM_BEFORE=[0,5,10,15];
const remState=()=>Object.assign({on:false,ids:[],others:false,before:0,asked:false,sig:'',v:0},LS.get(remKey())||{});
function remItems(st){
  const src=customRoutine()?S.dog.routine:recommendedItems();
  return src.filter(x=>x.type==='walk'||(st.others&&(x.type==='meal'||x.type==='meds')))
    .map(x=>({type:x.type,time:x.time,label:x.label||rtype(x.type).label,detail:x.detail||'',days:Array.isArray(x.days)?x.days.slice().sort():[]}))
    .sort((a,b)=>hm2min(a.time)-hm2min(b.time));
}
function walkTimes(){return remItems({others:false}).map(x=>x.time).filter((t,i,a)=>a.indexOf(t)===i);}
function reminderText(x,before){const n=S.dog.name,lab=x.label,det=x.detail?` · ${x.detail}`:'';
  if(x.type==='walk')return before?[`En ${before} min: paseo de ${n}`,`${lab}${det}. ¡Ve preparando el arnés!`]:[`Hora del paseo de ${n}`,`${lab}${det}. ¡A ponerle el arnés!`];
  if(x.type==='meal')return [before?`En ${before} min: ${lab}`:`Hora de comer: ${lab}`,`${n}${det}`];
  if(x.type==='meds')return [before?`En ${before} min: remedio de ${n}`:`Remedio de ${n}`,`${lab}${det}`];
  return [`${lab} · ${n}`,x.detail||rtype(x.type).label];}
async function scheduleReminders(force){
  if(!IS_APP||S.mode!=='cloud'||!S.dog||!NAT)return;
  const st=remState(),items=st.on?remItems(st):[];
  const sig=JSON.stringify([S.dog.id,S.dog.name,st.on,st.before,st.others,items]);
  if(!force&&st.v===2&&st.sig===sig)return;
  for(const id of (st.ids||[])){try{await NAT.cancelarAviso(id);}catch(e){}}
  st.ids=[];
  if(st.on){
    const list=[];
    for(const x of items){
      let t=hm2min(x.time)-(st.before||0),shift=0;if(t<0){t+=1440;shift=-1;}
      const hora=Math.floor(t/60),minuto=t%60;
      if(!x.days.length)list.push({x,cuando:{hora,minuto}});
      else x.days.forEach(d=>list.push({x,cuando:{hora,minuto,diaSemana:(d+shift+7)%7}}));
    }
    for(const {x,cuando} of list.slice(0,56)){
      const [t,body]=reminderText(x,st.before);
      try{
        if(NAT.programarAvisoRepetido)st.ids.push(await NAT.programarAvisoRepetido(t,body,cuando,{datos:{tipo:x.type}}));
        else{const d=new Date();d.setHours(cuando.hora,cuando.minuto,0,0);if(d<=new Date())d.setDate(d.getDate()+1);st.ids.push(await NAT.programarAviso(t,body,d,{datos:{tipo:x.type}}));}
      }catch(e){console.warn(e);}
    }
  }
  st.sig=sig;st.v=2;LS.set(remKey(),st);
}
async function setReminders(patch,quiet){
  if(!IS_APP)return;
  const st=Object.assign(remState(),patch,{asked:true});
  if(st.on&&!(await notifAllowed())){st.on=false;LS.set(remKey(),st);toast('Activa las notificaciones de SalchiPaseo en Ajustes del iPhone.',4500);renderSettings();return;}
  LS.set(remKey(),st);
  await scheduleReminders(true);if(S.view==='ajustes')renderSettings();
  if(quiet)return;
  if('on' in patch)toast(st.on?`Listo: te aviso ${st.before?st.before+' min antes de':'a la hora de'} cada paseo de ${S.dog.name}`:'Recordatorios desactivados',3800);
  else if('before' in patch)toast(st.before?`Te aviso ${st.before} min antes de cada paseo`:'Te aviso a la hora exacta de cada paseo');
  else if('others' in patch)toast(st.others?'También te aviso las comidas y los remedios':'Solo te aviso los paseos');
}
function maybeAskReminders(){
  if(!IS_APP||S.mode!=='cloud'||!S.dog||W.active)return;
  const st=remState();if(st.asked||st.on||$('.sheet'))return;
  const times=walkTimes();if(!times.length)return;
  st.asked=true;LS.set(remKey(),st);
  const sh=openSheet(`<div class="sheet-head"><span class="ic ic-orange" style="width:56px;height:56px;border-radius:18px">${I.bell}</span><div><h2>¿Te aviso cuándo sacar a ${esc(S.dog.name)}?</h2><p class="sub">Te mando una notificación a la hora de cada paseo de su rutina, aunque tengas la app cerrada.</p></div></div>
    <div class="rem-times">${times.map(t=>`<span>${I.walk}${esc(t)}</span>`).join('')}</div>
    <button class="btn btn-orange btn-block" id="remYes" style="margin-top:16px">Sí, avísame</button>
    <button class="btn btn-ghost btn-block" id="remNo" style="margin-top:8px">Ahora no</button>
    <p class="hint" style="margin-top:10px">Puedes cambiarlo cuando quieras en Ajustes → Avisos. Los horarios salen de la rutina de ${esc(S.dog.name)}.</p>`);
  $('#remYes',sh).onclick=async()=>{closeSheet(true);await setReminders({on:true});};
  $('#remNo',sh).onclick=()=>closeSheet(true);
}
function confirmResetStats(){
  if(W.active){toast('Termina el paseo en curso antes de reiniciar.');return;}
  const d=S.dog,n=S.walks.length;
  confirmSheet(`¿Reiniciar las estadísticas de ${esc(d.name)}?`,`Se borran para siempre sus <b>${n} ${n===1?'paseo':'paseos'}</b>: minutos, kilómetros, nivel, rachas y medallas vuelven a cero. Se mantienen su perfil, rutina, metas, fotos y rutas guardadas.`,'Reiniciar',async()=>{
    try{await DB.resetWalks(d.id);
      queueSet(queueGet().filter(it=>!(it.walk&&it.walk.dogId===d.id)));
      if(S.mode==='cloud')LS.del(lsKey('live'));
      S.walks=[];renderAll();toast(`Listo: estadísticas de ${d.name} en cero`);}
    catch(e){console.error(e);toast('No se pudo reiniciar. Revisa tu conexión.');}});
}
/* ---------- Actividad en vivo: el paseo en la pantalla bloqueada y en la isla dinámica ---------- */
const LIVE=IS_APP&&NAT&&NAT.actividad?NAT.actividad:null;
const liveAct={on:false,last:0,frame:0};
function liveState(){return {perro:S.dog?S.dog.name:'tu perro',inicio:W.started+W.pausedMs,pausa:W.paused&&W.pauseStart?W.pauseStart:null,metros:Math.round(W.distance),metaMin:perWalkMin(),cuadro:liveAct.frame,segundos:Math.round(walkElapsed())};}
async function liveStart(){
  if(!LIVE||!W.active||W.mode!=='gps')return;
  try{await LIVE.iniciar(liveState());liveAct.on=true;liveAct.last=Date.now();}catch(e){liveAct.on=false;console.warn('actividad en vivo',e);}
}
function liveTick(force){
  if(!liveAct.on||!W.active)return;const n=Date.now();if(!force&&n-liveAct.last<15000)return;
  liveAct.last=n;liveAct.frame=(liveAct.frame+1)%4;LIVE.actualizar(liveState()).catch(()=>{});
}
async function liveEnd(){if(!liveAct.on)return;liveAct.on=false;try{await LIVE.terminar(liveState());}catch(e){}}
async function liveCleanup(){if(!LIVE||W.active)return;try{await LIVE.terminar({inmediato:true});}catch(e){}}
async function testNotif(){
  if(!IS_APP){toast('Los avisos funcionan en la app de iPhone.');return;}
  if(!(await notifAllowed())){toast('Activa las notificaciones de SalchiPaseo en Ajustes del iPhone.',4500);return;}
  try{await NAT.programarAviso('Aviso de prueba',`Si ves esto, los avisos de SalchiPaseo funcionan. ${S.dog?S.dog.name:'Tu perro'} lo aprueba.`,60,{datos:{tipo:'test'}});toast('Listo: el aviso llega en 1 minuto. Puedes cerrar la app.',4000);}catch(e){toast('No se pudo programar el aviso');}
}
if(NAT&&IS_APP){try{NAT.alTocarAviso(n=>{const t=n&&n.extra&&n.extra.tipo;if(!S.dog)return;if(t==='walk'&&!W.active){closeSheet(true);go('perfil');openStartSheet();}else if(t==='min'&&W.active){$('#live').hidden=false;}});}catch(e){}}

/* =========================================================
   LOGIN CON CORREO + CONTRASEÑA (funciona dentro de la app, sin SMTP propio)
   ========================================================= */
const EMAIL_CODE=!!CFG.EMAIL_CODE; // true cuando Supabase tenga SMTP propio y la plantilla incluya {{ .Token }}
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function pwErr(e){const m=(e&&e.message)||'';
  if((e&&e.status===429)||/rate limit|too many|seconds/i.test(m))return 'Demasiados intentos seguidos. Espera unos minutos e intenta de nuevo.';
  if(/invalid login|invalid credentials/i.test(m))return 'Correo o contraseña incorrectos. Si antes entrabas con Google, primero crea tu contraseña desde la web (Ajustes → Contraseña para la app).';
  if(/not confirmed/i.test(m))return 'Falta confirmar tu correo: abre el enlace que te enviamos y vuelve a intentar.';
  if(/already registered|already exists/i.test(m))return 'Ese correo ya tiene cuenta. Toca «Entrar» con tu contraseña.';
  if(/should be different|same.*old/i.test(m))return 'La contraseña nueva debe ser distinta a la anterior.';
  if(/reauthenticat|recent login/i.test(m))return 'Por seguridad, cierra sesión, vuelve a entrar con Google e inténtalo de nuevo.';
  if(/password/i.test(m))return 'La contraseña es muy débil: usa al menos 8 caracteres, con letras y números.';
  if(/email/i.test(m))return 'Revisa que el correo esté bien escrito.';
  return 'No se pudo completar. Revisa tu conexión.';}
function pwField(id,label,ac,ph){return `<div class="field"><label for="${id}">${label}</label><div class="pw-wrap"><input class="input" id="${id}" type="password" autocomplete="${ac}" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${ph}"><button type="button" class="pw-eye" data-eye="${id}" aria-label="Mostrar contraseña">Ver</button></div></div>`;}
function bindEyes(sh){sh.querySelectorAll('[data-eye]').forEach(b=>b.onclick=()=>{const i=$('#'+b.dataset.eye,sh);const show=i.type==='password';i.type=show?'text':'password';b.textContent=show?'Ocultar':'Ver';b.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña');});}
function openEmailSheet(prefill,mode){
  if(!CONFIG_OK){$('#configWarn').hidden=false;toast('Primero conecta Supabase en config.js');return;}
  const signup=mode==='signup';
  const sh=openSheet(`<div class="sheet-head"><span class="ic ic-orange" style="width:56px;height:56px;border-radius:18px">${I.lock}</span><div><h2>${signup?'Crear cuenta':'Entrar con correo'}</h2><p class="sub">${signup?'Elige un correo y una contraseña para guardar los paseos de tu perro.':'Usa el mismo correo de siempre para ver tus perros, rutas y paseos.'}</p></div></div>
    <div class="field"><label for="emEmail">Correo</label><input class="input" id="emEmail" type="email" inputmode="email" autocomplete="${signup?'email':'username'}" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="tu@correo.com" value="${esc(prefill||'')}"></div>
    ${pwField('emPass','Contraseña',signup?'new-password':'current-password',signup?'Mínimo 8 caracteres':'Tu contraseña')}
    <button class="btn btn-orange btn-block" id="emGo" style="margin-top:14px">${signup?'Crear cuenta':'Entrar'}</button>
    <div class="row-actions" style="margin-top:12px"><button class="btn btn-ghost btn-sm" id="emSwitch">${signup?'Ya tengo cuenta':'Crear cuenta nueva'}</button>${EMAIL_CODE?'<button class="btn btn-white btn-sm" id="emCode">Usar un código</button>':''}</div>
    ${signup?'':`<p class="hint" style="margin-top:14px"><b>¿Antes entrabas con Google?</b> Abre <b>${esc(location.host+location.pathname.replace(/\/$/,''))}</b> en Safari, entra con Google y ve a Ajustes → <b>Contraseña para la app</b>. Después entra aquí con ese correo y verás todos tus datos.</p>`}`);
  bindEyes(sh);
  const ie=$('#emEmail',sh),ip=$('#emPass',sh);setTimeout(()=>(prefill?ip:ie).focus(),150);
  const goBtn=$('#emGo',sh),label=goBtn.textContent;
  const go_=async()=>{const email=ie.value.trim().toLowerCase(),password=ip.value;
    if(!EMAIL_RE.test(email)){toast('Escribe un correo válido');ie.focus();return;}
    if(password.length<(signup?8:6)){toast(signup?'La contraseña debe tener al menos 8 caracteres':'Escribe tu contraseña');ip.focus();return;}
    goBtn.disabled=true;goBtn.innerHTML='<span class="spin"></span>';
    const done=()=>{goBtn.disabled=false;goBtn.textContent=label;};
    if(!signup){const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error){done();toast(pwErr(error),6000);return;}
      closeSheet(true);if(data&&data.user)enterCloud(data.user);return;}
    const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});
    if(error){done();toast(pwErr(error),6000);return;}
    if(data&&data.session&&data.user){closeSheet(true);enterCloud(data.user);return;}
    if(data&&data.user&&Array.isArray(data.user.identities)&&!data.user.identities.length){done();toast('Ese correo ya tiene cuenta. Si entrabas con Google, crea tu contraseña desde la web (Ajustes → Contraseña para la app).',7000);return;}
    closeSheet(true);
    openSheet(`<h2>Confirma tu correo</h2><p class="sub" style="margin:6px 0 16px">Te enviamos un enlace a <b>${esc(email)}</b>. Ábrelo (puede abrirse en Safari, está bien) y luego vuelve aquí y entra con tu contraseña. Revisa también la carpeta de spam.</p><button class="btn btn-orange btn-block" id="emAfter">Ya lo confirmé, entrar</button>`);
    $('#emAfter').onclick=()=>{closeSheet(true);openEmailSheet(email);};};
  goBtn.onclick=go_;ip.onkeydown=e=>{if(e.key==='Enter')go_();};ie.onkeydown=e=>{if(e.key==='Enter')ip.focus();};
  $('#emSwitch',sh).onclick=()=>{const v=ie.value.trim();closeSheet(true);openEmailSheet(v,signup?'login':'signup');};
  if(EMAIL_CODE)$('#emCode',sh).onclick=()=>{const v=ie.value.trim();closeSheet(true);openOtpSheet(v);};
}
function openPasswordSheet(){
  const sh=openSheet(`<div class="sheet-head"><span class="ic ic-orange" style="width:56px;height:56px;border-radius:18px">${I.lock}</span><div><h2>Contraseña para la app</h2><p class="sub">Con ella entras en la app de iPhone usando <b>${esc((S.user&&S.user.email)||'tu correo')}</b>. Seguirás pudiendo entrar con Google en la web.</p></div></div>
    ${pwField('pwNew','Contraseña nueva','new-password','Mínimo 8 caracteres')}
    ${pwField('pwNew2','Repítela','new-password','Igual que arriba')}
    <button class="btn btn-orange btn-block" id="pwSave" style="margin-top:14px">Guardar contraseña</button>`);
  bindEyes(sh);const a=$('#pwNew',sh),b2=$('#pwNew2',sh);setTimeout(()=>a.focus(),150);
  const save=async()=>{const p1=a.value,p2=b2.value;
    if(p1.length<8){toast('Usa al menos 8 caracteres');a.focus();return;}
    if(!/[a-zA-Z]/.test(p1)||!/\d/.test(p1)){toast('Combina letras y números');a.focus();return;}
    if(p1!==p2){toast('Las contraseñas no coinciden');b2.focus();return;}
    const btn=$('#pwSave',sh);btn.disabled=true;btn.innerHTML='<span class="spin"></span>';
    const {error}=await sb.auth.updateUser({password:p1});
    if(error){btn.disabled=false;btn.textContent='Guardar contraseña';toast(pwErr(error),6000);return;}
    closeSheet(true);toast('¡Listo! Ya puedes entrar en la app con tu correo y esta contraseña.',5000);};
  $('#pwSave',sh).onclick=save;b2.onkeydown=e=>{if(e.key==='Enter')save();};
}

/* =========================================================
   LOGIN CON CÓDIGO POR CORREO (requiere SMTP propio en Supabase)
   ========================================================= */
function otpErr(e){const m=(e&&e.message)||'';if((e&&e.status===429)||/rate limit|too many|seconds/i.test(m))return 'Se enviaron varios correos seguidos. Espera unos minutos e intenta de nuevo.';if(/expired|invalid|token/i.test(m))return 'Código incorrecto o vencido. Revisa el último correo o pide uno nuevo.';if(/email/i.test(m))return 'Revisa que el correo esté bien escrito.';return 'No se pudo completar. Revisa tu conexión.';}
function openOtpSheet(prefill){
  if(!CONFIG_OK){$('#configWarn').hidden=false;toast('Primero conecta Supabase en config.js');return;}
  const sh=openSheet(`<div class="sheet-head"><span class="ic ic-orange" style="width:56px;height:56px;border-radius:18px">${I.paw}</span><div><h2>Entrar con código</h2><p class="sub">Te enviamos un código a tu correo. Si ya entraste antes con Google, usa ese mismo correo para ver tus datos.</p></div></div>
    <div class="field"><label for="otpEmail">Correo</label><input class="input" id="otpEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="tu@correo.com" value="${esc(prefill||'')}"></div>
    <button class="btn btn-orange btn-block" id="otpSend" style="margin-top:14px">Enviar código</button>`);
  const inp=$('#otpEmail',sh);setTimeout(()=>inp.focus(),150);
  const send=async()=>{const email=inp.value.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('Escribe un correo válido');inp.focus();return;}
    const b=$('#otpSend',sh);b.disabled=true;b.innerHTML='<span class="spin"></span>';
    const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true}});
    if(error){b.disabled=false;b.textContent='Enviar código';toast(otpErr(error),4500);return;}
    openOtpCode(email);};
  $('#otpSend',sh).onclick=send;inp.onkeydown=e=>{if(e.key==='Enter')send();};
}
function openOtpCode(email){
  const sh=openSheet(`<h2>Revisa tu correo</h2><p class="sub" style="margin:6px 0 16px">Escribe el código que enviamos a <b>${esc(email)}</b>. Puede tardar un minuto; revisa también la carpeta de spam.</p>
    <input class="input otp-input" id="otpCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="••••••" aria-label="Código">
    <button class="btn btn-orange btn-block" id="otpOk" style="margin-top:14px">Entrar</button>
    <div class="row-actions" style="margin-top:12px"><button class="btn btn-ghost btn-sm" id="otpBack">Cambiar correo</button><button class="btn btn-white btn-sm" id="otpResend">Reenviar código</button></div>`,{sticky:true,cls:'sticky'});
  const inp=$('#otpCode',sh);setTimeout(()=>inp.focus(),150);
  const verify=async()=>{const token=inp.value.replace(/\D/g,'');if(token.length<6){toast('El código tiene al menos 6 dígitos');inp.focus();return;}
    const b=$('#otpOk',sh);b.disabled=true;b.innerHTML='<span class="spin"></span>';
    const {data,error}=await sb.auth.verifyOtp({email,token,type:'email'});
    if(error){b.disabled=false;b.textContent='Entrar';toast(otpErr(error),4500);return;}
    closeSheet(true);if(data&&data.user)enterCloud(data.user);};
  inp.oninput=()=>{const v=inp.value.replace(/\D/g,'');if(v!==inp.value)inp.value=v;};
  inp.onkeydown=e=>{if(e.key==='Enter')verify();};
  $('#otpOk',sh).onclick=verify;
  $('#otpBack',sh).onclick=()=>{closeSheet(true);openOtpSheet(email);};
  let cool=Date.now()+60000;
  $('#otpResend',sh).onclick=async()=>{const left=Math.ceil((cool-Date.now())/1000);if(left>0){toast(`Puedes pedir otro código en ${left} s`);return;}
    const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error){toast(otpErr(error),4500);return;}cool=Date.now()+60000;toast('Te enviamos un código nuevo');};
}

/* =========================================================
   Eventos
   ========================================================= */
function armDelete(btn,fn){if(btn.classList.contains('armed')){fn();return;}btn.classList.add('armed');toast('Toca de nuevo para eliminar');setTimeout(()=>btn.classList.remove('armed'),3000);}
document.addEventListener('click',async e=>{
  const t=e.target.closest('button,[data-go],[data-action],[data-medal]');if(!t)return;
  if(t.closest('#lightbox'))return;
  if(t.hasAttribute('data-close')&&t.closest('.sheet')&&!t.id){closeSheet();return;}
  if(t.dataset.go){closeSheet(true);go(t.dataset.go);return;}
  if(t.dataset.photo){openLightbox(t.dataset.photo);return;}
  if(t.dataset.medal){const m=MEDALS[+t.dataset.medal];toast(`${m.name}: ${m.desc}${m.test(medalStats())?' ✓':''}`);return;}
  const a=t.dataset.action;
  if(a==='start-sheet'){openStartSheet();return;}
  if(a==='start-free'){startWalk('gps');return;}
  if(a==='start-sim'){startWalk('sim');return;}
  if(a==='edit-dog'){openEditDog();return;}
  if(a==='add-photo'){pickPhotos();return;}
  if(a==='edit-goals'){closeSheet(true);openGoalsSheet();return;}
  if(a==='rem-toggle'){setReminders({on:!remState().on});return;}
  if(a==='rem-others'){setReminders({others:!remState().others});return;}
  if(a==='reset-stats'){confirmResetStats();return;}
  if(a==='test-notif'){testNotif();return;}
  if(a==='otp'){openEmailSheet();return;}
  if(a==='set-password'){openPasswordSheet();return;}
  if(a==='edit-routine'){closeSheet(true);openRoutineEditor(true);return;}
  if(a==='add-dog'){closeSheet(true);openOnboarding('add');return;}
  if(a==='export'){exportData();return;}
  if(a==='sync'){await flushQueue();renderSettings();if(!queueGet().length)toast('Todo sincronizado');return;}
  if(a==='to-login'){resetToLogin();return;}
  if(a==='logout'){logout();return;}
  if(a==='wipe'){confirmSheet('¿Borrar todos tus datos?','Se eliminan para siempre tus perros, rutas y paseos. Esta acción no se puede deshacer.','Borrar todo',async()=>{await DB.wipe();S.dogs=[];S.walks=[];S.routes=[];openOnboarding('first');toast('Datos borrados');});return;}
  if(t.dataset.remBefore!=null){setReminders({before:+t.dataset.remBefore});return;}
  if(t.dataset.switchDog){closeSheet(true);if(t.dataset.switchDog!==S.dog.id){try{await selectDog(t.dataset.switchDog);renderAll();scheduleReminders(true);toast(`Ahora con ${S.dog.name}`);}catch(err){toast('No se pudo cargar. Revisa tu conexión.');}}return;}
  if(t.dataset.route){openRouteSheet(t.dataset.route);return;}
  if(t.dataset.walkRoute){startWalk('gps',routeById(t.dataset.walkRoute));return;}
  if(t.dataset.simRoute){startWalk('sim',routeById(t.dataset.simRoute));return;}
  if(t.dataset.delWalk){armDelete(t,async()=>{const id=t.dataset.delWalk;try{await DB.deleteWalk(id);S.walks=S.walks.filter(w=>w.id!==id);renderAll();toast('Paseo eliminado');}catch(err){toast('No se pudo eliminar. Revisa tu conexión.');}});return;}
});
$('#dogSwitch').onclick=openDogSwitch;
$('#photoInput').onchange=e=>uploadPhotos(e.target.files);
$('#pgLvl').onclick=()=>{const lv=levelInfo();toast(`Nivel ${lv.level}: ganas 1 XP por minuto y 10 XP por km. Faltan ${nf0.format(lv.toNext)} XP.`,4000);};
$('#pauseBtn').onclick=togglePause;
$('#stopBtn').onclick=stopWalk;
$('#recenter').onclick=()=>{W.follow=true;const p=W.points[W.points.length-1]||(livePin&&livePin.getLatLng());if(p&&liveMap)liveMap.panTo(p);};
$('#flagPee').innerHTML=I.pee+'Pipí';$('#flagPoop').innerHTML=I.poop+'Caca';
$('#flagPee').onclick=()=>{W.pee=!W.pee;setFlag('#flagPee',W.pee);saveLive(true);};
$('#flagPoop').onclick=()=>{W.poop=!W.poop;setFlag('#flagPoop',W.poop);saveLive(true);};
$('#onbSave').onclick=saveOnboarding;
$('#onbCancel').onclick=()=>show('main');
$('#demoBtn').onclick=enterDemo;
$('#demoExit').onclick=resetToLogin;
$('#googleBtn').onclick=loginGoogle;
window.addEventListener('pagehide',()=>{if(W.active)saveLive(true);});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){if(W.active){W.hiddenAt=Date.now();saveLive(true);}return;}
  if(W.active){requestWakeLock();
    if(W.mode==='gps'){if(!IS_APP)startTracking();if(liveMap){liveMap.invalidateSize();redrawTrack();}if(!IS_APP&&W.hiddenAt&&Date.now()-W.hiddenAt>15000)toast('El tiempo siguió corriendo. Con la pantalla apagada el GPS se pausa: usa el modo bolsillo.',5000);}
    W.hiddenAt=0;W.elapsed=walkElapsed();updateLive();}
  else if(S.dog&&$('#scr-main').classList.contains('on'))renderProfile();
});
let rsz;window.addEventListener('resize',()=>{clearTimeout(rsz);rsz=setTimeout(()=>{if(S.view==='stats'&&S.dog)renderStats();},150);});

/* =========================================================
   Sesión
   ========================================================= */
async function loginGoogle(){
  if(!CONFIG_OK){$('#configWarn').hidden=false;toast('Primero conecta Supabase en config.js');return;}
  if(location.protocol==='file:'){toast('Para iniciar sesión abre la app desde su dirección web (https://…)',4200);return;}
  const b=$('#googleBtn');b.disabled=true;
  setTimeout(()=>{b.disabled=false;},8000);
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}});
  if(error){b.disabled=false;toast('No se pudo abrir Google: '+error.message,4200);}
}
function enterDemo(){
  S.mode='demo';S.user={name:'Invitado'};makeDemo();
  S.dogs=MEM.dogs.slice();selectDog(S.dogs[0].id).then(()=>{show('main');go('perfil');renderAll();makeDemoPhotos().then(async()=>{S.photos=await DB.listPhotos(S.dog.id);renderAll();});});
}
function resetToLogin(){closeSheet(true);closeLightbox();S.photos=[];S.mode=null;S.user=null;S.dog=null;S.dogs=[];S.walks=[];S.routes=[];$('#live').hidden=true;show('login');}
async function logout(){
  if(S.mode==='cloud'&&sb){try{await sb.auth.signOut();}catch(e){}}
  resetToLogin();
}
let entering=false;
async function enterCloud(user){
  if(entering||(S.user&&S.user.id===user.id))return;entering=true;
  S.mode='cloud';const md=user.user_metadata||{};
  S.user={id:user.id,email:user.email,name:md.full_name||md.name||user.email,avatar:md.avatar_url||md.picture||''};
  show('loading');
  try{
    S.dogs=await DB.listDogs();
    if(!S.dogs.length){openOnboarding('first');}
    else{await selectDog(LS.get(lsKey('lastDog'))||S.dogs[0].id);show('main');go('perfil');renderAll();setTimeout(async()=>{flushQueue();await checkLiveBackup();scheduleReminders(false);liveCleanup();setTimeout(maybeAskReminders,1200);},400);}
  }catch(e){console.error(e);S.user=null;show('login');toast('No pudimos cargar tus datos: '+(e.message||'error de conexión'),5000);}
  entering=false;
}
async function boot(){
  buildScenes();bindAssets();
  if(IS_APP){$('#googleBtn').hidden=true;const o=$('#otpBtn');o.classList.remove('btn-white');o.classList.add('btn-orange');}
  if(!CONFIG_OK){$('#configWarn').hidden=false;show('login');return;}
  try{
    sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
    sb.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT'){if(S.mode==='cloud')resetToLogin();return;}
      if(session&&session.user&&(event==='SIGNED_IN'||event==='INITIAL_SESSION'))setTimeout(()=>enterCloud(session.user),0);
    });
    const {data,error}=await sb.auth.getSession();if(error)throw error;
    if(/[?&](code|error)=/.test(location.search)||/access_token|error_description/.test(location.hash)){
      const err=new URLSearchParams(location.search).get('error_description')||new URLSearchParams(location.hash.slice(1)).get('error_description');
      history.replaceState(null,'',location.pathname);if(err)toast('Error de login: '+err,5000);
    }
    if(data.session)enterCloud(data.session.user);else if(!entering)show('login');
  }catch(e){console.error(e);show('login');toast('No pudimos conectar con el servidor',4000);}
}
window.Salchipaseo={S,W,MEM,startWalk,stopWalk,enterDemo,go};
boot();
})();
