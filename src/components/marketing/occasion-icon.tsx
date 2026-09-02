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
};

export function OccasionIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Music;
  return <Icon className={className} />;
}
