/* Hamel OS — Operations & Resource Rules Engine
 * Domain rules for crew-owned work, admin job templates and persistent resources.
 * UI-agnostic. Designed to run beside HamelOSDomain and later move server-side.
 */
(function(global){
  'use strict';

  const VERSION=1;
  const WORK_STATES=Object.freeze({AVAILABLE:'AVAILABLE',CLAIMED:'CLAIMED',IN_PROGRESS:'IN_PROGRESS',COMPLETED:'COMPLETED',RELEASED:'RELEASED'});
  const RESOURCE_STATES=Object.freeze({AVAILABLE:'AVAILABLE',ASSIGNED:'ASSIGNED',DAMAGED:'DAMAGED',MAINTENANCE:'MAINTENANCE',OUT_OF_SERVICE:'OUT_OF_SERVICE'});
  const RESOURCE_TYPES=Object.freeze({TRUCK:'TRUCK',TRAILER:'TRAILER',MOWER:'MOWER',TRIMMER:'TRIMMER',BLOWER:'BLOWER',EQUIPMENT:'EQUIPMENT',TOOL:'TOOL',OTHER:'OTHER'});

  const clone=v=>JSON.parse(JSON.stringify(v));
  const now=()=>new Date().toISOString();
  const id=p=>p+'-'+Math.random().toString(36).slice(2,10).toUpperCase();
  const find=(a,k,v)=>(Array.isArray(a)?a:[]).find(x=>x&&x[k]===v)||null;
  const requireValue=(v,n)=>{if(v===undefined||v===null||v==='')throw new Error(n+' is required');return v};

  function log(state,type,input){
    if(!Array.isArray(state.events))state.events=[];
    const x=input||{};
    const event={id:id('OPS'),version:VERSION,type,occurredAt:x.occurredAt||now(),actorId:x.actorId||null,actorName:x.actorName||null,role:x.role||null,jobId:x.jobId||null,crewId:x.crewId||null,employeeId:x.employeeId||null,vehicleId:x.vehicleId||null,payload:clone(x.payload||{})};
    state.events.unshift(event);state.events=state.events.slice(0,500);return event;
  }

  // Admin creates reusable work definitions. The definition contains the work,
  // task sequence and default resource requirements; individual jobs can override it.
  function createWorkType(state,input){
    const x=input||{};const name=requireValue(x.name,'name');
    if(!Array.isArray(state.workTypes))state.workTypes=[];
    const workType={id:x.id||id('WORK'),name,description:x.description||'',category:x.category||'GENERAL',active:x.active!==false,tasks:(x.tasks||[]).map((t,i)=>({id:t.id||id('TASK'),name:requireValue(t.name,'task.name'),sequence:i+1,required:t.required!==false})),resourceRules:(x.resourceRules||[]).map(r=>({resourceType:requireValue(r.resourceType,'resourceType'),quantity:Math.max(1,Number(r.quantity)||1),persistent:r.persistent!==false,required:r.required!==false,allowSubstitute:r.allowSubstitute===true})) ,createdAt:now(),updatedAt:now()};
    state.workTypes.push(workType);
    log(state,'WORK_TYPE_CREATED',{...x,payload:{workTypeId:workType.id,name:workType.name,resourceRules:workType.resourceRules}});
    return clone(workType);
  }

  function updateWorkType(state,input){
    const x=input||{},w=find(state.workTypes,'id',requireValue(x.workTypeId,'workTypeId'));if(!w)throw new Error('Work type not found');
    if(x.name!==undefined)w.name=requireValue(x.name,'name');if(x.description!==undefined)w.description=x.description;if(x.active!==undefined)w.active=!!x.active;
    if(Array.isArray(x.tasks))w.tasks=x.tasks.map((t,i)=>({id:t.id||id('TASK'),name:requireValue(t.name,'task.name'),sequence:i+1,required:t.required!==false}));
    if(Array.isArray(x.resourceRules))w.resourceRules=x.resourceRules.map(r=>({resourceType:requireValue(r.resourceType,'resourceType'),quantity:Math.max(1,Number(r.quantity)||1),persistent:r.persistent!==false,required:r.required!==false,allowSubstitute:r.allowSubstitute===true}));
    w.updatedAt=now();log(state,'WORK_TYPE_UPDATED',{...x,payload:{workTypeId:w.id}});return clone(w);
  }

  // A recurring service such as lawn mowing can be represented by a work type
  // whose default resources are persistent. The actual job stores a snapshot so
  // historical jobs do not silently change when an admin edits the template.
  function createJobFromWorkType(state,input){
    const x=input||{},w=find(state.workTypes,'id',requireValue(x.workTypeId,'workTypeId'));if(!w||!w.active)throw new Error('Active work type not found');
    if(!Array.isArray(state.jobs))state.jobs=[];
    const job={id:x.jobId||id('JOB'),property:requireValue(x.property,'property'),client:x.client||null,address:x.address||null,crewId:null,status:WORK_STATES.AVAILABLE,progress:0,scheduledFor:x.scheduledFor||null,workTypeId:w.id,workTypeName:w.name,tasks:w.tasks.map(t=>({id:t.id+'-'+Math.random().toString(36).slice(2,5),templateTaskId:t.id,name:t.name,sequence:t.sequence,required:t.required,status:'PENDING',done:false})),resourcePlan:w.resourceRules.map(r=>({...r,assignedResourceIds:[]})),createdAt:now(),updatedAt:now()};
    state.jobs.push(job);log(state,'JOB_CREATED',{...x,jobId:job.id,payload:{workTypeId:w.id,workTypeName:w.name}});return clone(job);
  }

  // Atomic claim: only one crew can own a job. A second crew receives an error.
  // The job remains unavailable until the current owner explicitly releases it.
  function claimJob(state,input){
    const x=input||{},job=find(state.jobs,'id',requireValue(x.jobId,'jobId')),crew=find(state.crews,'id',requireValue(x.crewId,'crewId'));
    if(!job||!crew)throw new Error('Job or crew not found');
    if(job.status===WORK_STATES.COMPLETED)throw new Error('Job is already completed');
    if(job.crewId&&job.crewId!==crew.id)throw new Error('Job is already claimed by another crew');
    if(crew.jobId&&crew.jobId!==job.id)throw new Error('Crew already owns another job');
    job.crewId=crew.id;job.status=WORK_STATES.CLAIMED;job.claimedAt=now();job.claimedBy=crew.id;crew.jobId=job.id;
    log(state,'JOB_CLAIMED',{...x,jobId:job.id,crewId:crew.id,vehicleId:crew.vehicleId,payload:{property:job.property,claimType:'CREW_SELF_ASSIGN'}});
    return clone(job);
  }

  // Only the current owner/leader (or an admin/dispatch role) may release.
  // Releasing makes the job claimable by another eligible crew again.
  function releaseJob(state,input){
    const x=input||{},job=find(state.jobs,'id',requireValue(x.jobId,'jobId')),crew=find(state.crews,'id',requireValue(x.crewId,'crewId'));
    if(!job||!crew)throw new Error('Job or crew not found');
    if(job.crewId!==crew.id)throw new Error('This crew does not own the job');
    const privileged=['ADMIN','DISPATCH','LEADER'].includes(x.role);if(!privileged)throw new Error('Only a leader, dispatch, or admin can release a claimed job');
    const previousCrew=crew.id;job.crewId=null;job.status=WORK_STATES.RELEASED;job.releasedAt=now();job.releasedBy=x.actorId||crew.leaderId||null;crew.jobId=null;
    log(state,'JOB_RELEASED',{...x,jobId:job.id,crewId:previousCrew,payload:{reason:requireValue(x.reason,'reason'),releasedForReassignment:true}});
    return clone(job);
  }

  function reopenJob(state,input){
    const x=input||{},job=find(state.jobs,'id',requireValue(x.jobId,'jobId'));if(!job)throw new Error('Job not found');
    if(job.status!==WORK_STATES.RELEASED)throw new Error('Only released jobs can be reopened');
    job.status=WORK_STATES.AVAILABLE;job.updatedAt=now();log(state,'JOB_REOPENED',{...x,jobId:job.id,payload:{claimable:true}});return clone(job);
  }

  // Admin defines a resource once. persistent=true means this resource is the
  // default equipment for the crew/work type and is not silently reassigned.
  function registerResource(state,input){
    const x=input||{};const name=requireValue(x.name,'name'),type=requireValue(x.resourceType,'resourceType');
    if(!Object.values(RESOURCE_TYPES).includes(type))throw new Error('Invalid resource type');
    if(!Array.isArray(state.resources))state.resources=[];
    const resource={id:x.id||id('RES'),name,resourceType:type,serialNumber:x.serialNumber||null,status:x.status||RESOURCE_STATES.AVAILABLE,persistent:x.persistent===true,homeCrewId:x.homeCrewId||null,assignedCrewId:x.assignedCrewId||null,workTypeIds:Array.isArray(x.workTypeIds)?x.workTypeIds.slice():[],metadata:clone(x.metadata||{}),createdAt:now(),updatedAt:now()};
    state.resources.push(resource);log(state,'RESOURCE_REGISTERED',{...x,vehicleId:type==='TRUCK'||type==='TRAILER'?resource.id:null,payload:{resourceId:resource.id,resourceType:type,persistent:resource.persistent,homeCrewId:resource.homeCrewId}});return clone(resource);
  }

  function assignResource(state,input){
    const x=input||{},resource=find(state.resources,'id',requireValue(x.resourceId,'resourceId')),crew=find(state.crews,'id',requireValue(x.crewId,'crewId'));if(!resource||!crew)throw new Error('Resource or crew not found');
    if(resource.status===RESOURCE_STATES.DAMAGED||resource.status===RESOURCE_STATES.OUT_OF_SERVICE)throw new Error('Resource is unavailable');
    if(resource.persistent&&resource.homeCrewId&&resource.homeCrewId!==crew.id&&!['ADMIN','DISPATCH'].includes(x.role))throw new Error('Persistent resource belongs to another crew');
    if(resource.assignedCrewId&&resource.assignedCrewId!==crew.id)throw new Error('Resource is assigned to another crew');
    resource.assignedCrewId=crew.id;resource.status=RESOURCE_STATES.ASSIGNED;resource.updatedAt=now();
    if(!Array.isArray(crew.resourceIds))crew.resourceIds=[];if(!crew.resourceIds.includes(resource.id))crew.resourceIds.push(resource.id);
    log(state,'RESOURCE_ASSIGNED',{...x,crewId:crew.id,payload:{resourceId:resource.id,resourceType:resource.resourceType,persistent:resource.persistent}});return clone(resource);
  }

  // When a mower/trimmer/blower breaks, persistent assignment is suspended,
  // not erased. Admin can repair/replace it and the crew's default can resume.
  function reportResourceDamage(state,input){
    const x=input||{},resource=find(state.resources,'id',requireValue(x.resourceId,'resourceId'));if(!resource)throw new Error('Resource not found');
    resource.status=RESOURCE_STATES.DAMAGED;resource.damage={reportedAt:now(),reportedBy:x.actorId||null,severity:x.severity||'MEDIUM',reason:requireValue(x.reason,'reason'),incidentId:x.incidentId||null};resource.updatedAt=now();
    log(state,'RESOURCE_DAMAGED',{...x,crewId:resource.assignedCrewId,payload:{resourceId:resource.id,resourceType:resource.resourceType,persistent:resource.persistent,reason:resource.damage.reason,severity:resource.damage.severity}});return clone(resource);
  }

  function repairResource(state,input){
    const x=input||{},resource=find(state.resources,'id',requireValue(x.resourceId,'resourceId'));if(!resource)throw new Error('Resource not found');
    if(![RESOURCE_STATES.DAMAGED,RESOURCE_STATES.MAINTENANCE,RESOURCE_STATES.OUT_OF_SERVICE].includes(resource.status))throw new Error('Resource is not awaiting repair');
    resource.status=resource.assignedCrewId?RESOURCE_STATES.ASSIGNED:RESOURCE_STATES.AVAILABLE;resource.repairedAt=now();resource.repairNotes=x.notes||null;resource.updatedAt=now();
    log(state,'RESOURCE_REPAIRED',{...x,crewId:resource.assignedCrewId,payload:{resourceId:resource.id,restoredPersistent:resource.persistent}});return clone(resource);
  }

  function releaseResource(state,input){
    const x=input||{},resource=find(state.resources,'id',requireValue(x.resourceId,'resourceId'));if(!resource)throw new Error('Resource not found');
    if(resource.persistent&&!['ADMIN','DISPATCH'].includes(x.role)&&x.reason!=='DAMAGE')throw new Error('Persistent resources require admin/dispatch override');
    const oldCrew=resource.assignedCrewId;resource.assignedCrewId=null;resource.status=RESOURCE_STATES.AVAILABLE;resource.updatedAt=now();
    if(oldCrew){const c=find(state.crews,'id',oldCrew);if(c&&Array.isArray(c.resourceIds))c.resourceIds=c.resourceIds.filter(id=>id!==resource.id)}
    log(state,'RESOURCE_RELEASED',{...x,crewId:oldCrew,payload:{resourceId:resource.id,resourceType:resource.resourceType,persistent:resource.persistent,reason:x.reason||'MANUAL'}});return clone(resource);
  }

  // Resolve resources required for a job. Persistent resources are preferred
  // automatically; a damaged resource is skipped and surfaced as a shortage.
  function resolveJobResources(state,input){
    const x=input||{},job=find(state.jobs,'id',requireValue(x.jobId,'jobId')),crew=find(state.crews,'id',requireValue(x.crewId,'crewId'));if(!job||!crew)throw new Error('Job or crew not found');
    const resources=Array.isArray(state.resources)?state.resources:[];const plan=Array.isArray(job.resourcePlan)?job.resourcePlan:[];const result=[];const shortages=[];
    for(const rule of plan){
      const candidates=resources.filter(r=>r.resourceType===rule.resourceType&&r.status!==RESOURCE_STATES.DAMAGED&&r.status!==RESOURCE_STATES.OUT_OF_SERVICE&&(!r.assignedCrewId||r.assignedCrewId===crew.id)&&(rule.persistent?r.persistent===true:true)&&(r.homeCrewId===crew.id||!r.homeCrewId));
      const selected=candidates.slice(0,rule.quantity).map(r=>r.id);if(selected.length<rule.quantity)shortages.push({resourceType:rule.resourceType,required:rule.quantity,available:selected.length});
      rule.assignedResourceIds=selected;selected.forEach(rid=>{const r=find(resources,'id',rid);if(r){r.assignedCrewId=crew.id;r.status=RESOURCE_STATES.ASSIGNED}});result.push({resourceType:rule.resourceType,required:rule.quantity,selected});
    }
    log(state,shortages.length?'RESOURCE_SHORTAGE':'RESOURCES_RESOLVED',{...x,jobId:job.id,crewId:crew.id,payload:{result,shortages}});
    return {jobId:job.id,crewId:crew.id,result,shortages,ready:shortages.length===0};
  }

  function crewQueue(state,crewId){
    return (state.jobs||[]).filter(j=>j.crewId===crewId&&[WORK_STATES.CLAIMED,WORK_STATES.IN_PROGRESS].includes(j.status)).map(clone);
  }

  const api={VERSION,WORK_STATES,RESOURCE_STATES,RESOURCE_TYPES,createWorkType,updateWorkType,createJobFromWorkType,claimJob,releaseJob,reopenJob,registerResource,assignResource,reportResourceDamage,repairResource,releaseResource,resolveJobResources,crewQueue};
  global.HamelOSOperations=api;
})(window);
