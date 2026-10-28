# Auditoria técnica — 28/10/2026

Baseline: `c067372b31056a81d19caefc22410a428d6680f7`. Esta rodada registra evidências; não declara a aplicação homologada.

## Validação local

- Node.js 24.22.1; instalação com pnpm 10.4.1, conforme `packageManager`, usando `--frozen-lockfile --ignore-scripts`.
- `npm run check`: aprovado.
- `npm run build`: aprovado. Há chunks de aproximadamente 2,2 MB e 6,1 MB antes de gzip; não foi medida latência no navegador.
- `npm test`, sem `DATABASE_URL`: 553 testes, 440 aprovados e 113 falhos em oito arquivos. Há erros explícitos de banco indisponível, além de asserções sobre retornos nulos. Isso não demonstra 113 defeitos independentes de produto.
- `pnpm audit --json`: contagens informadas pelo pnpm de 7 critical, 70 high, 112 moderate e 22 low. Contagens podem incluir múltiplas cadeias/ocorrências; não representam 211 CVEs distintos nem exploração comprovada.
- A árvore da branch não contém `.github/workflows/`; a consulta de Actions retornou zero execuções.

## Bloqueios e correção proposta

1. Preparar MySQL descartável e fixtures sintéticas, executar migrações e reproduzir todos os testes sem acesso a produção. Separar explicitamente testes unitários e de integração somente depois de classificar as dependências reais; não ocultar falhas com skips genéricos.
2. Atualizar dependências por grupos, preservando o patch de wouter e o lockfile. Reexecutar tipagem, testes, PDF, importação Excel e build em cada grupo.
3. Avaliar a substituição/atualização suportada de `xlsx`: o relatório aponta dois advisories HIGH e não indica versão corrigida no canal npm consultado. Não instalar uma URL arbitrária nem forçar resolução para declarar o risco encerrado.
4. Priorizar advisories críticos de `fast-xml-parser`, `jspdf`, `proxy-addr` e `tinypool`, distinguindo dependências de runtime das ferramentas de build e teste. Consultar os avisos atuais antes de escolher versões.
5. Adicionar CI com banco isolado e nomes estáveis de checks após obter uma baseline reproduzível. Proteger a branch somente depois de observar esses checks na CI.
6. Medir importação e inferência de IA no navegador antes de alterar a divisão do bundle. Tamanho de bundle não equivale a benchmark.

## Limites

Não foram acessados secrets, banco de produção, console de deploy nem proteções administrativas. Não foram aplicadas atualizações de dependências sem a regressão de integração necessária. A suíte completa e a remediação de vulnerabilidades permanecem abertas.
