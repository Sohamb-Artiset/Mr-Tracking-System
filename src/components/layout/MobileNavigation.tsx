
import { 
  CalendarIcon, 
  FileIcon, 
  HomeIcon, 
  PlusIcon, 
  SearchIcon, 
  SettingsIcon, 
  UserIcon, 
  UsersIcon, 
  ChartBarIcon,
  Pill
} from "lucide-react";
import { NavLink } from "react-router-dom";

interface MobileNavigationProps {
  className?: string;
  userRole: string;
}

export function MobileNavigation({ className, userRole }: MobileNavigationProps) {
  // Admin navigation items
  const adminNavItems = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: HomeIcon,
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
  ];

  // MR navigation items
  const mrNavItems = [
    {
      title: "Dashboard",
      href: "/mr/dashboard",
      icon: HomeIcon,
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
    <nav className={`flex items-center justify-around border-t bg-background px-2 py-2 ${className}`}>
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) => 
            `mobile-nav-link ${isActive ? "active" : ""} flex flex-col items-center`
          }
        >
          <item.icon className="h-5 w-5" />
          <span className="text-xs">{item.title}</span>
        </NavLink>
      ))}
    </nav>
  );
}
