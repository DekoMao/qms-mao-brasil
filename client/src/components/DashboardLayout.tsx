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
  ChevronRight
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", iconColor: "text-sky-400" },
  { icon: List, label: "Defeitos", path: "/defects", iconColor: "text-amber-400" },
  { icon: List, label: "Lista de Defeitos", path: "/defects", iconColor: "text-amber-400", hidden: true },
  { icon: Kanban, label: "Kanban", path: "/kanban", iconColor: "text-violet-400" },
  { icon: Upload, label: "Importação", path: "/import", iconColor: "text-emerald-400" },
  { icon: FileBarChart, label: "Relatórios", path: "/reports", iconColor: "text-rose-400" },
];

const adminMenuItems = [
  { icon: Building2, label: "Fornecedores", path: "/suppliers", iconColor: "text-orange-400" },
  { icon: Clock, label: "SLA", path: "/sla-settings", iconColor: "text-cyan-400" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 320;

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
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center mb-2">
            QMS MAO Brasil
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Sistema de Gestão de Qualidade – Rastreamento de Defeitos
          </p>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90"
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
  const activeMenuItem = menuItems.find(item => 
    item.path === "/" ? location === "/" : location.startsWith(item.path)
  );
  const isMobile = useIsMobile();

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
          className="border-r-0 bg-sidebar"
          disableTransition={isResizing}
        >
          {/* Logo Header */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-4">
            <div className="flex items-center gap-3 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-5 w-5 text-sidebar-foreground/70" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sidebar-foreground tracking-tight truncate">
                      SQA TRACKING SYSTEM
                    </span>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-3 py-4">
            {/* Main Menu */}
            <SidebarMenu className="space-y-1">
              {menuItems.filter(item => !item.hidden).map(item => {
                const isActive = item.path === "/" 
                  ? location === "/" 
                  : location.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-11 rounded-xl transition-all font-medium ${
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <item.icon
                        className={`h-5 w-5 ${isActive ? "text-white" : item.iconColor}`}
                      />
                      <span className="ml-1">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* Admin Section */}
            <div className="mt-6 pt-4 border-t border-sidebar-border">
              {!isCollapsed && (
                <p className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Administração
                </p>
              )}
              <SidebarMenu className="space-y-1 mt-1">
                {adminMenuItems.map(item => {
                  const isActive = location.startsWith(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className={`h-11 rounded-xl transition-all font-medium ${
                          isActive 
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 ${isActive ? "text-white" : item.iconColor}`}
                        />
                        <span className="ml-1">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                {/* Link to Supplier Portal */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => window.open("/supplier-portal", "_blank")}
                    tooltip="Portal do Fornecedor"
                    className="h-11 rounded-xl transition-all font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  >
                    <ExternalLink className="h-5 w-5 text-pink-400" />
                    <span className="ml-1">Portal do Fornecedor</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarContent>

          {/* User Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none">
                  <Avatar className="h-10 w-10 border-2 border-sidebar-border shrink-0">
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-sky-400 to-blue-600 text-white">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold text-sidebar-foreground truncate leading-none">
                      {user?.name || "Usuário"}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-sky-400/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-background">
        {/* Top Header Bar */}
        <header className="header-bar sticky top-0 z-40 border-b">
          <div className="flex items-center gap-4">
            {isMobile && <SidebarTrigger className="h-9 w-9 rounded-lg" />}
            <h1 className="text-lg font-semibold text-foreground">
              {activeMenuItem?.label ?? "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </button>
            <button className="h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:block">{user?.name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>
        
        <main className="flex-1 p-6 bg-background min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
