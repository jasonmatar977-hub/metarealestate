"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import OnlineUsersSidebar from "@/components/OnlineUsersSidebar";
import FloatingAiButton from "@/components/FloatingAiButton";
import { Toaster } from "react-hot-toast";

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
        <FloatingAiButton />
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          // Limit visible toasts to 3 (react-hot-toast automatically handles this via containerStyle and stacking)
          containerStyle={{
            maxWidth: '420px',
          }}
          toastOptions={{
            // Default duration for success/info toasts: 2500ms (2.5s)
            duration: 2500,
            // Custom styling for app-like feel
            style: {
              background: '#fff',
              color: '#1f2937',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
            // Success toast styling: 2500ms (2.5s)
            success: {
              duration: 2500,
              style: {
                background: '#10b981',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10b981',
              },
            },
            // Error toast styling: 4500ms (4.5s)
            error: {
              duration: 4500,
              style: {
                background: '#ef4444',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
            // Info/blank toasts: 2500ms (2.5s)
            blank: {
              duration: 2500,
            },
          }}
        />
      </AuthProvider>
    </LanguageProvider>
  );
}
