import type { ComponentType } from "react";
import {
  BookmarksFill,
  Settings4Fill,
} from "@mingcute/react";

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

export const sidebarNavItems: NavItem[] = [
  { id: "library", label: "Library", href: "/library", Icon: BookmarksFill },
  { id: "settings", label: "Settings", Icon: Settings4Fill },
];
