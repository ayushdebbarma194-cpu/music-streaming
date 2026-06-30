/**
 * Left sidebar — primary navigation for desktop (replaces the source app's
 * mobile bottom tab bar). Collapsible; width persisted as a pure UI pref.
 */

import { NavLink } from "react-router-dom";
import { Icon } from "./ui/Icon";
import { IconButton } from "./ui/IconButton";
import { uiPrefs } from "@/lib/uiPrefs";
import { useState } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/search", label: "Search", icon: "search" },
  { to: "/library", label: "Library", icon: "library_music" },
  { to: "/downloads", label: "Downloads", icon: "download" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => uiPrefs.getSidebarCollapsed());

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      uiPrefs.setSidebarCollapsed(next);
      return next;
    });
  };

  return (
    <nav
      aria-label="Primary"
      className={`flex h-full flex-col gap-2 bg-surface-container-low p-3 transition-[width] duration-200 ease-m3-standard ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-m3-md bg-primary text-on-primary">
          <Icon name="graphic_eq" size={22} />
        </div>
        {!collapsed && (
          <span className="text-title-md font-semibold text-on-surface">
            ArchiveTune
          </span>
        )}
        <div className="ml-auto">
          <IconButton
            icon={collapsed ? "chevron_right" : "chevron_left"}
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            iconSize={20}
            onClick={toggle}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-4 rounded-full px-4 py-3 text-label-lg transition-colors duration-150 ease-m3-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-on-surface/8"
                } ${collapsed ? "justify-center px-0" : ""}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} filled={isActive} size={22} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
