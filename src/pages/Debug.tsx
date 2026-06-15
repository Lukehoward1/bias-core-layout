import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function Debug() {
  const { user, isLoading: authLoading } = useAuth();
  const { isActive, isLoading: subLoading, subscriptionStatus } = useSubscription();
  const [profileData, setProfileData] = useState<any>(null);

  async function checkProfile() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id ?? "")
      .maybeSingle();
    setProfileData({ data, error });
  }

  return (
    <div className="p-8 space-y-4 text-sm font-mono">
      <h1 className="text-2xl font-bold">Debug</h1>
      <p>authLoading: {String(authLoading)}</p>
      <p>subLoading: {String(subLoading)}</p>
      <p>user: {user?.email ?? "null"}</p>
      <p>user.id: {user?.id ?? "null"}</p>
      <p>isActive: {String(isActive)}</p>
      <p>subscriptionStatus: {subscriptionStatus ?? "null"}</p>
      <button onClick={checkProfile} className="bg-primary text-white px-4 py-2 rounded">
        Check Profile Direct
      </button>
      {profileData && (
        <pre className="bg-muted p-4 rounded overflow-auto">
          {JSON.stringify(profileData, null, 2)}
        </pre>
      )}
    </div>
  );
}
