/* Hamel OS — Operational Simulation Engine
 * Single source of truth for the Hamel OS UI.
 * Mock production behavior only. No database, GPS, auth, or external writes.
 */
(function (global) {
  'use strict';
  const STORAGE_KEY = 'hamel-os:simulation:v3';
  const now = () => new Date().toISOString();
  const makeId = p => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  function ensureMobileNavSurface() {
    if (document.getElementById('hamel-os-mobile-nav-surface')) return;
    const style = document.createElement('style');
    style.id = 'hamel-os-mobile-nav-surface';
    style.textContent = `
      @media (max-width:900px){
        .mobile-nav{background:#0d110d!important;border-top:1px solid #222622!important;box-shadow:0 -14px 34px rgba(0,0,0,.58),0 -1px 0 rgba(168,255,120,.04)!important;isolation:isolate}
        .mobile-nav>button{background:#111611!important;border:1px solid #202620!important;color:#858b85!important}
        .mobile-nav>button:focus-visible{outline:none}.mobile-nav>button:active{background:#182018!important}
      }
    `;
    document.head.appendChild(style);
  }
  ensureMobileNavSurface();

  const seed = {
    version:3,
    clock:{simulated:true,startedAt:now()},
    employees:[
      {id:'emp-jimmy',name:'Jimmy Hamel',crewId:'crew-alpha',role:'Leader',clocked:true},
      {id:'emp-steve',name:'Steve Hamel',crewId:'crew-bravo',role:'Leader',clocked:true},
      {id:'emp-carlos',name:'Carlos M.',crewId:'crew-charlie',role:'Leader',clocked:false},
      {id:'emp-luis',name:'Luis G.',crewId:'crew-alpha',role:'Crew',clocked:true},
      {id:'emp-david',name:'David R.',crewId:'crew-bravo',role:'Crew',clocked:true},
      {id:'emp-marco',name:'Marco T.',crewId:'crew-charlie',role:'Crew',clocked:false}
    ],
    crews:[
      {id:'crew-alpha',name:'Crew Alpha',leader:'Jimmy Hamel',vehicleId:'T01',status:'EN_ROUTE',jobId:'J-1042',progress:62,speed:24,x:38,y:42},
      {id:'crew-bravo',name:'Crew Bravo',leader:'Steve Hamel',vehicleId:'T03',status:'WORKING',jobId:'J-1043',progress:38,speed:3,x:67,y:62},
      {id:'crew-charlie',name:'Crew Charlie',leader:'Carlos M.',vehicleId:'T02',status:'SCHEDULED',jobId:'J-1044',progress:0,speed:0,x:22,y:70}
    ],
    vehicles:[
      {id:'T01',name:'F-250',type:'Truck',status:'EN_ROUTE',crewId:'crew-alpha'},
      {id:'T02',name:'Bobcat',type:'Equipment',status:'SCHEDULED',crewId:'crew-charlie'},
      {id:'T03',name:'Ram 2500',type:'Truck',status:'WORKING',crewId:'crew-bravo'},
      {id:'T04',name:'Trailer',type:'Trailer',status:'PARKED',crewId:null}
    ],
    jobs:[
      {id:'J-1042',property:'Vanderbilt Residence',client:'Vanderbilt Family',address:'17 Weston Rd, Wellesley',crewId:'crew-alpha',status:'ON_THE_WAY',progress:62,time:'10:30 AM',tasks:[{id:'t1',name:'Spring cleanup',done:true},{id:'t2',name:'Hedge trimming',done:false},{id:'t3',name:'Final cleanup',done:false}]},
      {id:'J-1043',property:'Smith Family Estate',client:'Smith Family',address:'81 Pond Ave, Natick',crewId:'crew-bravo',status:'IN_PROGRESS',progress:38,time:'12:00 PM',tasks:[{id:'t1',name:'Lawn service',done:true},{id:'t2',name:'Beds',done:false}]},
      {id:'J-1044',property:'Harrington Property',client:'Harrington LLC',address:'204 Central Ave, Weston',crewId:'crew-charlie',status:'SCHEDULED',progress:0,time:'2:30 PM',tasks:[{id:'t1',name:'Site prep',done:false}]},
      {id:'J-1045',property:'Oak Street Residence',client:'Private Client',address:'12 Oak St, Wellesley',crewId:null,status:'NEEDS_DISPATCH',progress:0,time:'3:45 PM',tasks:[]}
    ],
    evidence:[],
    events:[
      {id:makeId('EVT'),at:now(),actor:'System',type:'SYSTEM_READY',title:'Simulation online',detail:'Mock production environment initialized'},
      {id:makeId('EVT'),at:now(),actor:'Crew Alpha',type:'ROUTE_STARTED',title:'Route started',detail:'Vanderbilt Residence'},
      {id:makeId('EVT'),at:now(),actor:'System',type:'GPS_LOCK',title:'GPS lock acquired',detail:'T01 · 24 MPH'}
    ]
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  const validCrew=c=>c&&c.id;
  function normalize(input){
    const s=input||{},out=clone(seed);
    ['employees','crews','vehicles','jobs','evidence','events'].forEach(k=>{if(Array.isArray(s[k]))out[k]=s[k]});
    out.version=3;
    out.clock=s.clock&&typeof s.clock==='object'?s.clock:out.clock;
    out.events=out.events.slice(0,100);out.evidence=out.evidence.slice(0,100);
    out.crews.forEach(c=>{
      const j=out.jobs.find(x=>x.id===c.jobId),v=out.vehicles.find(x=>x.id===c.vehicleId);
      if(!j){c.jobId=null;c.status='AVAILABLE';c.progress=0;c.speed=0}
      if(v){v.crewId=c.id;v.status=c.status}
      if(j){j.crewId=c.id;j.progress=Math.max(0,Math.min(100,Number(j.progress)||0))}
    });
    out.jobs.forEach(j=>{if(j.crewId&&!out.crews.some(c=>c.id===j.crewId))j.crewId=null});
    return out;
  }
  function load(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?normalize(JSON.parse(raw)):clone(seed)}catch(_){return clone(seed)}}
  let state=load();
  const listeners=new Set();
  function persist(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(_){}
    const snapshot=clone(state);listeners.forEach(fn=>{try{fn(snapshot)}catch(_){}})
  }
  function emit(actor,type,title,detail){state.events.unshift({id:makeId('EVT'),at:now(),actor,type,title,detail});state.events=state.events.slice(0,100)}
  const crew=id=>state.crews.find(c=>c.id===id);
  const job=id=>state.jobs.find(j=>j.id===id);
  const vehicle=id=>state.vehicles.find(v=>v.id===id);
  const jobName=id=>{const j=job(id);return j?j.property:id};
  function sync(c,status){if(c){c.status=status;const v=vehicle(c.vehicleId);if(v)v.status=status}}
  function assignJob(jobId,crewId){
    const j=job(jobId),c=crew(crewId);
    if(!j||!c||c.jobId||!['SCHEDULED','NEEDS_DISPATCH'].includes(j.status))return null;
    if(j.crewId&&j.crewId!==crewId)return null;
    j.crewId=crewId;c.jobId=jobId;c.status='SCHEDULED';c.progress=j.progress||0;c.speed=0;sync(c,'SCHEDULED');
    emit('Dispatch','JOB_ASSIGNED','Job assigned',j.id+' · '+j.property+' → '+c.name);persist();return clone(j);
  }
  const api={
    getState(){return clone(state)},
    subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);fn(clone(state));return()=>listeners.delete(fn)},
    reset(){state=clone(seed);persist()},
    assignJob,
    startRoute(crewId='crew-alpha'){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||j.crewId!==c.id||c.status!=='SCHEDULED'||j.status!=='SCHEDULED')return null;sync(c,'EN_ROUTE');c.speed=Math.max(1,c.speed||24);c.progress=Math.max(Number(c.progress)||0,5);j.status='ON_THE_WAY';j.progress=Math.round(c.progress);emit(c.leader,'ROUTE_STARTED','Route started',jobName(c.jobId));persist();return clone(c)},
    arrive(crewId='crew-alpha'){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||c.status!=='EN_ROUTE'||j.status!=='ON_THE_WAY')return null;sync(c,'ON_SITE');c.speed=0;j.status='ON_SITE';emit(c.leader,'ARRIVED','Crew arrived on site',jobName(c.jobId));persist();return clone(c)},
    startJob(crewId='crew-alpha'){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||c.status!=='ON_SITE'||j.status!=='ON_SITE')return null;sync(c,'WORKING');c.speed=0;j.status='IN_PROGRESS';emit(c.leader,'JOB_STARTED','Job started',jobName(c.jobId));persist();return clone(c)},
    completeTask(crewId='crew-alpha',taskId){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||c.status!=='WORKING'||j.status!=='IN_PROGRESS')return null;const t=taskId?j.tasks.find(x=>x.id===taskId):j.tasks.find(x=>!x.done);if(!t||t.done)return clone(j);t.done=true;const total=j.tasks.length||1;j.progress=Math.round(j.tasks.filter(x=>x.done).length/total*100);c.progress=j.progress;emit(c.leader,'TASK_COMPLETED','Task completed',t.name+' · '+j.property);persist();return clone(j)},
    uploadEvidence(crewId='crew-alpha',label='AFTER'){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||!['ON_SITE','WORKING'].includes(c.status)||!['ON_SITE','IN_PROGRESS'].includes(j.status))return null;const evidence={id:makeId('PHOTO'),jobId:j.id,crewId,label,receivedAt:now()};state.evidence.unshift(evidence);state.evidence=state.evidence.slice(0,100);emit(c.leader,'EVIDENCE_RECEIVED','Photo received',j.property+' · '+label);persist();return clone(evidence)},
    completeJob(crewId='crew-alpha'){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||c.status!=='WORKING'||j.status!=='IN_PROGRESS')return null;sync(c,'AVAILABLE');c.speed=0;c.progress=100;c.jobId=null;j.status='COMPLETED';j.progress=100;j.tasks.forEach(t=>t.done=true);j.crewId=null;emit(c.leader,'JOB_COMPLETED','Job completed',j.property+' · sign-off');persist();return clone(j)},
    clockIn(employeeId){const e=state.employees.find(x=>x.id===employeeId);if(!e||e.clocked)return null;e.clocked=true;emit(e.name,'CLOCK_IN','Clocked in',e.crewId||'Office');persist();return clone(e)},
    clockOut(employeeId){const e=state.employees.find(x=>x.id===employeeId);if(!e||!e.clocked)return null;e.clocked=false;emit(e.name,'CLOCK_OUT','Clocked out',e.crewId||'Office');persist();return clone(e)},
    tick(seconds=1){const n=Number(seconds),elapsed=Number.isFinite(n)?Math.max(0,n):1;state.crews.forEach(c=>{if(c.status!=='EN_ROUTE')return;c.x+=0.9*elapsed;c.y+=0.18*elapsed;if(c.x>90)c.x=10;c.speed=Math.max(18,Math.min(31,c.speed+(Math.random()-.5)*2));c.progress=Math.min(95,(Number(c.progress)||0)+0.12*elapsed);const j=job(c.jobId);if(j)j.progress=Math.round(c.progress)});persist();return clone(state)}
  };

  const MAP_CENTER=[42.305,-71.285];
  const JOB_COORDS={
    'J-1042':[42.318,-71.258],
    'J-1043':[42.284,-71.303],
    'J-1044':[42.366,-71.302],
    'J-1045':[42.295,-71.272]
  };
  const crewLatLng=c=>[42.34-(Number(c.y)||50)*0.00045,-71.31+(Number(c.x)||50)*0.001];
  let leafletPromise=null;
  function loadLeaflet(){
    if(global.L)return Promise.resolve(global.L);
    if(leafletPromise)return leafletPromise;
    leafletPromise=new Promise((resolve,reject)=>{
      if(!document.getElementById('hamel-leaflet-css')){
        const css=document.createElement('link');css.id='hamel-leaflet-css';css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';css.crossOrigin='';document.head.appendChild(css)
      }
      const existing=document.getElementById('hamel-leaflet-js');
      if(existing){existing.addEventListener('load',()=>resolve(global.L),{once:true});existing.addEventListener('error',reject,{once:true});return}
      const script=document.createElement('script');script.id='hamel-leaflet-js';script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';script.crossOrigin='';script.onload=()=>resolve(global.L);script.onerror=reject;document.head.appendChild(script)
    });
    return leafletPromise;
  }
  function ensureMapStyles(){
    if(document.getElementById('hamel-leaflet-style'))return;
    const style=document.createElement('style');style.id='hamel-leaflet-style';style.textContent=`
      .hamel-leaflet-host{position:absolute;inset:0;z-index:2;overflow:hidden;border-radius:13px;background:#0d110d}
      .hamel-leaflet-host .leaflet-tile-pane{filter:brightness(.58) saturate(.72) contrast(1.08)}
      .hamel-leaflet-host .leaflet-control-zoom{margin:12px!important;border:1px solid #263026!important;box-shadow:0 8px 22px rgba(0,0,0,.4)!important}
      .hamel-leaflet-host .leaflet-control-zoom a{background:#101510!important;color:#a8ff78!important;border-bottom-color:#263026!important}
      .hamel-leaflet-host .leaflet-control-attribution{background:rgba(9,13,9,.82)!important;color:#aeb6ae!important;font-size:9px!important}
      .hamel-leaflet-host .leaflet-control-attribution a{color:#a8ff78!important}
      .hamel-fleet-marker{width:18px;height:18px;border:2px solid #081006;border-radius:50%;background:#a8ff78;box-shadow:0 0 0 3px rgba(168,255,120,.18),0 0 16px rgba(168,255,120,.62)}
      .hamel-fleet-marker.is-working{background:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.18),0 0 16px rgba(96,165,250,.55)}
      .hamel-fleet-marker.is-scheduled{background:#facc15;box-shadow:0 0 0 3px rgba(250,204,21,.16),0 0 14px rgba(250,204,21,.42)}
      .hamel-map-popup{min-width:180px;font:12px/1.35 Inter,ui-sans-serif,system-ui,sans-serif;color:#172017}
      .hamel-map-popup b{font-size:13px}.hamel-map-popup small{color:#657065}
      .hamel-map-popup .fleet-status{margin-top:6px;font-weight:800;color:#46653e}
      @media(max-width:640px){.hamel-leaflet-host .leaflet-control-zoom{margin:9px!important}.hamel-leaflet-host .leaflet-control-attribution{font-size:8px!important}}
    `;document.head.appendChild(style)
  }
  function initLeafletMap(mapCard){
    if(!mapCard||mapCard.dataset.hamelLeaflet==='1')return;
    mapCard.dataset.hamelLeaflet='1';
    ensureMapStyles();
    const host=document.createElement('div');host.className='hamel-leaflet-host';host.setAttribute('role','application');host.setAttribute('aria-label','Live fleet map');
    const children=Array.from(mapCard.children);children.forEach(ch=>{ch.style.visibility='hidden';ch.style.pointerEvents='none'});mapCard.appendChild(host);
    loadLeaflet().then(L=>{
      if(!host.isConnected)return;
      const map=L.map(host,{zoomControl:true,attributionControl:true,scrollWheelZoom:true,dragging:true,tap:true,preferCanvas:true}).setView(MAP_CENTER,12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',updateWhenIdle:true,keepBuffer:1}).addTo(map);
      const markers=new Map(),routes=new Map();
      const iconFor=c=>L.divIcon({className:'',html:`<div class="hamel-fleet-marker ${c.status==='WORKING'?'is-working':''} ${c.status==='SCHEDULED'?'is-scheduled':''}"></div>`,iconSize:[18,18],iconAnchor:[9,9],popupAnchor:[0,-10]});
      const popupFor=(c,j)=>`<div class="hamel-map-popup"><b>${c.name}</b><br><small>${c.vehicleId} · ${c.leader}</small><div class="fleet-status">${c.status.replaceAll('_',' ')}${j?' · '+Math.round(j.progress)+'%':''}</div>${j?'<div>'+j.property+'</div><small>'+j.address+'</small>':''}</div>`;
      const syncMap=(data)=>{
        const activeIds=new Set();
        data.crews.forEach(c=>{
          activeIds.add(c.id);const j=data.jobs.find(x=>x.id===c.jobId),ll=crewLatLng(c);
          let marker=markers.get(c.id);
          if(!marker){marker=L.marker(ll,{icon:iconFor(c),keyboard:true,title:c.name}).addTo(map);markers.set(c.id,marker);marker.on('click',()=>marker.openPopup())}else{marker.setLatLng(ll);marker.setIcon(iconFor(c))}
          marker.bindPopup(popupFor(c,j),{closeButton:true,autoPan:true});
          const jobLL=j&&JOB_COORDS[j.id];let route=routes.get(c.id);
          if(j&&jobLL){const points=[ll,jobLL];if(!route){route=L.polyline(points,{color:c.status==='WORKING'?'#60a5fa':'#a8ff78',weight:3,opacity:.72,dashArray:c.status==='EN_ROUTE'?'7 8':null}).addTo(map);routes.set(c.id,route)}else{route.setLatLngs(points);route.setStyle({color:c.status==='WORKING'?'#60a5fa':'#a8ff78',dashArray:c.status==='EN_ROUTE'?'7 8':null})}}else if(route){route.remove();routes.delete(c.id)}
        });
        markers.forEach((m,id)=>{if(!activeIds.has(id)){m.remove();markers.delete(id)}});
        routes.forEach((r,id)=>{if(!activeIds.has(id)){r.remove();routes.delete(id)}});
        map.invalidateSize({pan:false})
      };
      const fit=()=>{const layers=[...markers.values()];if(layers.length)map.fitBounds(L.featureGroup(layers).getBounds().pad(.28),{maxZoom:13,animate:true})};
      const controls=L.control({position:'topright'});controls.onAdd=()=>{const box=L.DomUtil.create('div','leaflet-bar');const b=L.DomUtil.create('a','',box);b.href='#';b.innerHTML='⌖';b.title='Center fleet';b.setAttribute('aria-label','Center fleet');b.style.cssText='background:#101510;color:#a8ff78;font-weight:800;text-decoration:none;text-align:center;width:34px;height:34px;line-height:34px';L.DomEvent.disableClickPropagation(box);L.DomEvent.on(b,'click',e=>{L.DomEvent.stop(e);fit()});return box};controls.addTo(map);
      const unsubscribe=api.subscribe(syncMap);map._hamelUnsubscribe=unsubscribe;
      setTimeout(()=>{map.invalidateSize({pan:false});syncMap(api.getState());fit()},100);
    }).catch(()=>{mapCard.dataset.hamelLeaflet='error';host.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#71717a;font:11px system-ui">Map service unavailable · simulation remains online</div>'});
  }
  function ensureFleetLeaflet(){
    const enhance=()=>{const mapCard=document.querySelector('.map-layout > div:first-child');if(!mapCard)return;if(mapCard.dataset.hamelLeaflet==='1'||mapCard.dataset.hamelLeaflet==='loading')return;mapCard.dataset.hamelLeaflet='loading';initLeafletMap(mapCard)};
    const start=()=>{if(!document.body)return;const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});enhance()};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  }
  ensureFleetLeaflet();
  global.HamelSimulation=api;
})(window);