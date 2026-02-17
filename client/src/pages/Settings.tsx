import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, User, Bell, Shield, Palette, 
  ArrowLeft, Save, Moon, Sun
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  
  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slaAlerts, setSlaAlerts] = useState(true);
  const [updateAlerts, setUpdateAlerts] = useState(true);

  const handleSave = () => {
    toast.success("Configurações salvas com sucesso!");
  };

  const handleThemeChange = (value: string) => {
    if ((value === "dark" && theme === "light") || (value === "light" && theme === "dark")) {
      toggleTheme?.();
    }
  };

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-all duration-200 shadow-sm hover:shadow group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <SettingsIcon className="h-6 w-6 text-primary" />
              {t('settings.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('settings.subtitle')}
            </p>
          </div>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          {t('common.save')}
        </Button>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Perfil do Usuário
          </CardTitle>
          <CardDescription>
            Informações da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('common.name')}</Label>
              <Input 
                id="name" 
                value={user?.name || ""} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                value={user?.email || ""} 
                disabled 
                className="bg-muted"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            As informações do perfil são gerenciadas pelo sistema de autenticação.
          </p>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {t('notification.title')}
          </CardTitle>
          <CardDescription>
            Configure como você deseja receber alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">
                Receber alertas importantes por email
              </p>
            </div>
            <Switch 
              checked={emailNotifications} 
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Alertas de SLA</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando casos estiverem próximos ou excederem o SLA
              </p>
            </div>
            <Switch 
              checked={slaAlerts} 
              onCheckedChange={setSlaAlerts}
              disabled={!emailNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Atualizações de Casos</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando houver atualizações em casos que você acompanha
              </p>
            </div>
            <Switch 
              checked={updateAlerts} 
              onCheckedChange={setUpdateAlerts}
              disabled={!emailNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Aparência
          </CardTitle>
          <CardDescription>
            Personalize a interface do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('settings.theme')}</Label>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      {t('settings.light')}
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      {t('settings.dark')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.language')}</Label>
              <Select value={i18n.language} onValueChange={handleLanguageChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Segurança
          </CardTitle>
          <CardDescription>
            Configurações de segurança da conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Autenticação</p>
              <p className="text-sm text-muted-foreground">
                Você está autenticado via Manus OAuth
              </p>
            </div>
            <Shield className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            A segurança da sua conta é gerenciada pelo provedor de autenticação.
            Para alterar sua senha ou configurações de segurança, acesse as configurações da sua conta Manus.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
