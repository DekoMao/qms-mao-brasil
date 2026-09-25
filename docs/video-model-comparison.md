# Análise do modelo de dashboard com IA local e adaptação para o QTrack

## 1. Escopo e evidências

Foi analisado o vídeo `Gravando2026-09-24225622.mp4` e a mensagem que o acompanha. A análise visual identificou um dashboard analítico de RH com chat conversacional, foco visual nos gráficos citados pela IA, cartões de desdobramento e um gerador de gráficos. O arquivo não apresentou uma faixa de áudio recuperável pela transcrição automática; portanto, a avaliação da fala foi complementada pelo texto fornecido pelo usuário.

## 2. O que caracteriza o modelo

O modelo combina cinco ideias centrais. Primeiro, há uma tela analítica única, com navegação compacta e conteúdo organizado em um grid de cartões. Segundo, a interface usa glassmorphism sobre um fundo azul profundo com roxo reservado para a camada de IA. Terceiro, o chat é um controlador do dashboard, e não apenas um canal de perguntas: a resposta destaca os componentes que sustentam a explicação. Quarto, a ação de desmembrar uma análise cria subinsights e mini-cartões sem retirar o usuário do contexto. Quinto, o produto comunica explicitamente privacidade e processamento local por meio de indicadores de GPU, modo offline e ausência de nuvem.

## 3. Estado atual do QTrack

O QTrack já possui uma base forte para reproduzir a experiência: tema dark navy permanente, Recharts, cards de KPI, alertas de acurácia, AI Control Center com sete agentes, métricas e guardrails, além de um componente `AIChatBox` reutilizável. O Dashboard já consulta a tendência de acurácia do Triage Agent e o AI Control Center possui uma identidade de IA em roxo.

A principal diferença arquitetural é importante: o `AIChatBox` atual é uma UI genérica que recebe mensagens e delega o processamento à camada de servidor; o projeto também usa integração LLM no backend. Portanto, o QTrack ainda não pode afirmar que “nenhuma informação sai do computador” para todas as perguntas. Para alcançar essa afirmação, será necessário criar um modo local explícito e impedir chamadas externas nesse modo.

## 4. Comparativo de lacunas

| Característica do modelo | Situação no QTrack | Adaptação recomendada |
|---|---|---|
| Chat persistente no dashboard | Componente de chat existente, não integrado ao Dashboard | Adicionar dock conversacional recolhível no Dashboard e AI Control Center |
| Perguntas em linguagem natural | Agentes e LLM existentes, sem controlador visual de consultas | Criar intents de qualidade e um plano de visualização tipado |
| IA destaca o gráfico citado | Não há foco coordenado entre chat e cards | Usar `data-focus-id`, estado global de foco e classe `ai-focus-glow` |
| Desmembrar análise | Não há fluxo de subinsights no Dashboard | Botão “Desmembrar análise” gerando mini-cards e drill-down inline |
| Gerador de gráficos | Recharts existe, mas gráficos são definidos pela tela | Criar catálogo de métricas e renderer seguro para especificações de gráfico |
| Indicador de processamento local | Não existe como estado funcional | Adicionar status `Local / GPU / WASM / Servidor` com explicação e consentimento |
| Privacidade | Tema e guardrails existem, mas não são equivalentes a execução local | Classificar o modo de execução e registrar claramente o que é processado localmente |
| Glassmorphism | Tema é navy enterprise, com cards sólidos | Adotar glassmorphism moderado apenas na camada de IA, sem abandonar legibilidade enterprise |

## 5. Arquitetura recomendada

### 5.1 Motor analítico local antes do modelo generativo

Criar um `LocalQualityAnalyticsEngine` executado em Web Worker. Ele deve receber apenas dados necessários e calcular localmente indicadores como defeitos por fornecedor, aging, SLA, severidade, etapa 8D, recorrência, COPQ e acurácia dos agentes. A maior parte das perguntas operacionais pode ser respondida por regras e agregações determinísticas, sem LLM.

O motor deve retornar uma estrutura estável, por exemplo:

```ts
{
  answer: string;
  intent: "aging" | "supplier" | "sla" | "copq" | "triage_accuracy" | "general";
  focusIds: string[];
  cards: Array<{ title: string; value?: string; explanation: string; chart?: ChartSpec }>;
  confidence: number;
  execution: "local-webgpu" | "local-wasm" | "rules" | "server";
}
```

### 5.2 Modelo local opcional

Para perguntas que exigem interpretação semântica, usar um adaptador de modelo local em Web Worker. A ordem de fallback deve ser WebGPU, depois WASM, depois regras determinísticas. Um modo servidor pode continuar existindo para usuários que optarem por ele, mas deve ser rotulado e nunca ser apresentado como offline.

O modelo local deve receber contexto agregado e campos mínimos, não a base inteira. Recomenda-se uma política de retenção zero para prompts e respostas locais, além de um controle para apagar o contexto de sessão.

### 5.3 Plano de visualização seguro

A IA não deve gerar JSX nem HTML. Ela deve gerar somente `ChartSpec` validado por Zod, com tipos permitidos como `line`, `bar`, `area`, `pie`, `kpi` e `table`, além de referências a datasets já calculados localmente. O renderer React existente cria o gráfico. Isso reduz risco de injeção, evita layouts imprevisíveis e facilita testes.

## 6. Experiência visual proposta para o QTrack

A recomendação não é substituir o dark navy por uma cópia do dashboard de RH. O melhor resultado é um híbrido: manter o navy #0A1628, teal #00D4AA e gold #F5A623 como identidade operacional; aplicar roxo #8B5CF6 somente à camada gerada pela IA; e usar transparência, blur e glow nos cartões da IA.

O topo do Dashboard deve receber três chips discretos: `IA Local`, `GPU` ou `WASM`, e `Dados protegidos`. Ao lado, um botão abre o chat lateral. Quando a resposta mencionar, por exemplo, “fornecedores com maior aging”, o card de fornecedores recebe foco roxo, a legenda correspondente ganha halo e o chat mostra a origem do cálculo.

Cada resposta deve incluir ações curtas: `Desmembrar análise`, `Gerar gráfico`, `Ver defeitos`, `Copiar resumo` e `Limpar foco`. O desmembramento deve abrir três ou quatro mini-cards, como “aging por fornecedor”, “SLA por etapa”, “severidade” e “casos críticos”, sem navegar para outra página.

## 7. Consultas iniciais a suportar

A primeira versão deve suportar perguntas com alto valor e baixa ambiguidade:

1. “Qual é o panorama geral dos defeitos no período?”
2. “Quais fornecedores têm maior aging?”
3. “Onde o SLA está mais ameaçado?”
4. “Como está a acurácia do Triage Agent?”
5. “Mostre a evolução semanal de defeitos e atrasos.”
6. “Compare severidade por fornecedor.”
7. “Quais causas raiz aparecem com maior frequência?”
8. “Gere um gráfico de Pareto dos defeitos.”

Perguntas fora do catálogo devem retornar uma resposta honesta, sugerir reformulação e não acionar servidor automaticamente quando o modo local estiver ativo.

## 8. Plano de implementação por fases

### Fase 1 — Experiência e contratos

Adicionar o dock de chat ao Dashboard, status de execução local, prompts sugeridos, estado global de foco, `ChartSpec` validado e cards de insight. Nesta fase, o motor pode usar regras locais sem modelo generativo.

### Fase 2 — Analytics local

Implementar o Web Worker com agregações de qualidade, cache por tenant/período e catálogo de intenções. Garantir que filtros e dados exibidos no Dashboard sejam a mesma fonte usada pelo chat.

### Fase 3 — Modelo local

Adicionar WebGPU com fallback WASM, download explícito do modelo, indicador de progresso, armazenamento local e opção de remover o modelo. Medir tempo de inicialização, memória e latência em máquinas sem GPU.

### Fase 4 — Explicabilidade e governança

Exibir as métricas que sustentam cada resposta, confiança, data do snapshot, filtros ativos e modo de execução. Registrar somente metadados de auditoria, sem salvar dados sensíveis nos prompts.

## 9. Critérios de aceitação

O trabalho estará alinhado ao modelo quando o usuário conseguir perguntar uma consulta suportada sem rede, receber uma resposta em até poucos segundos após o motor estar carregado, ver o gráfico relacionado ganhar foco visual, abrir subinsights sem sair do Dashboard e identificar claramente que a execução ocorreu por regras, WebGPU ou WASM. O sistema deve continuar funcional com o modelo local indisponível e nunca declarar “offline” quando uma chamada de servidor tiver sido feita.

## 10. Recomendação executiva

A maior oportunidade não é apenas trocar cores ou adicionar um chat. É transformar o AI Control Center em uma camada conversacional do QTrack: **perguntar, explicar, apontar e desdobrar**. Recomenda-se começar por regras e agregações locais, porque elas entregam privacidade real, previsibilidade e valor imediato; o modelo Phi-3 ou equivalente deve entrar depois como interpretador opcional, não como única fonte de verdade dos indicadores.

## 11. Status de implementação — 25/09/2026

As quatro fases propostas foram implementadas. O Dashboard agora possui o dock QTrack Insight, foco coordenado, subinsights e ações contextuais. As métricas são calculadas em Web Worker e armazenadas em cache apenas por snapshot agregado, tenant e período. O catálogo cobre as oito consultas iniciais, com resposta segura para perguntas fora do escopo.

O modo local oferece regras determinísticas, classificação semântica multilíngue em WASM e Phi-3.5 quantizado em WebGPU, ambos executados em Workers. O download dos modelos é explícito, o Phi-3 usa IndexedDB e pode ser removido, e falhas nunca acionam servidor automaticamente.

A governança inclui ChartSpec validado por Zod, evidências e fórmulas, confiança, latência, timestamp, filtros e auditoria local limitada a metadados. Perguntas e respostas não são persistidas.
