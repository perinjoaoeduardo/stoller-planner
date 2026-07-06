import type { Metadata } from "next";

import { AccessRequestForm } from "./access-request-form";

export const metadata: Metadata = {
  title: "Solicitar acesso — Corteva Planner",
};

export default function RegistroPage() {
  return <AccessRequestForm />;
}
