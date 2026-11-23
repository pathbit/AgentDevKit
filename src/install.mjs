// Ponto de entrada da instalação para a CLI e para os testes.
export { resolveTarget, safePath } from './installation/filesystem.mjs';
export { diagnosePreservedDerivedToml } from './installation/ownership.mjs';
export { loadState, inspectRemovalHistory, inspect } from './installation/state.mjs';
export { planInstallation } from './installation/plan.mjs';
export { applyPlan, derivePruneCandidates } from './installation/apply.mjs';
