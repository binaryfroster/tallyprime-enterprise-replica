import assert from 'node:assert';
import test from 'node:test';
import { BankingEngine } from '../src/core/bankingEngine';
import { PayrollEngine } from '../src/core/payrollEngine';
import { createTallyServer } from '../src/core/port9000Server';
import {
  SAMPLE_LEDGERS,
  SAMPLE_VOUCHERS,
  SAMPLE_BANK_STATEMENTS,
  SAMPLE_EMPLOYEES,
} from '../src/core/sampleCompany';

test('Auto BRS Engine detects unpresented payments & reconciled balances', () => {
  const hdfc = SAMPLE_LEDGERS.find((l) => l.id === 'led_hdfc_bank')!;
  const brs = BankingEngine.generateBRS({
    bankLedger: hdfc,
    vouchers: SAMPLE_VOUCHERS,
    statementTransactions: SAMPLE_BANK_STATEMENTS,
  });

  assert.strictEqual(brs.bankLedgerName, 'HDFC Bank Current A/c');
  assert.ok(brs.balanceAsPerCompanyBooks > 0);

  // Cheque CHQ-890012 for ₹10,00,000 issued to Intel was not in bank statement
  const unpresented = brs.amountsNotReflectedInBank.find(
    (item) => item.voucherNo === 'PMT/2026/001'
  );
  assert.ok(unpresented, 'Intel payment cheque must be identified as unpresented');
  assert.strictEqual(unpresented.amount, 1000000);
  assert.strictEqual(unpresented.type, 'PAYMENT_NOT_CLEARED');
  assert.strictEqual(brs.balanceAsPerBank, 5475000);
});

test('Payroll Engine computes gross salary, PF/ESI/PT, and generates balanced voucher', () => {
  const emp = SAMPLE_EMPLOYEES[0]; // Vikramaditya: Basic 1,20,000, HRA 50,000, Special 30,000
  const salary = PayrollEngine.computeMonthlySalary(emp, {
    employeeId: emp.id,
    totalDaysInMonth: 30,
    presentDays: 30,
    lopDays: 0,
  });

  assert.strictEqual(salary.basicSalary, 120000);
  assert.strictEqual(salary.grossSalary, 200000);
  assert.strictEqual(salary.employeePf, 14400); // 12% of 1,20,000
  assert.strictEqual(salary.professionalTax, 200);
  assert.strictEqual(salary.totalDeductions, 14600);
  assert.strictEqual(salary.netPayableSalary, 185400);

  const voucher = PayrollEngine.generatePayrollVoucher({
    voucherNumber: 'PAY/2026/001',
    date: '2026-04-30',
    salaryBreakups: [salary],
    salaryExpenseLedgerId: 'led_salaries_expense',
    salaryPayableLedgerId: 'led_salary_payable',
    pfPayableLedgerId: 'led_pf_payable',
    esiPayableLedgerId: 'led_esi_payable',
    ptPayableLedgerId: 'led_pt_payable',
  });

  assert.strictEqual(voucher.voucherType, 'PAYROLL');
  // Check double entry
  let dr = 0, cr = 0;
  voucher.ledgerEntries.forEach((e) => {
    if (e.amount > 0) dr += e.amount;
    else cr += Math.abs(e.amount);
  });
  assert.strictEqual(dr, cr, 'Payroll voucher must strictly balance');
});

test('Port 9000 XML Server responds to Export Data List of Ledgers request', async () => {
  const app = createTallyServer();
  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;

  // Standard Tally XML envelope payload
  const envelope = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Ledgers</REPORTNAME>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

  try {
    const res = await fetch(`http://localhost:${port}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('<STATUS>1</STATUS>'));
    assert.ok(text.includes('<COLLECTION>'));
    assert.ok(text.includes('HDFC Bank Current A/c'));
    assert.ok(text.includes('Share Capital A/c'));
  } finally {
    server.close();
  }
});
