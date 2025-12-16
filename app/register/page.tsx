/**
 * Register Page
 * Route: /register
 */

import Navbar from "@/components/Navbar";
import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <RegisterForm />
    </main>
  );
}

