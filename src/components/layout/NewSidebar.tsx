import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NewSidebarChild {
  label: string;
  url: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NewSidebarItem {
  label: string;
  url: string;
  icon: LucideIcon;
  end?: boolean;
  children?: NewSidebarChild[];
}

interface NewSidebarProps {
  brand: React.ReactNode;
  items: NewSidebarItem[];
  footerBrand?: React.ReactNode;
  footerItems?: NewSidebarItem[];
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

export const NEW_SIDEBAR_EXPANDED_WIDTH = 280;
export const NEW_SIDEBAR_COLLAPSED_WIDTH = 80;

export function NewSidebar({
  brand,
  items,
  footerBrand,
  footerItems,
  collapsed = false,
  onCollapsedChange,
  className,
}: NewSidebarProps) {
  const location = useLocation();

  const setCollapsed = (v: boolean) => onCollapsedChange?.(v);

  const isActiveItem = (item: NewSidebarItem) => {
    if (item.url === location.pathname) return true;
    if (item.children?.some((c) => c.url === location.pathname)) return true;
    return false;
  };

  const footer = footerItems && footerItems.length > 0 ? footerItems : undefined;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300',
        className,
      )}
      style={{
        width: collapsed ? NEW_SIDEBAR_COLLAPSED_WIDTH : NEW_SIDEBAR_EXPANDED_WIDTH,
      }}
    >
      {/* Floating capsule container */}
      <div
        className={cn(
          'my-3 ml-3 flex h-[calc(100vh-24px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0C] shadow-2xl transition-all duration-300 relative'
        )}
      >
        {/* radial glow background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(124,111,240,0.12), transparent 40%)',
          }}
        />

        {/* Header */}
        <div
          className={cn(
            'relative flex items-center gap-3 border-b border-white/10 px-3 py-4',
            collapsed && 'justify-center px-2'
          )}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C6FF0]"
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
          {!collapsed && <div className="relative flex min-w-0 flex-1 items-center">{brand}</div>}
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1.5">
            {items.map((item) => (
              <SidebarNavItem
                key={item.url}
                item={item}
                collapsed={collapsed}
                isActive={isActiveItem(item)}
              />
            ))}
          </ul>
        </nav>

        {/* Footer items */}
        {footer && (
          <div className="relative border-t border-white/10 p-3">
            <ul className="space-y-1.5">
              {footer.map((item) => (
                <SidebarNavItem
                  key={item.url}
                  item={item}
                  collapsed={collapsed}
                  isActive={item.url === location.pathname}
                />
              ))}
            </ul>
            {footerBrand && (
              <div className="mt-3 border-t border-white/10 pt-3">{footerBrand}</div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarNavItem({
  item,
  collapsed,
  isActive,
}: {
  item: NewSidebarItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(isActive);
  const hasChildren = !!item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <li>
        <NavLink
          to={item.url}
          end={item.end}
          title={collapsed ? item.label : undefined}
          className={({ isActive: act }) =>
            cn(
              'flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-all duration-300',
              collapsed && 'justify-center px-0',
              act
                ? 'bg-gradient-to-r from-[#4F5EF7] to-[#7C6FF0] font-semibold text-white shadow-lg shadow-[#4F5EF7]/30'
                : 'text-white/80 hover:bg-white/5 hover:text-white'
            )
          }
        >
          <item.icon className={cn('h-5 w-5 shrink-0', collapsed && 'mx-auto')} />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        </NavLink>
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={() => setOpen(!open)}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm transition-all duration-300',
          collapsed && 'justify-center px-0',
          isActive && !collapsed
            ? 'bg-gradient-to-r from-[#4F5EF7] to-[#7C6FF0] font-semibold text-white shadow-lg shadow-[#4F5EF7]/30'
            : 'text-white/80 hover:bg-white/5 hover:text-white'
        )}
        aria-expanded={open}
      >
        <item.icon className={cn('h-5 w-5 shrink-0', collapsed && 'mx-auto')} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{item.label}</span>
            {open ? (
              <ChevronDown className="h-4 w-4 text-white/70" />
            ) : (
              <ChevronRight className="h-4 w-4 text-white/70" />
            )}
          </>
        )}
      </button>

      {/* Submenu - only visible when expanded and open */}
      {hasChildren && !collapsed && open && (
        <ul className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-3">
          {item.children!.map((child) => (
            <li key={child.url}>
              <NavLink
                to={child.url}
                end={child.end}
                className={({ isActive: act }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white',
                    act && 'bg-white/5 font-medium text-white'
                  )
                }
              >
                <child.icon className="h-4 w-4 shrink-0 text-white/50" />
                <span className="flex-1 truncate">{child.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
