/* YALH — Multi-tenant Field Operations Core
 * Product identity is YALH. Hamel OS is only the Hamel Bros. tenant instance.
 * This browser-safe foundation keeps tenant/configuration rules independent from UI.
 * Server-side/Rust implementation can consume the same contract later.
 */
(function(global){
  'use strict';

  const VERSION=1;
  const PRODUCT={id:'yalh',name:'YALH',tagline:'Field Operations OS'};
  const TENANT_STATES=Object.freeze({ACTIVE:'ACTIVE',SUSPENDED:'SUSPENDED',ARCHIVED:'ARCHIVED'});
  const INVENTORY_STATES=Object.freeze({IN_STOCK:'IN_STOCK',LOW:'LOW',OUT_OF_STOCK:'OUT_OF_STOCK',RESERVED:'RESERVED'});
  const MAINTENANCE_STATES=Object.freeze({OK:'OK',DUE_SOON:'DUE_SOON',DUE:'DUE',OVERDUE:'OVERDUE',IN_REPAIR:'IN_REPAIR',OUT_OF_SERVICE:'OUT_OF_SERVICE'});

  const clone=v=>JSON.parse(JSON.stringify(v));
  const id=p=>p+'-'+Math.random().toString(36).slice(2,10).toUpperCase();
  const now=()=>new Date().toISOString();

  function makeTenant(input){
    const x=input||{};
    if(!x.name) throw new Error('Company name is required');
    const slug=(x.slug||x.name).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const instanceName=x.instanceName||((x.name.replace(/\s+Landscaping\s*$/i,'').trim()||x.name)+' OS');
    return {id:x.id||id('TEN'),name:x.name,displayName:x.displayName||x.name,slug,productBrand:PRODUCT.name,productName:PRODUCT.name,instanceName,logoUrl:x.logoUrl||null,primaryColor:x.primaryColor||null,timezone:x.timezone||'America/New_York',state:x.state||TENANT_STATES.ACTIVE,settings:clone(x.settings||{}),createdAt:x.createdAt||now(),updatedAt:now()};
  }

  function branding(tenant){
    if(!tenant) return {product:PRODUCT.name,productTagline:PRODUCT.tagline,instanceName:PRODUCT.name,companyName:null};
    return {product:PRODUCT.name,productTagline:PRODUCT.tagline,instanceName:tenant.instanceName||tenant.displayName+' OS',companyName:tenant.displayName||tenant.name,logoUrl:tenant.logoUrl||null,primaryColor:tenant.primaryColor||null};
  }

  function ensureTenantState(state,tenant){
    const s=state||{}; if(!s.tenant) s.tenant=makeTenant(tenant||{name:'Hamel Bros. Landscaping'});
    if(s.tenant.productBrand!==PRODUCT.name)s.tenant.productBrand=PRODUCT.name;
    if(!s.tenant.instanceName)s.tenant.instanceName=s.tenant.displayName+' OS';
    if(!Array.isArray(s.workTypes))s.workTypes=[];
    if(!Array.isArray(s.resources))s.resources=[];
    if(!Array.isArray(s.inventoryItems))s.inventoryItems=[];
    if(!Array.isArray(s.purchases))s.purchases=[];
    if(!Array.isArray(s.maintenance))s.maintenance=[];
    if(!Array.isArray(s.events))s.events=[];
    return s;
  }

  function addEvent(state,type,payload){
    ensureTenantState(state);
    state.events.unshift({id:id('EVT'),version:VERSION,companyId:state.tenant.id,type,occurredAt:now(),payload:clone(payload||{})});
    state.events=state.events.slice(0,1000);
  }

  function addInventoryItem(state,input){
    ensureTenantState(state); const x=input||{}; if(!x.name)throw new Error('Inventory item name is required');
    const q=Math.max(0,Number(x.quantityOnHand)||0),r=Math.max(0,Number(x.reorderPoint)||0);
    const item={id:x.id||id('INV'),companyId:state.tenant.id,sku:x.sku||null,name:x.name,category:x.category||'SUPPLY',unit:x.unit||'EA',quantityOnHand:q,quantityReserved:Math.max(0,Number(x.quantityReserved)||0),reorderPoint:r,status:q<=0?INVENTORY_STATES.OUT_OF_STOCK:q<=r?INVENTORY_STATES.LOW:INVENTORY_STATES.IN_STOCK,storageLocation:x.storageLocation||null,active:x.active!==false,metadata:clone(x.metadata||{}),createdAt:now(),updatedAt:now()};
    state.inventoryItems.push(item); addEvent(state,'INVENTORY_ITEM_CREATED',{inventoryItemId:item.id,name:item.name,quantity:q}); return clone(item);
  }

  function receiveInventory(state,input){
    ensureTenantState(state);const x=input||{},item=state.inventoryItems.find(i=>i.id===x.inventoryItemId);if(!item)throw new Error('Inventory item not found');
    const quantity=Number(x.quantity);if(!Number.isFinite(quantity)||quantity<=0)throw new Error('Quantity must be greater than zero');
    item.quantityOnHand+=quantity;item.status=item.quantityOnHand<=0?INVENTORY_STATES.OUT_OF_STOCK:item.quantityOnHand<=item.reorderPoint?INVENTORY_STATES.LOW:INVENTORY_STATES.IN_STOCK;item.updatedAt=now();
    addEvent(state,'INVENTORY_RECEIVED',{inventoryItemId:item.id,quantity,source:x.source||'PURCHASE'});return clone(item);
  }

  function consumeInventory(state,input){
    ensureTenantState(state);const x=input||{},item=state.inventoryItems.find(i=>i.id===x.inventoryItemId);if(!item)throw new Error('Inventory item not found');
    const quantity=Number(x.quantity);if(!Number.isFinite(quantity)||quantity<=0)throw new Error('Quantity must be greater than zero');
    if(item.quantityOnHand-item.quantityReserved<quantity)throw new Error('Insufficient inventory');
    item.quantityOnHand-=quantity;item.status=item.quantityOnHand<=0?INVENTORY_STATES.OUT_OF_STOCK:item.quantityOnHand<=item.reorderPoint?INVENTORY_STATES.LOW:INVENTORY_STATES.IN_STOCK;item.updatedAt=now();
    addEvent(state,'INVENTORY_CONSUMED',{inventoryItemId:item.id,quantity,jobId:x.jobId||null,resourceId:x.resourceId||null});return clone(item);
  }

  function reserveInventory(state,input){
    ensureTenantState(state);const x=input||{},item=state.inventoryItems.find(i=>i.id===x.inventoryItemId);if(!item)throw new Error('Inventory item not found');
    const quantity=Number(x.quantity);if(!Number.isFinite(quantity)||quantity<=0)throw new Error('Quantity must be greater than zero');
    if(item.quantityOnHand-item.quantityReserved<quantity)throw new Error('Insufficient available inventory');
    item.quantityReserved+=quantity;item.status=INVENTORY_STATES.RESERVED;item.updatedAt=now();addEvent(state,'INVENTORY_RESERVED',{inventoryItemId:item.id,quantity,jobId:x.jobId||null});return clone(item);
  }

  function registerPurchase(state,input){
    ensureTenantState(state);const x=input||{};const lines=Array.isArray(x.lines)?x.lines.map(l=>({inventoryItemId:l.inventoryItemId||null,name:l.name||null,quantity:Number(l.quantity)||0,unitCost:Number(l.unitCost)||0})):[];
    const purchase={id:x.id||id('PO'),companyId:state.tenant.id,vendorName:x.vendorName||null,purchaseOrder:x.purchaseOrder||null,invoiceNumber:x.invoiceNumber||null,purchasedAt:x.purchasedAt||now(),status:x.status||'RECEIVED',totalCost:lines.reduce((a,l)=>a+l.quantity*l.unitCost,0),notes:x.notes||null,lines,createdBy:x.createdBy||null,createdAt:now()};
    state.purchases.unshift(purchase);if(purchase.status==='RECEIVED')lines.forEach(l=>{if(l.inventoryItemId)receiveInventory(state,{inventoryItemId:l.inventoryItemId,quantity:l.quantity,source:'PURCHASE'});});
    addEvent(state,'PURCHASE_RECORDED',{purchaseId:purchase.id,vendorName:purchase.vendorName,totalCost:purchase.totalCost,lineCount:lines.length});return clone(purchase);
  }

  function scheduleMaintenance(state,input){
    ensureTenantState(state);const x=input||{};if(!x.resourceId)throw new Error('Resource is required');
    const record={id:x.id||id('MNT'),companyId:state.tenant.id,resourceId:x.resourceId,maintenanceType:x.maintenanceType||'PREVENTIVE',status:'SCHEDULED',scheduledFor:x.scheduledFor||null,startedAt:null,completedAt:null,meterValue:Number.isFinite(Number(x.meterValue))?Number(x.meterValue):null,intervalValue:Number.isFinite(Number(x.intervalValue))?Number(x.intervalValue):null,technician:x.technician||null,diagnosis:null,workPerformed:null,partsUsed:[],cost:0,notes:x.notes||null,createdAt:now(),updatedAt:now()};
    state.maintenance.unshift(record);addEvent(state,'MAINTENANCE_SCHEDULED',{maintenanceId:record.id,resourceId:record.resourceId,maintenanceType:record.maintenanceType});return clone(record);
  }

  function startRepair(state,input){
    ensureTenantState(state);const x=input||{},resource=state.resources.find(r=>r.id===x.resourceId);if(!resource)throw new Error('Resource not found');
    resource.status='IN_REPAIR';resource.maintenanceState=MAINTENANCE_STATES.IN_REPAIR;resource.updatedAt=now();
    const record=scheduleMaintenance(state,{...x,maintenanceType:'CORRECTIVE'});record.status='IN_PROGRESS';record.startedAt=now();record.diagnosis=x.diagnosis||null;const stored=state.maintenance.find(m=>m.id===record.id);Object.assign(stored,record);
    addEvent(state,'REPAIR_STARTED',{resourceId:resource.id,maintenanceId:record.id,diagnosis:record.diagnosis});return clone(stored);
  }

  function completeRepair(state,input){
    ensureTenantState(state);const x=input||{},resource=state.resources.find(r=>r.id===x.resourceId),record=state.maintenance.find(m=>m.id===x.maintenanceId);if(!resource||!record)throw new Error('Resource or maintenance record not found');
    const parts=Array.isArray(x.partsUsed)?x.partsUsed:[];parts.forEach(p=>consumeInventory(state,{inventoryItemId:p.inventoryItemId,quantity:p.quantity,resourceId:resource.id}));
    record.status='COMPLETED';record.completedAt=now();record.workPerformed=x.workPerformed||null;record.partsUsed=clone(parts);record.cost=Number(x.cost)||0;record.notes=x.notes||record.notes;record.updatedAt=now();resource.status=resource.assignedCrewId?'ASSIGNED':'AVAILABLE';resource.maintenanceState=MAINTENANCE_STATES.OK;resource.lastMaintenanceAt=record.completedAt;resource.updatedAt=now();
    addEvent(state,'REPAIR_COMPLETED',{resourceId:resource.id,maintenanceId:record.id,partsUsed:parts,cost:record.cost});return clone(record);
  }

  function maintenanceStatus(record,asOf){
    if(!record)return MAINTENANCE_STATES.OK;if(record.status==='IN_PROGRESS')return MAINTENANCE_STATES.IN_REPAIR;if(record.status==='COMPLETED')return MAINTENANCE_STATES.OK;
    if(!record.scheduledFor)return MAINTENANCE_STATES.OK;const delta=new Date(record.scheduledFor)-new Date(asOf||now()),day=86400000;
    if(delta<0)return MAINTENANCE_STATES.OVERDUE;if(delta<=7*day)return MAINTENANCE_STATES.DUE_SOON;return MAINTENANCE_STATES.OK;
  }

  const api={VERSION,PRODUCT,TENANT_STATES,INVENTORY_STATES,MAINTENANCE_STATES,makeTenant,branding,ensureTenantState,addEvent,addInventoryItem,receiveInventory,consumeInventory,reserveInventory,registerPurchase,scheduleMaintenance,startRepair,completeRepair,maintenanceStatus};
  global.YALHCore=api;
})(window);
