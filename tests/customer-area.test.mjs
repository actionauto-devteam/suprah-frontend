import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

function loadLib(name) {
  const filename = fileURLToPath(new URL(`../src/lib/${name}.ts`, import.meta.url));
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const cjs = { exports: {} };
  const requireLib = (specifier) => loadLib(specifier.replace(/^@\/lib\//, ''));
  new Function('exports', 'require', 'module', outputText)(cjs.exports, requireLib, cjs);
  return cjs.exports;
}

const {
  CUSTOMER_AREA_FILTER_OPTIONS,
  CUSTOMER_AREA_UNKNOWN_TEXT,
  customerAreaFilterLabel,
  customerAreaHint,
  customerAreaLabel,
  customerAreaShortLabel,
  isCustomerAreaFilter,
  readCustomerArea,
} = loadLib('customerArea');

test('shows a plain label for each area', () => {
  assert.equal(customerAreaLabel({ code: 'utah', basis: 'phone', detail: '801' }), 'Utah');
  assert.equal(customerAreaLabel({ code: 'utah_435', basis: 'phone', detail: '435' }), 'Utah (435)');
  assert.equal(customerAreaLabel({ code: 'southern_utah', basis: 'zip', detail: '84770' }), 'Southern Utah');
  assert.equal(customerAreaLabel({ code: 'canada', basis: 'phone', detail: '416' }), 'Canada');
});

test('adds the state or area code only to out-of-state and outside-US labels', () => {
  assert.equal(customerAreaLabel({ code: 'out_of_state', basis: 'state', detail: 'CA' }), 'Out of state · CA');
  assert.equal(customerAreaLabel({ code: 'out_of_state', basis: 'phone', detail: '949' }), 'Out of state · 949');
  assert.equal(customerAreaLabel({ code: 'out_of_state', basis: 'phone' }), 'Out of state');
  assert.equal(customerAreaLabel({ code: 'outside_us', basis: 'phone' }), 'Outside US');
});

test('shows the country name, not a two-letter code, for numbers outside the US', () => {
  assert.equal(customerAreaLabel({ code: 'outside_us', basis: 'phone', detail: 'MX' }), 'Outside US · Mexico');
  assert.equal(customerAreaLabel({ code: 'outside_us', basis: 'phone', detail: 'GB' }), 'Outside US · United Kingdom');
  assert.equal(customerAreaLabel({ code: 'outside_us', basis: 'phone', detail: 'PH' }), 'Outside US · Philippines');
  assert.equal(customerAreaHint({ code: 'outside_us', basis: 'phone', detail: 'MX' }), "From the phone number's country (Mexico).");
  assert.equal(customerAreaLabel({ code: 'outside_us', basis: 'phone', detail: 'Somewhere' }), 'Outside US · Somewhere');
  assert.equal(customerAreaLabel({ code: 'out_of_state', basis: 'state', detail: 'IN' }), 'Out of state · IN');
});

test('has a short label with no state or area code for tight rows', () => {
  assert.equal(customerAreaShortLabel({ code: 'out_of_state', basis: 'phone', detail: '949' }), 'Out of state');
  assert.equal(customerAreaShortLabel({ code: 'outside_us', basis: 'phone', detail: 'MX' }), 'Outside US');
  assert.equal(customerAreaShortLabel({ code: 'utah_435', basis: 'phone', detail: '435' }), 'Utah (435)');
  assert.equal(customerAreaShortLabel({ code: 'southern_utah', basis: 'zip', detail: '84770' }), 'Southern Utah');
  assert.equal(customerAreaShortLabel(null), '');
  assert.equal(customerAreaShortLabel({ code: 'mars' }), '');
});

test('shows nothing when there is no area or the value is not one we know', () => {
  assert.equal(customerAreaLabel(null), '');
  assert.equal(customerAreaLabel(undefined), '');
  assert.equal(customerAreaLabel({}), '');
  assert.equal(customerAreaLabel({ code: 'mars' }), '');
  assert.equal(customerAreaLabel({ code: 'constructor' }), '');
  assert.equal(customerAreaLabel({ code: 'toString' }), '');
  assert.equal(customerAreaLabel({ code: 42 }), '');
  assert.equal(customerAreaHint(null), '');
  assert.equal(readCustomerArea('utah'), null);
});

test('says where the label came from', () => {
  assert.equal(customerAreaHint({ code: 'utah', basis: 'zip', detail: '84116' }), 'From the ZIP code in the address (84116).');
  assert.equal(customerAreaHint({ code: 'out_of_state', basis: 'state', detail: 'NV' }), 'From the address (NV).');
  assert.match(customerAreaHint({ code: 'southern_utah', basis: 'zip', detail: '84770' }), /St\. George and Cedar City/);
  assert.match(customerAreaHint({ code: 'canada', basis: 'zip', detail: 'M5X 1A9' }), /postal code/);
});

test('warns that a phone area code is only a hint', () => {
  const hint = customerAreaHint({ code: 'out_of_state', basis: 'phone', detail: '949' });
  assert.match(hint, /area code \(949\)/);
  assert.match(hint, /confirm with the customer/);
  assert.match(customerAreaHint({ code: 'utah_435', basis: 'phone', detail: '435' }), /St\. George, Logan, Park City and Moab/);
});

test('offers the six filter choices with labels', () => {
  assert.deepEqual(
    CUSTOMER_AREA_FILTER_OPTIONS.map((option) => option.value),
    ['utah', 'utah_435', 'southern_utah', 'out_of_state', 'outside', 'none'],
  );
  assert.equal(customerAreaFilterLabel('outside'), 'Canada or outside the US');
  assert.equal(customerAreaFilterLabel('none'), 'No area info');
  assert.equal(customerAreaFilterLabel('texas'), '');
  assert.equal(isCustomerAreaFilter('utah_435'), true);
  assert.equal(isCustomerAreaFilter('canada'), false);
});

test('explains every filter choice in words that are true for it', () => {
  const hints = Object.fromEntries(CUSTOMER_AREA_FILTER_OPTIONS.map((option) => [option.value, option.hint]));
  for (const option of CUSTOMER_AREA_FILTER_OPTIONS) assert.ok(option.hint.length > 10, option.value);
  assert.match(hints.utah, /801 or 385/);
  assert.match(hints.utah, /847 are under Southern Utah/);
  assert.match(hints.utah_435, /435 number and no address/);
  assert.match(hints.southern_utah, /ZIP code starting with 847/);
  assert.equal(hints.none, CUSTOMER_AREA_UNKNOWN_TEXT);
  assert.equal(CUSTOMER_AREA_UNKNOWN_TEXT, "Can't tell from the address or phone number");
});
