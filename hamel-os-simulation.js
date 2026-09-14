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
      @media (max-width: 900px) {
        .mobile-nav {
          background: #0d110d !important;
          border-top: 1px solid #222622 !important;
          box-shadow: 0 -14px 34px rgba(0,0,0,.58), 0 -1px 0 rgba(168,255,120,.04) !important;
          isolation: isolate;
        }
        .mobile-nav > button {
          background: #111611 !important;
          border: 1px solid #202620 !important;
          color: #858b85 !important;
        }
        .mobile-nav > button[aria-current="page"],
        .mobile-nav > button:focus-visible { outline: none; }
        .mobile-nav > button:active { background: #182018 !important; }
      }
    `;
    document.head.appendChild(style);
  }
  ensureMobileNavSurface();

  const seed = {
    version: 3,
    clock: { simulated: true, startedAt: now() },
    employees: [
      {id:'emp-jimmy',name:'Jimmy Hamel',crewId:'crew-alpha',role:'Leader',clocked:true},
      {id:'emp-steve',name:'Steve Hamel',crewId:'crew-bravo',role:'Leader',clocked:true},
      {id:'emp-carlos',name:'Carlos M.',crewId:'crew-charlie',role:'Leader',clocked:false},
      {id:'emp-luis',name:'Luis G.',crewId:'crew-alpha',role:'Crew',clocked:true},
      {id:'emp-david',name:'David R.',crewId:'crew-bravo',role:'Crew',clocked:true},
      {id:'emp-marco',name:'Marco T.',crewId:'crew-charlie',role:'Crew',clocked:false}
    ],
    crews: [
      {id:'crew-alpha',name:'Crew Alpha',leader:'Jimmy Hamel',vehicleId:'T01',status:'EN_ROUTE',jobId:'J-1042',progress:62,speed:24,x:38,y:42},
      {id:'crew-bravo',name:'Crew Bravo',leader:'Steve Hamel',vehicleId:'T03',status:'WORKING',jobId:'J-1043',progress:38,speed:3,x:67,y:62},
      {id:'crew-charlie',name:'Crew Charlie',leader:'Carlos M.',vehicleId:'T02',status:'SCHEDULED',jobId:'J-1044',progress:0,speed:0,x:22,y:70}
    ],
    vehicles: [
      {id:'T01',name:'F-250',type:'Truck',status:'EN_ROUTE',crewId:'crew-alpha'},
      {id:'T02',name:'Bobcat',type:'Equipment',status:'SCHEDULED',crewId:'crew-charlie'},
      {id:'T03',name:'Ram 2500',type:'Truck',status:'WORKING',crewId:'crew-bravo'},
      {id:'T04',name:'Trailer',type:'Trailer',status:'PARKED',crewId:null}
    ],
    jobs: [
      {id:'J-1042',property:'Vanderbilt Residence',client:'Vanderbilt Family',address:'17 Weston Rd, Wellesley',crewId:'crew-alpha',status:'ON_THE_WAY',progress:62,time:'10:30 AM',tasks:[{id:'t1',name:'Spring cleanup',done:true},{id:'t2',name:'Hedge trimming',done:false},{id:'t3',name:'Final cleanup',done:false}]},
      {id:'J-1043',property:'Smith Family Estate',client:'Smith Family',address:'81 Pond Ave, Natick',crewId:'crew-bravo',status:'IN_PROGRESS',progress:38,time:'12:00 PM',tasks:[{id:'t1',name:'Lawn service',done:true},{id:'t2',name:'Beds',done:false}]},
      {id:'J-1044',property:'Harrington Property',client:'Harrington LLC',address:'204 Central Ave, Weston',crewId:'crew-charlie',status:'SCHEDULED',progress:0,time:'2:30 PM',tasks:[{id:'t1',name:'Site prep',done:false}]},
      {id:'J-1045',property:'Oak Street Residence',client:'Private Client',address:'12 Oak St, Wellesley',crewId:null,status:'NEEDS_DISPATCH',progress:0,time:'3:45 PM',tasks:[]}
    ],
    evidence: [],
    events: [
      {id:makeId('EVT'),at:now(),actor:'System',type:'SYSTEM_READY',title:'Simulation online',detail:'Mock production environment initialized'},
      {id:makeId('EVT'),at:now(),actor:'Crew Alpha',type:'ROUTE_STARTED',title:'Route started',detail:'Vanderbilt Residence'},
      {id:makeId('EVT'),at:now(),actor:'System',type:'GPS_LOCK',title:'GPS lock acquired',detail:'T01 · 24 MPH'}
    ]
  };
  const clone = v => JSON.parse(JSON.stringify(v));
  const validCrew = c => c && c.id;
  function normalize(input) {
    const s = input || {};
    const out = clone(seed);
    ['employees','crews','vehicles','jobs','evidence','events'].forEach(k => { if (Array.isArray(s[k])) out[k] = s[k]; });
    out.version = 3;
    out.clock = s.clock && typeof s.clock === 'object' ? s.clock : out.clock;
    out.events = out.events.slice(0,100);
    out.evidence = out.evidence.slice(0,100);
    out.crews.forEach(c => {
      const j = out.jobs.find(x => x.id === c.jobId);
      const v = out.vehicles.find(x => x.id === c.vehicleId);
      if (!j) { c.jobId = null; c.status = 'AVAILABLE'; c.progress = 0; c.speed = 0; }
      if (v) { v.crewId = c.id; v.status = c.status; }
      if (j) { j.crewId = c.id; j.progress = Math.max(0, Math.min(100, Number(j.progress)||0)); }
    });
    out.jobs.forEach(j => { if (j.crewId && !out.crews.some(c => c.id === j.crewId)) j.crewId = null; });
    return out;
  }
  function load() { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? normalize(JSON.parse(raw)) : clone(seed); } catch (_) { return clone(seed); } }
  let state = load();
  const listeners = new Set();
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    const snapshot = clone(state);
    listeners.forEach(fn => { try { fn(snapshot); } catch (_) {} });
  }
  function emit(actor,type,title,detail) { state.events.unshift({id:makeId('EVT'),at:now(),actor,type,title,detail}); state.events = state.events.slice(0,100); }
  const crew = id => state.crews.find(c => c.id === id);
  const job = id => state.jobs.find(j => j.id === id);
  const vehicle = id => state.vehicles.find(v => v.id === id);
  const jobName = id => { const j = job(id); return j ? j.property : id; };
  function sync(c,status) { if (c) { c.status = status; const v = vehicle(c.vehicleId); if (v) v.status = status; } }
  function assignJob(jobId, crewId) {
    const j = job(jobId), c = crew(crewId);
    if (!j || !c || c.jobId || !['SCHEDULED','NEEDS_DISPATCH'].includes(j.status)) return null;
    if (j.crewId && j.crewId !== crewId) return null;
    j.crewId = crewId; c.jobId = jobId; c.status = 'SCHEDULED'; c.progress = j.progress || 0; c.speed = 0;
    sync(c,'SCHEDULED'); emit('Dispatch','JOB_ASSIGNED','Job assigned',j.id+' · '+j.property+' → '+c.name); persist(); return clone(j);
  }
  const api = {
    getState(){ return clone(state); },
    subscribe(fn){ if (typeof fn !== 'function') return () => {}; listeners.add(fn); fn(clone(state)); return () => listeners.delete(fn); },
    reset(){ state = clone(seed); persist(); },
    assignJob,
    startRoute(crewId='crew-alpha') {
      const c=crew(crewId), j=c&&job(c.jobId);
      if (!validCrew(c)||!j || j.crewId!==c.id || c.status!=='SCHEDULED' || j.status!=='SCHEDULED') return null;
      sync(c,'EN_ROUTE'); c.speed=Math.max(1,c.speed||24); c.progress=Math.max(Number(c.progress)||0,5); j.status='ON_THE_WAY'; j.progress=Math.round(c.progress);
      emit(c.leader,'ROUTE_STARTED','Route started',jobName(c.jobId)); persist(); return clone(c);
    },
    arrive(crewId='crew-alpha') {
      const c=crew(crewId),j=c&&job(c.jobId); if(!validCrew(c)||!j||c.status!=='EN_ROUTE'||j.status!=='ON_THE_WAY') return null;
      sync(c,'ON_SITE'); c.speed=0; j.status='ON_SITE'; emit(c.leader,'ARRIVED','Crew arrived on site',jobName(c.jobId)); persist(); return clone(c);
    },
    startJob(crewId='crew-alpha') {
      const c=crew(crewId),j=c&&job(c.jobId); if(!validCrew(c)||!j||c.status!=='ON_SITE'||j.status!=='ON_SITE') return null;
      sync(c,'WORKING'); c.speed=0; j.status='IN_PROGRESS'; emit(c.leader,'JOB_STARTED','Job started',jobName(c.jobId)); persist(); return clone(c);
    },
    completeTask(crewId='crew-alpha',taskId) {
      const c=crew(crewId),j=c&&job(c.jobId); if(!validCrew(c)||!j||c.status!=='WORKING'||j.status!=='IN_PROGRESS') return null;
      const t=taskId?j.tasks.find(x=>x.id===taskId):j.tasks.find(x=>!x.done); if(!t||t.done) return clone(j);
      t.done=true; const total=j.tasks.length||1; j.progress=Math.round(j.tasks.filter(x=>x.done).length/total*100); c.progress=j.progress;
      emit(c.leader,'TASK_COMPLETED','Task completed',t.name+' · '+j.property); persist(); return clone(j);
    },
    uploadEvidence(crewId='crew-alpha',label='AFTER') {
      const c=crew(crewId),j=c&&job(c.jobId); if(!validCrew(c)||!j||!['ON_SITE','WORKING'].includes(c.status)||!['ON_SITE','IN_PROGRESS'].includes(j.status)) return null;
      const evidence={id:makeId('PHOTO'),jobId:j.id,crewId,label,receivedAt:now()}; state.evidence.unshift(evidence); state.evidence=state.evidence.slice(0,100);
      emit(c.leader,'EVIDENCE_RECEIVED','Photo received',j.property+' · '+label); persist(); return clone(evidence);
    },
    completeJob(crewId='crew-alpha') {
      const c=crew(crewId),j=c&&job(c.jobId); if(!validCrew(c)||!j||c.status!=='WORKING'||j.status!=='IN_PROGRESS') return null;
      sync(c,'AVAILABLE'); c.speed=0; c.progress=100; c.jobId=null; j.status='COMPLETED'; j.progress=100; j.tasks.forEach(t=>t.done=true); j.crewId=null;
      emit(c.leader,'JOB_COMPLETED','Job completed',j.property+' · sign-off'); persist(); return clone(j);
    },
    clockIn(employeeId) { const e=state.employees.find(x=>x.id===employeeId); if(!e||e.clocked) return null; e.clocked=true; emit(e.name,'CLOCK_IN','Clocked in',e.crewId||'Office'); persist(); return clone(e); },
    clockOut(employeeId) { const e=state.employees.find(x=>x.id===employeeId); if(!e||!e.clocked) return null; e.clocked=false; emit(e.name,'CLOCK_OUT','Clocked out',e.crewId||'Office'); persist(); return clone(e); },
    tick(seconds=1) {
      const n=Number(seconds), elapsed=Number.isFinite(n)?Math.max(0,n):1;
      state.crews.forEach(c=>{ if(c.status!=='EN_ROUTE') return; c.x+=0.9*elapsed; c.y+=0.18*elapsed; if(c.x>90)c.x=10; c.speed=Math.max(18,Math.min(31,c.speed+(Math.random()-.5)*2)); c.progress=Math.min(95,(Number(c.progress)||0)+0.12*elapsed); const j=job(c.jobId); if(j)j.progress=Math.round(c.progress); });
      persist(); return clone(state);
    }
  };

  function ensureFleetMapExperience() {
    if (document.getElementById('hamel-os-fleet-map-style')) return;
    const style = document.createElement('style');
    style.id = 'hamel-os-fleet-map-style';
    style.textContent = `
      .map-layout{width:100%;min-width:0;align-items:stretch;}
      .map-layout > *{min-width:0;max-width:100%;}
      .map-layout > div:first-child{width:100%;min-width:0;overflow:hidden;position:relative;}
      .map-layout > div:first-child > div:first-child{align-items:flex-start!important;}
      .hamel-map-stage{position:absolute;inset:0;transform-origin:50% 50%;will-change:transform;cursor:grab;touch-action:none;}
      .hamel-map-stage.is-dragging{cursor:grabbing;}
      .hamel-map-controls{position:absolute;right:12px;bottom:12px;z-index:12;display:flex;gap:5px;padding:4px;border:1px solid #222622;border-radius:10px;background:rgba(9,13,9,.88);backdrop-filter:blur(6px);pointer-events:auto;}
      .hamel-map-controls button{width:34px;height:34px;border:1px solid #303630;border-radius:7px;background:#111611;color:#d7e3d7;font-size:17px;line-height:1;cursor:pointer;}
      .hamel-map-controls button:hover{border-color:#526152;background:#182018;}
      .hamel-map-controls button:focus-visible{outline:2px solid #a8ff78;outline-offset:1px;}
      .hamel-map-live{position:absolute;left:12px;bottom:12px;z-index:12;padding:6px 9px;border:1px solid #304130;border-radius:999px;background:rgba(9,13,9,.88);color:#a8ff78;font-size:9px;font-weight:700;letter-spacing:.08em;pointer-events:none;}
      @media (max-width:900px){
        .map-layout{grid-template-columns:minmax(0,1fr)!important;width:100%;}
        .map-layout > div:first-child{height:clamp(300px,58vw,430px)!important;min-height:300px;}
        .map-layout > div:nth-child(2){width:100%;}
        .page{padding-bottom:calc(108px + env(safe-area-inset-bottom))!important;}
      }
      @media (max-width:640px){
        .map-layout > div:first-child{height:clamp(280px,72vw,390px)!important;min-height:280px;}
        .hamel-map-controls{right:9px;bottom:9px;}
        .hamel-map-controls button{width:36px;height:36px;}
        .hamel-map-live{left:9px;bottom:9px;}
      }
    `;
    document.head.appendChild(style);

    const enhance = () => {
      const map = document.querySelector('.map-layout > div:first-child');
      if (!map || map.dataset.hamelInteractive === '1') return;
      map.dataset.hamelInteractive = '1';
      const overlay = map.querySelector(':scope > div:first-child');
      if (overlay) { overlay.style.alignItems = 'flex-start'; overlay.style.zIndex = '8'; }

      const stage = document.createElement('div');
      stage.className = 'hamel-map-stage';
      const children = Array.from(map.children);
      children.forEach(child => {
        if (child === overlay) return;
        stage.appendChild(child);
      });
      map.insertBefore(stage, map.firstChild);

      const controls = document.createElement('div');
      controls.className = 'hamel-map-controls';
      controls.setAttribute('aria-label','Map controls');
      controls.innerHTML = '<button type="button" data-map-action="zoom-out" aria-label="Zoom out">−</button><button type="button" data-map-action="reset" aria-label="Reset map">↺</button><button type="button" data-map-action="zoom-in" aria-label="Zoom in">+</button>';
      map.appendChild(controls);
      const live = document.createElement('div');
      live.className = 'hamel-map-live';
      live.textContent = 'DRAG · ZOOM · LIVE';
      map.appendChild(live);

      let scale = 1, tx = 0, ty = 0;
      const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
      const render = () => { stage.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${scale})`; };
      const reset = () => { scale=1; tx=0; ty=0; render(); };
      const zoom = delta => { scale=clamp(scale+delta,.85,2.5); tx=clamp(tx,-map.clientWidth*(scale-1)*.55,map.clientWidth*(scale-1)*.55); ty=clamp(ty,-map.clientHeight*(scale-1)*.55,map.clientHeight*(scale-1)*.55); render(); };
      controls.addEventListener('click', e => { const b=e.target.closest('button'); if(!b)return; const a=b.dataset.mapAction; if(a==='zoom-in')zoom(.15); else if(a==='zoom-out')zoom(-.15); else reset(); });
      map.addEventListener('dblclick', e => { if(e.target.closest('.hamel-map-controls')) return; zoom(.25); });
      map.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY<0?.12:-.12); }, {passive:false});

      let drag=false, sx=0, sy=0, ox=0, oy=0;
      stage.addEventListener('pointerdown', e => { if(e.button!==undefined && e.button!==0)return; drag=true; sx=e.clientX; sy=e.clientY; ox=tx; oy=ty; stage.classList.add('is-dragging'); stage.setPointerCapture?.(e.pointerId); });
      stage.addEventListener('pointermove', e => { if(!drag)return; const dx=e.clientX-sx,dy=e.clientY-sy; const limX=Math.max(0,map.clientWidth*(scale-1)*.6),limY=Math.max(0,map.clientHeight*(scale-1)*.6); tx=clamp(ox+dx,-limX,limX); ty=clamp(oy+dy,-limY,limY); render(); });
      const stop=e=>{ if(!drag)return; drag=false; stage.classList.remove('is-dragging'); try{stage.releasePointerCapture?.(e.pointerId);}catch(_){} };
      stage.addEventListener('pointerup',stop); stage.addEventListener('pointercancel',stop); stage.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')stop(e);});
      window.addEventListener('resize',()=>{tx=clamp(tx,-map.clientWidth*(scale-1)*.6,map.clientWidth*(scale-1)*.6);ty=clamp(ty,-map.clientHeight*(scale-1)*.6,map.clientHeight*(scale-1)*.6);render();});
      render();
    };
    const startObserver = () => {
      if (!document.body) return;
      const observer = new MutationObserver(enhance);
      observer.observe(document.body,{childList:true,subtree:true});
      enhance();
    };
    if (document.body) startObserver();
    else document.addEventListener('DOMContentLoaded', startObserver, {once:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureFleetMapExperience, {once:true});
  else ensureFleetMapExperience();

  global.HamelSimulation = api;
})(window);