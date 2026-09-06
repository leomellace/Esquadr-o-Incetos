import { NameGate } from "@/components/NameGate";

export default function SalaLayout({ children }: { children: React.ReactNode }) {
  return <NameGate>{children}</NameGate>;
}
