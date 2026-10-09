# Galeria de telas — QTrack System

Capturas reais da aplicação, realizadas em **09/10/2026**, a partir da versão `0412dcd5`. As telas autenticadas usam viewport desktop de **1440 × 1000 px**; as imagens de página completa preservam a altura do conteúdo. A tela pública de login usa o viewport do navegador da captura.

Os dados de qualidade exibidos pertencem à base demonstrativa descrita no README principal. **Nome, e-mail e avatar do perfil foram ocultados de forma irreversível** nas telas autenticadas. A tela de fornecedores não foi incluída para não publicar códigos de acesso ao portal. Nenhum token, segredo, configuração de autenticação ou código de acesso foi adicionado à galeria.

As imagens documentam o estado real observado: módulos como COPQ, BI, documentos e predição podem aparecer vazios por ausência de dados/configuração na base usada. Não foram inseridos dados nem alteradas configurações para produzir as capturas. Capturas de viewport podem não mostrar todo o conteúdo; o Kanban possui rolagem horizontal. A captura de página completa do Dashboard não inclui controles flutuantes fixos.

[Voltar à documentação principal](../../README.md)

## Índice

| Tela | Arquivo | Conteúdo |
|---|---|---|
| Login | [login.png](login.png) | Acesso público ao sistema |
| Dashboard | [dashboard.png](dashboard.png) | KPIs, status e visão operacional |
| Dashboard completo | [dashboard-completo.png](dashboard-completo.png) | Página completa com casos críticos e Pareto |
| Lista de defeitos | [defeitos.png](defeitos.png) | Filtros e rastreamento de não conformidades |
| Novo defeito | [novo-defeito.png](novo-defeito.png) | Formulário de identificação e classificação |
| Kanban | [kanban.png](kanban.png) | Etapas do workflow 8D |
| Importação | [importacao.png](importacao.png) | Upload Excel e mapeamento de colunas |
| COPQ | [copq.png](copq.png) | Custos da não qualidade; base sem custos registrados |
| Scorecard | [scorecard.png](scorecard.png) | Avaliação dos fornecedores e métricas |
| BI Embedded | [bi-embedded.png](bi-embedded.png) | Estado inicial de criação de dashboards |
| AI Control Center | [ai-control-center.png](ai-control-center.png) | Sete agentes e abas de governança |
| Relatórios | [relatorios.png](relatorios.png) | Filtros, prévia e exportação |
| SLA | [sla.png](sla.png) | Configuração de prazos e alertas |
| Documentos | [documentos.png](documentos.png) | Gestão documental; base sem documentos |
| Predição | [predicao.png](predicao.png) | Recorrência e heatmap; dados insuficientes na captura |
| Workflows | [workflows.png](workflows.png) | Definições e templates de workflow |

## Acesso e visão operacional

### Login

![Tela de login do QTrack System](login.png)

### Dashboard

![Dashboard operacional com indicadores e gráficos](dashboard.png)

### Dashboard completo

![Dashboard completo com casos críticos e Pareto de causas raiz](dashboard-completo.png)

### Lista de defeitos

![Lista de defeitos com filtros e status](defeitos.png)

### Novo defeito

![Formulário de cadastro de novo defeito](novo-defeito.png)

### Kanban 8D

![Kanban com etapas do processo 8D](kanban.png)

### Importação

![Importação de planilhas e mapeamento único de colunas](importacao.png)

## Análises e IA

### COPQ

![Dashboard de custos da não qualidade sem custos registrados](copq.png)

### Scorecard

![Scorecard com avaliação de desempenho dos fornecedores](scorecard.png)

### BI Embedded

![Tela inicial do BI Embedded sem dashboards configurados](bi-embedded.png)

### AI Control Center

![AI Control Center com os sete agentes do QTrack](ai-control-center.png)

### Relatórios

![Relatórios com filtros e prévia de dados](relatorios.png)

### Predição

![Predição de recorrência sem dados suficientes na captura](predicao.png)

## Gestão e configuração

### SLA

![Configuração de prazos SLA por etapa](sla.png)

### Documentos

![Controle de documentos com estado vazio](documentos.png)

### Workflows

![Editor e catálogo de workflows](workflows.png)

## Integridade e atualização

O arquivo [manifest.json](manifest.json) registra data, versão de origem, dimensões, tamanho e anonimização de cada imagem. As capturas são PNGs versionados nesta pasta, usados exclusivamente na documentação: não alteram o frontend nem o bundle publicado.

Ao atualizar a galeria, recapture a aplicação, confira a ausência de dados pessoais, tokens e códigos de acesso, substitua apenas os arquivos correspondentes e atualize o manifesto.
