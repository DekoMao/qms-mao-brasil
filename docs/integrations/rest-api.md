# API REST pública v1

## Base URL e autenticação

A API está disponível em `/api/v1`. A especificação OpenAPI atualizada pode ser consultada em `GET /api/v1/docs`.

Todas as chamadas protegidas usam uma chave criada na tela **API Keys**:

```http
Authorization: Bearer qtk_live_...
X-Tenant-Id: 12
```

`X-Tenant-Id` é opcional quando a chave já está vinculada a um tenant; quando enviado, o middleware valida se a chave pertence à unidade informada. Chaves revogadas ou expiradas retornam `401`.

## Escopos

Os escopos são verificados antes do handler: `defects:read`, `defects:write`, `reports:read` e `suppliers:read`. Uma chamada sem o escopo necessário retorna `403`.

## Endpoints

| Método | Caminho | Escopo | Descrição |
|---|---|---|---|
| GET | `/api/v1/defects` | `defects:read` | Lista paginada com filtros |
| GET | `/api/v1/defects/:id` | `defects:read` | Consulta um defeito |
| POST | `/api/v1/defects` | `defects:write` | Cria um defeito |
| PATCH | `/api/v1/defects/:id` | `defects:write` | Atualiza um defeito |
| GET | `/api/v1/reports/stats` | `reports:read` | Indicadores do tenant |
| GET | `/api/v1/reports/copq` | `reports:read` | Custos de baixa qualidade |
| GET | `/api/v1/suppliers` | `suppliers:read` | Fornecedores disponíveis |
| GET | `/api/v1/docs` | público | Especificação OpenAPI em JSON |

## Paginação e filtros

`GET /defects` aceita `page`, `pageSize`, `status`, `supplier`, `step`, `mg`, `model`, `customer`, `owner`, `search`, `dateFrom` e `dateTo`. O backend aplica soft delete e tenant isolation antes de retornar os registros.

Exemplo:

```bash
curl -H "Authorization: Bearer $QTRACK_API_KEY" \
  -H "X-Tenant-Id: 12" \
  "$QTRACK_URL/api/v1/defects?page=1&pageSize=50&status=DELAYED"
```

## Respostas e erros

As respostas de sucesso são JSON. Erros usam o formato `{ "error": "CODE", "message": "..." }`. Os códigos mais comuns são `400` para payload inválido, `401` para autenticação ausente ou inválida, `403` para escopo/tenant não autorizado e `404` para registro inexistente no tenant ativo.

## Segurança operacional

Mantenha a chave somente no servidor integrador, aplique rotação periódica e revogue chaves comprometidas imediatamente. Não inclua chaves em logs, screenshots ou repositórios. Para novos consumidores, prefira `defects:read` e `reports:read` em vez de conceder `defects:write`.
