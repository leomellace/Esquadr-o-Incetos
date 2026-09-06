import { NameGate } from "@/components/NameGate";

export default function PartidaLayout({ children }: { children: React.ReactNode }) {
  return <NameGate>{children}</NameGate>;
}
