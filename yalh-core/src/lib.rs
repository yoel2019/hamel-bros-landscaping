//! YALH Core — authoritative, UI-agnostic business rules.
//!
//! This first Rust slice deliberately uses only the standard library. It establishes
//! canonical multi-tenant identities, job ownership/lifecycle, resource health and
//! inventory invariants before an HTTP/database layer is introduced.

use std::collections::{HashMap, HashSet};

pub const PRODUCT_ID: &str = "yalh";
pub const PRODUCT_NAME: &str = "YALH";

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CompanyId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct JobId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CrewId(pub String);

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ResourceId(pub String);

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClaimState {
    Available,
    Claimed,
    Released,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LifecycleState {
    Unassigned,
    Assigned,
    Ready,
    EnRoute,
    OnSite,
    InProgress,
    Completed,
    PartiallyCompleted,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ResourceHealth {
    Ok,
    DueSoon,
    Due,
    Overdue,
    InRepair,
    OutOfService,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ResourceAvailability {
    Available,
    Assigned,
    Damaged,
    Maintenance,
    OutOfService,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AssignmentMode {
    Persistent,
    Temporary,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InventoryStatus {
    InStock,
    Low,
    OutOfStock,
    Reserved,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CoreError {
    CompanyMismatch,
    JobNotFound,
    CrewNotFound,
    ResourceNotFound,
    InventoryItemNotFound,
    JobAlreadyClaimed,
    CrewAlreadyOwnsJob,
    InvalidClaimState,
    ReleaseReasonRequired,
    PermissionDenied,
    ResourceUnavailable,
    PersistentResourceOwnedByAnotherCrew,
    InsufficientInventory,
    InvalidQuantity,
}

#[derive(Debug, Clone)]
pub struct Company {
    pub id: CompanyId,
    pub name: String,
    pub display_name: String,
    pub instance_name: String,
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ClaimEventKind {
    Claimed,
    Released,
    Reopened,
}

#[derive(Debug, Clone)]
pub struct ClaimEvent {
    pub kind: ClaimEventKind,
    pub crew_id: Option<CrewId>,
    pub actor_id: Option<String>,
    pub reason: Option<String>,
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

    pub fn claim_job(
        &mut self,
        company_id: &CompanyId,
        job_id: &JobId,
        crew_id: &CrewId,
        actor_id: Option<String>,
    ) -> Result<(), CoreError> {
        let job = self.jobs.get(job_id).ok_or(CoreError::JobNotFound)?;
        if &job.company_id != company_id { return Err(CoreError::CompanyMismatch); }
        let crew = self.crews.get(crew_id).ok_or(CoreError::CrewNotFound)?;
        if &crew.company_id != company_id { return Err(CoreError::CompanyMismatch); }
        if job.crew_id.is_some() && job.crew_id.as_ref() != Some(crew_id) {
            return Err(CoreError::JobAlreadyClaimed);
        }
        if crew.job_id.is_some() && crew.job_id.as_ref() != Some(job_id) {
            return Err(CoreError::CrewAlreadyOwnsJob);
        }

        let job = self.jobs.get_mut(job_id).ok_or(CoreError::JobNotFound)?;
        if job.claim_state == ClaimState::Completed { return Err(CoreError::InvalidClaimState); }
        job.crew_id = Some(crew_id.clone());
        job.claim_state = ClaimState::Claimed;
        if matches!(job.lifecycle_state, LifecycleState::Unassigned) {
            job.lifecycle_state = LifecycleState::Assigned;
        }
        job.claim_history.push(ClaimEvent {
            kind: ClaimEventKind::Claimed,
            crew_id: Some(crew_id.clone()),
            actor_id,
            reason: None,
        });

        let crew = self.crews.get_mut(crew_id).ok_or(CoreError::CrewNotFound)?;
        crew.job_id = Some(job_id.clone());
        Ok(())
    }

    pub fn release_job(
        &mut self,
        company_id: &CompanyId,
        job_id: &JobId,
        crew_id: &CrewId,
        actor_id: Option<String>,
        reason: String,
        privileged: bool,
    ) -> Result<(), CoreError> {
        if reason.trim().is_empty() { return Err(CoreError::ReleaseReasonRequired); }
        if !privileged { return Err(CoreError::PermissionDenied); }
        let job = self.jobs.get(job_id).ok_or(CoreError::JobNotFound)?;
        if &job.company_id != company_id { return Err(CoreError::CompanyMismatch); }
        if job.crew_id.as_ref() != Some(crew_id) { return Err(CoreError::InvalidClaimState); }
        let job = self.jobs.get_mut(job_id).ok_or(CoreError::JobNotFound)?;
        job.crew_id = None;
        job.claim_state = ClaimState::Released;
        job.lifecycle_state = LifecycleState::Unassigned;
        job.claim_history.push(ClaimEvent {
            kind: ClaimEventKind::Released,
            crew_id: Some(crew_id.clone()),
            actor_id,
            reason: Some(reason),
        });
        if let Some(crew) = self.crews.get_mut(crew_id) { crew.job_id = None; }
        Ok(())
    }

    pub fn reopen_job(&mut self, company_id: &CompanyId, job_id: &JobId, actor_id: Option<String>) -> Result<(), CoreError> {
        let job = self.jobs.get(job_id).ok_or(CoreError::JobNotFound)?;
        if &job.company_id != company_id { return Err(CoreError::CompanyMismatch); }
        if job.claim_state != ClaimState::Released { return Err(CoreError::InvalidClaimState); }
        let job = self.jobs.get_mut(job_id).ok_or(CoreError::JobNotFound)?;
        job.claim_state = ClaimState::Available;
        job.lifecycle_state = LifecycleState::Unassigned;
        job.claim_history.push(ClaimEvent { kind: ClaimEventKind::Reopened, crew_id: None, actor_id, reason: None });
        Ok(())
    }

    pub fn assign_resource(
        &mut self,
        company_id: &CompanyId,
        resource_id: &ResourceId,
        crew_id: &CrewId,
        privileged_override: bool,
    ) -> Result<(), CoreError> {
        let resource = self.resources.get(resource_id).ok_or(CoreError::ResourceNotFound)?;
        let crew = self.crews.get(crew_id).ok_or(CoreError::CrewNotFound)?;
        if &resource.company_id != company_id || &crew.company_id != company_id { return Err(CoreError::CompanyMismatch); }
        if matches!(resource.availability, ResourceAvailability::Damaged | ResourceAvailability::OutOfService | ResourceAvailability::Maintenance) {
            return Err(CoreError::ResourceUnavailable);
        }
        if resource.assignment_mode == AssignmentMode::Persistent
            && resource.home_crew_id.as_ref().is_some_and(|home| home != crew_id)
            && !privileged_override
        {
            return Err(CoreError::PersistentResourceOwnedByAnotherCrew);
        }
        if resource.assigned_crew_id.as_ref().is_some_and(|owner| owner != crew_id) {
            return Err(CoreError::ResourceUnavailable);
        }
        let resource = self.resources.get_mut(resource_id).ok_or(CoreError::ResourceNotFound)?;
        resource.assigned_crew_id = Some(crew_id.clone());
        resource.availability = ResourceAvailability::Assigned;
        let crew = self.crews.get_mut(crew_id).ok_or(CoreError::CrewNotFound)?;
        crew.resource_ids.insert(resource_id.clone());
        Ok(())
    }

    pub fn damage_resource(&mut self, company_id: &CompanyId, resource_id: &ResourceId) -> Result<(), CoreError> {
        let resource = self.resources.get_mut(resource_id).ok_or(CoreError::ResourceNotFound)?;
        if &resource.company_id != company_id { return Err(CoreError::CompanyMismatch); }
        resource.availability = ResourceAvailability::Damaged;
        resource.health = ResourceHealth::InRepair;
        Ok(())
    }

    pub fn repair_resource(&mut self, company_id: &CompanyId, resource_id: &ResourceId) -> Result<(), CoreError> {
        let resource = self.resources.get_mut(resource_id).ok_or(CoreError::ResourceNotFound)?;
        if &resource.company_id != company_id { return Err(CoreError::CompanyMismatch); }
        resource.health = ResourceHealth::Ok;
        resource.availability = if resource.assigned_crew_id.is_some() { ResourceAvailability::Assigned } else { ResourceAvailability::Available };
        Ok(())
    }

    pub fn receive_inventory(&mut self, company_id: &CompanyId, item_id: &str, quantity: u32) -> Result<(), CoreError> {
        if quantity == 0 { return Err(CoreError::InvalidQuantity); }
        let item = self.inventory.get_mut(item_id).ok_or(CoreError::InventoryItemNotFound)?;
        if &item.company_id != company_id { return Err(CoreError::CompanyMismatch); }
        item.quantity_on_hand = item.quantity_on_hand.saturating_add(quantity);
        item.status = inventory_status(item.quantity_on_hand, item.quantity_reserved, item.reorder_point);
        Ok(())
    }

    pub fn consume_inventory(&mut self, company_id: &CompanyId, item_id: &str, quantity: u32) -> Result<(), CoreError> {
        if quantity == 0 { return Err(CoreError::InvalidQuantity); }
        let item = self.inventory.get_mut(item_id).ok_or(CoreError::InventoryItemNotFound)?;
        if &item.company_id != company_id { return Err(CoreError::CompanyMismatch); }
        let available = item.quantity_on_hand.saturating_sub(item.quantity_reserved);
        if available < quantity { return Err(CoreError::InsufficientInventory); }
        item.quantity_on_hand -= quantity;
        item.status = inventory_status(item.quantity_on_hand, item.quantity_reserved, item.reorder_point);
        Ok(())
    }
}

fn inventory_status(on_hand: u32, reserved: u32, reorder: u32) -> InventoryStatus {
    if on_hand == 0 { InventoryStatus::OutOfStock }
    else if reserved >= on_hand { InventoryStatus::Reserved }
    else if on_hand <= reorder { InventoryStatus::Low }
    else { InventoryStatus::InStock }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn company() -> CompanyId { CompanyId("hamel-test".into()) }
    fn crew(id: &str) -> CrewId { CrewId(id.into()) }
    fn job(id: &str) -> JobId { JobId(id.into()) }

    fn core_with_job() -> YalhCore {
        let c = company();
        let mut core = YalhCore::new();
        core.companies.insert(c.clone(), Company { id: c.clone(), name: "Hamel Bros. Landscaping".into(), display_name: "Hamel Bros. Landscaping".into(), instance_name: "Hamel OS".into() });
        let a = crew("alpha");
        core.crews.insert(a.clone(), Crew { id: a, company_id: c.clone(), job_id: None, resource_ids: HashSet::new() });
        let j = job("mow-1");
        core.jobs.insert(j, Job { id: job("mow-1"), company_id: c, claim_state: ClaimState::Available, lifecycle_state: LifecycleState::Unassigned, crew_id: None, claim_history: vec![] });
        core
    }

    #[test]
    fn only_one_crew_can_claim_a_job() {
        let mut core = core_with_job();
        let c = company();
        let bravo = crew("bravo");
        core.crews.insert(bravo.clone(), Crew { id: bravo.clone(), company_id: c.clone(), job_id: None, resource_ids: HashSet::new() });
        core.claim_job(&c, &job("mow-1"), &crew("alpha"), None).unwrap();
        assert_eq!(core.claim_job(&c, &job("mow-1"), &bravo, None), Err(CoreError::JobAlreadyClaimed));
    }

    #[test]
    fn release_requires_reason_and_preserves_history() {
        let mut core = core_with_job();
        let c = company(); let a = crew("alpha"); let j = job("mow-1");
        core.claim_job(&c, &j, &a, Some("leader-1".into())).unwrap();
        assert_eq!(core.release_job(&c, &j, &a, Some("leader-1".into()), "".into(), true), Err(CoreError::ReleaseReasonRequired));
        core.release_job(&c, &j, &a, Some("leader-1".into()), "equipment issue".into(), true).unwrap();
        assert_eq!(core.jobs[&j].claim_history.len(), 2);
        assert_eq!(core.jobs[&j].claim_state, ClaimState::Released);
    }

    #[test]
    fn persistent_resource_cannot_be_taken_from_home_crew_without_override() {
        let mut core = core_with_job(); let c = company();
        let a = crew("alpha"); let b = crew("bravo");
        core.crews.insert(b.clone(), Crew { id: b.clone(), company_id: c.clone(), job_id: None, resource_ids: HashSet::new() });
        let r = ResourceId("mower-7".into());
        core.resources.insert(r.clone(), Resource { id:r.clone(), company_id:c.clone(), assignment_mode:AssignmentMode::Persistent, home_crew_id:Some(a.clone()), assigned_crew_id:None, availability:ResourceAvailability::Available, health:ResourceHealth::Ok });
        assert_eq!(core.assign_resource(&c, &r, &b, false), Err(CoreError::PersistentResourceOwnedByAnotherCrew));
    }

    #[test]
    fn damaged_resource_can_be_repaired_without_losing_assignment() {
        let mut core = core_with_job(); let c = company(); let a = crew("alpha");
        let r = ResourceId("mower-7".into());
        core.resources.insert(r.clone(), Resource { id:r.clone(), company_id:c.clone(), assignment_mode:AssignmentMode::Persistent, home_crew_id:Some(a.clone()), assigned_crew_id:Some(a.clone()), availability:ResourceAvailability::Assigned, health:ResourceHealth::Ok });
        core.damage_resource(&c, &r).unwrap();
        core.repair_resource(&c, &r).unwrap();
        let resource = &core.resources[&r];
        assert_eq!(resource.assigned_crew_id, Some(a));
        assert_eq!(resource.health, ResourceHealth::Ok);
        assert_eq!(resource.availability, ResourceAvailability::Assigned);
    }

    #[test]
    fn inventory_cannot_go_negative() {
        let mut core = core_with_job(); let c = company();
        core.inventory.insert("fuel".into(), InventoryItem { id:"fuel".into(), company_id:c.clone(), quantity_on_hand:10, quantity_reserved:0, reorder_point:2, status:InventoryStatus::InStock });
        assert_eq!(core.consume_inventory(&c, "fuel", 11), Err(CoreError::InsufficientInventory));
        core.consume_inventory(&c, "fuel", 8).unwrap();
        assert_eq!(core.inventory["fuel"].quantity_on_hand, 2);
        assert_eq!(core.inventory["fuel"].status, InventoryStatus::Low);
    }
}
