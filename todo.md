# QMS MAO Brasil - TODO

## Banco de Dados
- [x] Schema da tabela Defects com todos os campos
- [x] Schema da tabela AuditLog para rastreabilidade
- [x] Schema da tabela Comments para colaboração
- [x] Migração do banco de dados

## Backend (tRPC)
- [x] Rotas CRUD para Defects
- [x] Lógica de cálculo de step (workflow 8D)
- [x] Lógica de cálculo de currentResponsible
- [x] Lógica de cálculo de aging (todos os campos)
- [x] Lógica de cálculo de bucketAging
- [x] Lógica de cálculo de daysLate
- [x] Sistema de auditoria (AuditLog)
- [x] Rotas de importação de dados Excel
- [x] Rotas de exportação CSV/XLSX

## Frontend - Telas
- [x] Layout Dashboard com sidebar
- [x] Tela de Login com perfis (Admin, SQA, SupplierUser, Viewer)
- [x] Tela Principal (Defects List) com filtros e busca
- [x] Tela de Detalhe do Defeito (formulário por seções)
- [x] Kanban Board por step do workflow
- [x] Dashboard Executivo com gráficos
- [x] Tela de Relatórios (Symptom Report)
- [x] Funcionalidade de Importação de dados
- [x] Funcionalidade de Exportação CSV/XLSX

## Regras de Negócio
- [x] Cálculo automático do step baseado nas datas
- [x] Cálculo automático do responsável atual
- [x] Cálculo de aging em dias corridos
- [x] Validação de docNumber único
- [x] Botões de avanço de etapa preenchendo datas

## Testes e Validação
- [x] Testes unitários para cálculo de step
- [x] Testes unitários para cálculo de aging
- [x] Testes unitários para cálculo de bucketAging
- [x] Validação dos critérios de aceite QA


## Portal do Fornecedor
- [x] Tabela de fornecedores com credenciais de acesso
- [x] Rota de login específica para fornecedores
- [x] View restrita mostrando apenas casos do fornecedor logado
- [x] Formulário para atualizar causa raiz e ações corretivas
- [x] Auditoria de alterações feitas pelo fornecedor

## Notificações por E-mail (SLA)
- [x] Configuração de SLA por etapa do workflow
- [x] Job de verificação de casos que excedem SLA
- [x] Envio de e-mail para responsável quando SLA é excedido
- [x] Histórico de notificações enviadas
- [x] Configuração de destinatários por tipo de alerta

## Análise de Causa Raiz (RCA) no Dashboard
- [x] Agregação de causas raiz por categoria
- [x] Gráfico de Pareto das causas mais frequentes
- [x] Drill-down para ver casos por causa raiz
- [x] Filtros por período, fornecedor e severidade


## Migração de Dados e Independência do Excel
- [x] Extrair todos os dados da planilha Excel (117 defeitos)
- [x] Inserir dados no banco de dados do sistema
- [x] Cadastrar fornecedores automaticamente a partir dos dados (15 fornecedores)
- [x] Implementar formulário de criação de novos defeitos
- [x] Remover dependência da função de importação para uso diário
- [x] Validar que todos os dados foram migrados corretamente


## Bugs Reportados
- [x] Barra lateral de menu desapareceu - restaurar navegação


## Redesign Visual (conforme SDD e imagem de referência)
- [x] Atualizar tema global para azul marinho/escuro
- [x] Redesenhar sidebar com ícones coloridos
- [x] Atualizar Dashboard com novo layout de cards
- [x] Atualizar Lista de Defeitos com tabela estilizada
- [x] Atualizar Detalhe do Defeito com timeline do workflow 8D
- [x] Criar tela de Login com logo e estilo da referência
- [x] Manter todas as funcionalidades existentes intactas


## Configuração e Testes Finais
- [x] Configurar SLAs para cada etapa do processo 8D
- [x] Testar Portal do Fornecedor com código de acesso
- [x] Adicionar filtro por data (período) na Lista de Defeitos
- [x] Verificar e testar os 117 casos migrados com filtros


## Upload de Anexos no Portal do Fornecedor
- [x] Adicionar campo de upload de arquivos/imagens na seção de causa raiz
- [x] Integrar com S3 para armazenamento dos arquivos
- [x] Exibir lista de anexos já enviados
- [x] Permitir visualização e download dos anexos


## Correções de UI e Funcionalidades (Solicitação do Usuário)
- [x] Corrigir duplicação de header nas telas Fornecedores e SLA
- [x] Ajustar largura do conteúdo removendo espaço em branco à esquerda
- [x] Remover botão X desnecessário na tela de Defeitos
- [x] Melhorar design do botão voltar (seta) em todas as telas
- [x] Implementar funcionalidade para ícone Alerta (sino) - Central de Notificações
- [x] Implementar funcionalidade para ícone Configuração (engrenagem) - Preferências do Usuário


## Bug - Duplicação de Header (Novo Defeito)
- [x] Corrigir duplicação de header na tela Novo Defeito
- [x] Verificar e corrigir outras telas com o mesmo problema


## Melhoria UX - Botão Voltar Moderno
- [x] Identificar todas as telas com botão voltar
- [x] Aplicar design moderno de botão voltar em todas as telas
- [x] Padronizar estilo em todo o sistema


## Correção de Dados
- [x] Corrigir capitalização: "Wrong material" → "Wrong Material"
- [x] Identificar e corrigir dados duplicados (casos críticos e sintomas)
- [x] Verificar duplicidade KNAUF "Wet cushion" (107.11.25 e 105.11.25) - NÃO SÃO DUPLICATAS (modelos e PNs diferentes)


## Melhoria UX - Coluna Modelo
- [x] Adicionar coluna Modelo na tabela Casos Críticos (Dashboard)
- [x] Top Sintomas e Top Fornecedores são agregações (contagem), não precisam de coluna Modelo
- [x] Verificar outras tabelas - Lista de Defeitos já possui coluna Modelo


## Melhoria UX - Botões '...' Dashboard
- [x] Verificar funcionalidade dos botões '...' nas divs do Dashboard - NÃO TINHAM FUNCIONALIDADE
- [x] Remover botões sem funcionalidade (6 botões removidos)


## Redesign SDD-UX - Status Distribution
- [x] Implementar donut chart com stroke fino
- [x] Adicionar KPI central mostrando CLOSED (86%)
- [x] Substituir legenda por status cards verticais à direita
- [x] Destacar DELAYED com fundo vermelho claro e ícone de alerta
- [x] Adicionar header com última atualização e total de itens
- [x] Aplicar cores: verde muted para CLOSED, vermelho forte para DELAYED
- [x] Adicionar interação: click nos cards filtra defeitos por status


## Melhorias UX Dashboard - Animações e Interatividade
- [x] Animação de carregamento individual para cada card do dashboard
- [x] Tooltip com número exato de casos e porcentagem nos cards de status
- [x] Carrossel automático para Casos Críticos


## Redesign Pareto RCA
- [x] Redesenhar layout com gráfico de barras + linha à esquerda
- [x] Adicionar tabela de dados à direita com colunas: Tnenala, Qai, % voda


## Correção Importação de Planilha
- [x] Analisar planilha e identificar novos registros (10.01.26 faltando)
- [x] Verificar última data atualizada no sistema (9 registros de 2026 existentes)
- [x] Identificar problema na função de importação (mapeamento de colunas)
- [x] Corrigir função de importação para encontrar novos registros
- [x] Importar novo registro 10.01.26 manualmente


## Animação Card Slider - Critical Cases
- [x] Implementar animação de swipe horizontal para esquerda
- [x] Manter transição suave entre cards (0.4s ease-in-out)
- [x] Preservar dados e informações existentes


## Importação de Imagens de Evidências
- [x] Analisar coluna "T" da aba "NEW_FORM" da planilha - 136 imagens encontradas
- [x] Verificar viabilidade de importar imagens de evidências - VIÁVEL
- [ ] Implementar importação de imagens aos respectivos defeitos

## Cadastro e Edição de Fornecedores
- [x] Implementar cadastro de fornecedores com geração de código de acesso (já existia)
- [x] Implementar edição de nome, email e status dos fornecedores
- [x] Testar funcionalidades de fornecedores

## Configuração de SLAs
- [x] Implementar configuração de SLAs por etapa do workflow 8D (já existia em /sla-settings)
- [x] Definir prazos máximos por etapa (ex: 7 dias Causa Raiz, 5 dias Ação Corretiva)
- [x] Ativar alertas automáticos de SLA

## Job Automático de Verificação de SLA
- [x] Criar rotina automática de verificação diária de SLA (sendSlaAlerts já existe)
- [x] Implementar envio de notificações por email para casos atrasados (já implementado)
- [x] Testar job de verificação de SLA

## Bug Fix - Edição de Fornecedor
- [x] Corrigir erro "Failed query: update suppliers" ao tentar editar nome de fornecedor (KLABIN AM -> KLABIN S/A)

## Bug Fix - Atualização de Nome de Fornecedor
- [x] Lista de defeitos não atualiza nome do fornecedor após edição (mostra nome antigo "KLABIN AM" ao invés de "Klabin S/A_Unid.2")
- [x] Filtro de fornecedores mostra nomes obsoletos/duplicados que não existem mais no cadastro

## Documentação
- [x] Criar README.md profissional para o repositório GitHub
