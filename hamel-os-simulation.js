/* Hamel OS — Operational Simulation Engine
 * Phase 2: mock production behavior only. No database, GPS, auth, or external writes.
 * Designed so the UI can later replace this adapter with Supabase without changing its domain model.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'hamel-os:simulation:v1';
  const now = () => new Date().toISOString();
  const id = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  const seed = {
    version: 1,
    clock: { simulated: true, startedAt: now() },
    crews: [
      { id: 'crew-alpha', name: 'Crew Alpha', leader: 'Jimmy Hamel', vehicleId: 'T01', status: 'EN_ROUTE', jobId: 'J-1042', progress: 62, speed: 24, x: 38, y: 42 },
      { id: 'crew-bravo', name: 'Crew Bravo', leader: 'Steve Hamel', vehicleId: 'T03', status: 'WORKING', jobId: 'J-1043', progress: 38, speed: 3, x: 67, y: 62 },
      { id: 'crew-charlie', name: 'Crew Charlie', leader: 'Carlos M.', vehicleId: 'T02', status: 'SCHEDULED', jobId: 'J-1044', progress: 0, speed: 0, x: 22, y: 70 }
    ],
    vehicles: [
      { id: 'T01', name: 'F-250', type: 'Truck', status: 'EN_ROUTE', crewId: 'crew-alpha' },
      { id: 'T02', name: 'Bobcat', type: 'Equipment', status: 'SCHEDULED', crewId: 'crew-charlie' },
      { id: 'T03', name: 'Ram 2500', type: 'Truck', status: 'WORKING', crewId: 'crew-bravo' },
      { id: 'T04', name: 'Trailer', type: 'Trailer', status: 'PARKED', crewId: null }
    ],
    jobs: [
      { id: 'J-1042', property: 'Vanderbilt Residence', client: 'Vanderbilt Family', address: '17 Weston Rd, Wellesley', crewId: 'crew-alpha', status: 'ON_THE_WAY', progress: 62, tasks: [{ id: 't1', name: 'Spring cleanup', done: true }, { id: 't2', name: 'Hedge trimming', done: false }, { id: 't3', name: 'Final cleanup', done: false }] },
      { id: 'J-1043', property: 'Smith Family Estate', client: 'Smith Family', address: '81 Pond Ave, Natick', crewId: 'crew-bravo', status: 'IN_PROGRESS', progress: 38, tasks: [{ id: 't1', name: 'Lawn service', done: true }, { id: 't2', name: 'Beds', done: false }] },
      { id: 'J-1044', property: 'Harrington Property', client: 'Harrington LLC', address: '204 Central Ave, Weston', crewId: 'crew-charlie', status: 'SCHEDULED', progress: 0, tasks: [{ id: 't1', name: 'Site prep', done: false }] },
      { id: 'J-1045', property: 'Oak Street Residence', client: 'Private Client', address: '12 Oak St, Wellesley', crewId: null, status: 'NEEDS_DISPATCH', progress: 0, tasks: [] }
    ],
    events: [
      { id: id('EVT'), at: now(), actor: 'System', type: 'SYSTEM_READY', title: 'Simulation online', detail: 'Mock production environment initialized' },
      { id: id('EVT'), at: now(), actor: 'Crew Alpha', type: 'ROUTE_STARTED', title: 'Route started', detail: 'Vanderbilt Residence' },
      { id: id('EVT'), at: now(), actor: 'System', type: 'GPS_LOCK', title: 'GPS lock acquired', detail: 'T01 · 24 MPH' }
    ]
  };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function load() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : clone(seed); }
    catch (_) { return clone(seed); }
  }
  let state = load();
  const listeners = new Set();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    listeners.forEach(fn => { try { fn(clone(state)); } catch (_) {} });
  }
  function emit(actor, type, title, detail) {
    state.events.unshift({ id: id('EVT'), at: now(), actor, type, title, detail });
    state.events = state.events.slice(0, 100);
  }
  function patchJob(jobId, patch) {
    const job = state.jobs.find(j => j.id === jobId);
    if (job) Object.assign(job, patch);
    return job;
  }
  function patchCrew(crewId, patch) {
    const crew = state.crews.find(c => c.id === crewId);
    if (crew) Object.assign(crew, patch);
    return crew;
  }

  const api = {
    getState() { return clone(state); },
    subscribe(fn) {
      if (typeof fn !== 'function') return () => {};
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reset() { state = clone(seed); persist(); },

    startRoute(crewId = 'crew-alpha') {
      const crew = state.crews.find(c => c.id === crewId);
      if (!crew) return null;
      patchCrew(crewId, { status: 'EN_ROUTE', speed: 24, progress: Math.max(crew.progress, 5) });
      patchJob(crew.jobId, { status: 'ON_THE_WAY', progress: crew.progress });
      emit(crew.leader, 'ROUTE_STARTED', 'Route started', jobName(crew.jobId));
      persist();
      return clone(crew);
    },

    arrive(crewId = 'crew-alpha') {
      const crew = patchCrew(crewId, { status: 'ON_SITE', speed: 0 });
      if (!crew) return null;
      patchJob(crew.jobId, { status: 'ON_SITE' });
      emit(crew.leader, 'ARRIVED', 'Crew arrived on site', jobName(crew.jobId));
      persist();
      return clone(crew);
    },

    startJob(crewId = 'crew-alpha') {
      const crew = patchCrew(crewId, { status: 'WORKING', speed: 0 });
      if (!crew) return null;
      patchJob(crew.jobId, { status: 'IN_PROGRESS' });
      emit(crew.leader, 'JOB_STARTED', 'Job started', jobName(crew.jobId));
      persist();
      return clone(crew);
    },

    completeTask(crewId = 'crew-alpha', taskId) {
      const crew = state.crews.find(c => c.id === crewId);
      if (!crew) return null;
      const job = state.jobs.find(j => j.id === crew.jobId);
      if (!job) return null;
      const task = job.tasks.find(t => t.id === taskId) || job.tasks.find(t => !t.done);
      if (!task) return clone(job);
      task.done = true;
      const total = job.tasks.length || 1;
      job.progress = Math.round(job.tasks.filter(t => t.done).length / total * 100);
      crew.progress = job.progress;
      emit(crew.leader, 'TASK_COMPLETED', 'Task completed', task.name + ' · ' + job.property);
      persist();
      return clone(job);
    },

    uploadEvidence(crewId = 'crew-alpha', label = 'AFTER') {
      const crew = state.crews.find(c => c.id === crewId);
      if (!crew) return null;
      const job = state.jobs.find(j => j.id === crew.jobId);
      if (!job) return null;
      const evidence = { id: id('PHOTO'), jobId: crew.jobId, crewId, label, receivedAt: now() };
      emit(crew.leader, 'EVIDENCE_RECEIVED', 'Photo received', job.property + ' · ' + label);
      persist();
      return evidence;
    },

    completeJob(crewId = 'crew-alpha') {
      const crew = patchCrew(crewId, { status: 'AVAILABLE', speed: 0, progress: 100 });
      if (!crew) return null;
      const job = patchJob(crew.jobId, { status: 'COMPLETED', progress: 100 });
      if (job) job.tasks.forEach(t => { t.done = true; });
      const vehicle = state.vehicles.find(v => v.id === crew.vehicleId);
      if (vehicle) vehicle.status = 'AVAILABLE';
      emit(crew.leader, 'JOB_COMPLETED', 'Job completed', jobName(crew.jobId) + ' · sign-off');
      persist();
      return clone(job);
    },

    tick(seconds = 1) {
      const elapsed = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 1;
      state.crews.forEach(crew => {
        if (crew.status !== 'EN_ROUTE') return;
        crew.x += 0.9 * elapsed;
        crew.y += 0.18 * elapsed;
        if (crew.x > 90) crew.x = 10;
        crew.speed = Math.max(18, Math.min(31, crew.speed + (Math.random() - 0.5) * 2));
        crew.progress = Math.min(95, crew.progress + 0.12 * elapsed);
        patchJob(crew.jobId, { progress: Math.round(crew.progress) });
      });
      persist();
      return this.getState();
    },

    runFullCycle(crewId = 'crew-alpha') {
      if (!state.crews.some(c => c.id === crewId)) return false;
      this.startRoute(crewId);
      setTimeout(() => this.arrive(crewId), 2200);
      setTimeout(() => this.startJob(crewId), 4200);
      setTimeout(() => this.completeTask(crewId), 6000);
      setTimeout(() => this.uploadEvidence(crewId, 'AFTER'), 7600);
      setTimeout(() => this.completeJob(crewId), 9800);
      return true;
    }
  };

  function jobName(jobId) { const j = state.jobs.find(x => x.id === jobId); return j ? j.property : jobId; }

  global.HamelSimulation = api;
})(window);
