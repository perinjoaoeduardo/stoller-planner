import type { Metadata } from "next";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Redefinir senha — Corteva PED",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
