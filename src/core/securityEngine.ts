import {
  User,
  PublicUser,
  UserRole,
  UserSession,
  SecurityConfig,
  SecurityAction,
  PermissionResult,
  TallyVaultEnvelope,
  AuditorSignoffRecord,
} from './securityTypes';
import {
  generateSalt,
  generateApiKey,
  hashPassword,
  encryptAesGcm,
  decryptAesGcm,
  timingSafeEqualString,
} from './securityCrypto';
import { sha256 } from './cryptoUtils';

export class SecurityEngine {
  private users: Map<string, User> = new Map();
  private config: SecurityConfig;
  private currentSession: UserSession | null = null;
  private activeSessions: Map<string, UserSession> = new Map();
  private failedAttempts: Map<string, { count: number; lockedUntil?: number }> = new Map();
  private signoffRecords: AuditorSignoffRecord[] = [];

  constructor(initialConfig?: Partial<SecurityConfig>) {
    this.config = {
      enableSecurityControl: true,
      enableTallyVault: false,
      enableApiSecurity: false,
      apiKey: generateApiKey(),
      lockoutThreshold: 3,
      lockoutDurationSeconds: 30,
      ...initialConfig,
    };

    this.initDefaultUsers();
  }

  private initDefaultUsers() {
    // 1. Administrator
    const adminSalt = generateSalt();
    this.users.set('usr_admin', {
      id: 'usr_admin',
      username: 'admin',
      fullName: 'System Administrator',
      role: 'ADMIN',
      passwordHash: hashPassword('admin123', adminSalt),
      salt: adminSalt,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    // 2. Data Entry Operator
    const operatorSalt = generateSalt();
    this.users.set('usr_operator', {
      id: 'usr_operator',
      username: 'operator',
      fullName: 'Accounts Data Entry Operator',
      role: 'DATA_ENTRY',
      passwordHash: hashPassword('operator123', operatorSalt),
      salt: operatorSalt,
      isActive: true,
      allowedBackDatedDays: 7, // Allowed only within 7 days backdated
      disallowedReports: [
        'balance_sheet',
        'profit_loss',
        'ratio_analysis',
        'audit_trail',
        'statutory',
      ],
      disallowedActions: [
        'VIEW_BALANCE_SHEET',
        'VIEW_PROFIT_LOSS',
        'VIEW_RATIO_ANALYSIS',
        'VIEW_AUDIT_TRAIL',
        'VIEW_STATUTORY',
        'ALTER_MASTER',
        'CREATE_MASTER',
        'DELETE_VOUCHER',
        'MANAGE_SECURITY',
        'EXPORT_BACKUP',
        'AUDITOR_SIGNOFF',
      ],
      createdAt: new Date().toISOString(),
    });

    // 3. Statutory Auditor
    const auditorSalt = generateSalt();
    this.users.set('usr_auditor', {
      id: 'usr_auditor',
      username: 'auditor',
      fullName: 'Chartered Accountant & Statutory Auditor',
      role: 'AUDITOR',
      passwordHash: hashPassword('auditor123', auditorSalt),
      salt: auditorSalt,
      isActive: true,
      disallowedActions: [
        'CREATE_VOUCHER',
        'ALTER_VOUCHER',
        'DELETE_VOUCHER',
        'CREATE_MASTER',
        'ALTER_MASTER',
        'MANAGE_SECURITY',
      ],
      createdAt: new Date().toISOString(),
    });

    // Default to active admin session
    this.login('admin', 'admin123');
  }

  // --- Authentication & Session Management ---

  public login(
    username: string,
    password: string
  ): { success: boolean; session?: UserSession; error?: string; lockedUntilSeconds?: number } {
    const user = Array.from(this.users.values()).find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return { success: false, error: `Invalid credentials: User "${username}" not found.` };
    }

    if (!user.isActive) {
      return { success: false, error: `User account "${username}" has been deactivated.` };
    }

    // Check brute-force lockout
    const attemptRecord = this.failedAttempts.get(user.id);
    const now = Date.now();
    if (attemptRecord?.lockedUntil && attemptRecord.lockedUntil > now) {
      const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
      return {
        success: false,
        error: `Account locked due to multiple failed login attempts. Retry in ${remainingSeconds}s.`,
        lockedUntilSeconds: remainingSeconds,
      };
    }

    // Verify Password
    const computedHash = hashPassword(password, user.salt);
    if (!timingSafeEqualString(computedHash, user.passwordHash)) {
      const currentAttempts = (attemptRecord?.count || 0) + 1;
      let lockedUntil: number | undefined;

      if (currentAttempts >= this.config.lockoutThreshold) {
        lockedUntil = now + this.config.lockoutDurationSeconds * 1000;
        this.failedAttempts.set(user.id, { count: currentAttempts, lockedUntil });
        return {
          success: false,
          error: `Incorrect password! Maximum attempts exceeded. Account locked for ${this.config.lockoutDurationSeconds}s.`,
          lockedUntilSeconds: this.config.lockoutDurationSeconds,
        };
      }

      this.failedAttempts.set(user.id, { count: currentAttempts });
      return {
        success: false,
        error: `Incorrect password! ${this.config.lockoutThreshold - currentAttempts} attempts remaining before temporary lockout.`,
      };
    }

    // Login Successful: Reset failure counter & establish session
    this.failedAttempts.delete(user.id);
    user.lastLoginAt = new Date().toISOString();

    const publicUser: PublicUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      allowedBackDatedDays: user.allowedBackDatedDays,
      disallowedReports: user.disallowedReports,
      disallowedActions: user.disallowedActions,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };

    const session: UserSession = {
      token: 'sess_' + generateSalt(16),
      user: publicUser,
      loginTime: new Date().toISOString(),
      expiresAt: new Date(now + 8 * 3600 * 1000).toISOString(), // 8-hour session
    };

    this.currentSession = session;
    this.activeSessions.set(session.token, session);
    return { success: true, session };
  }

  public logout(token?: string): boolean {
    if (token) {
      this.activeSessions.delete(token);
    }
    if (this.currentSession) {
      this.activeSessions.delete(this.currentSession.token);
      this.currentSession = null;
    }
    return true;
  }

  public getCurrentSession(): UserSession | null {
    if (!this.currentSession) return null;
    // Check expiration
    if (new Date(this.currentSession.expiresAt).getTime() < Date.now()) {
      this.currentSession = null;
      return null;
    }
    return this.currentSession;
  }

  public getCurrentUser(): PublicUser | null {
    return this.getCurrentSession()?.user || null;
  }

  // --- Role-Based Access Control (RBAC) Guard ---

  public canExecute(
    action: SecurityAction,
    context?: { voucherDate?: string; currentDate?: string; actingUser?: PublicUser | null }
  ): PermissionResult {
    // If security is disabled, everything is permitted
    if (!this.config.enableSecurityControl) {
      return { allowed: true };
    }

    const user = context?.actingUser !== undefined ? context.actingUser : this.getCurrentUser();
    if (!user) {
      return {
        allowed: false,
        reason: 'Authentication required. Please log into TallyPrime.',
      };
    }

    // Administrators and Owners have full unfettered access
    if (user.role === 'ADMIN' || user.role === 'OWNER') {
      return { allowed: true };
    }

    // Check explicit disallowed actions
    if (user.disallowedActions && user.disallowedActions.includes(action)) {
      return {
        allowed: false,
        reason: `Access Denied: User "${user.username}" (${user.role}) is not permitted to perform "${action}".`,
      };
    }

    // Back-dating restriction validation on voucher entry / alteration
    if (action === 'CREATE_VOUCHER' || action === 'ALTER_VOUCHER') {
      if (user.allowedBackDatedDays !== undefined && context?.voucherDate && context?.currentDate) {
        const vchTime = new Date(context.voucherDate).getTime();
        const curTime = new Date(context.currentDate).getTime();
        const diffDays = Math.floor((curTime - vchTime) / (1000 * 3600 * 24));

        if (diffDays > user.allowedBackDatedDays) {
          return {
            allowed: false,
            reason: `Back-Dating Policy Violation: Transaction date (${context.voucherDate}) is ${diffDays} days old. User role "${user.role}" is restricted to max ${user.allowedBackDatedDays} back-dated days.`,
            violatingField: 'date',
          };
        }
      }
    }

    // Report restrictions
    if (user.disallowedReports && user.disallowedReports.length > 0) {
      const actionToReport: Record<string, string> = {
        VIEW_BALANCE_SHEET: 'balance_sheet',
        VIEW_PROFIT_LOSS: 'profit_loss',
        VIEW_RATIO_ANALYSIS: 'ratio_analysis',
        VIEW_AUDIT_TRAIL: 'audit_trail',
        VIEW_STATUTORY: 'statutory',
      };
      const rep = actionToReport[action];
      if (rep && user.disallowedReports.includes(rep)) {
        return {
          allowed: false,
          reason: `Security Policy Violation: Management report "${rep}" is restricted for user role "${user.role}".`,
        };
      }
    }

    return { allowed: true };
  }

  // --- User Administration (Admin Only) ---

  public getUsers(): PublicUser[] {
    return Array.from(this.users.values()).map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
      allowedBackDatedDays: u.allowedBackDatedDays,
      disallowedReports: u.disallowedReports,
      disallowedActions: u.disallowedActions,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));
  }

  public toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      allowedBackDatedDays: user.allowedBackDatedDays,
      disallowedReports: user.disallowedReports,
      disallowedActions: user.disallowedActions,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  public addUser(
    params: {
      username: string;
      fullName: string;
      role: UserRole;
      password: string;
      allowedBackDatedDays?: number;
      disallowedReports?: string[];
      disallowedActions?: SecurityAction[];
    },
    actingUser?: PublicUser
  ): { success: boolean; user?: PublicUser; error?: string } {
    const user = actingUser !== undefined ? actingUser : this.getCurrentUser();
    const auth = this.canExecute('MANAGE_SECURITY', { actingUser: user });
    if (!auth.allowed) return { success: false, error: auth.reason };

    if (!params.username || params.username.trim().length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }

    if (
      Array.from(this.users.values()).some(
        (u) => u.username.toLowerCase() === params.username.toLowerCase()
      )
    ) {
      return { success: false, error: `User with username "${params.username}" already exists.` };
    }

    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const salt = generateSalt();
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Secure RBAC Defaults for newly provisioned roles (CWE-276 / CWE-863 prevention)
    const defaultDisallowedActions: SecurityAction[] =
      params.role === 'DATA_ENTRY'
        ? [
            'VIEW_BALANCE_SHEET',
            'VIEW_PROFIT_LOSS',
            'VIEW_RATIO_ANALYSIS',
            'VIEW_AUDIT_TRAIL',
            'VIEW_STATUTORY',
            'ALTER_MASTER',
            'CREATE_MASTER',
            'DELETE_VOUCHER',
            'MANAGE_SECURITY',
            'EXPORT_BACKUP',
            'AUDITOR_SIGNOFF',
          ]
        : params.role === 'AUDITOR'
        ? [
            'CREATE_VOUCHER',
            'ALTER_VOUCHER',
            'DELETE_VOUCHER',
            'CREATE_MASTER',
            'ALTER_MASTER',
            'MANAGE_SECURITY',
          ]
        : [];

    const defaultDisallowedReports =
      params.role === 'DATA_ENTRY'
        ? ['balance_sheet', 'profit_loss', 'ratio_analysis', 'audit_trail', 'statutory']
        : [];

    const defaultBackDatedDays = params.role === 'DATA_ENTRY' ? 7 : undefined;

    const newUser: User = {
      id,
      username: params.username,
      fullName: params.fullName,
      role: params.role,
      passwordHash: hashPassword(params.password, salt),
      salt,
      isActive: true,
      allowedBackDatedDays:
        params.allowedBackDatedDays !== undefined ? params.allowedBackDatedDays : defaultBackDatedDays,
      disallowedReports: params.disallowedReports || defaultDisallowedReports,
      disallowedActions: params.disallowedActions || defaultDisallowedActions,
      createdAt: new Date().toISOString(),
    };

    this.users.set(id, newUser);
    return { success: true, user: this.toPublicUser(newUser) };
  }

  public deleteUser(userId: string, actingUser?: PublicUser): { success: boolean; error?: string } {
    const caller = actingUser !== undefined ? actingUser : this.getCurrentUser();
    const auth = this.canExecute('MANAGE_SECURITY', { actingUser: caller });
    if (!auth.allowed) return { success: false, error: auth.reason };

    const targetUser = this.users.get(userId);
    if (!targetUser) return { success: false, error: 'User not found.' };

    // Cannot delete active admin if only one admin left
    if (targetUser.role === 'ADMIN') {
      const adminCount = Array.from(this.users.values()).filter(
        (u) => u.role === 'ADMIN' && u.isActive
      ).length;
      if (adminCount <= 1) {
        return { success: false, error: 'Cannot delete the only remaining Administrator.' };
      }
    }

    this.users.delete(userId);
    return { success: true };
  }

  public changePassword(
    userId: string,
    newPassword: string,
    actingUser?: PublicUser
  ): { success: boolean; error?: string } {
    const caller = actingUser !== undefined ? actingUser : this.getCurrentUser();
    const user = this.users.get(userId);
    if (!user) return { success: false, error: 'User not found.' };

    // Authorization: Must be ADMIN or changing own password
    if (caller && caller.role !== 'ADMIN' && caller.role !== 'OWNER' && caller.id !== userId) {
      return { success: false, error: 'Access Denied: You can only change your own password.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const salt = generateSalt();
    user.salt = salt;
    user.passwordHash = hashPassword(newPassword, salt);
    return { success: true };
  }

  // --- TallyVault Military-Grade Database Encryption ---

  public enableTallyVault(vaultPassword: string, hint?: string): { success: boolean; error?: string } {
    if (!vaultPassword || vaultPassword.length < 6) {
      return { success: false, error: 'TallyVault password must be at least 6 characters.' };
    }
    const salt = generateSalt();
    this.config.enableTallyVault = true;
    this.config.tallyVaultSalt = salt;
    this.config.tallyVaultHash = hashPassword(vaultPassword, salt);
    this.config.tallyVaultHint = hint;
    return { success: true };
  }

  public disableTallyVault(vaultPassword: string): { success: boolean; error?: string } {
    if (!this.config.enableTallyVault) return { success: true };
    if (!this.verifyVaultPassword(vaultPassword)) {
      return { success: false, error: 'Incorrect TallyVault password. Cannot disable vault.' };
    }
    this.config.enableTallyVault = false;
    this.config.tallyVaultHash = undefined;
    this.config.tallyVaultSalt = undefined;
    this.config.tallyVaultHint = undefined;
    return { success: true };
  }

  public verifyVaultPassword(password: string): boolean {
    if (!this.config.enableTallyVault || !this.config.tallyVaultHash || !this.config.tallyVaultSalt) {
      return true;
    }
    const computed = hashPassword(password, this.config.tallyVaultSalt);
    return timingSafeEqualString(computed, this.config.tallyVaultHash);
  }

  public isVaultEnabled(): boolean {
    return this.config.enableTallyVault;
  }

  public async encryptVaultBackup(
    plainJson: string,
    vaultPassword?: string
  ): Promise<TallyVaultEnvelope> {
    const pwd = vaultPassword || (this.config.enableTallyVault ? 'TallyVaultDefaultKey' : 'TallyMasterKey');
    const encrypted = await encryptAesGcm(plainJson, pwd);

    return {
      magic: 'TALLYVAULT_V1',
      cipher: 'AES-256-GCM',
      saltHex: encrypted.saltHex,
      ivHex: encrypted.ivHex,
      ciphertextBase64: encrypted.ciphertextBase64,
      companyMaskedName: '***** (Company 10001)',
      createdAt: new Date().toISOString(),
    };
  }

  public async decryptVaultBackup(
    envelope: TallyVaultEnvelope,
    vaultPassword: string
  ): Promise<string> {
    if (envelope.magic !== 'TALLYVAULT_V1') {
      throw new Error('Invalid TallyVault backup envelope format.');
    }
    return await decryptAesGcm(
      envelope.ciphertextBase64,
      vaultPassword,
      envelope.saltHex,
      envelope.ivHex
    );
  }

  // --- Auditor Sign-off Mechanism ---

  public signOffVoucher(
    voucherId: string,
    notes?: string,
    actingUser?: PublicUser
  ): { success: boolean; record?: AuditorSignoffRecord; error?: string } {
    const user = actingUser !== undefined ? actingUser : this.getCurrentUser();
    const auth = this.canExecute('AUDITOR_SIGNOFF', { actingUser: user });
    if (!auth.allowed) return { success: false, error: auth.reason };

    if (!user) return { success: false, error: 'No active auditor session.' };

    const timestamp = new Date().toISOString();
    const signatureHash = sha256(
      JSON.stringify({
        voucherId,
        signedBy: user.id,
        role: user.role,
        timestamp,
        notes,
      })
    );

    const record: AuditorSignoffRecord = {
      id: `signoff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      entityType: 'VOUCHER',
      entityId: voucherId,
      signedByUserId: user.id,
      signedByUserName: user.fullName,
      timestamp,
      notes,
      signatureHash,
    };

    this.signoffRecords.push(record);
    return { success: true, record };
  }

  public getSignoffsForEntity(entityId: string): AuditorSignoffRecord[] {
    return this.signoffRecords.filter((s) => s.entityId === entityId);
  }

  public getAllSignoffs(): AuditorSignoffRecord[] {
    return [...this.signoffRecords];
  }

  public verifySignoff(record: AuditorSignoffRecord): boolean {
    const expectedHash = sha256(
      JSON.stringify({
        voucherId: record.entityId,
        signedBy: record.signedByUserId,
        role: 'AUDITOR',
        timestamp: record.timestamp,
        notes: record.notes,
      })
    );
    return expectedHash === record.signatureHash;
  }

  public setVaultPassword(vaultPassword: string, hint?: string): { success: boolean; error?: string } {
    return this.enableTallyVault(vaultPassword, hint);
  }

  // --- API Security & Port 9000 Gateway Verification ---

  public getConfig(): SecurityConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<SecurityConfig>): SecurityConfig {
    this.config = { ...this.config, ...updates };
    return { ...this.config };
  }

  public verifyApiAccess(
    authHeader?: string,
    apiKeyHeader?: string
  ): { success: boolean; user?: PublicUser; error?: string; status?: number } {
    // 1. Check Bearer API Key or Session Token if provided
    const rawBearer = apiKeyHeader || authHeader;
    if (rawBearer && rawBearer.startsWith('Bearer ')) {
      const token = rawBearer.replace('Bearer ', '').trim();
      if (timingSafeEqualString(token, this.config.apiKey)) {
        const admin = this.users.get('usr_admin')!;
        return { success: true, user: this.toPublicUser(admin) };
      }
      const session =
        this.activeSessions.get(token) ||
        (this.currentSession && timingSafeEqualString(this.currentSession.token, token)
          ? this.currentSession
          : null);
      if (session) {
        if (new Date(session.expiresAt).getTime() > Date.now()) {
          return { success: true, user: session.user };
        } else {
          return { success: false, error: 'Session expired. Please log in again.', status: 401 };
        }
      }
      return { success: false, error: 'Invalid or expired session token.', status: 401 };
    } else if (apiKeyHeader && timingSafeEqualString(apiKeyHeader, this.config.apiKey)) {
      const admin = this.users.get('usr_admin')!;
      return { success: true, user: this.toPublicUser(admin) };
    }

    // 2. Check HTTP Basic Auth (Authorization: Basic base64(user:pass))
    if (authHeader && authHeader.startsWith('Basic ')) {
      try {
        const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
        const [username, password] = credentials.split(':');
        const loginResult = this.login(username, password);
        if (loginResult.success && loginResult.session) {
          return { success: true, user: loginResult.session.user };
        }
        return {
          success: false,
          error: loginResult.error || 'Invalid credentials',
          status: 401,
        };
      } catch {
        return { success: false, error: 'Malformed Basic authorization header', status: 400 };
      }
    }

    // If API security is turned off and no credentials were supplied, grant default admin access
    if (!this.config.enableApiSecurity) {
      const admin = this.users.get('usr_admin')!;
      return { success: true, user: this.toPublicUser(admin) };
    }

    return {
      success: false,
      error: 'Unauthorized: Valid API Key or HTTP Basic credentials required.',
      status: 401,
    };
  }
}

// Global Singleton Instance
export const globalSecurityEngine = new SecurityEngine();
