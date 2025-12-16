/**
 * Login Page
 * Route: /login
 */

import Navbar from "@/components/Navbar";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <LoginForm />
    </main>
  );
}

