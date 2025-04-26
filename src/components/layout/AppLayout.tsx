
import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";
import { MobileNavigation } from "./MobileNavigation";
import { Navigation } from "./Navigation";
import { UserNav } from "./UserNav";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types"; // Assuming User type is available

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate("/");
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        navigate("/");
        setIsLoading(false);
        return;
      }

      if (profile.status === "pending") {
        navigate("/"); // Redirect to home if status is pending
        setIsLoading(false);
        return;
      }

      setUser(profile);
      setIsLoading(false);

      // If on the wrong dashboard, redirect to the correct one
      if (profile.role === "admin" && location.pathname.startsWith("/mr")) {
        navigate("/admin/dashboard");
      } else if (profile.role === "mr" && location.pathname.startsWith("/admin")) {
        navigate("/mr/dashboard");
      }
    };

    fetchUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      } else {
        fetchUser(); // Re-fetch user on auth state change
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };

  }, [navigate, location.pathname]);

  // If loading or no user is set, show loading
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/40">
        <Sidebar className="hidden md:block">
          <SidebarHeader className="flex h-14 items-center border-b px-4">
            <span className="font-semibold">MR Tracking</span>
          </SidebarHeader>
          <SidebarContent>
            <Navigation userRole={user.role} />
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col w-full">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <span className="md:hidden font-semibold">MR Tracking</span>
            <div className="ml-auto flex items-center gap-2">
              <UserNav userName={user.name} userRole={user.role} />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
          </main>
          <MobileNavigation className="md:hidden" userRole={user.role} />
        </div>
      </div>
    </SidebarProvider>
  );
}
