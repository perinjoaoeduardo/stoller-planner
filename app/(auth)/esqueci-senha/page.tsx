import type { Metadata } from "next";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Esqueci minha senha — Corteva PED",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
