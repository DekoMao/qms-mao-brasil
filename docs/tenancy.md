# Multi-tenancy no QTrack System

## Objetivo

O QTrack isola dados por planta ou unidade operacional usando `tenantId` nas entidades de negócio e um contexto de tenant resolvido a cada requisição. O isolamento é aplicado no backend; o tenant selecionado no navegador não é uma fronteira de segurança.

## Resolução do tenant

O contexto ativo é resolvido a partir da identidade autenticada e do tenant ativo persistido no perfil do usuário. A sessão também pode informar o tenant por cabeçalho quando a integração exige esse comportamento. Se nenhum tenant explícito for informado, o sistema usa o tenant padrão permitido para o usuário. A procedure `tenantProcedure` exige um contexto válido antes de executar operações sensíveis.

## Escopo das consultas

As consultas de defeitos, relatórios, COPQ, scorecards, notificações, documentos, webhooks e sugestões de IA recebem o tenant ativo e aplicam a condição correspondente. Consultas por identificador também validam o tenant antes de retornar o registro. A troca de tenant invalida as queries do cliente para evitar exibição de dados obsoletos.

## Administração

A tela de administração de tenants permite listar unidades, criar um novo tenant e gerenciar membros. O usuário deve ter uma permissão administrativa compatível para executar mudanças de membros ou configurações. A auditoria registra trocas de tenant e tentativas de acesso negadas.

## Boas práticas para integrações

Integrações externas devem enviar `X-Tenant-Id` somente quando a chave de API tiver acesso à unidade solicitada. Nunca use `tenantId` recebido do cliente para montar uma consulta diretamente; valide o acesso no middleware e nas procedures. Ao criar um registro, grave o tenant derivado do contexto autenticado.

## Checklist operacional

1. Criar o tenant e o usuário administrador.
2. Associar os membros com o papel mínimo necessário.
3. Confirmar o tenant ativo no header do Dashboard.
4. Testar que um registro de outra unidade retorna `NOT_FOUND` ou `FORBIDDEN`.
5. Revisar o audit trail após uma troca de tenant.
