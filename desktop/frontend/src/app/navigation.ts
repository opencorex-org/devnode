import {
  LayoutDashboard,
  Folder,
  Server,
  Terminal as TerminalIcon,
  Settings,
  CircleHelp,
} from "lucide-react";
import type { Page } from "../types";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  id: Page;
  label: string;
  icon: LucideIcon;
};

export const navigation: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: Folder },
  { id: "services", label: "Services", icon: Server },
  { id: "terminal", label: "Terminal", icon: TerminalIcon },
  { id: "settings", label: "Connection", icon: Settings },
  { id: "help", label: "Help & Setup", icon: CircleHelp },
];
