import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  List, 
  Kanban, 
  Upload, 
  FileBarChart,
  Shield,
  Building2,
  Clock,
  ExternalLink,
  Bell,
  Settings,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Award,
  GitBranch,
  Webhook,
  Brain,
  FileText,
  Key,
  type LucideIcon,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useTranslation } from 'react-i18next';
import { usePermissions } from "@/hooks/usePermissions";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { trpc } from "@/lib/trpc";
import { Building, Download, WifiOff, X } from "lucide-react";

// ─── Language Switcher ───────────────────────────────────────────────
const LANGS = ['pt-BR', 'en', 'es'] as const;
const LANG_LABELS: Record<string, string> = { 'pt-BR': 'PT', en: 'EN', es: 'ES' };

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  
  const cycleLanguage = () => {
    const idx = LANGS.indexOf(currentLang as any);
    const next = LANGS[(idx + 1) % LANGS.length];
    i18n.changeLanguage(next);
  };
  
  return (
    <button
      onClick={cycleLanguage}
      className="h-9 px-2 rounded-lg flex items-center gap-1.5 transition-colors text-sm font-medium"
      style={{ color: "rgba(148,163,184,1)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#E2E8F0"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(148,163,184,1)"; }}
      title="Mudar idioma / Change language / Cambiar idioma"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
      <span className="hidden sm:inline">{LANG_LABELS[currentLang] || 'PT'}</span>
    </button>
  );
}

// ─── Tenant Switcher ────────────────────────────────────────────────
function TenantSwitcher() {
  const { data: myTenants } = trpc.tenant.myTenants.useQuery();
  const { data: activeTenant } = trpc.tenant.activeTenant.useQuery();
  const switchMutation = trpc.tenant.switchTenant.useMutation();
  const utils = trpc.useUtils();

  if (!myTenants || myTenants.length <= 1) return null;

  const currentTenant = myTenants.find((t: any) => t.tenantId === activeTenant?.tenantId);
  const currentName = currentTenant?.tenantName || "Tenant";

  const handleSwitch = async (tenantId: number) => {
    if (tenantId === activeTenant?.tenantId) return;
    await switchMutation.mutateAsync({ tenantId });
    utils.invalidate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-9 px-3 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
          style={{ 
            color: "#94A3B8", 
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
          title="Trocar Tenant"
        >
          <Building className="h-4 w-4" style={{ color: "#00D4AA" }} />
          <span className="hidden sm:inline max-w-[120px] truncate">{currentName}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
        {myTenants.map((t: any) => (
          <DropdownMenuItem
            key={t.tenantId}
            onClick={() => handleSwitch(t.tenantId)}
            className={`cursor-pointer ${
              t.tenantId === activeTenant?.tenantId ? "bg-muted font-semibold" : ""
            }`}
          >
            <Building className="mr-2 h-4 w-4" />
            <span className="truncate">{t.tenantName || `Tenant ${t.tenantId}`}</span>
            {t.tenantId === activeTenant?.tenantId && (
              <span className="ml-auto text-xs" style={{ color: "#00D4AA" }}>Ativo</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Menu Item Type ──────────────────────────────────────────────────
type MenuItem = {
  icon: LucideIcon;
  label: string;
  path: string;
  iconColor: string;
  hidden?: boolean;
  external?: boolean;
  permission?: { resource: string; action: string };
};

// ─── Menu Groups ─────────────────────────────────────────────────────
type MenuGroup = {
  id: string;
  label: string;
  collapsible: boolean;
  defaultOpen: boolean;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    id: "operacional",
    label: "Operacional",
    collapsible: false,
    defaultOpen: true,
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/", iconColor: "text-[#00D4AA]" },
      { icon: List, label: "Defeitos", path: "/defects", iconColor: "text-[#F5A623]" },
      { icon: Kanban, label: "Kanban", path: "/kanban", iconColor: "text-[#3B82F6]" },
      { icon: Upload, label: "Importação", path: "/import", iconColor: "text-[#10B981]" },
    ],
  },
  {
    id: "analise",
    label: "Análise",
    collapsible: true,
    defaultOpen: true,
    items: [
      { icon: DollarSign, label: "COPQ", path: "/copq", iconColor: "text-[#EF4444]" },
      { icon: Award, label: "Scorecard", path: "/scorecard", iconColor: "text-[#00D4AA]" },
      { icon: FileBarChart, label: "Relatórios", path: "/reports", iconColor: "text-[#F5A623]" },
      { icon: Brain, label: "IA Predição", path: "/prediction", iconColor: "text-[#8B5CF6]" },
      { icon: LayoutDashboard, label: "BI Embeddido", path: "/bi", iconColor: "text-[#06B6D4]" },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    collapsible: true,
    defaultOpen: true,
    items: [
      { icon: Building2, label: "Fornecedores", path: "/suppliers", iconColor: "text-[#F5A623]" },
      { icon: FileText, label: "Documentos", path: "/documents", iconColor: "text-[#3B82F6]" },
      { icon: GitBranch, label: "Workflows", path: "/workflow", iconColor: "text-[#00D4AA]" },
      { icon: Clock, label: "SLA", path: "/sla-settings", iconColor: "text-[#06B6D4]" },
    ],
  },
  {
    id: "configuracao",
    label: "Configuração",
    collapsible: true,
    defaultOpen: false,
    items: [
      { icon: Key, label: "RBAC", path: "/rbac", iconColor: "text-[#F5A623]", permission: { resource: "rbac", action: "manage" } },
      { icon: Building2, label: "Tenants", path: "/tenants", iconColor: "text-[#8B5CF6]", permission: { resource: "tenant", action: "manage" } },
      { icon: Webhook, label: "Webhooks", path: "/webhooks", iconColor: "text-[#EF4444]", permission: { resource: "webhook", action: "manage" } },
      { icon: Key, label: "API Keys", path: "/api-keys", iconColor: "text-[#10B981]", permission: { resource: "api_keys", action: "write" } },
      { icon: Bell, label: "Push Notifications", path: "/push-settings", iconColor: "text-[#06B6D4]" },
    ],
  },
];

const externalLinks: MenuItem[] = [
  { icon: ExternalLink, label: "Portal do Fornecedor", path: "/supplier-portal", iconColor: "text-[#F5A623]", external: true },
];

// ─── Collapsible Group Component ─────────────────────────────────────
const COLLAPSED_GROUPS_KEY = "sidebar-collapsed-groups";

function getInitialCollapsedState(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(COLLAPSED_GROUPS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  const state: Record<string, boolean> = {};
  menuGroups.forEach(g => {
    state[g.id] = !g.defaultOpen;
  });
  return state;
}

function CollapsibleGroup({
  group,
  location,
  isCollapsed: isSidebarCollapsed,
  collapsedGroups,
  toggleGroup,
  onNavigate,
  canAccess,
}: {
  group: MenuGroup;
  location: string;
  isCollapsed: boolean;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (id: string) => void;
  onNavigate: (path: string) => void;
  canAccess: (item: MenuItem) => boolean;
}) {
  const isGroupCollapsed = collapsedGroups[group.id] ?? false;
  const hasActiveItem = group.items.some(item =>
    item.path === "/" ? location === "/" : location.startsWith(item.path)
  );

  return (
    <div className="mb-1">
      {/* Group Header */}
      {!isSidebarCollapsed && (
        <button
          onClick={() => group.collapsible && toggleGroup(group.id)}
          className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors rounded-md ${
            group.collapsible
              ? "cursor-pointer"
              : "cursor-default"
          }`}
          style={{ 
            color: hasActiveItem && isGroupCollapsed ? "#00D4AA" : "rgba(148,163,184,0.5)",
          }}
        >
          <span>{group.label}</span>
          {group.collapsible && (
            <span className="transition-transform duration-200">
              {isGroupCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </span>
          )}
        </button>
      )}

      {/* Group Items with animation */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isGroupCollapsed && !isSidebarCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
        }`}
      >
        <SidebarMenu className="space-y-0.5 mt-0.5">
          {group.items
            .filter(item => !item.hidden && canAccess(item))
            .map(item => {
              const isActive =
                item.path === "/"
                  ? location === "/"
                  : location.startsWith(item.path);
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => onNavigate(item.path)}
                    tooltip={item.label}
                    className={`h-10 rounded-xl transition-all font-medium ${
                      isActive
                        ? "text-white shadow-md"
                        : "hover:text-foreground"
                    }`}
                    style={isActive ? {
                      background: "linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,212,170,0.05))",
                      borderLeft: "3px solid #00D4AA",
                      color: "#00D4AA",
                    } : {
                      color: "rgba(148,163,184,0.8)",
                    }}
                  >
                    <item.icon
                      className={`h-[18px] w-[18px] ${isActive ? "text-[#00D4AA]" : item.iconColor}`}
                    />
                    <span className="ml-1 text-[13px]">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
        </SidebarMenu>
      </div>

      {/* Active indicator dot when group is collapsed */}
      {isGroupCollapsed && hasActiveItem && !isSidebarCollapsed && (
        <div className="flex justify-center py-1">
          <div className="h-1 w-6 rounded-full" style={{ background: "rgba(0,212,170,0.6)" }} />
        </div>
      )}
    </div>
  );
}

// ─── Sidebar Width Constants ─────────────────────────────────────────
const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

// ─── Main Layout ─────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card animate-fade-in">
          <div className="login-logo">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663029478970/YCDEzlwkgDTTmqGn.png" alt="QTrack System" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center mb-2 text-foreground">
            QTrack System
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Vendor Defect Tracking – Quality Management
          </p>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            style={{ background: "linear-gradient(135deg, #00D4AA, #00B894)", color: "#0A1628" }}
          >
            Entrar no Sistema
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

// ─── Layout Content ──────────────────────────────────────────────────
type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { can: canPermission, isAdmin: isRbacAdmin } = usePermissions();
  const { canInstall, isOnline, promptInstall } = usePwaInstall();
  const [pwaInstallDismissed, setPwaInstallDismissed] = useState(false);

  const canAccess = useCallback((item: MenuItem): boolean => {
    if (!item.permission) return true;
    if (isRbacAdmin || user?.role === "admin") return true;
    return canPermission(item.permission.resource, item.permission.action);
  }, [canPermission, isRbacAdmin, user?.role]);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(getInitialCollapsedState);

  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const activeLabel = (() => {
    for (const group of menuGroups) {
      for (const item of group.items) {
        if (item.path === "/" ? location === "/" : location.startsWith(item.path)) {
          return item.label;
        }
      }
    }
    return "Dashboard";
  })();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          style={{ background: "#0A1628" }}
          disableTransition={isResizing}
        >
          {/* Logo Header */}
          <SidebarHeader className="h-16 justify-center px-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center rounded-lg transition-colors focus:outline-none shrink-0"
                style={{ color: "rgba(148,163,184,0.7)" }}
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
                    <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663029478970/YCDEzlwkgDTTmqGn.png" alt="QTrack" className="h-9 w-9 object-contain" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold tracking-tight text-sm leading-tight text-foreground">
                      QTrack System
                    </span>
                    <span className="text-[10px] leading-tight" style={{ color: "rgba(148,163,184,0.4)" }}>
                      Quality Management
                    </span>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Scrollable Content */}
          <SidebarContent className="gap-0 px-3 py-3 overflow-y-auto">
            {menuGroups.map((group, idx) => (
              <div key={group.id}>
                {idx > 0 && (
                  <div className="mx-2 my-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
                )}
                <CollapsibleGroup
                  group={group}
                  location={location}
                  isCollapsed={isCollapsed}
                  collapsedGroups={collapsedGroups}
                  toggleGroup={toggleGroup}
                  onNavigate={setLocation}
                  canAccess={canAccess}
                />
              </div>
            ))}

            {/* External Links */}
            <div className="mx-2 my-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
            <SidebarMenu className="space-y-0.5">
              {externalLinks.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => window.open(item.path, "_blank")}
                    tooltip={item.label}
                    className="h-10 rounded-xl transition-all font-medium"
                    style={{ color: "rgba(148,163,184,0.8)" }}
                  >
                    <item.icon className={`h-[18px] w-[18px] ${item.iconColor}`} />
                    <span className="ml-1 text-[13px]">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          {/* User Footer */}
          <SidebarFooter className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none"
                  style={{ color: "#E2E8F0" }}>
                  <Avatar className="h-10 w-10 shrink-0" style={{ border: "2px solid rgba(0,212,170,0.3)" }}>
                    <AvatarFallback className="text-sm font-semibold" style={{ background: "linear-gradient(135deg, #00D4AA, #00B894)", color: "#0A1628" }}>
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold truncate leading-none text-foreground">
                      {user?.name || "Usuário"}
                    </p>
                    <p className="text-xs truncate mt-1" style={{ color: "rgba(148,163,184,0.6)" }}>
                      {user?.email || "-"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 group-data-[collapsible=icon]:hidden" style={{ color: "rgba(148,163,184,0.4)" }} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                <DropdownMenuItem
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors ${isCollapsed ? "hidden" : ""}`}
          style={{ zIndex: 50 }}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,212,170,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        />
      </div>

      <SidebarInset className="bg-background">
        {/* Top Header Bar */}
        <header className="header-bar sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {isMobile && <SidebarTrigger className="h-9 w-9 rounded-lg" />}
            <h1 className="text-lg font-semibold text-foreground">
              {activeLabel}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <TenantSwitcher />
            <button 
              onClick={() => setLocation("/notifications")}
              className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors relative"
              style={{ color: "#94A3B8" }}
              title="Central de Notificações"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setLocation("/settings")}
              className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "#94A3B8" }}
              title="Configurações"
            >
              <Settings className="h-5 w-5" />
            </button>
            <LanguageSwitcher />
            <div className="flex items-center gap-2 pl-3" style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold" style={{ background: "linear-gradient(135deg, #00D4AA, #00B894)", color: "#0A1628" }}>
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:block text-foreground">{user?.name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>
        
        {/* Offline Banner */}
        {!isOnline && (
          <div className="px-4 py-2 text-sm flex items-center gap-2 justify-center" style={{ background: "rgba(245,158,11,0.15)", color: "#FBBF24", borderBottom: "1px solid rgba(245,158,11,0.2)" }}>
            <WifiOff className="h-4 w-4" />
            <span>Sem conexão com a internet. Algumas funcionalidades podem não estar disponíveis.</span>
          </div>
        )}

        {/* PWA Install Banner */}
        {canInstall && !pwaInstallDismissed && (
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: "rgba(0,212,170,0.08)", borderBottom: "1px solid rgba(0,212,170,0.15)" }}>
            <div className="flex items-center gap-2 text-sm">
              <Download className="h-4 w-4" style={{ color: "#00D4AA" }} />
              <span className="text-foreground">Instale o <strong>QTrack</strong> para acesso rápido e offline.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={promptInstall}
                style={{ background: "#00D4AA", color: "#0A1628" }}>
                Instalar
              </Button>
              <button onClick={() => setPwaInstallDismissed(true)} className="h-7 w-7 rounded flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 bg-background min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
