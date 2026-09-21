# BI embutido

## Conceito

O módulo BI permite criar dashboards por tenant e compô-los com widgets configuráveis. Cada widget guarda tipo visual, fonte de dados, configuração e posição, enquanto o backend resolve os dados com o tenant ativo.

## Dashboards

A página `/bi` lista dashboards próprios e dashboards compartilhados. O usuário pode criar, renomear, compartilhar, ajustar o layout e remover dashboards. A exclusão é lógica para preservar rastreabilidade.

## Widgets

Os widgets suportam indicadores, barras, linhas, pizza/donut, gauge, tabela, heatmap e variações compactas. A posição é persistida como `{ x, y, w, h }`, permitindo reconstruir o layout após recarregar a página.

## Fontes de dados

As fontes incluem contagem de defeitos, distribuição por status e severidade, fornecedor, planta/categoria, tendência mensal, SLA e indicadores de COPQ. `resolveData` recebe a fonte e uma configuração opcional e aplica automaticamente o filtro de tenant.

Exemplo conceitual:

```json
{
  "widgetType": "LINE_CHART",
  "title": "Defeitos por mês",
  "dataSource": "DEFECT_TREND",
  "config": { "period": "12m" },
  "position": { "x": 0, "y": 0, "w": 6, "h": 3 }
}
```

## Controle de acesso

A criação, edição e remoção usam procedures protegidas. Dashboards compartilhados podem ser consultados por usuários autorizados do tenant, mas a atualização exige que o usuário seja o proprietário. Dados são resolvidos no backend; não confie em filtros enviados pelo navegador para isolamento.

## Performance

Use fontes agregadas para cards executivos, limite tendências a períodos úteis e configure auto-refresh apenas quando necessário. Para novos widgets, adicione o resolver, sua cobertura de teste e a opção visual na página antes de disponibilizar a fonte em produção.
