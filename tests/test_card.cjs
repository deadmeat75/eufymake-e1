const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const registry = new Map();
global.HTMLElement = class { attachShadow() { this.shadowRoot = {innerHTML:'', addEventListener(type, fn) { this.onclick = fn; }, received:{textContent:''}, querySelector() { return this.received; }}; } };
global.customElements = {get:key => registry.get(key), define:(key,value) => registry.set(key,value)};
global.window = {};
vm.runInThisContext(fs.readFileSync(__dirname + '/../custom_components/eufymake_e1/www/card.js','utf8'));
const Card = registry.get('eufymake-e1-card');
const card = new Card();
const prefix = 'eufymake_e1_test';
const states = {};
function entity(key,value,domain='sensor',renamed=false) {
  const id = renamed ? domain + '.my_renamed_' + key : `${domain}.${prefix}_${key}`;
  states[id] = {entity_id:id, state:String(value), attributes:{eufymake_device_id:prefix,eufymake_key:key}};
}
entity('printer_status','Printing');
entity('print_progress',100,'sensor',true);
entity('print_time',163);
entity('time_remaining',57);
entity('printer_step',4);
for (const color of ['cyan','magenta','yellow','black','white','gloss']) {
  entity(color + '_ink_remaining',65.5);
  entity(color + '_ink_expiration','unavailable');
  entity(color + '_expiration_date',color === 'gloss' ? '2026-09-11' : '2026-09-15','date',true);
}
entity('waste_tank_remaining',50);
entity('waste_tank_expiration',100);
for (const layout of ['horizontal','vertical']) {
  card.setConfig({device_id:prefix,layout});
  card.hass = {states,config:{time_zone:'America/Los_Angeles'}};
  const html = card.shadowRoot.innerHTML;
  for (const text of ['100%','2026-09-15','2026-09-11','Cyan','Magenta','Yellow','Black','White','Gloss','Waste tank','Print time','Remaining','Printer step','top:51px','top:88px']) assert(html.includes(text), `${layout} missing ${text}`);
  assert(!html.includes('NaN'));
  assert.strictEqual((html.match(/<div\b/g)||[]).length, (html.match(/<\/div>/g)||[]).length);
  assert.strictEqual(card.stateFor('print_progress').entity_id,'sensor.my_renamed_print_progress');
  entity('print_progress',0,'sensor',true);
  card.hass = {states,config:{time_zone:'America/Los_Angeles'}};
  assert(card.shadowRoot.innerHTML.includes('0%'));
  entity('print_progress',100,'sensor',true);
}
// Unit controls apply only to the six cartridges in either layout.
for (const layout of ['horizontal','vertical']) {
  card.setConfig({device_id:prefix,layout,ink_unit:'percent'});
  card.hass = {states,config:{time_zone:'America/Los_Angeles'}};
  assert.strictEqual((card.shadowRoot.innerHTML.match(/65\.5%<\/div>/g)||[]).length,6);
  card.shadowRoot.onclick({target:{closest:() => ({dataset:{inkUnit:'ml'}})}});
  let html = card.shadowRoot.innerHTML;
  assert.strictEqual((html.match(/65\.5 mL/g)||[]).length,6);
  assert(html.includes('50.0%'), 'waste tank must remain a percentage');
  assert(html.includes('100%'), 'print progress must remain a percentage');
  assert(html.includes('height:65.5%'), 'fill remains proportional');
  card.setConfig({device_id:prefix,layout,ink_unit:'percent'});
  card.hass = {states,config:{time_zone:'America/Los_Angeles'}};
  assert(card.shadowRoot.innerHTML.includes('65.5 mL'), 'live/config updates retain selection');
  entity('cyan_ink_remaining',0);
  entity('magenta_ink_remaining',100);
  entity('yellow_ink_remaining','unavailable');
  card.hass = {states,config:{time_zone:'America/Los_Angeles'}};
  html = card.shadowRoot.innerHTML;
  assert(html.includes('0.0 mL'));
  assert(html.includes('100.0 mL'));
  assert.strictEqual((html.match(/ mL</g)||[]).length,5, 'unavailable ink must not become zero mL');
  card.shadowRoot.onclick({target:{closest:() => ({dataset:{inkUnit:'percent'}})}});
  assert(card.shadowRoot.innerHTML.includes('100.0%'));
  for (const key of ['cyan','magenta','yellow']) entity(key+'_ink_remaining',65.5);
}
const mlCard = new Card();
mlCard.setConfig({device_id:prefix,ink_unit:'ml'});
mlCard.hass = {states,config:{time_zone:'America/Los_Angeles'}};
assert(mlCard.shadowRoot.innerHTML.includes('65.5 mL'));
assert.throws(() => mlCard.setConfig({device_id:prefix,ink_unit:'liters'}));
card.hass = {states:{},config:{time_zone:'America/Los_Angeles'}};
assert(card.shadowRoot.innerHTML.includes('Date not saved'));
assert(!card.shadowRoot.innerHTML.includes('NaN'));
assert(registry.has('eufymake-e1-panel'));
for (const layout of ['horizontal', 'vertical']) {
  card.setConfig({device_id:prefix, layout});
  for (const status of ['Printing', 'Automatic flash clean', 'Taking snapshot']) {
    entity('printer_status', status);
    states['sensor.' + prefix + '_printer_status'].attributes.last_received = '2026-10-09T23:15:00+00:00';
    // All live readings available: disclaimer must still be present.
    for (const color of ['cyan','magenta','yellow','black','white','gloss']) entity(color+'_ink_expiration',100);
    card.hass = {states, config:{time_zone:'America/Los_Angeles'}};
    assert(card.shadowRoot.innerHTML.includes(status));
    assert(card.shadowRoot.innerHTML.includes('Date edits only affect Home Assistant.'));
    assert(card.shadowRoot.innerHTML.includes('PRINTER MONITOR'));
    assert(!card.shadowRoot.innerHTML.includes('UV PRINT STUDIO'));
    assert(!card.shadowRoot.innerHTML.includes('Waiting for status'));
    assert(card.shadowRoot.received.textContent.includes('Last live data received:'));
    assert(card.shadowRoot.received.textContent.includes('4:15:00 PM'));
  }
  states['sensor.' + prefix + '_printer_status'].state = 'unavailable';
  card.hass = {states, config:{time_zone:'America/Los_Angeles'}};
  assert(card.shadowRoot.received.textContent.includes('4:15:00 PM'));
  states['sensor.' + prefix + '_printer_status'].attributes.last_received = 'invalid';
  card.hass = {states, config:{time_zone:'America/Los_Angeles'}};
  assert(card.shadowRoot.received.textContent.includes('No live data received'));
}
console.log('Both card layouts verified: 0%, 100%, offline, saved dates, renamed entities, and balanced markup.');
