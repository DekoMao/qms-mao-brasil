import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bell, BellOff, Send, Smartphone, CheckCircle, XCircle, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSettings() {
  const { t } = useTranslation();
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const vapidQuery = trpc.push.vapidPublicKey.useQuery();
  const subscribeMut = trpc.push.subscribe.useMutation();
  const unsubscribeMut = trpc.push.unsubscribe.useMutation();
  const sendTestMut = trpc.push.sendTest.useMutation();
  const mySubsQuery = trpc.push.mySubscriptions.useQuery();

  useEffect(() => {
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setSwRegistration(reg);
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const handleSubscribe = async () => {
    if (!vapidQuery.data?.publicKey || !swRegistration) {
      toast.error("Service Worker ou VAPID key não disponível");
      return;
    }

    setLoading(true);
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== "granted") {
        toast.error("Permissão de notificação negada pelo navegador");
        setLoading(false);
        return;
      }

      // Subscribe to push
      const sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidQuery.data.publicKey),
      });

      const keys = sub.toJSON().keys!;
      await subscribeMut.mutateAsync({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh!,
        auth: keys.auth!,
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      mySubsQuery.refetch();
      toast.success("Push notifications ativadas com sucesso!");
    } catch (err: any) {
      console.error("Subscribe error:", err);
      toast.error(err.message || "Erro ao ativar push notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!swRegistration) return;
    setLoading(true);
    try {
      const sub = await swRegistration.pushManager.getSubscription();
      if (sub) {
        await unsubscribeMut.mutateAsync({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      mySubsQuery.refetch();
      toast.success("Push notifications desativadas");
    } catch (err: any) {
      toast.error(err.message || "Erro ao desativar");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    try {
      const result = await sendTestMut.mutateAsync();
      if (result.sent > 0) {
        toast.success(`Notificação de teste enviada para ${result.sent} dispositivo(s)`);
      } else {
        toast.warning("Nenhum dispositivo ativo encontrado");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar teste");
    }
  };

  const supportsNotifications = "Notification" in window;
  const supportsPush = "PushManager" in window;
  const supportsServiceWorker = "serviceWorker" in navigator;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Push Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Receba alertas em tempo real sobre defeitos, SLA e atualizações do sistema
        </p>
      </div>

      {/* Browser Compatibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Compatibilidade do Navegador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {supportsNotifications ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Notifications API</span>
            </div>
            <div className="flex items-center gap-2">
              {supportsPush ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Push API</span>
            </div>
            <div className="flex items-center gap-2">
              {supportsServiceWorker ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Service Worker</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            Status da Assinatura
          </CardTitle>
          <CardDescription>
            {isSubscribed
              ? "Push notifications estão ativas neste dispositivo"
              : "Push notifications estão desativadas"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Permissão:</span>
            <Badge
              variant={
                permissionState === "granted"
                  ? "default"
                  : permissionState === "denied"
                  ? "destructive"
                  : "secondary"
              }
            >
              {permissionState === "granted"
                ? "Concedida"
                : permissionState === "denied"
                ? "Negada"
                : "Pendente"}
            </Badge>
          </div>

          {permissionState === "denied" && (
            <Alert variant="destructive">
              <AlertTitle>Permissão Bloqueada</AlertTitle>
              <AlertDescription>
                As notificações foram bloqueadas nas configurações do navegador. Para reativar,
                clique no ícone de cadeado na barra de endereço e altere a permissão de notificações.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            {!isSubscribed ? (
              <Button
                onClick={handleSubscribe}
                disabled={loading || permissionState === "denied" || !supportsPush}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Ativar Notificações
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleUnsubscribe} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <BellOff className="h-4 w-4 mr-2" />
                  )}
                  Desativar
                </Button>
                <Button variant="secondary" onClick={handleSendTest} disabled={sendTestMut.isPending}>
                  {sendTestMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar Teste
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Dispositivos Ativos
          </CardTitle>
          <CardDescription>
            Dispositivos registrados para receber push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mySubsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : mySubsQuery.data && mySubsQuery.data.length > 0 ? (
            <div className="space-y-3">
              {mySubsQuery.data.map((sub: any) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {sub.userAgent
                          ? sub.userAgent.includes("Chrome")
                            ? "Google Chrome"
                            : sub.userAgent.includes("Firefox")
                            ? "Mozilla Firefox"
                            : sub.userAgent.includes("Safari")
                            ? "Safari"
                            : "Navegador"
                          : "Dispositivo desconhecido"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Registrado em{" "}
                        {new Date(sub.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={sub.isActive ? "default" : "secondary"}>
                    {sub.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum dispositivo registrado</p>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Notificação</CardTitle>
          <CardDescription>
            Eventos que geram push notifications automáticas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                title: "Defeito Atribuído",
                description: "Quando um defeito é atribuído a você",
                badge: "Ativo",
              },
              {
                title: "SLA Próximo do Vencimento",
                description: "Alerta quando o SLA está a 24h de vencer",
                badge: "Ativo",
              },
              {
                title: "SLA Violado",
                description: "Notificação imediata quando um SLA é violado",
                badge: "Ativo",
              },
              {
                title: "Mudança de Status",
                description: "Quando o status de um defeito sob sua responsabilidade muda",
                badge: "Ativo",
              },
              {
                title: "Documento para Aprovação",
                description: "Quando um documento é submetido para sua aprovação",
                badge: "Ativo",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant="outline">{item.badge}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
