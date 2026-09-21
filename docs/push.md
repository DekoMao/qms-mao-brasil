# Web Push

## Visão geral

O QTrack usa Web Push com VAPID para enviar alertas operacionais ao navegador. O service worker recebe a mensagem, exibe a notificação e direciona o usuário para a URL profunda enviada no payload.

## Configuração VAPID

Em produção, defina `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` como secrets do servidor. Em desenvolvimento, o sistema gera um par em memória e registra as chaves no log para facilitar a configuração; essas chaves não devem ser usadas como configuração permanente.

## Fluxo do cliente

1. A página solicita permissão de notificação ao usuário.
2. O navegador cria uma `PushSubscription` usando a chave pública VAPID.
3. A inscrição é enviada ao backend com endpoint, `p256dh`, `auth` e user agent.
4. O backend desativa inscrições anteriores para o mesmo endpoint e salva a nova inscrição.
5. O service worker trata `push` e `notificationclick`, abrindo o deep link da mensagem.

A tela `/push-settings` permite ativar/desativar o dispositivo, consultar inscrições ativas e enviar uma notificação de teste.

## Payload

```json
{
  "title": "SLA excedido",
  "body": "O defeito 123 precisa de atenção.",
  "icon": "/icons/icon-192x192.png",
  "tag": "sla-123",
  "url": "/defects/123"
}
```

## Entrega e limpeza

O servidor retorna `sent`, `failed` e `total`. Respostas HTTP 404 ou 410 desativam automaticamente a inscrição inválida. Falhas transitórias permanecem disponíveis para diagnóstico sem impedir o envio para os demais dispositivos.

## Privacidade e operação

A inscrição é vinculada ao usuário e, opcionalmente, ao tenant. Não armazene conteúdo sensível no payload: a notificação deve conter apenas um resumo e um link autenticado para o QTrack.
