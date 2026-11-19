/*!
 * Suprah Deal Desk - Website Online Purchase Widget
 * Drop on a vehicle page:
 *   <script src="https://suprah-app.com/deal-desk-widget.js"
 *     data-dealer="your-dealer-key" data-api="https://api.suprah-app.com"
 *     data-vin="..." data-price="..." data-year="..." data-make="..." data-model="..."
 *     async></script>
 * Optional: data-trim, data-mileage, data-stock, data-condition, data-image,
 *           data-button="false" (no floating button), data-label="Buy online".
 * JS API:   SuprahDealDesk.open({ vin, price, year, make, model, ... })
 * Submissions land in the dealership's Deal Desk queue as "Website" deals.
 */
(function () {
  'use strict';
  if (window.SuprahDealDesk) return;

  var script = document.currentScript || (function () { var s = document.querySelectorAll('script[data-dealer]'); return s[s.length - 1]; })();
  var ds = (script && script.dataset) || {};
  var API = (ds.api || 'https://api.suprah-app.com').replace(/\/+$/, '');
  var DEALER = ds.dealer;
  if (!DEALER) { console.warn('[Suprah Deal Desk] data-dealer is required'); return; }
  var BASE = API + '/api/public/deal-desk/' + encodeURIComponent(DEALER);

  function num(v) { if (v == null || v === '') return undefined; var n = Number(String(v).replace(/[$,\s]/g, '')); return isFinite(n) ? n : undefined; }
  function money(v) { return v == null || isNaN(v) ? '\u2014' : '$' + Math.round(v).toLocaleString('en-US'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var vehicleFromTag = {
    vin: ds.vin, stockNumber: ds.stock, year: num(ds.year), make: ds.make, model: ds.model, trim: ds.trim,
    mileage: num(ds.mileage), price: num(ds.price), condition: ds.condition, image: ds.image,
  };

  var config = null;
  var state;
  function reset(vehicle) {
    state = {
      step: 0,
      vehicle: Object.assign({}, vehicleFromTag, vehicle || {}),
      fin: { downPayment: '', creditBand: 'good', desiredTerm: 72, trade: false, tradeYear: '', tradeMake: '', tradeModel: '', tradeMileage: '', tradeValue: '', tradePayoff: '' },
      cust: { firstName: '', lastName: '', email: '', phone: '', street: '', city: '', state: '', zip: '' },
      credit: { employer: '', jobTitle: '', employmentYears: '', grossMonthlyIncome: '', housingStatus: 'rent', housingPayment: '', residenceYears: '', dob: '', ssn: '' },
      consent: false, wantsDeposit: false, website: '',
      estimate: null, busy: false, error: '', result: null,
    };
  }

  function api(path, body) {
    return fetch(BASE + path, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.message || 'Something went wrong. Please try again.');
        return j.data;
      });
    });
  }

  /* --------- DOM --------- */
  var host = document.createElement('div');
  host.id = 'suprah-deal-desk';
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  var accent = '#16a34a';

  function css() {
    return '' +
      ':host{all:initial}*{box-sizing:border-box;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      '.fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;align-items:center;gap:10px;border:0;border-radius:999px;padding:14px 20px;background:var(--a);color:#fff;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 10px 30px -8px var(--a),0 4px 12px rgba(0,0,0,.18);transition:transform .15s}' +
      '.fab:hover{transform:translateY(-2px)}.fab svg{width:18px;height:18px}' +
      '.ov{position:fixed;inset:0;z-index:2147483001;background:rgba(10,15,13,.55);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;animation:f .2s}' +
      '@media(min-width:640px){.ov{align-items:center;padding:24px}}' +
      '@keyframes f{from{opacity:0}}@keyframes u{from{transform:translateY(24px);opacity:0}}' +
      '.sh{width:100%;max-width:520px;max-height:94dvh;display:flex;flex-direction:column;background:#fff;color:#0f172a;border-radius:22px 22px 0 0;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.45);animation:u .25s}' +
      '@media(min-width:640px){.sh{border-radius:22px}}' +
      '.hd{position:relative;padding:18px 20px 14px;border-bottom:1px solid #eef2f0;background:linear-gradient(135deg,color-mix(in srgb,var(--a) 10%,#fff),#fff 60%)}' +
      '.k{font:600 10.5px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--a)}' +
      '.t{margin:4px 0 0;font-size:19px;font-weight:700;letter-spacing:-.01em}' +
      '.x{position:absolute;right:12px;top:12px;width:34px;height:34px;border:0;border-radius:10px;background:transparent;color:#64748b;font-size:22px;line-height:1;cursor:pointer}.x:hover{background:#f1f5f9}' +
      '.pr{display:flex;gap:6px;margin-top:12px}.pr i{flex:1;height:4px;border-radius:4px;background:#e2e8f0}.pr i.on{background:var(--a)}' +
      '.bd{flex:1;overflow-y:auto;padding:18px 20px}' +
      '.veh{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid #e2e8f0;border-radius:14px;margin-bottom:16px}' +
      '.veh img{width:84px;height:60px;object-fit:cover;border-radius:10px;background:#f1f5f9}.veh b{display:block;font-size:15px}.veh span{font-size:12.5px;color:#64748b}' +
      '.g{display:grid;gap:12px}.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.g3{display:grid;grid-template-columns:1fr 70px 90px;gap:10px}' +
      'label.f{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:#334155}' +
      'input,select{width:100%;height:44px;border:1px solid #cbd5e1;border-radius:11px;padding:0 12px;font-size:15px;color:#0f172a;background:#fff;outline:none;transition:border .15s,box-shadow .15s}' +
      'input:focus,select:focus{border-color:var(--a);box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 20%,transparent)}' +
      '.seg{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.seg button{height:40px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-size:13px;font-weight:600;color:#334155;cursor:pointer}' +
      '.seg button.on{border-color:var(--a);background:color-mix(in srgb,var(--a) 10%,#fff);color:var(--a)}' +
      '.pays{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;margin-top:6px}' +
      '.pay{border:1px solid #e2e8f0;border-radius:12px;padding:10px;text-align:center;cursor:pointer;background:#fff}.pay.on{border-color:var(--a);box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 18%,transparent)}' +
      '.pay b{display:block;font-size:17px}.pay span{font-size:11.5px;color:#64748b}' +
      '.note{font-size:11.5px;color:#64748b;margin-top:8px;line-height:1.45}' +
      '.chk{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;color:#334155;line-height:1.45;padding:12px;border:1px solid #e2e8f0;border-radius:12px}.chk input{width:18px;height:18px;margin-top:1px;accent-color:var(--a);flex:none}' +
      '.tog{display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #e2e8f0;border-radius:12px;font-size:14px;font-weight:600}' +
      '.sw{width:42px;height:24px;border-radius:99px;background:#cbd5e1;position:relative;border:0;cursor:pointer;flex:none}.sw.on{background:var(--a)}.sw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s}.sw.on::after{transform:translateX(18px)}' +
      '.sum{border:1px solid #e2e8f0;border-radius:14px;padding:4px 14px}.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px dashed #e2e8f0;font-size:13.5px}.row:last-child{border:0}.row span{color:#64748b}' +
      '.err{margin-top:12px;padding:10px 12px;border-radius:10px;background:#fef2f2;color:#b91c1c;font-size:13px}' +
      '.ft{display:flex;gap:10px;padding:14px 20px calc(14px + env(safe-area-inset-bottom));border-top:1px solid #eef2f0;background:#fafbfa}' +
      '.btn{flex:1;height:48px;border:0;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;transition:filter .15s,transform .1s}.btn:active{transform:scale(.98)}' +
      '.pri{background:var(--a);color:#fff;box-shadow:0 8px 20px -8px var(--a)}.pri:hover{filter:brightness(1.05)}.pri:disabled{opacity:.55;cursor:not-allowed}' +
      '.sec{flex:0 0 auto;padding:0 18px;background:#fff;border:1px solid #cbd5e1;color:#334155}' +
      '.ok{text-align:center;padding:26px 8px}.ok .ic{width:64px;height:64px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--a) 14%,#fff);color:var(--a)}' +
      '.ok h3{margin:0;font-size:21px}.ok p{color:#475569;font-size:14.5px;line-height:1.5}.ref{display:inline-block;margin-top:6px;font:700 13px ui-monospace,monospace;padding:6px 12px;border-radius:8px;background:#f1f5f9}' +
      '.lock{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#64748b;margin-top:10px}' +
      '.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
      '.spin{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;display:inline-block;animation:s .7s linear infinite;vertical-align:-4px}@keyframes s{to{transform:rotate(360deg)}}';
  }

  var ICON_CAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 6H7.4a2 2 0 0 0-1.8 1.1L4 10l-1.5.6C1.7 10.9 1 11.7 1 12.6V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/></svg>';
  var ICON_CHECK = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var STEPS = ['Payments', 'Your info', 'Credit application', 'Review'];

  function vehicleName(v) { return [v.year, v.make, v.model, v.trim].filter(Boolean).join(' ') || 'This vehicle'; }

  function render() {
    var active = root.activeElement || document.activeElement;
    var keep = active && active.getAttribute && active.getAttribute('name') ? { name: active.getAttribute('name'), start: active.selectionStart, end: active.selectionEnd } : null;
    root.innerHTML = '<style>' + css() + '</style>' + (state.open ? sheet() : '') + (ds.button === 'false' ? '' : '<button class="fab" part="button" data-a="open">' + ICON_CAR + esc(ds.label || 'Buy this car online') + '</button>');
    host.style.setProperty('--a', accent);
    bind();
    if (keep) { var el = root.querySelector('[name="' + keep.name + '"]'); if (el) { el.focus(); try { if (keep.start != null) el.setSelectionRange(keep.start, keep.end); } catch (e) {} } }
  }

  function field(label, name, val, opts) {
    opts = opts || {};
    return '<label class="f">' + esc(label) + '<input name="' + name + '" value="' + esc(val) + '"' + (opts.type ? ' type="' + opts.type + '"' : '') + (opts.mode ? ' inputmode="' + opts.mode + '"' : '') + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') + (opts.ac ? ' autocomplete="' + opts.ac + '"' : '') + '></label>';
  }

  function sheet() {
    var v = state.vehicle, s = state;
    var head = '<div class="hd"><div class="k">' + esc(config ? config.dealerName : 'Buy online') + '</div><h2 class="t">' + esc(s.result ? 'You\u2019re all set' : (config && config.headline) || 'Buy this car online') + '</h2><button class="x" data-a="close" aria-label="Close">\u00d7</button>' +
      (s.result ? '' : '<div class="pr">' + STEPS.map(function (_, i) { return '<i class="' + (i <= s.step ? 'on' : '') + '"></i>'; }).join('') + '</div>') + '</div>';
    var body = '', foot = '';
    if (s.result) {
      body = '<div class="ok"><div class="ic">' + ICON_CHECK + '</div><h3>Request sent</h3><p>' + esc(s.result.message) + '</p><div class="ref">Reference ' + esc(s.result.reference) + '</div>' +
        (s.result.depositAmount ? '<p style="margin-top:14px">You asked to hold it with a ' + money(s.result.depositAmount) + ' deposit \u2014 our team will help you place it when they contact you.</p>' : '') + '</div>';
      foot = '<button class="btn pri" data-a="close">Done</button>';
    } else if (s.step === 0) {
      var e = s.estimate;
      body = '<div class="veh">' + (v.image ? '<img src="' + esc(v.image) + '" alt="">' : '') + '<div><b>' + esc(vehicleName(v)) + '</b><span>' + (v.price ? money(v.price) : 'Price on request') + (v.mileage ? ' \u00b7 ' + Number(v.mileage).toLocaleString() + ' mi' : '') + '</span></div></div>' +
        '<div class="g"><div class="g2">' + field('Down payment', 'fin.downPayment', s.fin.downPayment, { mode: 'decimal', ph: '$0' }) +
        '<label class="f">Credit<select name="fin.creditBand">' + [['excellent', 'Excellent (750+)'], ['good', 'Good (700\u2013749)'], ['fair', 'Fair (650\u2013699)'], ['rebuilding', 'Rebuilding (<650)'], ['unsure', 'Not sure']].map(function (o) { return '<option value="' + o[0] + '"' + (s.fin.creditBand === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label></div>' +
        '<div class="tog">Trading in a vehicle?<button class="sw' + (s.fin.trade ? ' on' : '') + '" data-a="trade" aria-label="Toggle trade-in"></button></div>' +
        (s.fin.trade ? '<div class="g2">' + field('Year', 'fin.tradeYear', s.fin.tradeYear, { mode: 'numeric' }) + field('Make', 'fin.tradeMake', s.fin.tradeMake) + field('Model', 'fin.tradeModel', s.fin.tradeModel) + field('Mileage', 'fin.tradeMileage', s.fin.tradeMileage, { mode: 'numeric' }) + field('Estimated value', 'fin.tradeValue', s.fin.tradeValue, { mode: 'decimal', ph: '$' }) + field('Loan payoff', 'fin.tradePayoff', s.fin.tradePayoff, { mode: 'decimal', ph: '$0' }) + '</div>' : '') +
        '<div><div style="font-size:12px;font-weight:600;color:#334155">Estimated monthly payment</div><div class="pays">' +
        (e ? e.options.filter(function (o) { return o.term >= 48; }).map(function (o) { return '<div class="pay' + (Number(s.fin.desiredTerm) === o.term ? ' on' : '') + '" data-a="term" data-term="' + o.term + '"><b>' + money(o.payment) + '</b><span>' + o.term + ' mo</span></div>'; }).join('') : '<div class="note">Enter the details above to see payments.</div>') +
        '</div>' + (e ? '<div class="note">' + money(e.amountFinanced) + ' financed at an estimated ' + e.apr + '% APR, incl. tax and fees. ' + esc(e.disclaimer) + '</div>' : '') + '</div></div>';
      foot = '<button class="btn pri" data-a="next"' + (v.price ? '' : ' disabled') + '>Start my purchase</button>';
    } else if (s.step === 1) {
      body = '<div class="g"><div class="g2">' + field('First name', 'cust.firstName', s.cust.firstName, { ac: 'given-name' }) + field('Last name', 'cust.lastName', s.cust.lastName, { ac: 'family-name' }) + '</div>' +
        field('Email', 'cust.email', s.cust.email, { type: 'email', ac: 'email' }) + field('Mobile phone', 'cust.phone', s.cust.phone, { type: 'tel', ac: 'tel' }) +
        field('Street address', 'cust.street', s.cust.street, { ac: 'street-address' }) + '<div class="g3">' + field('City', 'cust.city', s.cust.city, { ac: 'address-level2' }) + field('State', 'cust.state', s.cust.state, { ac: 'address-level1' }) + field('ZIP', 'cust.zip', s.cust.zip, { mode: 'numeric', ac: 'postal-code' }) + '</div>' +
        '<div class="hp"><input name="website" tabindex="-1" autocomplete="off" value=""></div></div>';
      foot = '<button class="btn sec" data-a="back">Back</button><button class="btn pri" data-a="next">Continue</button>';
    } else if (s.step === 2) {
      body = '<div class="g"><div class="g2">' + field('Employer', 'credit.employer', s.credit.employer) + field('Job title', 'credit.jobTitle', s.credit.jobTitle) + field('Years at job', 'credit.employmentYears', s.credit.employmentYears, { mode: 'decimal' }) + field('Gross monthly income', 'credit.grossMonthlyIncome', s.credit.grossMonthlyIncome, { mode: 'decimal', ph: '$' }) + '</div>' +
        '<div class="g2"><label class="f">Housing<select name="credit.housingStatus">' + [['rent', 'Rent'], ['own', 'Own'], ['family', 'Live with family'], ['other', 'Other']].map(function (o) { return '<option value="' + o[0] + '"' + (s.credit.housingStatus === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' + field('Monthly housing payment', 'credit.housingPayment', s.credit.housingPayment, { mode: 'decimal', ph: '$' }) + field('Years at address', 'credit.residenceYears', s.credit.residenceYears, { mode: 'decimal' }) + field('Date of birth', 'credit.dob', s.credit.dob, { type: 'date', ac: 'bday' }) + '</div>' +
        field('Social Security number', 'credit.ssn', s.credit.ssn, { type: 'password', mode: 'numeric', ph: '\u2022\u2022\u2022-\u2022\u2022-\u2022\u2022\u2022\u2022', ac: 'off' }) +
        '<label class="chk"><input type="checkbox" name="consent"' + (s.consent ? ' checked' : '') + '><span>' + esc(config ? config.consentText : '') + '</span></label>' +
        '<div class="lock">\ud83d\udd12 Encrypted. Only the dealership\u2019s finance team can see your SSN.</div></div>';
      foot = '<button class="btn sec" data-a="back">Back</button><button class="btn pri" data-a="next">Review</button>';
    } else {
      var pay = s.estimate && s.estimate.options.filter(function (o) { return o.term === Number(s.fin.desiredTerm); })[0];
      body = '<div class="sum">' +
        '<div class="row"><span>Vehicle</span><b>' + esc(vehicleName(v)) + '</b></div>' +
        '<div class="row"><span>Price</span><b>' + money(v.price) + '</b></div>' +
        '<div class="row"><span>Down payment</span><b>' + money(num(s.fin.downPayment) || 0) + '</b></div>' +
        (s.fin.trade ? '<div class="row"><span>Trade-in</span><b>' + esc([s.fin.tradeYear, s.fin.tradeMake, s.fin.tradeModel].filter(Boolean).join(' ')) + '</b></div>' : '') +
        '<div class="row"><span>Est. payment</span><b>' + (pay ? money(pay.payment) + '/mo \u00b7 ' + pay.term + ' mo' : '\u2014') + '</b></div>' +
        '<div class="row"><span>Buyer</span><b>' + esc(s.cust.firstName + ' ' + s.cust.lastName) + '</b></div></div>' +
        (config && config.depositAmount ? '<div class="tog" style="margin-top:12px">Hold it with a ' + money(config.depositAmount) + ' refundable deposit<button class="sw' + (s.wantsDeposit ? ' on' : '') + '" data-a="deposit" aria-label="Toggle deposit"></button></div>' : '') +
        '<div class="note">Our online sales team reviews your application and contacts you with your financing options \u2014 usually within minutes during business hours.</div>';
      foot = '<button class="btn sec" data-a="back">Back</button><button class="btn pri" data-a="submit"' + (s.busy ? ' disabled' : '') + '>' + (s.busy ? '<span class="spin"></span>' : 'Submit') + '</button>';
    }
    return '<div class="ov" data-a="backdrop"><div class="sh" role="dialog" aria-modal="true">' + head + '<div class="bd">' + body + (state.error ? '<div class="err">' + esc(state.error) + '</div>' : '') + '</div><div class="ft">' + foot + '</div></div></div>';
  }

  var estTimer = null;
  function refreshEstimate() {
    clearTimeout(estTimer);
    estTimer = setTimeout(function () {
      if (!state.vehicle.price) return;
      api('/estimate', {
        price: state.vehicle.price, downPayment: num(state.fin.downPayment) || 0,
        tradeValue: state.fin.trade ? num(state.fin.tradeValue) : 0, tradePayoff: state.fin.trade ? num(state.fin.tradePayoff) : 0,
        creditBand: state.fin.creditBand,
      }).then(function (e) { state.estimate = e; if (state.open && state.step === 0) render(); }).catch(function () {});
    }, 300);
  }

  function validate() {
    var s = state;
    if (s.step === 1) {
      if (!s.cust.firstName || !s.cust.lastName) return 'Please enter your full name.';
      if (!/^\S+@\S+\.\S+$/.test(s.cust.email)) return 'Please enter a valid email.';
      if (String(s.cust.phone).replace(/\D/g, '').length < 10) return 'Please enter a 10-digit phone number.';
    }
    if (s.step === 2) {
      if (!(num(s.credit.grossMonthlyIncome) > 0)) return 'Please enter your gross monthly income.';
      var ssn = String(s.credit.ssn).replace(/\D/g, '');
      if (ssn && ssn.length !== 9) return 'SSN must be 9 digits.';
      if (!s.consent) return 'Please authorize the credit check to continue.';
    }
    return '';
  }

  function submit() {
    var s = state;
    s.busy = true; s.error = ''; render();
    var yrs = function (v) { var n = num(v); return n == null ? undefined : Math.round(n * 12); };
    api('/deals', {
      vehicle: { vin: s.vehicle.vin, stockNumber: s.vehicle.stockNumber, year: s.vehicle.year, make: s.vehicle.make, model: s.vehicle.model, trim: s.vehicle.trim, mileage: s.vehicle.mileage, price: s.vehicle.price, condition: ['new', 'used', 'cpo'].indexOf(s.vehicle.condition) >= 0 ? s.vehicle.condition : undefined },
      customer: { firstName: s.cust.firstName, lastName: s.cust.lastName, email: s.cust.email, phone: s.cust.phone, address: { street: s.cust.street, city: s.cust.city, state: s.cust.state, zip: s.cust.zip } },
      financing: {
        downPayment: num(s.fin.downPayment) || 0, desiredTerm: Number(s.fin.desiredTerm), creditBand: s.fin.creditBand,
        tradeIn: s.fin.trade ? { present: true, year: num(s.fin.tradeYear), make: s.fin.tradeMake, model: s.fin.tradeModel, mileage: num(s.fin.tradeMileage), value: num(s.fin.tradeValue), payoff: num(s.fin.tradePayoff) } : { present: false },
      },
      creditApp: {
        employer: s.credit.employer, jobTitle: s.credit.jobTitle, employmentMonths: yrs(s.credit.employmentYears), grossMonthlyIncome: num(s.credit.grossMonthlyIncome),
        housingStatus: s.credit.housingStatus, housingPayment: num(s.credit.housingPayment), residenceMonths: yrs(s.credit.residenceYears), ssn: s.credit.ssn || undefined, dob: s.credit.dob || undefined,
      },
      consent: true, wantsDeposit: !!s.wantsDeposit, website: s.website || undefined,
    }).then(function (res) {
      s.busy = false; s.result = res; s.credit.ssn = ''; render();
    }).catch(function (err) { s.busy = false; s.error = err.message; render(); });
  }

  function setPath(path, value) {
    var p = path.split('.');
    if (p.length === 1) state[p[0]] = value; else state[p[0]][p[1]] = value;
  }

  function bind() {
    root.querySelectorAll('[data-a]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        var a = el.getAttribute('data-a');
        if (a === 'backdrop') { if (ev.target === el) close(); return; }
        ev.stopPropagation();
        if (a === 'open') open();
        else if (a === 'close') close();
        else if (a === 'trade') { state.fin.trade = !state.fin.trade; render(); refreshEstimate(); }
        else if (a === 'deposit') { state.wantsDeposit = !state.wantsDeposit; render(); }
        else if (a === 'term') { state.fin.desiredTerm = Number(el.getAttribute('data-term')); render(); }
        else if (a === 'back') { state.step = Math.max(0, state.step - 1); state.error = ''; render(); }
        else if (a === 'next') { var e = validate(); state.error = e; if (!e) state.step++; render(); }
        else if (a === 'submit') submit();
      });
    });
    root.querySelectorAll('input[name],select[name]').forEach(function (el) {
      var name = el.getAttribute('name');
      var handler = function () {
        var v = el.type === 'checkbox' ? el.checked : el.value;
        setPath(name, v);
        if (name.indexOf('fin.') === 0) { refreshEstimate(); }
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', function () { handler(); if (el.tagName === 'SELECT' || el.type === 'checkbox') render(); });
    });
  }

  function onKey(e) { if (e.key === 'Escape' && state.open) close(); }

  function open(vehicle) {
    if (vehicle) reset(vehicle);
    state.open = true;
    document.documentElement.style.overflow = 'hidden';
    var go = function () { render(); refreshEstimate(); };
    if (!config) {
      api('/config').then(function (c) { config = c; accent = c.accentColor || accent; go(); }).catch(function (err) { state.error = err.message; go(); });
    } else go();
    document.addEventListener('keydown', onKey);
  }

  function close() {
    state.open = false;
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (state.result) reset();
    render();
  }

  reset();
  function mount() { document.body.appendChild(host); render(); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  window.SuprahDealDesk = { open: open, close: close, version: '1.0.0' };
})();
