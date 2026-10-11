import { Employee, Voucher } from './types';

export interface AttendanceRecord {
  employeeId: string;
  totalDaysInMonth: number;
  presentDays: number;
  lopDays: number; // Loss of pay
  overtimeHours?: number;
}

export interface SalaryBreakup {
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  grossSalary: number;
  employeePf: number; // 12% of Basic
  employeeEsi: number; // 0.75% of Gross (if Gross <= 21000)
  professionalTax: number;
  totalDeductions: number;
  netPayableSalary: number;
  employerPf: number; // 3.67%
  employerEps: number; // 8.33%
  employerEsi: number; // 3.25%
}

export class PayrollEngine {
  /**
   * Computes salary breakup for an employee for a specific attendance record
   */
  public static computeMonthlySalary(employee: Employee, attendance: AttendanceRecord): SalaryBreakup {
    const factor =
      attendance.totalDaysInMonth > 0
        ? attendance.presentDays / attendance.totalDaysInMonth
        : 1.0;

    const basicSalary = Math.round(employee.basicSalary * factor);
    const hra = Math.round(employee.hra * factor);
    const specialAllowance = Math.round(employee.specialAllowance * factor);
    const grossSalary = basicSalary + hra + specialAllowance;

    // Statutory deductions
    const employeePf = employee.pfNumber ? Math.round(basicSalary * 0.12) : 0;
    const employeeEsi =
      employee.esiNumber && grossSalary <= 21000 ? Math.round(grossSalary * 0.0075) : 0;
    const professionalTax = grossSalary > 10000 ? 200 : 0;

    const totalDeductions = employeePf + employeeEsi + professionalTax;
    const netPayableSalary = grossSalary - totalDeductions;

    // Employer statutory contributions
    const employerPf = employee.pfNumber ? Math.round(basicSalary * 0.0367) : 0;
    const employerEps = employee.pfNumber ? Math.round(basicSalary * 0.0833) : 0;
    const employerEsi =
      employee.esiNumber && grossSalary <= 21000 ? Math.round(grossSalary * 0.0325) : 0;

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      basicSalary,
      hra,
      specialAllowance,
      grossSalary,
      employeePf,
      employeeEsi,
      professionalTax,
      totalDeductions,
      netPayableSalary,
      employerPf,
      employerEps,
      employerEsi,
    };
  }

  /**
   * Auto-generates a Tally-compliant Payroll Voucher (Ctrl+F4)
   */
  public static generatePayrollVoucher(params: {
    voucherNumber: string;
    date: string;
    salaryBreakups: SalaryBreakup[];
    salaryExpenseLedgerId: string;
    salaryPayableLedgerId: string;
    pfPayableLedgerId: string;
    esiPayableLedgerId: string;
    ptPayableLedgerId: string;
  }): Voucher {
    let totalGross = 0;
    let totalNetPayable = 0;
    let totalPf = 0;
    let totalEsi = 0;
    let totalPt = 0;

    for (const sb of params.salaryBreakups) {
      totalGross += sb.grossSalary;
      totalNetPayable += sb.netPayableSalary;
      totalPf += sb.employeePf;
      totalEsi += sb.employeeEsi;
      totalPt += sb.professionalTax;
    }

    // Double-entry validation:
    // Debit: Salary Expense (totalGross)
    // Credit: Salary Payable (totalNetPayable)
    // Credit: PF Payable (totalPf)
    // Credit: ESI Payable (totalEsi)
    // Credit: PT Payable (totalPt)
    const ledgerEntries = [
      {
        id: `le_sal_exp_${Date.now()}`,
        ledgerId: params.salaryExpenseLedgerId,
        ledgerName: 'Salaries & Wages A/c',
        amount: totalGross, // Dr
        isDeemedPositive: true,
      },
      {
        id: `le_sal_pay_${Date.now()}`,
        ledgerId: params.salaryPayableLedgerId,
        ledgerName: 'Salary Payable A/c',
        amount: -totalNetPayable, // Cr
        isDeemedPositive: false,
      },
    ];

    if (totalPf > 0) {
      ledgerEntries.push({
        id: `le_pf_pay_${Date.now()}`,
        ledgerId: params.pfPayableLedgerId,
        ledgerName: 'PF Payable A/c',
        amount: -totalPf, // Cr
        isDeemedPositive: false,
      });
    }

    if (totalEsi > 0) {
      ledgerEntries.push({
        id: `le_esi_pay_${Date.now()}`,
        ledgerId: params.esiPayableLedgerId,
        ledgerName: 'ESI Payable A/c',
        amount: -totalEsi, // Cr
        isDeemedPositive: false,
      });
    }

    if (totalPt > 0) {
      ledgerEntries.push({
        id: `le_pt_pay_${Date.now()}`,
        ledgerId: params.ptPayableLedgerId,
        ledgerName: 'Professional Tax Payable A/c',
        amount: -totalPt, // Cr
        isDeemedPositive: false,
      });
    }

    return {
      id: `vch_payroll_${Date.now()}`,
      voucherNumber: params.voucherNumber,
      voucherType: 'PAYROLL',
      date: params.date,
      invoicingMode: 'AS_VOUCHER',
      narration: `Monthly salary processing for ${params.salaryBreakups.length} employees`,
      ledgerEntries,
      totalVoucherAmount: totalGross,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'payroll_admin',
    };
  }
}
