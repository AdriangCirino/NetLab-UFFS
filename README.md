# NetLab UFFS 

Jornada educativa com **três missões obrigatórias e sequenciais**, usando React, React Flow e Vite. Não há servidor, cadastro ou ranking.

## Executar

```bash
npm install
npm run dev
```

## Testes e produção

```bash
npm test
npm run build
npm run preview
```

## Como funcionam as missões

1. **Primeira conexão:** Celular → Roteador Wi-Fi → Provedor → Internet Global, seguido da volta de uma resposta didática.
2. **Mensagem pelo WhatsApp:** os mesmos oito equipamentos do laboratório original. A comunicação passa pelo serviço de mensagens e chega ao celular B. O nó Internet Global pode ser visitado mais de uma vez sem duplicar o cabo.
3. **Partida online:** Controle USB → Player 1; Player 1 e Player 2 → Switch → Roteador → Provedor → Internet Global, com dois ramos: DNS e servidor de jogo. Os dois jogadores consultam o DNS e depois se comunicam com o servidor de jogo. O controle é um **periférico USB**, não um elemento do tráfego da Internet.

Em cada missão, o participante pode iniciar, conectar cabos e testar. Falhas **não param o cronômetro**: o pacote percorre os trechos corretos até a primeira ligação faltante. Com cabos extras, a rede não é aprovada mesmo se o caminho principal estiver completo. A validação exige o conjunto exato de conexões.

Após a vitória, os cabos ficam travados, **a topologia permanece visível** e só é possível avançar para a próxima missão. Não é possível reiniciar a missão concluída. A próxima missão é desbloqueada pelo botão **Próxima missão**. Após a terceira, **Nova rodada** ou **F5** inicia a jornada do zero. Os dados são mantidos apenas na memória da página: um F5 antes do final também reinicia todas as missões.

## Controles

- **Arrastar a saída verde até a entrada azul:** criar um cabo de rede.
- **Conector roxo:** cabo USB do controle (apenas no desafio 3).
- **Dois cliques sobre um cabo:** removê-lo antes de concluir a missão.
- **Clique no cabo + Excluir cabo:** alternativa para exclusão.
- **Arrastar o fundo:** navegar pela bancada.
- **Scroll / gestos:** zoom. **Centralizar:** recuperar os equipamentos.
- **Ícone ? em alguns nós:** explicação curta sobre switch, DNS e controle.

## Estrutura

- `src/missions.js`: dados, nós, rotas e etapas dos três desafios.
- `src/network.js`: validação da topologia e simulação do percurso.
- `src/network.test.js`: testes das regras de cada missão.
- `src/App.jsx`: interface, navegação entre etapas, cronômetro e animação.
- `src/styles.css`: tema UFFS e bancada multicolorida.



## Observações didáticas

- A primeira missão usa uma resposta simulada de um serviço na Internet: em redes reais, alcançar a Internet não é por si só suficiente para demonstrar que uma aplicação respondeu.
- DNS **informa o endereço IP**, não encaminha o tráfego até o servidor do jogo. Por isso o DNS e o servidor são ramificações independentes da Internet Global.
- A simulação não reproduz protocolos reais nem a infraestrutura interna do WhatsApp. Cabos na bancada representam relações de conectividade simplificadas, não necessariamente o meio físico exato.
