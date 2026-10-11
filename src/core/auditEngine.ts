import { AuditTrailLog } from './types';
import { sha256 } from './cryptoUtils';

export class AuditEngine {
  private logs: AuditTrailLog[] = [];
  private lastHash: string = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor(initialLogs: AuditTrailLog[] = []) {
    if (initialLogs.length > 0) {
      this.logs = [...initialLogs];
      this.lastHash = initialLogs[initialLogs.length - 1].currentHash;
    }
  }

  public recordChange(params: {
    entityType: 'MASTER' | 'VOUCHER' | 'COMPANY';
    entityId: string;
    action: 'CREATE' | 'ALTER' | 'DELETE' | 'CANCEL';
    userId?: string;
    ipAddress?: string;
    diff: { field: string; oldValue: any; newValue: any }[];
  }): AuditTrailLog {
    const timestamp = new Date().toISOString();
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const previousHash = this.lastHash;
    const rawPayload = JSON.stringify({
      id,
      timestamp,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId || 'admin',
      ipAddress: params.ipAddress || '127.0.0.1',
      previousHash,
      diff: params.diff,
    });
    const currentHash = sha256(rawPayload);

    const logEntry: AuditTrailLog = {
      id,
      timestamp,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId || 'admin',
      ipAddress: params.ipAddress || '127.0.0.1',
      previousHash,
      currentHash,
      diff: params.diff,
    };

    this.logs.push(logEntry);
    this.lastHash = currentHash;
    return logEntry;
  }

  public getLogs(): AuditTrailLog[] {
    return [...this.logs];
  }

  public getLogsForEntity(entityId: string): AuditTrailLog[] {
    return this.logs.filter((l) => l.entityId === entityId);
  }

  public verifyIntegrity(): { isValid: boolean; corruptedAtId?: string } {
    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const log of this.logs) {
      if (log.previousHash !== expectedPrevHash) {
        return { isValid: false, corruptedAtId: log.id };
      }
      const rawPayload = JSON.stringify({
        id: log.id,
        timestamp: log.timestamp,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        userId: log.userId,
        ipAddress: log.ipAddress,
        previousHash: log.previousHash,
        diff: log.diff,
      });
      const recomputedHash = sha256(rawPayload);
      if (recomputedHash !== log.currentHash) {
        return { isValid: false, corruptedAtId: log.id };
      }
      expectedPrevHash = log.currentHash;
    }
    return { isValid: true };
  }
}
