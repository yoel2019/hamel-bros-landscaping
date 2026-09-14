/* Hamel OS — Operational Domain Engine
 * Pure business logic. UI-agnostic and dependency-free.
 * Designed for the browser simulator now and Supabase/server execution later.
 */
(function(global){
  'use strict';

  const VERSION = 1;
  const EVENT_TYPES = Object.freeze({
    CLOCK_IN:'CLOCK_IN', CLOCK_OUT:'CLOCK_OUT', BREAK_START:'BREAK_START', BREAK_END:'BREAK_END',
    LOCATION:'LOCATION', ROUTE_STARTED:'ROUTE_STARTED', ARRIVED:'ARRIVED', JOB_STARTED:'JOB_STARTED',
    TASK_COMPLETED:'TASK_COMPLETED', TASK_SKIPPED:'TASK_SKIPPED', TASK_NOT_COMPLETED:'TASK_NOT_COMPLETED',
    EVIDENCE:'EVIDENCE', INCIDENT:'INCIDENT', JOB_COMPLETED:'JOB_COMPLETED', JOB_PARTIALLY_COMPLETED:'JOB_PARTIALLY_COMPLETED',
    JOB_CANCELLED:'JOB_CANCELLED', SITE_CHECK:'SITE_CHECK'
  });

  const TASK_REASONS = Object.freeze([
    'MATERIAL_UNAVAILABLE','CLIENT_REQUESTED','WEATHER','SAFETY_RISK','ACCESS_BLOCKED',
    'EQUIPMENT_ISSUE','TIME_LIMIT','DUPLICATE','NOT_APPLICABLE','OTHER'
  ]);
  const INCIDENT_TYPES = Object.freeze([
    'EQUIPMENT_DAMAGE','PROPERTY_DAMAGE','PRE_EXISTING_DAMAGE','SAFETY_ISSUE',
    'ACCESS_ISSUE','VEHICLE_ISSUE','CLIENT_ISSUE','OTHER'
  ]);
  const ROLES = Object.freeze({ADMIN:'ADMIN',DISPATCH:'DISPATCH',LEADER:'LEADER',CREW:'CREW',CLIENT:'CLIENT'});

  const clone = v => JSON.parse(JSON.stringify(v));
  const isoNow = () => new Date().toISOString();
  const id = prefix => prefix+'-'+Math.random().toString(36).slice(2,10).toUpperCase();
  const clamp = (n,min,max) => Math.min(max,Math.max(min,Number(n)||0));
  const required = (v,name) => { if(v===undefined||v===null||v==='') throw new Error(name+' is required'); return v; };

  // Haversine distance in meters. No external map service is required for validation.
  function distanceMeters(a,b){
    if(!a||!b||!Number.isFinite(Number(a.latitude))||!Number.isFinite(Number(a.longitude))||!Number.isFinite(Number(b.latitude))||!Number.isFinite(Number(b.longitude))) return null;
    const R=6371008.8, p1=Number(a.latitude)*Math.PI/180, p2=Number(b.latitude)*Math.PI/180;
    const dp=(Number(b.latitude)-Number(a.latitude))*Math.PI/180, dl=(Number(b.longitude)-Number(a.longitude))*Math.PI/180;
    const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));
  }
  function gps(point){
    if(!point) return null;
    return {latitude:Number(point.latitude),longitude:Number(point.longitude),accuracyM:Number.isFinite(Number(point.accuracyM))?Number(point.accuracyM):null,capturedAt:point.capturedAt||isoNow()};
  }
  function verifyGeofence(location,site,radiusM=150){
    const distance=distanceMeters(location,site);
    if(distance===null) return {verified:false,distanceM:null,reason:'GPS_UNAVAILABLE'};
    const accuracy=Number(location.accuracyM);
    const effectiveRadius=radiusM+ (Number.isFinite(accuracy)?Math.min(accuracy,100):0);
    return {verified:distance<=effectiveRadius,distanceM:Math.round(distance),reason:distance<=effectiveRadius?'WITHIN_SITE_RADIUS':'OUTSIDE_SITE_RADIUS'};
  }

  function makeEvent(type,input){
    const e=input||{};
    return {
      id:e.id||id('EVT'), version:VERSION, type, occurredAt:e.occurredAt||isoNow(),
      actorId:e.actorId||null, actorName:e.actorName||null, role:e.role||null,
      employeeId:e.employeeId||null, crewId:e.crewId||null, jobId:e.jobId||null, vehicleId:e.vehicleId||null,
      latitude:Number.isFinite(Number(e.latitude))?Number(e.latitude):null,
      longitude:Number.isFinite(Number(e.longitude))?Number(e.longitude):null,
      gpsAccuracyM:Number.isFinite(Number(e.gpsAccuracyM))?Number(e.gpsAccuracyM):null,
      payload:clone(e.payload||{})
    };
  }

  function eventLog(state,event){
    if(!Array.isArray(state.events)) state.events=[];
    state.events.unshift(event); state.events=state.events.slice(0,500);
    return event;
  }
  function findEmployee(state,employeeId){return (state.employees||[]).find(e=>e.id===employeeId)||null;}
  function findCrew(state,crewId){return (state.crews||[]).find(c=>c.id===crewId)||null;}
  function findJob(state,jobId){return (state.jobs||[]).find(j=>j.id===jobId)||null;}
  function findVehicle(state,vehicleId){return (state.vehicles||[]).find(v=>v.id===vehicleId)||null;}
  function currentClock(employee){return employee&&employee.clockSession||null;}
  function assertWorker(employee){if(!employee) throw new Error('Employee not found');}
  function assertClocked(employee){if(!employee.clockSession) throw new Error('Employee is not clocked in');}
  function assertNotOnBreak(employee){if(employee.clockSession&&employee.clockSession.onBreak) throw new Error('Employee is on break');}

  function clockIn(state,employeeId,location,meta){
    const e=findEmployee(state,required(employeeId,'employeeId')); assertWorker(e);
    if(e.clockSession) throw new Error('Employee is already clocked in');
    const g=gps(required(location,'location'));
    e.clockSession={startedAt:isoNow(),onBreak:false,lastLocation:g,breaks:[]}; e.clocked=true;
    return eventLog(state,makeEvent(EVENT_TYPES.CLOCK_IN,{...meta,employeeId:e.id,actorId:e.id,actorName:e.name,latitude:g.latitude,longitude:g.longitude,gpsAccuracyM:g.accuracyM,payload:{locationVerified:true}}));
  }
  function clockOut(state,employeeId,location,meta){
    const e=findEmployee(state,required(employeeId,'employeeId')); assertWorker(e); assertClocked(e);
    if(e.clockSession.onBreak) throw new Error('End break before clocking out');
    const g=gps(required(location,'location')); const started=e.clockSession.startedAt;
    const session=clone(e.clockSession); session.endedAt=isoNow(); session.clockOutLocation=g;
    e.clockSession=null; e.clocked=false;
    return eventLog(state,makeEvent(EVENT_TYPES.CLOCK_OUT,{...meta,employeeId:e.id,actorId:e.id,actorName:e.name,latitude:g.latitude,longitude:g.longitude,payload:{session}}));
  }
  function startBreak(state,employeeId,location,meta){
    const e=findEmployee(state,required(employeeId,'employeeId')); assertWorker(e); assertClocked(e); assertNotOnBreak(e);
    const g=gps(required(location,'location')); e.clockSession.onBreak=true;
    const b={startedAt:isoNow(),startLocation:g}; e.clockSession.breaks.push(b);
    return eventLog(state,makeEvent(EVENT_TYPES.BREAK_START,{...meta,employeeId:e.id,actorId:e.id,actorName:e.name,latitude:g.latitude,longitude:g.longitude,payload:{breakIndex:e.clockSession.breaks.length-1}}));
  }
  function endBreak(state,employeeId,location,meta){
    const e=findEmployee(state,required(employeeId,'employeeId')); assertWorker(e); assertClocked(e);
    if(!e.clockSession.onBreak) throw new Error('Employee is not on break');
    const g=gps(required(location,'location')); const b=e.clockSession.breaks[e.clockSession.breaks.length-1]; b.endedAt=isoNow(); b.endLocation=g; e.clockSession.onBreak=false;
    return eventLog(state,makeEvent(EVENT_TYPES.BREAK_END,{...meta,employeeId:e.id,actorId:e.id,actorName:e.name,latitude:g.latitude,longitude:g.longitude,payload:{breakIndex:e.clockSession.breaks.length-1}}));
  }
  function recordLocation(state,subject,location,meta){
    const g=gps(required(location,'location')); const target=subject||{};
    if(target.employeeId){const e=findEmployee(state,target.employeeId);if(e&&e.clockSession)e.clockSession.lastLocation=g;}
    if(target.vehicleId){const v=findVehicle(state,target.vehicleId);if(v)v.lastLocation=g;}
    if(target.crewId){const c=findCrew(state,target.crewId);if(c)c.lastLocation=g;}
    return eventLog(state,makeEvent(EVENT_TYPES.LOCATION,{...meta,employeeId:target.employeeId||null,crewId:target.crewId||null,vehicleId:target.vehicleId||null,jobId:target.jobId||null,latitude:g.latitude,longitude:g.longitude,gpsAccuracyM:g.accuracyM,payload:{source:meta&&meta.source||'device'}}));
  }

  function arrive(state,input){
    const x=input||{}, c=findCrew(state,required(x.crewId,'crewId')), j=findJob(state,required(x.jobId||c&&c.jobId,'jobId'));
    if(!c||!j) throw new Error('Crew or job not found');
    const g=gps(required(x.location,'location')); const site=x.site||j.location;
    const verification=verifyGeofence(g,site,x.radiusM||150);
    if(x.requireVerified!==false&&!verification.verified) throw new Error('Arrival GPS could not be verified: '+verification.reason);
    c.status='ON_SITE'; c.speed=0; c.lastLocation=g; j.status='ON_SITE'; j.arrival={at:isoNow(),location:g,verification,employeeId:x.employeeId||null,crewId:c.id};
    return eventLog(state,makeEvent(EVENT_TYPES.ARRIVED,{actorId:x.employeeId||c.leaderId||null,actorName:x.actorName||c.leader||null,role:x.role||ROLES.LEADER,employeeId:x.employeeId||null,crewId:c.id,jobId:j.id,vehicleId:c.vehicleId,latitude:g.latitude,longitude:g.longitude,gpsAccuracyM:g.accuracyM,payload:{verification}}));
  }
  function startJob(state,input){
    const x=input||{},j=findJob(state,required(x.jobId,'jobId')),c=findCrew(state,required(x.crewId||j&&j.crewId,'crewId')); if(!j||!c) throw new Error('Job or crew not found');
    if(j.status!=='ON_SITE') throw new Error('Job must be ON_SITE before work starts');
    j.status='IN_PROGRESS'; c.status='WORKING'; j.startedAt=isoNow();
    return eventLog(state,makeEvent(EVENT_TYPES.JOB_STARTED,{...x,crewId:c.id,jobId:j.id,vehicleId:c.vehicleId,payload:{}}));
  }
  function taskOutcome(state,input){
    const x=input||{},j=findJob(state,required(x.jobId,'jobId')),t=j&&j.tasks&&j.tasks.find(a=>a.id===x.taskId); if(!j||!t) throw new Error('Task not found');
    const outcome=x.outcome||'COMPLETED';
    if(outcome==='COMPLETED'){
      t.status='COMPLETED'; t.done=true; t.outcomeAt=isoNow(); t.reasonCode=null; t.reason=null;
    } else {
      const reasonCode=required(x.reasonCode,'reasonCode'); if(!TASK_REASONS.includes(reasonCode)) throw new Error('Invalid task reason');
      if(!x.reason) throw new Error('A reason is required when a task is skipped or not completed');
      t.status=outcome==='SKIPPED'?'SKIPPED':'NOT_COMPLETED'; t.done=false; t.outcomeAt=isoNow(); t.reasonCode=reasonCode; t.reason=x.reason;
    }
    const total=j.tasks.length||1,done=j.tasks.filter(a=>a.status==='COMPLETED'||a.done).length;j.progress=Math.round(done/total*100);
    const type=outcome==='COMPLETED'?EVENT_TYPES.TASK_COMPLETED:(outcome==='SKIPPED'?EVENT_TYPES.TASK_SKIPPED:EVENT_TYPES.TASK_NOT_COMPLETED);
    return eventLog(state,makeEvent(type,{...x,jobId:j.id,payload:{taskId:t.id,taskName:t.name,outcome,reasonCode:t.reasonCode||null,reason:t.reason||null}}));
  }
  function siteCheck(state,input){
    const x=input||{},j=findJob(state,required(x.jobId,'jobId')); if(!j) throw new Error('Job not found');
    const status=x.condition||'NORMAL'; if(status!=='NORMAL'&&!x.notes) throw new Error('Site check notes are required for an abnormal condition');
    return eventLog(state,makeEvent(EVENT_TYPES.SITE_CHECK,{...x,jobId:j.id,payload:{condition:status,notes:x.notes||null,preExistingDamage:!!x.preExistingDamage}}));
  }
  function incident(state,input){
    const x=input||{},type=required(x.incidentType,'incidentType'); if(!INCIDENT_TYPES.includes(type)) throw new Error('Invalid incident type');
    const severity=x.severity||'LOW'; const title=required(x.title,'title'); const g=x.location?gps(x.location):null;
    const record={id:id('INC'),jobId:x.jobId||null,employeeId:x.employeeId||null,crewId:x.crewId||null,vehicleId:x.vehicleId||null,incidentType:type,severity,title,description:x.description||null,occurredAt:x.occurredAt||isoNow(),location:g,status:'OPEN',evidenceIds:Array.isArray(x.evidenceIds)?x.evidenceIds.slice():[]};
    if(!Array.isArray(state.incidents))state.incidents=[]; state.incidents.unshift(record);
    eventLog(state,makeEvent(EVENT_TYPES.INCIDENT,{...x,jobId:record.jobId,employeeId:record.employeeId,crewId:record.crewId,vehicleId:record.vehicleId,latitude:g&&g.latitude,longitude:g&&g.longitude,gpsAccuracyM:g&&g.accuracyM,payload:{incidentId:record.id,type,severity,title,description:record.description}}));
    return record;
  }
  function completeJob(state,input){
    const x=input||{},j=findJob(state,required(x.jobId,'jobId')),c=findCrew(state,required(x.crewId||j&&j.crewId,'crewId')); if(!j||!c) throw new Error('Job or crew not found');
    const unfinished=(j.tasks||[]).filter(t=>t.status!=='COMPLETED'&&t.done!==true);
    const disposition=unfinished.length?'PARTIALLY_COMPLETED':'COMPLETED';
    if(unfinished.some(t=>!t.reasonCode||!t.reason)) throw new Error('Every unfinished task needs a reason before job sign-off');
    j.status=disposition; j.progress=unfinished.length?Math.round((j.tasks.length-unfinished.length)/(j.tasks.length||1)*100):100; j.completedAt=isoNow(); j.completion={employeeId:x.employeeId||null,crewId:c.id,disposition,unfinishedTaskIds:unfinished.map(t=>t.id),notes:x.notes||null};
    c.status='AVAILABLE'; c.jobId=null; c.speed=0;
    return eventLog(state,makeEvent(unfinished.length?EVENT_TYPES.JOB_PARTIALLY_COMPLETED:EVENT_TYPES.JOB_COMPLETED,{...x,jobId:j.id,crewId:c.id,vehicleId:c.vehicleId,payload:{disposition,unfinishedTaskIds:unfinished.map(t=>t.id)}}));
  }

  function customerView(state,jobId){
    const j=findJob(state,jobId); if(!j) return null;
    const publicTypes=new Set(['ROUTE_STARTED','ARRIVED','JOB_STARTED','TASK_COMPLETED','EVIDENCE','JOB_COMPLETED','JOB_PARTIALLY_COMPLETED']);
    const timeline=(state.events||[]).filter(e=>e.jobId===jobId&&publicTypes.has(e.type)).map(e=>({type:e.type,at:e.occurredAt,detail:e.payload&&e.payload.taskName||null}));
    const crew=(state.crews||[]).find(c=>c.id===j.crewId)||null;
    return {jobId:j.id,property:j.property,address:j.address,status:j.status,progress:j.progress||0,arrival:j.arrival||null,crewStatus:crew&&crew.status||null,lastKnownLocation:crew&&crew.lastLocation||null,timeline};
  }

  function auditTime(state,employeeId){
    const events=(state.events||[]).filter(e=>e.employeeId===employeeId&&['CLOCK_IN','CLOCK_OUT','BREAK_START','BREAK_END'].includes(e.type)).sort((a,b)=>new Date(a.occurredAt)-new Date(b.occurredAt));
    let open=null,breakStart=null,worked=0,breaks=0;
    for(const e of events){
      if(e.type==='CLOCK_IN'&&!open)open=e;
      else if(e.type==='CLOCK_OUT'&&open){worked+=new Date(e.occurredAt)-new Date(open.occurredAt);open=null;}
      else if(e.type==='BREAK_START'&&!breakStart){breakStart=e;}
      else if(e.type==='BREAK_END'&&breakStart){breaks+=new Date(e.occurredAt)-new Date(breakStart.occurredAt);breakStart=null;}
    }
    return {employeeId,workedMs:worked,breakMs:breaks,openSession:!!open,breakOpen:!!breakStart,events};
  }

  const api={VERSION,EVENT_TYPES,TASK_REASONS,INCIDENT_TYPES,ROLES,clone,distanceMeters,verifyGeofence,makeEvent,
    clockIn,clockOut,startBreak,endBreak,recordLocation,arrive,startJob,taskOutcome,siteCheck,incident,completeJob,customerView,auditTime};
  global.HamelOSDomain=api;
})(window);
