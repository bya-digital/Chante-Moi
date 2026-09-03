import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/referentiels", label: "Référentiels" },
];

export function AdminNav() {
  return (
    <nav className="flex gap-1 border-b border-border pb-3">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
