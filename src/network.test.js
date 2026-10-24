import test from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, createShuffledNodes } from './missions.js';
import { validateNetwork, traceNetwork, cableKey, isUsbCable } from './network.js';
import { nextMissionIndex, mayResetMission } from './progression.js';
const edge = (source,target) => ({source,target});
const exact = m => m.cables.map(([a,b])=>edge(a,b));
for (const mission of MISSIONS) {
  test(`${mission.id}: todas as conexões corretas e fases de ida/volta`, () => {
    assert.equal(validateNetwork(mission,exact(mission)).valid,true);
    assert.equal(traceNetwork(mission,exact(mission)).complete,true);
    assert.ok(traceNetwork(mission,exact(mission)).segments.length >= mission.cables.length);
  });
  test(`${mission.id}: poucos cabos = incompleto, com pacote parando na falha`, () => {
    const partial = exact(mission).slice(0, 1);
    const check = validateNetwork(mission,partial);
    assert.equal(check.reason,'incomplete');
    assert.ok(traceNetwork(mission,partial).failure);
  });
  test(`${mission.id}: cabo excedente invalida até quando todo o caminho existe`, () => {
    const additional = edge(mission.equipment[0].id, mission.equipment.at(-1).id);
    const result = validateNetwork(mission,[...exact(mission),additional]);
    assert.equal(result.reason, 'extra');
    assert.equal(result.valid,false);
    assert.equal(traceNetwork(mission,[...exact(mission),additional]).complete,true);
  });
  test(`${mission.id}: ligação errada com cabo obrigatório faltando`, () => {
    const correct=exact(mission);
    const wrong=edge(mission.equipment[0].id, mission.equipment.at(-1).id);
    const result=validateNetwork(mission,[...correct.slice(0,-1),wrong]);
    assert.equal(result.reason,'incorrect');
    assert.equal(result.valid,false);
  });
  test(`${mission.id}: ligar tudo com tudo não vence`, () => {
    const ids=mission.equipment.map(x=>x.id);const all=[];
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)all.push(edge(ids[i],ids[j]));
    assert.equal(validateNetwork(mission,all).valid,false);
  });
  test(`${mission.id}: sentido do cabo não muda o resultado`, () => {
    assert.equal(validateNetwork(mission,exact(mission).map(({source,target})=>edge(target,source))).valid,true);
  });
  test(`${mission.id}: posições não mudam regras e IDs permanecem únicos`, () => {
    const nodes=createShuffledNodes(mission);
    assert.equal(nodes.length,mission.equipment.length);
    assert.equal(new Set(nodes.map(n=>n.id)).size,nodes.length);
    assert.ok(nodes.every(n=>Number.isFinite(n.position.x)));
  });
}
test('Missão 3 usa USB como conexão periférica, com DNS e servidor em ramos separados',()=>{
 const m=MISSIONS[2];
 assert.ok(m.cables.some(c=>cableKey(...c)===cableKey('controller','pc1')));
 assert.ok(m.cables.some(c=>cableKey(...c)===cableKey('internet','dns')));
 assert.ok(m.cables.some(c=>cableKey(...c)===cableKey('internet','gameServer')));
 assert.ok(!m.cables.some(c=>cableKey(...c)===cableKey('dns','gameServer')));
 assert.equal(isUsbCable({source:'controller',target:'pc1'}),true);
});
test('Missão 2 só usa sete cabos mesmo visitando Internet duas vezes',()=>{
 assert.equal(MISSIONS[1].cables.length,7);
 assert.equal(MISSIONS[1].phases[0].path.filter(n=>n==='internet').length,2);
});

test('Missões devem seguir estritamente a ordem 1, 2, 3', () => {
 assert.equal(nextMissionIndex(0,false,3),0);
 assert.equal(nextMissionIndex(0,true,3),1);
 assert.equal(nextMissionIndex(1,false,3),1);
 assert.equal(nextMissionIndex(1,true,3),2);
 assert.equal(nextMissionIndex(2,true,3),2);
});
test('Missão concluída não pode ser reiniciada',()=> {
 assert.equal(mayResetMission(true),false);
 assert.equal(mayResetMission(false),true);
});
test('Animação de falha para quando o cabo seguinte não existe',()=>{
 const mission=MISSIONS[1];
 const partial=exact(mission).slice(0,2);
 const trace=traceNetwork(mission,partial);
 assert.equal(trace.segments.length,2);
 assert.equal(trace.failure.from,'ispA');
 assert.equal(trace.complete,false);
});
