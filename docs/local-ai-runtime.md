# Runtime de IA local no QTrack

## Arquitetura implementada

O QTrack usa três camadas, sempre no navegador:

1. **Regras em Web Worker** — caminho padrão e sempre disponível. Calcula métricas determinísticas sobre snapshots agregados e isolados por tenant/período.
2. **Classificador semântico em WASM** — opcional. Usa `Xenova/paraphrase-multilingual-MiniLM-L12-v2` via Transformers.js para mapear perguntas livres ao catálogo de intenções; os números continuam sendo calculados pelas regras.
3. **Phi-3.5 em WebGPU** — opcional. Usa `Phi-3.5-mini-instruct-q4f16_1-MLC-1k` via WebLLM em Worker dedicado para interpretar somente o contexto agregado produzido pelo motor determinístico. A variante de 1k reduz o requisito estimado de VRAM para cerca de 2,5 GB.

Nenhuma dessas rotas chama procedures tRPC de IA. O backend fornece os mesmos agregados tenant-scoped exibidos no Dashboard; a análise e a interpretação ocorrem no navegador.

## Modos de execução

| Modo | Comportamento | Fallback |
|---|---|---|
| Automático | Prioriza Phi-3 carregado, depois WASM carregado | Regras locais |
| Regras locais | Somente agregações determinísticas | Não necessário |
| Phi-3 · WebGPU | Interpretação generativa sobre agregados | Regras locais se não carregado/falhar |
| Semântico · WASM | Classificação de intenção multilíngue | Regras locais se não carregado/falhar |

A escolha é persistida apenas em `localStorage`. O modelo Phi-3 é baixado somente após ação explícita e armazenado em IndexedDB. A UI permite limpar a sessão e remover modelo/cache. O Worker WASM pode ser descarregado da memória.

## Privacidade e auditoria

- O Phi-3 recebe somente snapshot, filtros e métricas agregadas; registros individuais não são incluídos no prompt.
- Perguntas e respostas **não são gravadas** na auditoria.
- A auditoria local armazena no máximo 50 metadados: timestamp, modo, intenção, confiança, latência, snapshot, filtro e nome do modelo.
- O usuário pode limpar contexto, foco e auditoria local.
- A interface nunca declara execução generativa offline quando o modelo não está carregado.

## ChartSpec seguro

A IA não gera HTML ou JSX. O renderer aceita somente o schema Zod `localChartSpecSchema`, limitado aos tipos `bar`, `line`, `area`, `pie`, `kpi` e `table`, com dados numéricos e textos limitados. Especificações desconhecidas são rejeitadas antes da renderização.

## Fontes técnicas

- Transformers.js: https://huggingface.co/docs/transformers.js/en/index
- Modelo multilíngue compatível: https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2
- WebLLM: https://webllm.mlc.ai/
- WebLLM API e Workers: https://github.com/mlc-ai/web-llm

## Limitações

- O primeiro carregamento exige internet e espaço local para os artefatos.
- Phi-3 via WebLLM requer WebGPU. Em máquinas sem GPU compatível, o modo WASM oferece interpretação semântica, mas não geração livre.
- O desempenho varia conforme navegador, memória e GPU; tempos de inicialização e inferência são mostrados na interface.
- Manter modelos grandes em cache é uma escolha do usuário; o QTrack não baixa modelos silenciosamente.

## Verificação executada

Em 25/09/2026, o Worker analítico respondeu corretamente à consulta de aging por fornecedor. O classificador semântico WASM foi carregado em navegador real e classificou “Onde os prazos estão em maior risco?” como intenção `sla`, com confiança 0,637. O primeiro ciclo completo levou 4.345 ms e o carregamento subsequente usando cache levou 2.493 ms. O Phi-3 não foi baixado durante a validação automatizada porque exige aproximadamente 2,5 GB de VRAM; sua integração, Worker, bundle, tipos, progresso e gestão de cache foram validados por compilação e build.
