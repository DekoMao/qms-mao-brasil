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
