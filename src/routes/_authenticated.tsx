import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-store";

// Pathless layout that gates every child route on a live Supabase session.
// ssr:false because Supabase persists the session in localStorage — the
// server can't read it, so gating server-side would loop-redirect on refresh.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/welcome" });
    }
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { household, hydrated } = useApp();
  const navigate = useNavigate();

  // Route guard (§5): if the 14-day trial has expired, bounce to settings
  // (which renders the Paywall component with the upgrade CTA).
  // We wait for hydration so the guard doesn't fire before bootLive loads
  // the household data.
  useEffect(() => {
    if (!hydrated) return;
    if (household.subscriptionStatus === "free") {
      navigate({ to: "/settings" });
    }
  }, [household.subscriptionStatus, hydrated, navigate]);

  if (!hydrated || household.subscriptionStatus === "free") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
      </div>
    );
  }

  return <Outlet />;
}