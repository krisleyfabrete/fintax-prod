import { useState } from "react";
import type { ElementType } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  LayoutGrid,
  History,
  ClipboardList,
  Layers,
  ChevronDown,
  FileDown,
  Grid3x3,
  Camera,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  id: string;
  label: string;
  icon: ElementType;
}

const TOP_ITEMS: NavItem[] = [
  { id: "workspace", label: "Workspace", icon: Home },
  { id: "command", label: "Command", icon: LayoutGrid },
  { id: "runs", label: "Runs", icon: History },
  { id: "reports", label: "Reports", icon: ClipboardList },
];

const DATASET_SUBITEMS: NavItem[] = [
  { id: "sources", label: "Sources", icon: FileDown },
  { id: "collections", label: "Collections", icon: Grid3x3 },
  { id: "snapshots", label: "Snapshots", icon: Camera },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("datasets");
  const [datasetsOpen, setDatasetsOpen] = useState(true);

  const isDatasetsActive = activeItem === "datasets";

  return (
    <aside
      className={`relative flex flex-col bg-sidebar-background border border-sidebar-border shadow-2xl
        transition-all duration-300 ease-in-out overflow-hidden
        ${collapsed ? "w-20" : "w-64"} rounded-xl`}
    >
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-purple-600/10 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-lg font-bold uppercase tracking-wide text-sidebar-foreground">
            Sidebar
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="h-8 w-8 shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </Button>
      </div>

      <nav className="relative z-10 flex flex-1 flex-col gap-1 p-2">
        {TOP_ITEMS.map(({ id, label, icon: Icon }) => (
          <NavRow
            key={id}
            label={label}
            Icon={Icon}
            collapsed={collapsed}
            active={activeItem === id}
            onClick={() => setActiveItem(id)}
          />
        ))}

        <button
          type="button"
          aria-expanded={datasetsOpen}
          onClick={() => {
            setActiveItem("datasets");
            setDatasetsOpen((v) => !v);
          }}
          className={cn(
            "group flex items-center rounded-full transition-all duration-200",
            collapsed
              ? "mx-auto h-11 w-11 justify-center"
              : "w-full gap-3 px-4 py-2.5",
            isDatasetsActive
              ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-indigo-500/20"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
          )}
        >
          <Layers size={20} strokeWidth={1.75} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm font-semibold">
                Datasets
              </span>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={cn(
                  "shrink-0 transition-transform duration-200",
                  datasetsOpen ? "rotate-0" : "-rotate-90"
                )}
              />
            </>
          )}
        </button>

        {!collapsed && (
          <div
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              datasetsOpen && isDatasetsActive
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="relative ml-5 mt-1 flex flex-col gap-0.5 border-l border-sidebar-border pl-4">
                {DATASET_SUBITEMS.map(({ id, label, icon: Icon }) => (
                  <SubRow key={id} label={label} Icon={Icon} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto" />

        <NavRow
          label="Control"
          Icon={Settings}
          collapsed={collapsed}
          active={activeItem === "control"}
          onClick={() => setActiveItem("control")}
        />
      </nav>
    </aside>
  );
}

interface NavRowProps {
  label: string;
  Icon: ElementType;
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
}

function NavRow({ label, Icon, collapsed, active, onClick }: NavRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center rounded-full transition-all duration-200",
        collapsed ? "mx-auto h-11 w-11 justify-center" : "w-full gap-3 px-4 py-2.5",
        active
          ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-indigo-500/20"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
      )}
    >
      <Icon size={20} strokeWidth={1.75} className="shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}

interface SubRowProps {
  label: string;
  Icon: ElementType;
}

function SubRow({ label, Icon }: SubRowProps) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/70
        transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:bg-sidebar-accent
        focus-visible:outline-none"
    >
      <Icon size={17} strokeWidth={1.75} className="shrink-0" />
      <span>{label}</span>
    </button>
  );
}
