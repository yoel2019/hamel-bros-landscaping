# YALH — Architecture & Product Constitution

**Status:** Foundational specification  
**Purpose:** Preserve the product logic and architectural decisions so implementation can continue without losing the agreed design.

## 1. Product identity

**YALH** is the product/platform brand. It is not Hamel Bros. Landscaping.

Hamel Bros. Landscaping is the first sandbox/tenant used to learn, test and validate the platform.

Each customer gets a company-specific experience that feels owned by that company. Example:

- Platform: **YALH**
- Tenant: **Hamel Bros. Landscaping**
- Tenant-facing instance: **Hamel OS**

Another company could receive its own branded instance (for example, `Company OS`) while using the same YALH platform and core.

The tenant must never be hard-coded into the business engine. The engine works with generic entities such as Company, Crew, Employee, Job, Resource and InventoryItem.

## 2. Core architectural principle

YALH is intended to become a multi-company operating system for landscaping and field-service businesses.

The long-term architecture is:

```text
                         YALH PLATFORM
                              |
                         YALH CORE
                            RUST
                              |
       +----------------------+----------------------+
       |                      |                      |
   Operations             Resources             Business
       |                      |                      |
     Jobs                 Equipment              Clients
     Dispatch             Vehicles               Properties
     Crews                 Tools                  Reports
     Routes               Maintenance             Analytics
     Time                 Repairs
     GPS                  Inventory
     Evidence             Purchases
       |                      |                      |
       +----------------------+----------------------+
                              |
                         Event / Audit
                              |
                         PostgreSQL
                           Supabase
                              |
               +--------------+--------------+
               |              |              |
             Admin          Crew          Client
               UI             UI             UI
```

### Separation of responsibilities

- **Rust / YALH Core:** business rules, authorization decisions, state transitions, validation, resource allocation, inventory/m maintenance rules, event generation and other domain processing.
- **Supabase/PostgreSQL:** persistent memory/state. It is the source of durable records, not the business-rule engine.
- **Web/mobile UI:** presentation and user interaction. UI asks the Core for information or requests actions; it must not duplicate authoritative business rules.
- **Events/Audit:** every important operational mutation creates an auditable event.

Rust is not being added merely to make screens faster. It is the authoritative, dependency-light business core. Rust should be introduced without creating a second competing JavaScript business engine.

Rust should remain UI-agnostic and server-ready. If a future high-volume telemetry component benefits from additional specialized technology, it can be introduced later; do not use Rust unnecessarily for every peripheral function.

## 3. Multi-tenancy

Every business entity that belongs to a company must carry a tenant/company boundary, conceptually:

```text
company_id
```

Core entities:

```text
companies
employees
crews
clients
properties
jobs
work_types
resources
inventory_items
purchases
maintenance_records
repairs
incidents
events
```

Tenant isolation is mandatory. One company's data and operations must never be exposed to another company.

Company configuration includes, at minimum:

- company name
- display name
- logo
- branding/theme
- timezone
- units
- operating rules
- company settings
- license/plan metadata

## 4. Job / work ownership model

A job has separate concepts instead of one overloaded status field.

### Dispatch state

```text
NEEDS_DISPATCH
ASSIGNED
```

### Claim state

```text
AVAILABLE
CLAIMED
RELEASED
```

### Lifecycle state

```text
UNASSIGNED
ASSIGNED
READY
EN_ROUTE
ON_SITE
IN_PROGRESS
COMPLETED
PARTIALLY_COMPLETED
CANCELLED
```

Do not mix `CLAIMED` with `IN_PROGRESS`, because a crew owning a house and a crew actively working a house are different facts.

### Crew self-claim rule

When a crew sees an eligible house in its assigned/available work list, it can take the house into its personal list.

On successful claim:

1. the job is atomically owned by that crew;
2. other crews cannot claim it;
3. the owning crew sees it in its personal queue;
4. a `JOB_CLAIMED` event is written;
5. the claim is persisted.

If another crew attempts to claim an already-owned job, the Core rejects the action with a deterministic business error.

### Release rule

The current leader can release a claimed job. Admin/Dispatch may also release it according to permissions.

A release requires a reason.

On release:

1. previous ownership is recorded;
2. the job becomes available for reassignment;
3. a `JOB_RELEASED` event records the previous crew and reason;
4. the job can subsequently be reopened/claimed by another eligible crew;
5. the reassignment history remains permanently auditable.

Never delete the prior claim history when ownership changes.

## 5. Work Types

Work Types are created/configured by the company administrator. They are reusable definitions of actions/services.

A Work Type may define:

- name
- description
- category
- ordered tasks
- required/optional tasks
- resource requirements
- resource quantities
- persistent vs temporary resource requirements
- required vs optional resources
- substitution rules
- consumable requirements
- evidence requirements
- inspection/checklist rules
- recurrence/scheduling rules

Example:

```text
LAWN MOWING

Tasks:
- mow lawn
- trim edges
- blow/clean site
- final inspection

Persistent resources:
- mower x1
- trimmer x1
- blower x1
- truck x1

Consumables:
- fuel
- trimmer line
```

A job created from a Work Type stores a snapshot of the task/resource plan so historical jobs do not silently change when the administrator later edits the Work Type.

## 6. Resources / equipment

Resources include:

- trucks
- trailers
- mowers
- trimmers
- blowers
- machinery
- equipment
- tools
- other operational resources

Resource concepts should eventually be separated into:

- availability state
- health/maintenance state
- assignment mode
- home crew / default crew

Do not erase a persistent crew relationship simply because the equipment is damaged.

### Persistent resource

A persistent resource is normally assigned to a specific crew and is preferred automatically for work types that require it.

Example:

```text
Mower-07
persistent = true
home_crew = Alpha
```

When healthy, YALH should automatically prefer Mower-07 for Alpha's lawn-mowing work.

### Damaged persistent resource

If Mower-07 breaks:

```text
Mower-07
ASSIGNED/PERSISTENT
        ↓
DAMAGED
        ↓
IN_REPAIR
```

The persistent/home-crew relationship remains recorded.

The system may assign a temporary replacement if one is available.

When Mower-07 is repaired, its normal persistent relationship can be restored.

## 7. Inventory

Inventory is a first-class operational subsystem.

Track:

- consumables
- supplies
- spare parts
- tools
- equipment-related parts
- other stock items

Each item should support:

- SKU/code
- name
- category
- unit of measure
- quantity on hand
- quantity reserved
- reorder point
- location
- supplier
- status
- cost information
- active/inactive state

Stock states include conceptually:

```text
IN_STOCK
LOW
OUT_OF_STOCK
RESERVED
```

Inventory operations must be auditable.

## 8. Purchases

Purchases must record:

- supplier
- purchase order/reference
- invoice/reference
- purchase date
- received date
- line items
- quantities ordered
- quantities received
- unit cost
- total cost
- receiver/user

Receiving a purchase increases inventory according to the actual quantity received.

## 9. Maintenance & repair center

A technician/repair person needs a dedicated maintenance view that answers:

- what equipment exists;
- what was purchased;
- what is currently in stock;
- what is low/out of stock;
- what is currently broken;
- what is under repair;
- what preventive maintenance is due;
- what is overdue;
- what parts/consumables are available;
- what parts were used in each repair;
- repair cost and history.

Maintenance states should include conceptually:

```text
OK
DUE_SOON
DUE
OVERDUE
IN_REPAIR
OUT_OF_SERVICE
```

Maintenance records should include:

- resource/equipment
- maintenance type
- scheduled date
- completed date
- meter/hours/mileage where applicable
- technician
- diagnosis
- work performed
- parts used
- consumables used
- labor/time
- cost
- notes
- evidence/photos where applicable

A repair workflow is:

```text
DAMAGE REPORTED
      ↓
DIAGNOSIS
      ↓
REPAIR ORDER
      ↓
PARTS / INVENTORY CONSUMPTION
      ↓
REPAIR
      ↓
TEST / INSPECTION
      ↓
REPAIRED
      ↓
RESOURCE AVAILABLE / PERSISTENT ASSIGNMENT RESTORED
```

## 10. Inventory ↔ maintenance integration

A repair that consumes a part must affect inventory.

Example:

```text
Mower-07 damaged
      ↓
Repair requires belt + oil
      ↓
Reserve parts
      ↓
Technician uses parts
      ↓
Inventory quantities decrease
      ↓
Repair completed
      ↓
Mower returns to service
```

If a required part is unavailable, the repair should be blocked or explicitly marked waiting-for-parts according to the configured rule.

## 11. Resource resolution for jobs

When a job becomes ready, the Core resolves required resources.

Priority:

1. persistent resource belonging to the crew;
2. otherwise an eligible available resource;
3. otherwise a configured substitute;
4. otherwise create a resource shortage.

A damaged/out-of-service resource cannot be selected.

Example:

```text
Lawn Mowing Job
       ↓
Persistent mower available? → yes → assign
       ↓ no
Temporary mower available? → yes → assign
       ↓ no
RESOURCE_SHORTAGE
```

The job must not falsely appear ready when required resources are missing.

## 12. Time, GPS and field execution

The field execution model includes:

```text
CLOCK IN
START ROUTE
ARRIVE ON SITE
START JOB
TASKS
EVIDENCE
SIGN-OFF
CLOCK OUT
```

Clock-in/out requires GPS evidence.

Arrival requires GPS/geofence verification unless an authorized workflow explicitly bypasses it.

Breaks require GPS and must be closed before clock-out.

Unfinished tasks require a standardized reason plus explanation.

Completion becomes `PARTIALLY_COMPLETED` when required work remains unfinished and the required reasons are recorded.

## 13. Evidence and incidents

Evidence can be linked to jobs, tasks, resources and incidents.

Important events include:

```text
CLOCK_IN
CLOCK_OUT
BREAK_START
BREAK_END
LOCATION
ROUTE_STARTED
ARRIVED
JOB_STARTED
TASK_COMPLETED
TASK_SKIPPED
TASK_NOT_COMPLETED
EVIDENCE
INCIDENT
JOB_COMPLETED
JOB_PARTIALLY_COMPLETED
JOB_CANCELLED
SITE_CHECK
JOB_CLAIMED
JOB_RELEASED
JOB_REOPENED
RESOURCE_ASSIGNED
RESOURCE_DAMAGED
RESOURCE_REPAIRED
RESOURCE_RELEASED
RESOURCE_SHORTAGE
RESOURCES_RESOLVED
WORK_TYPE_CREATED
WORK_TYPE_UPDATED
PURCHASE_RECEIVED
INVENTORY_CONSUMED
MAINTENANCE_DUE
REPAIR_COMPLETED
```

Event history is append-oriented and should not be silently rewritten when state changes.

## 14. Customer projection

The customer-facing interface receives a restricted projection of operational state.

It may expose:

- scheduled status
- on-the-way status
- working status
- completed/partially completed status
- progress
- arrival
- permitted location information
- permitted evidence
- permitted timeline events

Internal employee/admin data must not leak into the customer projection.

## 15. UI roles

The platform will support role-specific experiences:

### Admin / Dispatcher
Desktop control tower:

- dispatch
- crews
- jobs
- fleet
- inventory
- purchases
- maintenance
- work types
- resources
- audits
- company configuration

### Crew Leader
Mobile execution:

- personal/crew job queue
- claim job
- release job
- start route
- arrive
- start work
- task checklist
- evidence
- incidents
- sign-off
- assigned persistent equipment

### Employee / Time Clock
Mobile/kiosk:

- PIN/authentication
- GPS clock-in/out
- breaks
- current status

### Client
Mobile/web tracker:

```text
SCHEDULED
→ ON THE WAY
→ WORKING
→ COMPLETED
```

## 16. Persistence

Supabase/PostgreSQL is the durable store.

During development/simulation:

- localStorage may remain as an offline/cache fallback;
- initial UI state should not be blocked waiting for the database;
- database hydration should occur asynchronously;
- mutations should be persisted centrally;
- high-frequency events such as telemetry/ticks should be coalesced/debounced where appropriate;
- service-role secrets must never be exposed in the browser.

The temporary JSONB simulation state is a development bridge. Long-term production data should use normalized multi-tenant tables with proper authorization/RLS.

## 17. Development strategy

Hamel Bros. Landscaping remains the reference sandbox.

Do not hard-code Hamel-specific business rules into YALH Core.

Build generic behavior first, then configure Hamel as test data.

Required integration scenarios:

1. Alpha claims a lawn-mowing job.
2. Bravo is denied because Alpha owns it.
3. Alpha leader releases it with a reason.
4. The release is logged.
5. The job becomes claimable again.
6. Bravo claims it.
7. Persistent mower/trimmer/blower/truck resolve automatically for Alpha when applicable.
8. A mower is damaged.
9. The damaged mower cannot be selected.
10. The repair center receives the equipment.
11. Required repair parts are reserved/consumed from inventory.
12. A temporary replacement can be assigned.
13. Repair restores the persistent relationship.
14. Audit history contains the full claim/release/resource/repair chain.
15. A second company can exist with completely separate data and configuration.

## 18. Non-negotiable architectural rules

1. **YALH is the product; Hamel Bros. is only a tenant/sandbox.**
2. **No tenant-specific rules in the Core.**
3. **One authoritative business-rule engine.** Rust is the target Core; do not maintain competing business logic in the UI.
4. **UI requests actions; UI does not decide business truth.**
5. **Every important state mutation is auditable.**
6. **Persistent equipment relationships survive damage/repair.**
7. **Inventory and maintenance are interconnected.**
8. **Jobs, crews and resources are separate entities.**
9. **Claim ownership and lifecycle status are separate concepts.**
10. **Multi-tenancy is foundational, not a later retrofit.**
11. **Historical jobs snapshot their work-type definition.**
12. **Do not expose secrets in client-side code.**
13. **Do not touch the public website (`index.html`) for Hamel OS work.**
14. **Hamel OS must remain responsive and usable on desktop and mobile.**
15. **Prefer generic configuration over hard-coded landscaping-specific assumptions wherever practical.**

## 19. Current implementation state

Existing development components include:

- `hamel-os-simulation.js` — current UI simulation/state engine;
- `hamel-os-domain.js` — domain validation/events/GPS/time logic;
- `hamel-os-operations.js` — work claiming, release, work types and resource rules;
- `hamel-os-layout.css` — dedicated UI layout system;
- temporary Supabase persistence table for simulation state.

These components must be progressively consolidated behind the YALH Core architecture rather than allowed to become independent competing sources of truth.

## 20. Next implementation order

1. Create the Rust YALH Core project/module structure.
2. Define Rust domain models and canonical state transitions.
3. Port/adapt the existing domain and operations rules into Rust tests first.
4. Add multi-tenant boundaries to all domain operations.
5. Integrate inventory, purchases, maintenance and repairs into the Core.
6. Expose a clean API boundary for UI clients.
7. Make the current Hamel simulator consume the Core rather than duplicate its rules.
8. Integrate Supabase persistence behind the Core/API boundary.
9. Build the operational UI modules on top of the authoritative Core.
10. Add authentication, authorization and production RLS before real customer deployment.

## 21. Product vision

YALH should ultimately feel like an operating system for a field-service company, not a collection of unrelated CRUD pages.

The mental model is:

> **YALH thinks. Supabase remembers. The interfaces show and request.**

Each customer should feel that they have their own operating system, while YALH remains the underlying platform and technology.
