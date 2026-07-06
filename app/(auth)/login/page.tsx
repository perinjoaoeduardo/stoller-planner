import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Corteva Planner",
};

export default function LoginPage() {
  return <LoginForm />;
}
