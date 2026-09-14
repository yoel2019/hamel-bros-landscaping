//! YALH Core: authoritative, tenant-safe business rules.
//! Browser UI and persistence adapters must call this layer rather than reimplement rules.

use std::collections::{HashMap, HashSet};

pub const PRODUCT_ID: &str = "yalh";
pub const PRODUCT_NAME: &str = "YALH";

#[derive(Debug, Clone, PartialEq, Eq, Hash)] pub struct CompanyId(pub String);
#[derive(Debug, Clone, PartialEq, Eq, Hash)] pub struct JobId(pub String);
#[derive(Debug, Clone, PartialEq, Eq, Hash)] pub struct CrewId(pub String);
#[derive(Debug, Clone, PartialEq, Eq, Hash)] pub struct ResourceId(pub String);

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClaimState { Available, Claimed, Released }

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LifecycleState { Unassigned, Assigned, Ready, EnRoute, OnSite, InProgress, Completed, PartiallyCompleted, Cancelled }

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ResourceHealth { Ok, DueSoon, Due, Overdue, InRepair, OutOfService }

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ResourceAvailability { Available, Assigned, Damaged, Maintenance, OutOfService }

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AssignmentMode { Persistent, Temporary }

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InventoryStatus { InStock, Low, OutOfStock, Reserved }

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CoreError {
    CompanyMismatch, JobNotFound, CrewNotFound, ResourceNotFound, InventoryItemNotFound,
    JobAlreadyClaimed, CrewAlreadyOwnsJob, InvalidClaimState, ReleaseReasonRequired,
    PermissionDenied, ResourceUnavailable, PersistentResourceOwnedByAnotherCrew,
    InsufficientInventory, InvalidQuantity,
}

#[derive(Debug, Clone)]
pub struct Company { pub id: CompanyId, pub name: String, pub display_name: String, pub instance_name: String }

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClaimEventKind { Claimed, Released, Reopened }

#[derive(Debug, Clone)]
pub struct ClaimEvent {
    pub kind: ClaimEventKind,
    pub crew_id: Option<CrewId>,
    pub actor_id: Option<String>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone)]
pub struct Job {
    pub id: JobId,
    pub company_id: CompanyId,
    pub claim_state: ClaimState,
    pub lifecycle_state: LifecycleState,
    pub crew_id: Option<CrewId>,
    pub claim_history: Vec<ClaimEvent>,
}

#[derive(Debug, Clone)]
pub struct Crew {
    pub id: CrewId,
    pub company_id: CompanyId,
    pub job_id: Option<JobId>,
    pub resource_ids: HashSet<ResourceId>,
}

#[derive(Debug, Clone)]
pub struct Resource {
    pub id: ResourceId,
    pub company_id: CompanyId,
    pub assignment_mode: AssignmentMode,
    pub home_crew_id: Option<CrewId>,
    pub assigned_crew_id: Option<CrewId>,
    pub availability: ResourceAvailability,
    pub health: ResourceHealth,
}

#[derive(Debug, Clone)]
pub struct InventoryItem {
    pub id: String,
    pub company_id: CompanyId,
    pub quantity_on_hand: u32,
    pub quantity_reserved: u32,
    pub reorder_point: u32,
    pub status: InventoryStatus,
}

#[derive(Debug, Default)]
pub struct YalhCore {
    pub companies: HashMap<CompanyId, Company>,
    pub jobs: HashMap<JobId, Job>,
    pub crews: HashMap<CrewId, Crew>,
    pub resources: HashMap<ResourceId, Resource>,
    pub inventory: HashMap<String, InventoryItem>,
}

impl YalhCore {
    pub fn new() -> Self { Self::default() }

    pub fn claim_job(&mut self, company: &CompanyId, job_id: &JobId, crew_id: &CrewId, actor_id: Option<String>) -> Result<(), CoreError> {
        let job = self.jobs.get(job_id).ok_or(CoreError::JobNotFound)?;
        let crew = self.crews.get(crew_id).ok_or(CoreError::CrewNotFound)?;
        ensure_company(&job.company_id, company)?; ensure_company(&crew.company_id, company)?;
        if job.claim_state != ClaimState::Available && job.crew_id.as_ref() != Some(crew_id) { return Err(CoreError::InvalidClaimState); }
        if job.crew_id.as_ref().is_some_and(|owner| owner != crew_id) { return Err(CoreError::JobAlreadyClaimed); }
        if crew.job_id.as_ref().is_some_and(|owned| owned != job_id) { return Err(CoreError::CrewAlreadyOwnsJob); }
        let job = self.jobs.get_mut(job_id).ok_or(CoreError::JobNotFound)?;
        job.claim_state = ClaimState::Claimed; job.crew_id = Some(crew_id.clone());
        if job.lifecycle_state == LifecycleState::Unassigned { job.lifecycle_state = LifecycleState::Assigned; }
        job.claim_history.push(ClaimEvent { kind: ClaimEventKind::Claimed, crew_id: Some(crew_id.clone()), actor_id, reason: None });
        self.crews.get_mut(crew_id).ok_or(CoreError::CrewNotFound)?.job_id = Some(job_id.clone());
        Ok(())
    }

    pub fn release_job(&mut self, company: &CompanyId, job_id: &JobId, crew_id: &CrewId, actor_id: Option<String>, reason: String, privileged: bool) -> Result<(), CoreError> {
        if reason.trim().is_empty() { return Err(CoreError::ReleaseReasonRequired); }
        if !privileged { return Err(CoreError::PermissionDenied); }
        let job = self.jobs.get(job_id).ok_or(CoreError::JobNotFound)?;
        ensure_company(&job.company_id, company)?;
        if job.crew_id.as_ref() != Some(crew_id) { return Err(CoreError::InvalidClaimState); }
        let job = self.jobs.get_mut(job_id).ok_or(CoreError::JobNotFound)?;
        job.crew_id = None; job.claim_state = ClaimState::Released; job.lifecycle_state = LifecycleState::Unassigned;
        job.claim_history.push(ClaimEvent { kind: ClaimEventKind::Released, crew_id: Some(crew_id.clone()), actor_id, reason: Some(reason) });
        if let Some(crew) = self.crews.get_mut(crew_id) { crew.job_id = None; }
        Ok(())
    }

    pub fn reopen_job(&mut self, company: &CompanyId, job_id: &JobId, actor_id: Option<String>) -> Result<(), CoreError> {
        let job = self.jobs.get(job_id).ok_or(CoreError::JobNotFound)?;
        ensure_company(&job.company_id, company)?;
        if job.claim_state != ClaimState::Released { return Err(CoreError::InvalidClaimState); }
        let job = self.jobs.get_mut(job_id).ok_or(CoreError::JobNotFound)?;
        job.claim_state = ClaimState::Available; job.lifecycle_state = LifecycleState::Unassigned;
        job.claim_history.push(ClaimEvent { kind: ClaimEventKind::Reopened, crew_id: None, actor_id, reason: None });
        Ok(())
    }

    pub fn assign_resource(&mut self, company: &CompanyId, resource_id: &ResourceId, crew_id: &CrewId, privileged_override: bool) -> Result<(), CoreError> {
        let resource = self.resources.get(resource_id).ok_or(CoreError::ResourceNotFound)?;
        let crew = self.crews.get(crew_id).ok_or(CoreError::CrewNotFound)?;
        ensure_company(&resource.company_id, company)?; ensure_company(&crew.company_id, company)?;
        if matches!(resource.availability, ResourceAvailability::Damaged | ResourceAvailability::Maintenance | ResourceAvailability::OutOfService) { return Err(CoreError::ResourceUnavailable); }
        if resource.assignment_mode == AssignmentMode::Persistent && resource.home_crew_id.as_ref().is_some_and(|home| home != crew_id) && !privileged_override { return Err(CoreError::PersistentResourceOwnedByAnotherCrew); }
        if resource.assigned_crew_id.as_ref().is_some_and(|owner| owner != crew_id) { return Err(CoreError::ResourceUnavailable); }
        let resource = self.resources.get_mut(resource_id).ok_or(CoreError::ResourceNotFound)?;
        resource.assigned_crew_id = Some(crew_id.clone()); resource.availability = ResourceAvailability::Assigned;
        self.crews.get_mut(crew_id).ok_or(CoreError::CrewNotFound)?.resource_ids.insert(resource_id.clone());
        Ok(())
    }

    pub fn damage_resource(&mut self, company: &CompanyId, resource_id: &ResourceId) -> Result<(), CoreError> {
        let resource = self.resources.get_mut(resource_id).ok_or(CoreError::ResourceNotFound)?;
        ensure_company(&resource.company_id, company)?; resource.availability = ResourceAvailability::Damaged; resource.health = ResourceHealth::InRepair; Ok(())
    }

    pub fn repair_resource(&mut self, company: &CompanyId, resource_id: &ResourceId) -> Result<(), CoreError> {
        let resource = self.resources.get_mut(resource_id).ok_or(CoreError::ResourceNotFound)?;
        ensure_company(&resource.company_id, company)?; resource.health = ResourceHealth::Ok;
        resource.availability = if resource.assigned_crew_id.is_some() { ResourceAvailability::Assigned } else { ResourceAvailability::Available }; Ok(())
    }

    pub fn receive_inventory(&mut self, company: &CompanyId, item_id: &str, quantity: u32) -> Result<(), CoreError> {
        if quantity == 0 { return Err(CoreError::InvalidQuantity); }
        let item = self.inventory.get_mut(item_id).ok_or(CoreError::InventoryItemNotFound)?;
        ensure_company(&item.company_id, company)?; item.quantity_on_hand = item.quantity_on_hand.saturating_add(quantity); item.status = inventory_status(item); Ok(())
    }

    pub fn consume_inventory(&mut self, company: &CompanyId, item_id: &str, quantity: u32) -> Result<(), CoreError> {
        if quantity == 0 { return Err(CoreError::InvalidQuantity); }
        let item = self.inventory.get_mut(item_id).ok_or(CoreError::InventoryItemNotFound)?;
        ensure_company(&item.company_id, company)?;
        if item.quantity_on_hand.saturating_sub(item.quantity_reserved) < quantity { return Err(CoreError::InsufficientInventory); }
        item.quantity_on_hand -= quantity; item.status = inventory_status(item); Ok(())
    }
}

fn ensure_company(actual: &CompanyId, requested: &CompanyId) -> Result<(), CoreError> { if actual == requested { Ok(()) } else { Err(CoreError::CompanyMismatch) } }
fn inventory_status(item: &InventoryItem) -> InventoryStatus {
    if item.quantity_on_hand == 0 { InventoryStatus::OutOfStock }
    else if item.quantity_reserved >= item.quantity_on_hand { InventoryStatus::Reserved }
    else if item.quantity_on_hand <= item.reorder_point { InventoryStatus::Low }
    else { InventoryStatus::InStock }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn c() -> CompanyId { CompanyId("hamel".into()) }
    fn crew(id: &str) -> CrewId { CrewId(id.into()) }
    fn job(id: &str) -> JobId { JobId(id.into()) }
    fn base() -> YalhCore {
        let company = c(); let mut core = YalhCore::new();
        core.companies.insert(company.clone(), Company { id: company.clone(), name: "Hamel Bros. Landscaping".into(), display_name: "Hamel Bros. Landscaping".into(), instance_name: "Hamel OS".into() });
        let alpha = crew("alpha"); core.crews.insert(alpha.clone(), Crew { id: alpha, company_id: company.clone(), job_id: None, resource_ids: HashSet::new() });
        let j = job("mow-1"); core.jobs.insert(j.clone(), Job { id:j, company_id:company, claim_state:ClaimState::Available, lifecycle_state:LifecycleState::Unassigned, crew_id:None, claim_history:vec![] }); core
    }
    #[test] fn claim_is_exclusive() {
        let mut core=base(); let company=c(); let alpha=crew("alpha"); let bravo=crew("bravo");
        core.crews.insert(bravo.clone(), Crew{id:bravo.clone(),company_id:company.clone(),job_id:None,resource_ids:HashSet::new()});
        core.claim_job(&company,&job("mow-1"),&alpha,None).unwrap(); assert_eq!(core.claim_job(&company,&job("mow-1"),&bravo,None),Err(CoreError::JobAlreadyClaimed));
    }
    #[test] fn release_keeps_history() {
        let mut core=base(); let company=c(); let alpha=crew("alpha"); let j=job("mow-1");
        core.claim_job(&company,&j,&alpha,None).unwrap(); assert_eq!(core.release_job(&company,&j,&alpha,None,"".into(),true),Err(CoreError::ReleaseReasonRequired));
        core.release_job(&company,&j,&alpha,None,"equipment damage".into(),true).unwrap(); assert_eq!(core.jobs[&j].claim_history.len(),2);
    }
    #[test] fn persistent_resource_is_protected() {
        let mut core=base(); let company=c(); let alpha=crew("alpha"); let bravo=crew("bravo");
        core.crews.insert(bravo.clone(),Crew{id:bravo.clone(),company_id:company.clone(),job_id:None,resource_ids:HashSet::new()});
        let r=ResourceId("mower-7".into()); core.resources.insert(r.clone(),Resource{id:r.clone(),company_id:company,assignment_mode:AssignmentMode::Persistent,home_crew_id:Some(alpha),assigned_crew_id:None,availability:ResourceAvailability::Available,health:ResourceHealth::Ok});
        assert_eq!(core.assign_resource(&c(),&r,&bravo,false),Err(CoreError::PersistentResourceOwnedByAnotherCrew));
    }
    #[test] fn repair_restores_assignment() {
        let mut core=base(); let company=c(); let alpha=crew("alpha"); let r=ResourceId("mower-7".into());
        core.resources.insert(r.clone(),Resource{id:r.clone(),company_id:company.clone(),assignment_mode:AssignmentMode::Persistent,home_crew_id:Some(alpha.clone()),assigned_crew_id:Some(alpha),availability:ResourceAvailability::Assigned,health:ResourceHealth::Ok});
        core.damage_resource(&company,&r).unwrap(); core.repair_resource(&company,&r).unwrap(); let x=&core.resources[&r]; assert_eq!(x.health,ResourceHealth::Ok); assert_eq!(x.availability,ResourceAvailability::Assigned);
    }
    #[test] fn inventory_never_goes_negative() {
        let mut core=base(); let company=c(); core.inventory.insert("fuel".into(),InventoryItem{id:"fuel".into(),company_id:company.clone(),quantity_on_hand:10,quantity_reserved:0,reorder_point:2,status:InventoryStatus::InStock});
        assert_eq!(core.consume_inventory(&company,"fuel",11),Err(CoreError::InsufficientInventory)); core.consume_inventory(&company,"fuel",8).unwrap(); assert_eq!(core.inventory["fuel"].quantity_on_hand,2); assert_eq!(core.inventory["fuel"].status,InventoryStatus::Low);
    }
}
