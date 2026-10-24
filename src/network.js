import { MISSION_MAP } from './missions.js';

export const cableKey = (a, b) => [a, b].sort().join('::');

export function validateNetwork(mission, edges) {
  const required = new Set(mission.cables.map(([a,b]) => cableKey(a,b)));
  const actual = new Set(edges.map(e => cableKey(e.source,e.target)));
  const extra = [...actual].filter(key => !required.has(key));
  const missing = [...required].filter(key => !actual.has(key));
  const duplicates = edges.length - actual.size;
  const valid = missing.length === 0 && extra.length === 0 && duplicates === 0;
  const reason = valid ? 'valid'
    : !missing.length ? 'extra'
    : !extra.length && !duplicates ? 'incomplete'
    : 'incorrect';
  return { valid, reason, missing, extra, duplicates,
    expected: required.size, connected: edges.length };
}

// Retrata a tentativa de comunicação seguindo a ordem didática das etapas.
// Se uma conexão não existe, o pacote para no último equipamento alcançado.
// Isso funciona mesmo em redes incorretas, incompletas ou com cabos sobrando.
export function traceNetwork(mission, edges) {
  const cables = new Set(edges.map(e => cableKey(e.source,e.target)));
  const segments = [];
  for (let p = 0; p < mission.phases.length; p++) {
    const phase = mission.phases[p];
    for (let i = 0; i < phase.path.length - 1; i++) {
      const from = phase.path[i];
      const to = phase.path[i+1];
      if (!cables.has(cableKey(from,to))) {
        return { segments, complete: false, failure: { from, to, phaseIndex:p, phaseLabel:phase.label } };
      }
      segments.push({ from, to, phaseIndex:p, phaseLabel:phase.label, kind:phase.kind, firstInPhase:i===0 });
    }
  }
  return { segments, complete: true, failure: null };
}

// Utilitário auxiliar para cabos personalizados (controle/USB).
export function isUsbCable(edge) {
  return edge.source === 'controller' || edge.target === 'controller' ||
    edge.sourceHandle === 'usb-out' || edge.targetHandle === 'usb-in';
}

export const resolveMission = (id) => MISSION_MAP[id];
