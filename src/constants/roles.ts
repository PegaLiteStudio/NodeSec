export const ROLES = {
    ROOTSEC: 'rootsec',       // Super Admin
    NULLSEC: 'nullsec',       // Creator
    CORESEC: 'coresec',       // System operations (internal)
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
