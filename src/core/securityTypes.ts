export type UserRole = 'ADMIN' | 'DATA_ENTRY' | 'AUDITOR' | 'OWNER';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  allowedBackDatedDays?: number; // e.g. 7 = max 7 days backdating allowed; undefined = unlimited
  disallowedReports?: string[]; // e.g. ['balance_sheet', 'profit_loss', 'ratio_analysis', 'audit_trail']
  disallowedActions?: SecurityAction[];
}

export type PublicUser = Omit<User, 'passwordHash' | 'salt'>;

export interface UserSession {
  token: string;
  user: PublicUser;
  loginTime: string;
  expiresAt: string;
}

export interface SecurityConfig {
  enableSecurityControl: boolean;
  enableTallyVault: boolean;
  tallyVaultHash?: string;
  tallyVaultSalt?: string;
  tallyVaultHint?: string;
  enableApiSecurity: boolean;
  apiKey: string;
  lockoutThreshold: number; // default: 3
  lockoutDurationSeconds: number; // default: 30
}

export type SecurityAction =
  | 'VIEW_BALANCE_SHEET'
  | 'VIEW_PROFIT_LOSS'
  | 'VIEW_TRIAL_BALANCE'
  | 'VIEW_RATIO_ANALYSIS'
  | 'VIEW_AUDIT_TRAIL'
  | 'VIEW_BANKING'
  | 'VIEW_STATUTORY'
  | 'VIEW_DAYBOOK'
  | 'CREATE_VOUCHER'
  | 'ALTER_VOUCHER'
  | 'DELETE_VOUCHER'
  | 'CREATE_MASTER'
  | 'ALTER_MASTER'
  | 'MANAGE_SECURITY'
  | 'EXPORT_BACKUP'
  | 'AUDITOR_SIGNOFF';

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  violatingField?: string;
}

export interface TallyVaultEnvelope {
  magic: 'TALLYVAULT_V1';
  cipher: 'AES-256-GCM';
  saltHex: string;
  ivHex: string;
  ciphertextBase64: string;
  companyMaskedName: string;
  createdAt: string;
}

export interface AuditorSignoffRecord {
  id: string;
  entityType: 'VOUCHER' | 'PERIOD';
  entityId: string;
  signedByUserId: string;
  signedByUserName: string;
  timestamp: string;
  notes?: string;
  signatureHash: string;
}
