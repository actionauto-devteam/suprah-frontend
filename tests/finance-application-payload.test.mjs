import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// Loads a src/lib TypeScript file the same way the other tests do.
function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  new Function('exports', 'require', 'module', outputText)(cjs.exports, () => ({}), cjs);
  return cjs.exports;
}

const { financeApplicationPayload, timeAtJob } = loadLib('finance-application-payload');

// A made-up applicant (test data only).
const form = {
  personal: { applicationType: 'individual', firstName: ' Ana ', lastName: 'Reyes', ssn: '123-45-6789', dob: '1990-04-12', dlNumber: 'D1234567', maritalStatus: 'single' },
  contact: { email: ' ana@example.com ', phone: '(801) 555-0100' },
  residence: { address: '12 Main St', city: 'Orem', state: 'UT', zipCode: '84057', housingStatus: 'rent', monthlyPayment: 1200, yearsAtAddress: 2, monthsAtAddress: 3 },
  employment: { employerName: 'Acme', jobTitle: 'Technician', workPhone: '', annualIncome: 62000, incomeFrequency: 'bi-weekly', employmentYears: 3, employmentMonths: 6 },
  reference: { refName: 'Sam', refRelationship: 'Friend', refPhone: '8015550101' },
  tradeIn: { hasTradeIn: false },
};

test('the full-page form sends every answer to the dealership', () => {
  assert.deepEqual(financeApplicationPayload('veh-1', form), {
    vehicleId: 'veh-1',
    personalInfo: {
      firstName: 'Ana',
      lastName: 'Reyes',
      email: 'ana@example.com',
      phone: '(801) 555-0100',
      dob: '1990-04-12',
      ssn: '123-45-6789',
      address: { street: '12 Main St', city: 'Orem', state: 'UT', zip: '84057' },
      applicationType: 'individual',
      maritalStatus: 'single',
      driversLicenseNumber: 'D1234567',
    },
    employmentInfo: {
      employer: 'Acme',
      jobTitle: 'Technician',
      income: '62000',
      incomeFrequency: 'Yearly',
      yearsAtJob: '3 years 6 months',
      workPhone: undefined,
      payFrequency: 'bi-weekly',
    },
    residence: { housingStatus: 'rent', monthlyPayment: 1200, yearsAtAddress: 2, monthsAtAddress: 3 },
    reference: { name: 'Sam', relationship: 'Friend', phone: '8015550101' },
    tradeIn: { hasTradeIn: false },
  });
});

test('a trade-in is sent with its details', () => {
  const withTrade = { ...form, tradeIn: { hasTradeIn: true, tradeYear: '2015', tradeMake: ' Honda ', tradeModel: 'Civic', tradeMileage: '' } };
  assert.deepEqual(financeApplicationPayload('veh-1', withTrade).tradeIn, {
    hasTradeIn: true, year: '2015', make: 'Honda', model: 'Civic', mileage: undefined,
  });
});

test('time at the job reads naturally', () => {
  assert.equal(timeAtJob(1, 0), '1 year');
  assert.equal(timeAtJob(0, 8), '8 months');
  assert.equal(timeAtJob(2, 1), '2 years 1 month');
  assert.equal(timeAtJob(0, 0), 'Less than a month');
  assert.equal(timeAtJob(undefined, 'x'), 'Less than a month');
});
