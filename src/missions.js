// As missões compartilham componentes e regras, mas não precisam duplicar telas.
// Rotas representam viagens DIDÁTICAS de uma solicitação e sua resposta.
// Um único cabo pode ser usado nas duas direções.
const node = (id, name, detail, icon, color, group, ports = 'both', help = '') => ({
  id, name, detail, icon, color, group, ports, help
});

const INTERNET = node('internet', 'Internet Global', 'Redes conectadas no mundo', 'globe', 'cyan', 'INTERNET');

export const MISSIONS = [
  {
    id: 'first', number: 1, level: 'FÁCIL', short: 'Primeira conexão',
    headline: 'Sua primeira conexão', highlight: 'com a Internet.',
    description: 'Faça o celular alcançar a Internet Global e acompanhe uma resposta voltando pelo mesmo caminho.',
    task: 'Conectar à Internet', taskDetail: 'Monte o caminho e receba a resposta.',
    testLabel: 'Testar conexão', successTitle: 'Conectado à Internet!',
    successText: 'O celular alcançou a rede externa e recebeu uma resposta simulada pelo mesmo caminho.',
    equipment: [
      node('phone', 'Meu celular', 'Dispositivo de origem', 'phone', 'purple', 'DISPOSITIVO', 'source'),
      node('wifi', 'Roteador Wi-Fi', 'Rede da minha casa', 'wifi', 'amber', 'REDE LOCAL'),
      node('isp', 'Meu provedor', 'Acesso à Internet', 'router', 'blue', 'PROVEDOR'),
      { ...INTERNET, ports: 'target' }
    ],
    cables: [['phone','wifi'], ['wifi','isp'], ['isp','internet']],
    phases: [
      { label: 'Indo até a Internet Global', kind: 'network', path: ['phone','wifi','isp','internet'] },
      { label: 'Resposta voltando para o celular', kind: 'network', path: ['internet','isp','wifi','phone'] }
    ]
  },
  {
    id: 'message', number: 2, level: 'MÉDIO', short: 'Mensagem pelo WhatsApp',
    headline: 'Como uma mensagem', highlight: 'chega ao outro celular?',
    description: 'Conecte dois celulares por provedores diferentes e faça a mensagem passar pelo serviço do WhatsApp.',
    task: 'Entregar a mensagem', taskDetail: 'Do celular A até o celular B.',
    testLabel: 'Testar mensagem', successTitle: 'Mensagem entregue!',
    successText: 'A mensagem atravessou a rede, passou pelo serviço e chegou ao celular de destino.',
    equipment: [
      node('phoneA', 'Celular A', 'Origem da mensagem', 'phone', 'purple', 'ORIGEM', 'source'),
      node('wifiA', 'Roteador Wi-Fi A', 'Rede da casa A', 'wifi', 'amber', 'REDE LOCAL'),
      node('ispA', 'Provedor A', 'Acesso à Internet', 'router', 'blue', 'PROVEDOR'),
      INTERNET,
      node('whatsapp', 'WhatsApp', 'Serviço de mensagens', 'message', 'green', 'SERVIÇO'),
      node('ispB', 'Provedor B', 'Acesso à Internet', 'router', 'blue', 'PROVEDOR'),
      node('wifiB', 'Roteador Wi-Fi B', 'Rede da casa B', 'wifi', 'amber', 'REDE LOCAL'),
      node('phoneB', 'Celular B', 'Destino da mensagem', 'phone', 'pink', 'DESTINO', 'target')
    ],
    cables: [
      ['phoneA','wifiA'], ['wifiA','ispA'], ['ispA','internet'],
      ['internet','whatsapp'], ['internet','ispB'], ['ispB','wifiB'], ['wifiB','phoneB']
    ],
    phases: [{
      label: 'Entregando a mensagem pelo serviço', kind: 'network',
      path: ['phoneA','wifiA','ispA','internet','whatsapp','internet','ispB','wifiB','phoneB']
    }]
  },
  {
    id: 'game', number: 3, level: 'EXTREMO', short: 'Partida online',
    headline: 'Dois jogadores.', highlight: 'Uma partida online.',
    description: 'Conecte os dois PCs à mesma rede local, ligue o controle ao jogador 1 e encontre o servidor de jogo com ajuda do DNS.',
    task: 'Entrar na partida', taskDetail: 'Dois jogadores, um servidor de jogo.',
    testLabel: 'Testar partida', successTitle: 'Os dois jogadores estão online!',
    successText: 'Controle conectado, consultas DNS respondidas e os dois PCs comunicando com o servidor do jogo.',
    equipment: [
      node('controller', 'Controle', 'Periférico USB do jogador 1', 'gamepad', 'pink', 'ACESSÓRIO', 'usbSource', 'O controle se conecta ao computador por USB. Não é um cabo da rede.'),
      node('pc1', 'Player 1', 'Meu computador', 'monitor', 'purple', 'JOGADOR 1', 'pcUsb', 'Recebe o controle por USB e usa a rede local pelo switch.'),
      node('pc2', 'Player 2', 'PC do meu colega', 'monitor', 'pink', 'JOGADOR 2', 'source'),
      node('switch', 'Switch', 'Rede local dos jogadores', 'switch', 'amber', 'REDE LOCAL', 'both', 'Conecta vários dispositivos dentro de uma mesma rede local.'),
      node('router', 'Roteador', 'Saída da rede local', 'wifi', 'amber', 'ROTEADOR'),
      node('isp', 'Provedor', 'Acesso à Internet', 'router', 'blue', 'PROVEDOR'),
      INTERNET,
      node('dns', 'Servidor DNS', 'Descobre o IP do jogo', 'dns', 'violet', 'SERVIÇO', 'target', 'Ajuda a encontrar o endereço IP associado ao nome de um servidor.'),
      node('gameServer', 'Servidor do jogo', 'Hospeda a partida', 'server', 'green', 'SERVIDOR', 'target')
    ],
    cables: [
      ['controller','pc1'], ['pc1','switch'], ['pc2','switch'],
      ['switch','router'], ['router','isp'], ['isp','internet'],
      ['internet','dns'], ['internet','gameServer']
    ],
    phases: [
      { label: 'Conectando o controle ao Player 1', kind: 'usb', path: ['controller','pc1'] },
      { label: 'Player 1 consulta o DNS', kind: 'network', path: ['pc1','switch','router','isp','internet','dns','internet','isp','router','switch','pc1'] },
      { label: 'Player 1 acessa o servidor', kind: 'network', path: ['pc1','switch','router','isp','internet','gameServer','internet','isp','router','switch','pc1'] },
      { label: 'Player 2 consulta o DNS', kind: 'network', path: ['pc2','switch','router','isp','internet','dns','internet','isp','router','switch','pc2'] },
      { label: 'Player 2 entra na partida', kind: 'network', path: ['pc2','switch','router','isp','internet','gameServer','internet','isp','router','switch','pc2'] }
    ]
  }
];

export const MISSION_MAP = Object.fromEntries(MISSIONS.map(mission => [mission.id, mission]));

const LAYOUTS = {
  4: [{x:45,y:180},{x:320,y:180},{x:595,y:180},{x:870,y:180}],
  8: [
    {x:45,y:65},{x:310,y:65},{x:575,y:65},{x:840,y:65},
    {x:45,y:315},{x:310,y:315},{x:575,y:315},{x:840,y:315}
  ],
  9: [
    {x:50,y:45},{x:385,y:45},{x:720,y:45},
    {x:50,y:275},{x:385,y:275},{x:720,y:275},
    {x:50,y:505},{x:385,y:505},{x:720,y:505}
  ]
};

export function createShuffledNodes(mission) {
  const slots = (LAYOUTS[mission.equipment.length] || LAYOUTS[9]).map(p => ({ ...p }));
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return mission.equipment.map((data, i) => ({
    id: data.id, type: 'device', position: slots[i], deletable: false,
    data: { ...data, active: false, error: false }
  }));
}
