import {
  Cake,
  Heart,
  Gem,
  Baby,
  Flower2,
  Award,
  Flame,
  HandHeart,
  Trophy,
  Church,
  Briefcase,
  Music,
  PartyPopper,
  Gift,
  Sparkles,
  Smile,
  HeartHandshake,
  BookOpenText,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Cake,
  Heart,
  Gem,
  Baby,
  Flower2,
  Award,
  Flame,
  HandHeart,
  Trophy,
  Church,
  Briefcase,
  Music,
  PartyPopper,
  Gift,
  Sparkles,
  Smile,
  HeartHandshake,
  BookOpenText,
};

// Les icônes sont stockées en base en kebab-case (ex. "flower-2", saisissable par un admin) —
// on normalise en PascalCase pour retrouver le composant Lucide correspondant.
function toPascalCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function OccasionIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[toPascalCase(name)]) || (name && ICONS[name]) || Music;
  return <Icon className={className} />;
}
