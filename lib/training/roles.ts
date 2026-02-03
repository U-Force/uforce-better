/**
 * Role-Based Access Control for Training
 */

import { TrainingRole, type RolePermissions } from './types';

export const ROLE_PERMISSIONS: Record<TrainingRole, RolePermissions> = {
  [TrainingRole.RO_TRAINEE]: {
    canControlRods: true,
    maxRodChangePercent: 10, // Max 10% change without approval
    canScram: false, // Must request supervisor
    canBypassTrips: false,
    canControlPump: true,
    requiresApproval: true,
    showHints: true,
    showProcedures: true,
  },

  [TrainingRole.RO]: {
    canControlRods: true,
    maxRodChangePercent: null, // Unlimited
    canScram: true,
    canBypassTrips: false,
    canControlPump: true,
    requiresApproval: false,
    showHints: false,
    showProcedures: true,
  },

  [TrainingRole.SRO]: {
    canControlRods: true,
    maxRodChangePercent: null,
    canScram: true,
    canBypassTrips: true, // Can bypass for testing
    canControlPump: true,
    requiresApproval: false,
    showHints: false,
    showProcedures: false, // Expected to know procedures
  },

  [TrainingRole.MAINTENANCE]: {
    canControlRods: false,
    maxRodChangePercent: 0,
    canScram: false,
    canBypassTrips: false,
    canControlPump: false,
    requiresApproval: false,
    showHints: false,
    showProcedures: false,
  },

  [TrainingRole.FREE_PLAY]: {
    canControlRods: true,
    maxRodChangePercent: null,
    canScram: true,
    canBypassTrips: true,
    canControlPump: true,
    requiresApproval: false,
    showHints: false,
    showProcedures: false,
  },
};

export function getRolePermissions(role: TrainingRole): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

export function getRoleDisplayName(role: TrainingRole): string {
  const names: Record<TrainingRole, string> = {
    [TrainingRole.RO_TRAINEE]: 'Reactor Operator Trainee',
    [TrainingRole.RO]: 'Reactor Operator',
    [TrainingRole.SRO]: 'Senior Reactor Operator',
    [TrainingRole.MAINTENANCE]: 'Maintenance Technician',
    [TrainingRole.FREE_PLAY]: 'Free Play Mode',
  };
  return names[role];
}

export function getRoleDescription(role: TrainingRole): string {
  const descriptions: Record<TrainingRole, string> = {
    [TrainingRole.RO_TRAINEE]:
      'Limited controls, procedural guidance, hints enabled. Focus on learning.',
    [TrainingRole.RO]:
      'Full operational authority. Expected to follow procedures independently.',
    [TrainingRole.SRO]:
      'Supervisory authority including bypass capability. Emergency command.',
    [TrainingRole.MAINTENANCE]:
      'View-only monitoring. Observe reactor behavior during maintenance activities.',
    [TrainingRole.FREE_PLAY]:
      'Unrestricted sandbox mode for exploration and experimentation.',
  };
  return descriptions[role];
}
