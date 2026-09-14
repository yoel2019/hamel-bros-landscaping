/* Hamel OS — Operational Simulation Engine
 * Single source of truth for the Hamel OS UI.
 * Mock production behavior only. No database, GPS, auth, or external writes.
 */
(function(global){
  'use strict';
  const STORAGE_KEY='hamel-os:simulation:v3';
  const now=()=>new Date().toISOString();
  const makeId=p=>p+'-'+Math.random().toString(36).slice(2,8).toUpperCase();
  const clone=v=>JSON.parse(JSON.stringify(v));

  function installBaseStyles(){
    if(document.getElementById('hamel-os-sim-style'))return;
    const s=document.createElement('style');s.id='hamel-os-sim-style';
    s.textContent=`
      @media(max-width:900px){
        .mobile-nav{background:#0d110d!important;border-top:1px solid #222622!important;box-shadow:0 -14px 34px rgba(0,0,0,.58),0 -1px 0 rgba(168,255,120,.04)!important;isolation:isolate}
        .mobile-nav>button{background:#111611!important;border:1px solid #202620!important;color:#858b85!important}
        .mobile-nav>button:focus-visible{outline:none}.mobile-nav>button:active{background:#182018!important}
        .page{padding-bottom:calc(100px + env(safe-area-inset-bottom))!important}
        .map-layout > div:first-child > div:first-child{align-items:flex-start!important}
      }
      .map-layout > div:first-child > div:first-child{z-index:5!important}
    `;document.head.appendChild(s);
  }
  installBaseStyles();

  const seed={
    version:3,clock:{simulated:true,startedAt:now()},
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
    evidence:[],events:[
      {id:makeId('EVT'),at:now(),actor:'System',type:'SYSTEM_READY',title:'Simulation online',detail:'Mock production environment initialized'},
      {id:makeId('EVT'),at:now(),actor:'Crew Alpha',type:'ROUTE_STARTED',title:'Route started',detail:'Vanderbilt Residence'},
      {id:makeId('EVT'),at:now(),actor:'System',type:'GPS_LOCK',title:'GPS lock acquired',detail:'T01 · 24 MPH'}
    ]
  };
  function normalize(input){
    const s=input||{},out=clone(seed);
    ['employees','crews','vehicles','jobs','evidence','events'].forEach(k=>{if(Array.isArray(s[k]))out[k]=s[k]});
    out.version=3;out.clock=s.clock&&typeof s.clock==='object'?s.clock:out.clock;
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
  let state=load();const listeners=new Set();
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(_){}const snap=clone(state);listeners.forEach(fn=>{try{fn(snap)}catch(_){}})}
  function emit(actor,type,title,detail){state.events.unshift({id:makeId('EVT'),at:now(),actor,type,title,detail});state.events=state.events.slice(0,100)}
  const crew=id=>state.crews.find(c=>c.id===id),job=id=>state.jobs.find(j=>j.id===id),vehicle=id=>state.vehicles.find(v=>v.id===id);
  const validCrew=c=>c&&c.id;
  const jobName=id=>{const j=job(id);return j?j.property:id};
  function sync(c,status){if(!c)return;c.status=status;const v=vehicle(c.vehicleId);if(v)v.status=status}
  function assignJob(jobId,crewId){const j=job(jobId),c=crew(crewId);if(!j||!c||c.jobId||!['SCHEDULED','NEEDS_DISPATCH'].includes(j.status))return null;if(j.crewId&&j.crewId!==crewId)return null;j.crewId=crewId;c.jobId=jobId;c.status='SCHEDULED';c.progress=j.progress||0;c.speed=0;sync(c,'SCHEDULED');emit('Dispatch','JOB_ASSIGNED','Job assigned',j.id+' · '+j.property+' → '+c.name);persist();return clone(j)}
  const api={
    getState(){return clone(state)},
    subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);fn(clone(state));return()=>listeners.delete(fn)},
    reset(){state=clone(seed);persist()},assignJob,
    startRoute(crewId='crew-alpha'){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||j.crewId!==c.id||c.status!=='SCHEDULED'||j.status!=='SCHEDULED')return null;sync(c,'EN_ROUTE');c.speed=Math.max(1,c.speed||24);c.progress=Math.max(Number(c.progress)||0,5);j.status='ON_THE_WAY';j.progress=Math.round(c.progress);emit(c.leader,'ROUTE_STARTED','Route started',jobName(c.jobId));persist();return clone(c)},
    arrive(crewId='crew-alpha'){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||c.status!=='EN_ROUTE'||j.status!=='ON_THE_WAY')return null;sync(c,'ON_SITE');c.speed=0;j.status='ON_SITE';emit(c.leader,'ARRIVED','Crew arrived on site',jobName(c.jobId));persist();return clone(c)},
    startJob(crewId='crew-alpha'){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||c.status!=='ON_SITE'||j.status!=='ON_SITE')return null;sync(c,'WORKING');c.speed=0;j.status='IN_PROGRESS';emit(c.leader,'JOB_STARTED','Job started',jobName(c.jobId));persist();return clone(c)},
    completeTask(crewId='crew-alpha',taskId){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||c.status!=='WORKING'||j.status!=='IN_PROGRESS')return null;const t=taskId?j.tasks.find(x=>x.id===taskId):j.tasks.find(x=>!x.done);if(!t||t.done)return clone(j);t.done=true;const total=j.tasks.length||1;j.progress=Math.round(j.tasks.filter(x=>x.done).length/total*100);c.progress=j.progress;emit(c.leader,'TASK_COMPLETED','Task completed',t.name+' · '+j.property);persist();return clone(j)},
    uploadEvidence(crewId='crew-alpha',label='AFTER'){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||!['ON_SITE','WORKING'].includes(c.status)||!['ON_SITE','IN_PROGRESS'].includes(j.status))return null;const evidence={id:makeId('PHOTO'),jobId:j.id,crewId,label,receivedAt:now()};state.evidence.unshift(evidence);state.evidence=state.evidence.slice(0,100);emit(c.leader,'EVIDENCE_RECEIVED','Photo received',j.property+' · '+label);persist();return clone(evidence)},
    completeJob(crewId='crew-alpha'){const c=crew(crewId),j=c&&job(c.jobId);if(!validCrew(c)||!j||c.status!=='WORKING'||j.status!=='IN_PROGRESS')return null;sync(c,'AVAILABLE');c.speed=0;c.progress=100;c.jobId=null;j.status='COMPLETED';j.progress=100;j.tasks.forEach(t=>t.done=true);j.crewId=null;emit(c.leader,'JOB_COMPLETED','Job completed',j.property+' · sign-off');persist();return clone(j)},
    clockIn(employeeId){const e=state.employees.find(x=>x.id===employeeId);if(!e||e.clocked)return null;e.clocked=true;emit(e.name,'CLOCK_IN','Clocked in',e.crewId||'Office');persist();return clone(e)},
    clockOut(employeeId){const e=state.employees.find(x=>x.id===employeeId);if(!e||!e.clocked)return null;e.clocked=false;emit(e.name,'CLOCK_OUT','Clocked out',e.crewId||'Office');persist();return clone(e)},
    tick(seconds=1){const n=Number(seconds),elapsed=Number.isFinite(n)?Math.max(0,n):1;state.crews.forEach(c=>{if(c.status!=='EN_ROUTE')return;c.progress=Math.min(95,(Number(c.progress)||0)+0.12*elapsed);c.speed=Math.max(18,Math.min(31,c.speed+(Math.random()-.5)*2));const j=job(c.jobId);if(j)j.progress=Math.round(c.progress)});persist();return clone(state)}
  };

  const MAP_CENTER=[42.305,-71.285];
  const JOB_COORDS={'J-1042':[42.318,-71.258],'J-1043':[42.284,-71.303],'J-1044':[42.366,-71.302],'J-1045':[42.295,-71.272]};
  const crewLatLng=c=>[42.34-(Number(c.y)||50)*0.00045,-71.31+(Number(c.x)||50)*0.001];
  let leafletPromise=null,lucidePromise=null;
  function loadLeaflet(){
    if(global.L)return Promise.resolve(global.L);if(leafletPromise)return leafletPromise;
    leafletPromise=new Promise((resolve,reject)=>{
      if(!document.getElementById('hamel-leaflet-css')){const css=document.createElement('link');css.id='hamel-leaflet-css';css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';css.crossOrigin='';document.head.appendChild(css)}
      const script=document.getElementById('hamel-leaflet-js');
      if(script){if(global.L)resolve(global.L);else{script.addEventListener('load',()=>resolve(global.L),{once:true});script.addEventListener('error',reject,{once:true})}return}
      const js=document.createElement('script');js.id='hamel-leaflet-js';js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';js.integrity='sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';js.crossOrigin='';js.onload=()=>resolve(global.L);js.onerror=reject;document.head.appendChild(js)
    });return leafletPromise;
  }
  function loadLucide(){
    if(global.lucide&&typeof global.lucide.createIcons==='function')return Promise.resolve(global.lucide);
    if(lucidePromise)return lucidePromise;
    lucidePromise=new Promise((resolve,reject)=>{
      const existing=document.getElementById('hamel-lucide-js');
      if(existing){if(global.lucide)resolve(global.lucide);else{existing.addEventListener('load',()=>resolve(global.lucide),{once:true});existing.addEventListener('error',reject,{once:true})}return}
      const js=document.createElement('script');js.id='hamel-lucide-js';js.src='https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js';js.onload=()=>global.lucide?resolve(global.lucide):reject(new Error('Lucide unavailable'));js.onerror=reject;document.head.appendChild(js);
    });return lucidePromise;
  }
  function mapStyles(){
    if(document.getElementById('hamel-leaflet-style'))return;
    const s=document.createElement('style');s.id='hamel-leaflet-style';s.textContent=`
      .hamel-leaflet-host{position:absolute;inset:0;z-index:2;overflow:hidden;border-radius:13px;background:#0d110d;touch-action:pan-y}
      .hamel-leaflet-host .leaflet-tile-pane{filter:brightness(.58) saturate(.72) contrast(1.08)}
      .hamel-leaflet-host .leaflet-control-zoom{margin:12px!important;border:1px solid #263026!important;box-shadow:0 8px 22px rgba(0,0,0,.4)!important}
      .hamel-leaflet-host .leaflet-control-zoom a{background:#101510!important;color:#a8ff78!important;border-bottom-color:#263026!important}
      .hamel-leaflet-host .leaflet-control-attribution{background:rgba(9,13,9,.82)!important;color:#aeb6ae!important;font-size:9px!important}
      .hamel-leaflet-host .leaflet-control-attribution a{color:#a8ff78!important}
      .hamel-truck-icon{width:52px;height:36px;position:relative;filter:drop-shadow(0 5px 8px rgba(0,0,0,.6));display:grid;place-items:center}
      .hamel-truck-icon svg{width:32px;height:32px;display:block;stroke:#071007;stroke-width:2.4;transform-origin:50% 50%;transition:transform .25s linear;fill:#a8ff78}
      .hamel-truck-tag{position:absolute;left:28px;top:-8px;padding:2px 5px;border:1px solid #263026;border-radius:5px;background:#0b100b;color:#dfffd0;font:700 8px/1.1 ui-monospace,monospace;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.45);z-index:2}
      .hamel-truck-dot{position:absolute;left:3px;top:5px;width:7px;height:7px;border-radius:50%;background:#a8ff78;box-shadow:0 0 9px rgba(168,255,120,.8);z-index:2}
      .hamel-truck-working .hamel-truck-dot{background:#60a5fa;box-shadow:0 0 9px rgba(96,165,250,.75)}
      .hamel-truck-scheduled .hamel-truck-dot{background:#facc15;box-shadow:0 0 9px rgba(250,204,21,.7)}
      .hamel-map-popup{min-width:185px;color:#152015}.hamel-map-popup b{font-size:13px}.hamel-map-popup small{color:#667066}.hamel-map-popup .fleet-status{margin:6px 0;padding:5px 7px;border-radius:5px;background:#eff8eb;font:700 10px ui-monospace,monospace;color:#315a2a}
      .hamel-route{filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
      @media(max-width:900px){.hamel-leaflet-host .leaflet-control-zoom{margin:9px!important}.hamel-leaflet-host .leaflet-control-attribution{font-size:8px!important}.hamel-truck-icon{width:48px;height:33px}.hamel-truck-icon svg{width:30px;height:30px}}
    `;document.head.appendChild(s)
  }
  const routeCache=new Map(),routeLayers=new Map(),truckMarkers=new Map();
  function bearing(a,b){const r=Math.PI/180,y1=a[0]*r,y2=b[0]*r,dl=(b[1]-a[1])*r;const y=Math.sin(dl)*Math.cos(y2),x=Math.cos(y1)*Math.sin(y2)-Math.sin(y1)*Math.cos(y2)*Math.cos(dl);return (Math.atan2(y,x)*180/Math.PI+360)%360}
  function routePoint(points,p){if(!points||points.length<2)return points&&points[0];const t=Math.max(0,Math.min(1,p));const scaled=t*(points.length-1),i=Math.min(points.length-2,Math.floor(scaled)),f=scaled-i;const a=points[i],b=points[i+1];return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]}
  async function fetchRoute(from,to){const key=from.map(v=>v.toFixed(5)).join(',')+'>'+to.map(v=>v.toFixed(5)).join(',');if(routeCache.has(key))return routeCache.get(key);const url='https://router.project-osrm.org/route/v1/driving/'+from[1]+','+from[0]+';'+to[1]+','+to[0]+'?overview=full&geometries=geojson';try{const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error('route '+r.status);const data=await r.json();const pts=data&&data.routes&&data.routes[0]&&data.routes[0].geometry&&data.routes[0].geometry.coordinates;if(!pts||pts.length<2)throw new Error('no route');const latlng=pts.map(p=>[p[1],p[0]]);routeCache.set(key,latlng);return latlng}catch(_){const fallback=[from,to];routeCache.set(key,fallback);return fallback}}
  function iconFor(c,rotation){const cls=c.status==='WORKING'?'hamel-truck-working':c.status==='SCHEDULED'?'hamel-truck-scheduled':'';return global.L.divIcon({className:'',html:`<div class="hamel-truck-icon ${cls}"><span class="hamel-truck-tag">${c.name.replace('Crew ','')}</span><span class="hamel-truck-dot"></span><i data-lucide="truck" aria-hidden="true" style="transform:rotate(${rotation}deg)"></i></div>`,iconSize:[52,36],iconAnchor:[26,18],popupAnchor:[0,-18]})}
  function hydrateIcon(iconElement){if(global.lucide&&typeof global.lucide.createIcons==='function'&&iconElement){global.lucide.createIcons({root:iconElement,icons:{truck:global.lucide.icons.Truck}})}}
  function setMarkerIcon(L,marker,c,rotation){const icon=iconFor(c,rotation);marker.setIcon(icon);requestAnimationFrame(()=>{const el=marker.getElement();if(el)hydrateIcon(el)})}
  function popupFor(c,j){return `<div class="hamel-map-popup"><b>${c.name}</b><br><small>${c.vehicleId} · ${c.leader}</small><div class="fleet-status">${c.status.replaceAll('_',' ')}${j?' · '+Math.round(j.progress)+'%':''}</div>${j?'<div>'+j.property+'</div><small>'+j.address+'</small>':''}</div>`}
  function setupMap(mapCard){
    if(!mapCard||mapCard.dataset.hamelLeaflet==='1'||mapCard.dataset.hamelLeaflet==='loading')return;
    mapCard.dataset.hamelLeaflet='loading';mapStyles();
    const host=document.createElement('div');host.className='hamel-leaflet-host';host.setAttribute('aria-label','Live fleet map');mapCard.style.position='relative';
    mapCard.appendChild(host);
    Promise.all([loadLeaflet(),loadLucide()]).then(([L])=>{
      if(!host.isConnected)return;
      const mobile=window.matchMedia&&window.matchMedia('(max-width:900px)').matches;
      const map=L.map(host,{zoomControl:true,attributionControl:true,scrollWheelZoom:false,dragging:!mobile,tap:true,touchZoom:!mobile,doubleClickZoom:!mobile,boxZoom:!mobile,preferCanvas:true}).setView(MAP_CENTER,12);
      mapCard.dataset.hamelLeaflet='1';global.HamelFleetMap=map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',updateWhenIdle:true,keepBuffer:1}).addTo(map);
      const sync=data=>{
        const active=new Set();
        data.crews.forEach(c=>{
          active.add(c.id);const j=data.jobs.find(x=>x.id===c.jobId);const target=j&&JOB_COORDS[j.id];
          let marker=truckMarkers.get(c.id);if(!marker){marker=L.marker(crewLatLng(c),{icon:iconFor(c,0),keyboard:true,title:c.name,zIndexOffset:800}).addTo(map);truckMarkers.set(c.id,marker);marker.on('click',()=>marker.openPopup())}
          marker.bindPopup(popupFor(c,j),{closeButton:true,autoPan:true});
          if(c.status==='EN_ROUTE'&&target){const start=crewLatLng(c);const key=c.id+'|'+j.id;if(!routeCache.has(key)&&!routeCache.has(key+'-loading')){routeCache.set(key+'-loading',true);fetchRoute(start,target).then(points=>{routeCache.set(key,points);routeCache.delete(key+'-loading');drawRoute(L,map,c,points)})}const points=routeCache.get(key);if(points){const pos=routePoint(points,Math.max(0,Math.min(1,(Number(c.progress)||0)/100)));const next=routePoint(points,Math.min(1,(Number(c.progress)||0)/100+.01));marker.setLatLng(pos);setMarkerIcon(L,marker,c,bearing(pos,next))}else{marker.setLatLng(start);setMarkerIcon(L,marker,c,0)}
          }else if(target&&['WORKING','ON_SITE'].includes(c.status)){marker.setLatLng(target);setMarkerIcon(L,marker,c,0)}else{marker.setLatLng(crewLatLng(c));setMarkerIcon(L,marker,c,0)}
        });
        truckMarkers.forEach((m,id)=>{if(!active.has(id)){map.removeLayer(m);truckMarkers.delete(id)}});
        if(!map.__fitDone&&data.crews.length){map.__fitDone=true;setTimeout(()=>{const pts=data.crews.map(c=>c.status==='WORKING'&&c.jobId&&JOB_COORDS[c.jobId]?JOB_COORDS[c.jobId]:crewLatLng(c));if(pts.length)map.fitBounds(pts,{padding:[30,30],maxZoom:13})},80)}
      };
      function drawRoute(L,map,c,points){let line=routeLayers.get(c.id);if(line)map.removeLayer(line);line=L.polyline(points,{className:'hamel-route',color:c.status==='WORKING'?'#60a5fa':'#a8ff78',weight:4,opacity:.78,dashArray:'7 7',lineCap:'round'}).addTo(map);routeLayers.set(c.id,line)}
      global.HamelSimulation.subscribe(sync);
      host.addEventListener('wheel',e=>{if(e.ctrlKey)return;e.stopImmediatePropagation()},{capture:true,passive:true});
      window.addEventListener('resize',()=>map.invalidateSize({pan:false}),{passive:true});
    }).catch(()=>{mapCard.dataset.hamelLeaflet='error';host.remove()})
  }
  function ensureFleetMap(){
    const enhance=()=>{const card=document.querySelector('.map-layout > div:first-child');if(card)setupMap(card)};
    const start=()=>{if(!document.body)return;const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});enhance()};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  }
  ensureFleetMap();
  global.HamelSimulation=api;
})(window);