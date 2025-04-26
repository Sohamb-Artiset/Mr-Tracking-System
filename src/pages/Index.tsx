
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types";
import Login from "./Login";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
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
        setIsLoading(false);
        return;
      }

      setUser(profile);
      setIsLoading(false);
    };

    checkUserStatus();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkUserStatus(); // Re-check status on login
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };

  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (user && user.status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center space-y-4">
        <h1 className="text-3xl font-bold">Account Pending Approval</h1>
        <p className="text-muted-foreground">
          Your account is currently pending administrator approval.
        </p>
        <p className="text-muted-foreground">
          You will receive an email notification once your account has been activated.
        </p>
        <Button onClick={async () => {
          await supabase.auth.signOut();
          setUser(null);
          navigate("/");
        }}>Sign Out</Button>
      </div>
    );
  }

  return <Login />;
};

export default Index;
