
import { 
  CalendarIcon, 
  FileIcon, 
  SearchIcon, 
  SettingsIcon, 
  UserIcon, 
  UsersIcon, 
  ChartBarIcon, 
  PlusIcon,
  Pill
} from "lucide-react";
import { NavLink } from "react-router-dom";

interface NavigationProps {
  userRole: string;
}

export function Navigation({ userRole }: NavigationProps) {
  // Admin navigation items
  const adminNavItems = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: ChartBarIcon,
    },
    {
      title: "Users",
      href: "/admin/users",
      icon: UsersIcon,
    },
    {
      title: "Doctors",
      href: "/admin/doctors",
      icon: UserIcon,
    },
    {
      title: "Medicines",
      href: "/admin/medicines",
      icon: Pill,
    },
    {
      title: "Reports",
      href: "/admin/reports",
      icon: FileIcon,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: SettingsIcon,
    },
  ];

  // MR navigation items
  const mrNavItems = [
    {
      title: "Dashboard",
      href: "/mr/dashboard",
      icon: ChartBarIcon,
    },
    {
      title: "Log Visit",
      href: "/mr/visits/new",
      icon: PlusIcon,
    },
    {
      title: "Doctors",
      href: "/mr/doctors",
      icon: UserIcon,
    },
    {
      title: "Visits",
      href: "/mr/visits",
      icon: CalendarIcon,
    },
    {
      title: "Reports",
      href: "/mr/reports",
      icon: FileIcon,
    },
  ];

  // Choose which navigation items to show based on user role
  const navItems = userRole === "admin" ? adminNavItems : mrNavItems;

  return (
    <nav className="space-y-1 px-2 py-3">
      {navItems.map((item) => (
        <NavLink 
          key={item.href}
          to={item.href}
          className={({ isActive }) => 
            `nav-link ${isActive ? "active" : ""}`
          }
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </NavLink>
      ))}
    </nav>
  );
}
