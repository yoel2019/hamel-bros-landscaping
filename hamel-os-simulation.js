/* Hamel OS — Operational Simulation Engine
 * Mock production behavior only. No database, GPS, auth, or external writes.
 */
(function (global) {
  'use strict';
  const STORAGE_KEY = 'hamel-os:simulation:v1';
  const now = () => new Date().toISOString();
  const id = p => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const seed = {
    version: 2, clock: { simulated:true, startedAt:now() },
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
      {id:'J-1042',property:'Vanderbilt Residence',client:'Vanderbilt Family',address:'17 Weston Rd, Wellesley',crewId:'crew-alpha',status:'ON_THE_WAY',progress:62,tasks:[{id:'t1',name:'Spring cleanup',done:true},{id:'t2',name:'Hedge trimming',done:false},{id:'t3',name:'Final cleanup',done:false}]},
      {id:'J-1043',property:'Smith Family Estate',client:'Smith Family',address:'81 Pond Ave, Natick',crewId:'crew-bravo',status:'IN_PROGRESS',progress:38,tasks:[{id:'t1',name:'Lawn service',done:true},{id:'t2',name:'Beds',done:false}]},
      {id:'J-1044',property:'Harrington Property',client:'Harrington LLC',address:'204 Central Ave, Weston',crewId:'crew-charlie',status:'SCHEDULED',progress:0,tasks:[{id:'t1',name:'Site prep',done:false}]},
      {id:'J-1045',property:'Oak Street Residence',client:'Private Client',address:'12 Oak St, Wellesley',crewId:null,status:'NEEDS_DISPATCH',progress:0,tasks:[]}
    ], evidence:[], events:[
      {id:id('EVT'),at:now(),actor:'System',type:'SYSTEM_READY',title:'Simulation online',detail:'Mock production environment initialized'},
      {id:id('EVT'),at:now(),actor:'Crew Alpha',type:'ROUTE_STARTED',title:'Route started',detail:'Vanderbilt Residence'},
      {id:id('EVT'),at:now(),actor:'System',type:'GPS_LOCK',title:'GPS lock acquired',detail:'T01 · 24 MPH'}
    ]
  };
  const clone=v=>JSON.parse(JSON.stringify(v));
  function normalize(s){const out=clone(seed);Object.assign(out,s||{});out.version=2;out.crews=Array.isArray(s&&s.crews)?s.crews:out.crews;out.vehicles=Array.isArray(s&&s.vehicles)?s.vehicles:out.vehicles;out.jobs=Array.isArray(s&&s.jobs)?s.jobs:out.jobs;out.events=Array.isArray(s&&s.events)?s.events.slice(0,100):out.events;out.evidence=Array.isArray(s&&s.evidence)?s.evidence:[];return out;}
  function load(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?normalize(JSON.parse(raw)):clone(seed);}catch(_){return clone(seed);}}
  let state=load();const listeners=new Set();
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}listeners.forEach(fn=>{try{fn(clone(state));}catch(_){}});}
  function emit(actor,type,title,detail){state.events.unshift({id:id('EVT'),at:now(),actor,type,title,detail});state.events=state.events.slice(0,100);}
  const crew=idv=>state.crews.find(c=>c.id===idv), job=idv=>state.jobs.find(j=>j.id===idv), vehicle=idv=>state.vehicles.find(v=>v.id===idv), jobName=idv=>{const j=job(idv);return j?j.property:idv;};
  function syncVehicle(c,status){const v=vehicle(c.vehicleId);if(v)v.status=status;}
  const api={
    getState(){return clone(state);},
    subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
    reset(){state=clone(seed);persist();},
    startRoute(crewId='crew-alpha'){
      const c=crew(crewId),j=c&&job(c.jobId);
      if(!c||!j||!(j.status==='SCHEDULED'||(j.status==='ON_THE_WAY'&&c.status==='EN_ROUTE')))return null;
      c.status='EN_ROUTE';c.speed=Math.max(1,c.speed||24);c.progress=Math.max(c.progress||0,5);j.status='ON_THE_WAY';j.progress=Math.round(c.progress);syncVehicle(c,'EN_ROUTE');emit(c.leader,'ROUTE_STARTED','Route started',jobName(c.jobId));persist();return clone(c);
    },
    arrive(crewId='crew-alpha'){
      const c=crew(crewId),j=c&&job(c.jobId);if(!c||!j||c.status!=='EN_ROUTE')return null;c.status='ON_SITE';c.speed=0;j.status='ON_SITE';syncVehicle(c,'ON_SITE');emit(c.leader,'ARRIVED','Crew arrived on site',jobName(c.jobId));persist();return clone(c);
    },
    startJob(crewId='crew-alpha'){
      const c=crew(crewId),j=c&&job(c.jobId);if(!c||!j||c.status!=='ON_SITE')return null;c.status='WORKING';c.speed=0;j.status='IN_PROGRESS';syncVehicle(c,'WORKING');emit(c.leader,'JOB_STARTED','Job started',jobName(c.jobId));persist();return clone(c);
    },
    completeTask(crewId='crew-alpha',taskId){
      const c=crew(crewId),j=c&&job(c.jobId);if(!c||!j||c.status!=='WORKING')return null;const t=taskId?j.tasks.find(x=>x.id===taskId):j.tasks.find(x=>!x.done);if(!t||t.done)return clone(j);t.done=true;const total=j.tasks.length||1;j.progress=Math.round(j.tasks.filter(x=>x.done).length/total*100);c.progress=j.progress;emit(c.leader,'TASK_COMPLETED','Task completed',t.name+' · '+j.property);persist();return clone(j);
    },
    uploadEvidence(crewId='crew-alpha',label='AFTER'){
      const c=crew(crewId),j=c&&job(c.jobId);if(!c||!j||!['ON_SITE','WORKING'].includes(c.status))return null;const evidence={id:id('PHOTO'),jobId:j.id,crewId,label,receivedAt:now()};state.evidence.unshift(evidence);state.evidence=state.evidence.slice(0,100);emit(c.leader,'EVIDENCE_RECEIVED','Photo received',j.property+' · '+label);persist();return clone(evidence);
    },
    completeJob(crewId='crew-alpha'){
      const c=crew(crewId),j=c&&job(c.jobId);if(!c||!j||c.status!=='WORKING')return null;c.status='AVAILABLE';c.speed=0;c.progress=100;j.status='COMPLETED';j.progress=100;j.tasks.forEach(t=>{t.done=true;});syncVehicle(c,'AVAILABLE');emit(c.leader,'JOB_COMPLETED','Job completed',j.property+' · sign-off');persist();return clone(j);
    },
    tick(seconds=1){const n=Number(seconds),elapsed=Number.isFinite(n)?Math.max(0,n):1;state.crews.forEach(c=>{if(c.status!=='EN_ROUTE')return;c.x+=0.9*elapsed;c.y+=0.18*elapsed;if(c.x>90)c.x=10;c.speed=Math.max(18,Math.min(31,c.speed+(Math.random()-.5)*2));c.progress=Math.min(95,c.progress+0.12*elapsed);const j=job(c.jobId);if(j)j.progress=Math.round(c.progress);});persist();return this.getState();},
    runFullCycle(crewId='crew-alpha'){const c=crew(crewId),j=c&&job(c.jobId);if(!c||!j)return false;if(!this.startRoute(crewId))return false;setTimeout(()=>this.arrive(crewId),2200);setTimeout(()=>this.startJob(crewId),4200);setTimeout(()=>this.completeTask(crewId),6000);setTimeout(()=>this.uploadEvidence(crewId,'AFTER'),7600);setTimeout(()=>this.completeJob(crewId),9800);return true;}
  };
  global.HamelSimulation=api;
})(window);