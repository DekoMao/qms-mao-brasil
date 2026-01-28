import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, Check, CheckCheck, AlertTriangle, Clock, 
  ArrowLeft, Trash2, Filter
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NotificationType = "sla_warning" | "sla_violation" | "update" | "comment" | "assignment";

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  sla_warning: <Clock className="h-5 w-5 text-amber-500" />,
  sla_violation: <AlertTriangle className="h-5 w-5 text-rose-500" />,
  update: <Bell className="h-5 w-5 text-sky-500" />,
  comment: <Bell className="h-5 w-5 text-violet-500" />,
  assignment: <Bell className="h-5 w-5 text-emerald-500" />,
};

const notificationLabels: Record<NotificationType, string> = {
  sla_warning: "Aviso de SLA",
  sla_violation: "Violação de SLA",
  update: "Atualização",
  comment: "Comentário",
  assignment: "Atribuição",
};

export default function Notifications() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<string>("all");

  const { data: notifications, isLoading, refetch } = trpc.notification.list.useQuery();

  const markAsReadMutation = trpc.notification.markAsRead.useMutation({
    onSuccess: () => refetch(),
  });

  const markAllAsReadMutation = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.notification.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const filteredNotifications = notifications?.filter((n: any) => {
    if (n.status === "DELETED") return false;
    if (filter === "all") return true;
    if (filter === "unread") return n.status !== "READ";
    return n.type === filter;
  }) || [];

  const unreadCount = notifications?.filter((n: any) => n.status !== "READ" && n.status !== "DELETED").length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-all duration-200 shadow-sm hover:shadow group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              Central de Notificações
              {unreadCount > 0 && (
                <Badge className="bg-rose-500 text-white">{unreadCount}</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas notificações e alertas do sistema
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">Não lidas</SelectItem>
              <SelectItem value="sla_warning">Avisos SLA</SelectItem>
              <SelectItem value="sla_violation">Violações SLA</SelectItem>
              <SelectItem value="update">Atualizações</SelectItem>
              <SelectItem value="comment">Comentários</SelectItem>
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button 
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredNotifications.length} notificação(ões)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma notificação encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification: any) => (
                <div 
                  key={notification.id}
                  className={`p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors ${
                    notification.status !== "READ" ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="shrink-0 mt-1">
                    {notificationIcons[notification.type as NotificationType] || <Bell className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-medium ${notification.status !== "READ" ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {notificationLabels[notification.type as NotificationType] || notification.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {notification.status !== "READ" && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => markAsReadMutation.mutate({ id: notification.id })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: notification.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
