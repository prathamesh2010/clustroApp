import React from 'react';
import {
  Users,
  PlaneTakeoff,
  PartyPopper,
  Building2,
  Landmark,
  TreePine,
  Briefcase,
  Trophy,
  HeartHandshake,
  Sparkles,
  LucideIcon,
} from 'lucide-react';
import { ClusterType } from '@clustro/shared';

export const CLUSTER_TYPE_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bgColor: string }
> = {
  family: { label: 'Family', icon: Users, color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  friends: { label: 'Friends', icon: PartyPopper, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  trip: { label: 'Trip', icon: PlaneTakeoff, color: 'text-sky-600', bgColor: 'bg-sky-50' },
  picnic: { label: 'Picnic', icon: TreePine, color: 'text-teal-600', bgColor: 'bg-teal-50' },
  party: { label: 'Party', icon: PartyPopper, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  society: { label: 'Society / Chawl', icon: Building2, color: 'text-amber-700', bgColor: 'bg-amber-50' },
  village: { label: 'Village / Community', icon: Landmark, color: 'text-orange-700', bgColor: 'bg-orange-50' },
  office: { label: 'Office / Event', icon: Briefcase, color: 'text-slate-700', bgColor: 'bg-slate-100' },
  sports: { label: 'Sports', icon: Trophy, color: 'text-rose-600', bgColor: 'bg-rose-50' },
  club: { label: 'Club', icon: HeartHandshake, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  custom: { label: 'Custom', icon: Sparkles, color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
};

export function getTypeMeta(type: string | ClusterType) {
  return CLUSTER_TYPE_CONFIG[type] || CLUSTER_TYPE_CONFIG.family;
}

export const TypeIcon: React.FC<{ type: string | ClusterType; className?: string; size?: number }> = ({
  type,
  className = '',
  size = 20,
}) => {
  const meta = getTypeMeta(type);
  const Icon = meta.icon;
  return <Icon className={className || meta.color} size={size} />;
};
