import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background, BaseEdge, Controls, Handle, Position, ReactFlowProvider,
  getBezierPath, useEdgesState, useNodesState, useReactFlow
} from 'reactflow';
import {
  Activity, AlertTriangle, Check, CheckCircle2, ChevronRight, Clock3,
  Focus, Gamepad2, Globe2, HelpCircle, Link2, Mail, MessageCircle,
  Monitor, MousePointer2, Network, Play, RotateCcw, Router, Search,
  Send, Server, Smartphone, Trash2, Wifi
} from 'lucide-react';
import { createShuffledNodes, MISSIONS } from './missions.js';
import { cableKey, isUsbCable, traceNetwork, validateNetwork } from './network.js';
import { mayResetMission, nextMissionIndex } from './progression.js';

const ICONS = {
  phone: Smartphone, wifi: Wifi, router: Router, globe: Globe2,
  message: MessageCircle, monitor: Monitor, switch: Network,
  gamepad: Gamepad2, dns: Search, server: Server
};
const nodeTypes = { device: DeviceNode };
const edgeTypes = { cable: CableEdge };
const STEP_MS = 470;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const displayTime = sec => `${String(Math.floor(sec / 60)).padStart(2,'0')}:${String(sec % 60).padStart(2,'0')}`;

function DeviceNode({ data, selected }) {
  const Icon = ICONS[data.icon] || Router;
  const [helpOpen, setHelpOpen] = useState(false);
  const input = data.ports === 'both' || data.ports === 'target';
  const output = data.ports === 'both' || data.ports === 'source' || data.ports === 'pcUsb';
  return (
    <div className={`device device-${data.color} ${selected ? 'selected' : ''} ${data.active ? 'device-active' : ''} ${data.error ? 'device-error' : ''}`}>
      <div className="device-category">{data.group}</div>
      {data.help && (
        <button className="device-help nodrag nopan" type="button"
          aria-label={`Explicação: ${data.name}`} aria-expanded={helpOpen}
          title={data.help} onClick={event => {event.stopPropagation();setHelpOpen(open=>!open);}}>
          <HelpCircle size={15} />
        </button>
      )}
      <div className="device-round"><Icon size={28} strokeWidth={1.75}/></div>
      <div className="device-name">{data.name}</div>
      <div className="device-detail">{data.detail}</div>
      {helpOpen && <div className="device-popover nodrag nopan" role="note">{data.help}</div>}
      {input && <Handle type="target" id="input" position={Position.Left} className="port port-input" title="Entrada" />}
      {output && <Handle type="source" id="output" position={Position.Right} className="port port-output" title="Saída" />}
      {data.ports === 'pcUsb' && <Handle type="target" id="usb-in" position={Position.Bottom} className="port port-usb port-usb-in" title="Conector USB para o controle" />}
      {data.ports === 'usbSource' && <Handle type="source" id="usb-out" position={Position.Right} className="port port-usb port-usb-out" title="Cabo USB do controle" />}
    </div>
  );
}

function CableEdge(props) {
  const [normalPath] = getBezierPath(props);
  const isActive = Boolean(props.data?.active);
  const reverse = Boolean(props.data?.reverse);
  const isUsb = Boolean(props.data?.usb);
  const isInvalid = Boolean(props.data?.invalid);
  const [reversePath] = getBezierPath({
    sourceX: props.targetX, sourceY: props.targetY,
    sourcePosition: props.targetPosition, targetX: props.sourceX,
    targetY: props.sourceY, targetPosition: props.sourcePosition
  });
  const path = reverse ? reversePath : normalPath;
  const color = isInvalid ? '#fb7185' : isActive ? (isUsb ? '#c4a1ff' : '#facc15') : isUsb ? '#ae87ea' : '#69b6c7';
  return <g>
    <BaseEdge {...props} path={normalPath} interactionWidth={30}
      style={{ stroke:color, strokeWidth:isActive?4:3, strokeDasharray:isUsb?'6 5':undefined }} />
    {isActive && (
      <g>
        <circle r="7" fill={isUsb?'#d8b4fe':'#fde047'} stroke="#fff8d0" strokeWidth="1.7">
          <animateMotion key={`${props.data?.step}-head`} path={path} dur={`${STEP_MS/1000}s`} fill="freeze" />
        </circle>
        <circle r="3.1" fill="#ffffff" opacity=".88">
          <animateMotion key={`${props.data?.step}-tail`} path={path} dur={`${STEP_MS/1000}s`} begin="0.12s" fill="freeze" />
        </circle>
      </g>
    )}
  </g>;
}

function Stepper({ missionIndex, times }) {
  return <nav className="mission-stepper" aria-label="Progresso das missões">
    {MISSIONS.map((mission, i) => <div key={mission.id} className={`step ${i === missionIndex ? 'step-current' : ''} ${times[i] !== null ? 'step-done' : ''} ${i > missionIndex ? 'step-locked' : ''}`} aria-current={i === missionIndex ? 'step' : undefined}>
      <div className="step-number">{times[i] !== null ? <Check size={14} /> : String(i+1).padStart(2,'0')}</div>
      <div className="step-copy"><b>{mission.short}</b><small>{times[i] !== null ? `Concluída em ${displayTime(times[i])}` : i > missionIndex ? 'Bloqueada' : mission.level}</small></div>
      {i < MISSIONS.length-1 && <ChevronRight className="step-chevron" size={16} />}
    </div>)}
  </nav>;
}

function Lab() {
  const [missionIndex, setMissionIndex] = useState(0);
  const mission = MISSIONS[missionIndex];
  const [times, setTimes] = useState([null,null,null]);
  const [nodes, setNodes, handleNodesChange] = useNodesState(() => createShuffledNodes(MISSIONS[0]));
  const [edges, setEdges, handleEdgesChange] = useEdgesState([]);
  const [running, setRunning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [won, setWon] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [notice, setNotice] = useState({ type:'info', title:'Pronto para começar?', text:'Inicie a missão para liberar as conexões dos equipamentos.' });
  const [phaseText, setPhaseText] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const startedAt = useRef(0);
  const epoch = useRef(0);
  const intervalRef = useRef(null);
  const fitRef = useRef(null);
  const { fitView } = useReactFlow();
  const names = Object.fromEntries(mission.equipment.map(item => [item.id,item.name]));

  useEffect(() => {
    if (running && !won) {
      intervalRef.current = window.setInterval(() => {
        setSeconds(Math.floor((Date.now()-startedAt.current)/1000));
      },200);
    }
    return () => window.clearInterval(intervalRef.current);
  },[running,won,missionIndex]);
  useEffect(() => () => {
    epoch.current++;
    window.clearInterval(intervalRef.current);
    window.clearTimeout(fitRef.current);
  },[]);

  const resetCurrent = useCallback(() => {
    if (!mayResetMission(won)) return; // Missões concluídas não podem reiniciar.
    epoch.current++;
    setNodes(createShuffledNodes(mission));
    setEdges([]);
    setRunning(false);
    setTesting(false);
    setSeconds(0);
    setPhaseText('');
    setNotice({type:'info',title:'Missão reiniciada',text:'Inicie novamente e monte as conexões.'});
    window.clearTimeout(fitRef.current);
    fitRef.current = window.setTimeout(() => fitView({padding:0.27,maxZoom:0.91,duration:400}),130);
  },[won,mission,setNodes,setEdges,fitView]);

  const begin = () => {
    if (running || won || testing) return;
    startedAt.current = Date.now();
    setRunning(true);
    setSeconds(0);
    setNotice({type:'info',title:'Valendo!',text:'Saída verde → entrada azul. Arraste o fundo para navegar e use Centralizar se precisar.'});
  };

  const onConnect = useCallback(connection => {
    if (!running || won || testing || !connection.source || !connection.target || connection.source === connection.target) return;
    const key = cableKey(connection.source,connection.target);
    const usb = isUsbCable(connection);
    setEdges(current => current.some(e => cableKey(e.source,e.target)===key) ? current : [
      ...current,
      { ...connection,id:`c-${key}`,type:'cable',deletable:true,
        data:{active:false,invalid:false,usb} }
    ]);
    setNodes(current => current.map(n => ({...n,data:{...n.data,error:false}})));
    setNotice({type:'info',title:'Conexão adicionada',text:'Continue montando. Para remover um cabo, dê dois cliques nele ou selecione e use Excluir cabo.'});
  },[running,won,testing,setEdges,setNodes]);

  const removeEdge = useCallback((_event, edge) => {
    if (!running || won || testing) return;
    _event.stopPropagation();
    setEdges(current => current.filter(e => e.id !== edge.id));
    setNotice({type:'info',title:'Cabo removido',text:'Você pode refazer a ligação e testar novamente.'});
    setNodes(current => current.map(n => ({...n,data:{...n.data,error:false}})));
  },[running,won,testing,setEdges,setNodes]);

  const removeSelected = () => {
    if (!running || won || testing) return;
    setEdges(current => current.filter(e => !e.selected));
    setNotice({type:'info',title:'Cabo removido',text:'Selecione outros equipamentos para continuar a montagem.'});
  };

  const onNodesChange = useCallback(changes => {
    const allowed = changes.filter(change => change.type !== 'remove' &&
      (change.type !== 'position' || ((running || won) && !testing)));
    if (allowed.length) handleNodesChange(allowed);
  },[running,won,testing,handleNodesChange]);
  const onEdgesChange = useCallback(changes => {
    if (!running || won || testing) return;
    handleEdgesChange(changes);
  },[running,won,testing,handleEdgesChange]);

  const test = async () => {
    if (!running || testing || won) return;
    const currentEpoch = ++epoch.current;
    const report = validateNetwork(mission,edges);
    const trace = traceNetwork(mission,edges);
    const required = new Set(mission.cables.map(([a,b])=>cableKey(a,b)));
    setTesting(true);
    setPhaseText('Iniciando teste...');
    setNotice({type:'info',title:'Transmitindo...',text:'Acompanhe os pacotes percorrendo os cabos. Uma ligação errada pode interromper a transmissão.'});
    const firstId = mission.phases[0].path[0];
    setNodes(current => current.map(n=>({...n,data:{...n.data,active:n.id===firstId,error:false}})));
    setEdges(current => current.map(e=>({...e,data:{...e.data,active:false,invalid:false}})));
    // Mesmo sem nenhum cabo correto, mostramos a tentativa partindo da origem.
    // Nunca simulamos o pacote atravessando um cabo inexistente.
    setPhaseText(mission.phases[0].label);
    await pause(520);
    if (epoch.current !== currentEpoch) return;

    let lastPhaseIndex = -1;
    for (let i=0;i<trace.segments.length;i++) {
      if (epoch.current !== currentEpoch) return;
      const segment = trace.segments[i];
      if (segment.phaseIndex !== lastPhaseIndex) {
        lastPhaseIndex = segment.phaseIndex;
        setPhaseText(segment.phaseLabel);
        setNotice({type:'info',title:segment.phaseLabel,text:segment.kind==='usb'?'Primeiro, o controle é reconhecido pelo computador.':'Observe a viagem do pacote e a resposta pelos mesmos cabos.'});
        setNodes(current => current.map(n=>({...n,data:{...n.data,active:n.id===segment.from}})));
        await pause(240);
      }
      if (epoch.current !== currentEpoch) return;
      const activeCable = cableKey(segment.from,segment.to);
      setEdges(current => current.map(e => ({
        ...e, data:{...e.data,
          active:cableKey(e.source,e.target)===activeCable,
          reverse:e.source!==segment.from,step:i+1,invalid:false}
      })));
      setNodes(current => current.map(n => ({...n,data:{...n.data,active:n.id===segment.to}})));
      await pause(STEP_MS+70);
    }
    if (epoch.current !== currentEpoch) return;
    setPhaseText('');
    setEdges(current => current.map(e => ({...e,data:{...e.data,active:false,
      invalid:!required.has(cableKey(e.source,e.target))}})));
    setTesting(false);
    if (report.valid) {
      const finalTime = Math.floor((Date.now()-startedAt.current)/1000);
      setSeconds(finalTime);
      setTimes(previous => previous.map((time,i) => i===missionIndex ? finalTime : time));
      setWon(true);
      setNodes(current => current.map(n=>({...n,data:{...n.data,active:false,error:false}})));
      setNotice({type:'success',title:mission.successTitle,
        text:`${mission.successText} A topologia está visível para você conferir. ${missionIndex<2?'Avance para a próxima missão.':'As três missões foram concluídas!'}`});
      return;
    }
    const stopAt = trace.failure?.from;
    setNodes(current => current.map(n=>({...n,data:{...n.data,
      active:false,error:Boolean(stopAt && n.id===stopAt)}})));
    const location = stopAt ? names[stopAt] : 'a rede';
    let text;
    let title;
    if (report.reason==='extra') {
      title='Cabos sobrando';
      text='O caminho principal funciona, mas há ligações extras. Existe apenas um caminho válido: remova os cabos extras e tente novamente.';
    } else if (report.reason==='incorrect') {
      title='Revise as ligações';
      text=`Há conexões fora do caminho esperado e ainda faltam ligações. ${trace.failure?`O sinal parou em ${location}. `:''}O cronômetro continua.`;
    } else {
      title='Caminho incompleto';
      text=`O sinal chegou até ${location}, mas não conseguiu continuar. Ainda faltam conexões. O cronômetro continua.`;
    }
    setNotice({type:'error',title,text});
  };

  const advance = () => {
    const next = nextMissionIndex(missionIndex, won, MISSIONS.length);
    if (next === missionIndex) return;
    epoch.current++;
    setMissionIndex(next);
    setNodes(createShuffledNodes(MISSIONS[next]));
    setEdges([]);
    setWon(false);
    setRunning(false);
    setTesting(false);
    setSeconds(0);
    setPhaseText('');
    setNotice({type:'info',title:`Missão ${next+1} desbloqueada!`,text:'Inicie a nova missão para liberar os cabos. As missões concluídas permanecem registradas até atualizar a página.'});
    window.clearTimeout(fitRef.current);
    fitRef.current=window.setTimeout(()=>fitView({padding:0.26,maxZoom:0.91,duration:400}),140);
    window.scrollTo({top:0,behavior:'smooth'});
  };

  const allDone=won && missionIndex===MISSIONS.length-1;
  return (
    <main className="shell">
      <header className="header">
        <div className="branding">
          <div className="official-logo">
            {!logoFailed ? <img src="https://www.uffs.edu.br/uffs/conteudo/upload/baixa-resolucao-uffs-assinatura-visual-preferencial-em-verde-_rgb-isku4g.png"
              alt="Universidade Federal da Fronteira Sul" onError={()=>setLogoFailed(true)}/> : <span>UFFS</span>}
          </div>
          <div className="brand-separator"/>
          <div><div className="brand-title">NET<span>LAB</span></div><div className="brand-sub">LABORATÓRIO DE REDES</div></div>
        </div>
      </header>

      <Stepper missionIndex={missionIndex} times={times} />

      <div className="intro">
        <div className="eyebrow">MISSÃO {String(mission.number).padStart(2,'0')} / 03 · {mission.level}</div>
        <h1>{mission.headline} <span>{mission.highlight}</span></h1>
        <p>{mission.description}</p>
      </div>

      <section className={`controlbar ${won?'controlbar-won':''}`} aria-label="Controles da missão">
        <div className="control-info"><div className="control-symbol"><Send size={21}/></div>
          <div><b>{mission.task}</b><small>{mission.taskDetail}</small></div>
        </div>
        <div className="clock"><Clock3 size={17}/><span>{displayTime(seconds)}</span></div>
        <div className="actions">
          {!won && <>
            <button className="btn btn-start" onClick={begin} disabled={running||testing}><Play size={16}/>{running?'Em andamento':'Iniciar'}</button>
            <button className="btn btn-test" onClick={test} disabled={!running||testing}><Mail size={16}/>{testing?'Transmitindo…':mission.testLabel}</button>
            <button className="btn btn-reset" onClick={resetCurrent} disabled={testing}><RotateCcw size={16}/>Reiniciar</button>
          </>}
          {won && missionIndex<2 && <button className="btn btn-next" onClick={advance}>
            Próxima missão <ChevronRight size={18}/>
          </button>}
          {allDone && <button className="btn btn-next" onClick={()=>window.location.reload()}>
            <RotateCcw size={16}/> Nova rodada
          </button>}
        </div>
      </section>

      <section className={`feedback feedback-${notice.type}`} role="status" aria-live="polite">
        <div className="feedback-icon">{notice.type==='success'?<CheckCircle2/>:notice.type==='error'?<AlertTriangle/>:<Activity/>}</div>
        <div className="feedback-copy"><div className="feedback-tag">{notice.type==='success'?'MISSÃO CONCLUÍDA':notice.type==='error'?'VERIFICAÇÃO DA REDE':'STATUS DA MISSÃO'}</div>
          <h3>{notice.title}</h3><p>{notice.text}</p></div>
        {won && missionIndex<2 && <button className="btn btn-next feedback-next" onClick={advance}>Avançar <ChevronRight size={17}/></button>}
      </section>

      <section className="workbench">
        <div className="workbench-header">
          <div><div className="eyebrow">BANCADA · MISSÃO {String(mission.number).padStart(2,'0')}</div><h2>Laboratório de redes</h2></div>
          <div className="workbench-tools">
            <span className="counter"><Link2 size={14}/>{edges.length}/{mission.cables.length} cabos</span>
            <button className="btn btn-tool" onClick={()=>fitView({padding:0.26,maxZoom:0.91,duration:450})}><Focus size={16}/>Centralizar</button>
            <button className="btn btn-tool" disabled={!running||testing||won||!edges.some(e=>e.selected)} onClick={removeSelected}><Trash2 size={15}/>Excluir cabo</button>
          </div>
        </div>
        <div className="legend">
          <span><i className="legend-in"/><b>Entrada</b></span>
          <span><i className="legend-out"/><b>Saída</b></span>
          {mission.id==='game' && <span><i className="legend-usb"/><b>USB</b></span>}
          <span className="legend-tip"><MousePointer2 size={14}/> Arraste saída → entrada; arraste o fundo para navegar</span>
        </div>
        <div className={`canvas canvas-${mission.id}`}>
          <ReactFlow key={mission.id}
            nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onEdgeDoubleClick={removeEdge}
            nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            nodesDraggable={!testing&&(running||won)} nodesConnectable={running&&!testing&&!won}
            edgesUpdatable={false} elementsSelectable={!testing} edgesFocusable={!testing}
            panOnDrag={true} panOnScroll={false} zoomOnScroll={true} zoomOnPinch={true}
            zoomOnDoubleClick={false} preventScrolling={true}
            deleteKeyCode={['Backspace','Delete']}
            fitView fitViewOptions={{padding:0.26,maxZoom:0.91}}
            minZoom={0.32} maxZoom={1.8}
            defaultEdgeOptions={{type:'cable'}} proOptions={{hideAttribution:true}}
            connectionLineStyle={{stroke:'#35d88c',strokeWidth:3}}>
            <Background color="#294346" gap={23} size={1}/>
            <Controls showInteractive={false}/>
          </ReactFlow>
          {testing && <div className="packet-indicator"><span className="packet-led"/>{phaseText}</div>}
          {won && <div className="completed-indicator"><CheckCircle2 size={16}/> Topologia concluída · você pode navegar e mover os nós</div>}
          <div className="canvas-watermark">NETLAB / SIMULAÇÃO EDUCATIVA</div>
        </div>
        <div className="canvas-footer">
          <span>Dois cliques no cabo para remover · Scroll para zoom</span>
          <span>{won ? 'Conexões travadas após a conclusão' : 'Equipamentos embaralhados a cada missão'}</span>
        </div>
      </section>

      {allDone && <section className="journey-complete" aria-label="Resumo das três missões">
        <div className="journey-icon">🏆</div>
        <div><div className="eyebrow">JORNADA CONCLUÍDA</div><h2>Três missões. Uma rede de conhecimentos.</h2>
          <p>Parabéns! Os três laboratórios foram concluídos. A topologia do desafio extremo permanece acima para conferência.</p>
          <div className="time-summary">{MISSIONS.map((item,i)=><span key={item.id}>{item.number}. {item.short}: <strong>{displayTime(times[i]??0)}</strong></span>)}</div>
          <small>Para receber outro grupo, clique em Nova rodada ou pressione F5.</small>
        </div>
      </section>}

      <footer className="site-footer">
        <span>NETLAB · UFFS</span>
        <span>Simulação didática. Internet, Wi-Fi, DNS e servidores são apresentados de forma simplificada.</span>
      </footer>
    </main>
  );
}

export default function App() {
  return <ReactFlowProvider><Lab/></ReactFlowProvider>;
}
