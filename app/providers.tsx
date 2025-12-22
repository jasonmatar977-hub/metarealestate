"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import OnlineUsersSidebar from "@/components/OnlineUsersSidebar";

function PresenceHeartbeat() {
  usePresenceHeartbeat();
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <PresenceHeartbeat />
        {children}
        <OnlineUsersSidebar />
      </AuthProvider>
    </LanguageProvider>
  );
}
