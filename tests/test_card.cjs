const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const registry = new Map();
global.HTMLElement = class { attachShadow() { this.shadowRoot = {innerHTML:''}; } };
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
card.hass = {states:{},config:{time_zone:'America/Los_Angeles'}};
assert(card.shadowRoot.innerHTML.includes('Date not saved'));
assert(!card.shadowRoot.innerHTML.includes('NaN'));
assert(registry.has('eufymake-e1-panel'));
console.log('Both card layouts verified: 0%, 100%, offline, saved dates, renamed entities, and balanced markup.');
