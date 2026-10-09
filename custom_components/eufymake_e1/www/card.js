// EufyMake E1 Studio. Dashboard artwork derived from the user's approved card.
class EufyMakeE1Card extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:'open'}); }
  setConfig(config) {
    if (!/^eufymake_e1_[a-z0-9]+$/.test(config.device_id || '')) throw new Error('Set a valid printer device_id');
    this._config = {layout:'horizontal', ...config};
    this.render();
  }
  set hass(value) { this._hass = value; this.render(); }
  connectedCallback() { this._timer = setInterval(() => this.render(), 60000); }
  disconnectedCallback() { clearInterval(this._timer); }
  stateFor(key, domain='sensor') {
    const states = this._hass.states;
    const explicit = this._config.entities?.[key];
    if (explicit) return states[explicit];
    const registered = Object.values(states).find(state =>
      state.attributes?.eufymake_device_id === this._config.device_id &&
      state.attributes?.eufymake_key === key);
    return registered || states[domain + '.' + this._config.device_id + '_' + key];
  }
  static getStubConfig(hass) {
    const match = Object.values(hass.states).find(s => s.attributes?.eufymake_device_id);
    return {type:'custom:eufymake-e1-card', device_id:match?.attributes.eufymake_device_id || 'eufymake_e1_yourserial', layout:'horizontal'};
  }
  getCardSize() { return this._config?.layout === 'vertical' ? 12 : 6; }
  render() {
    if (!this._hass || !this._config) return;
    const panel = this._config.layout === 'vertical' ? this.vertical() : this.horizontal();
    this.shadowRoot.innerHTML = `<ha-card><style>
      :host{display:block;min-width:0}ha-card{display:block;box-sizing:border-box;padding:20px;
      border-radius:24px;background:linear-gradient(145deg,#18283b,#0b1220);
      border:1px solid #334155;box-shadow:0 12px 30px #00000035;color:#f1f5f9}
    </style>${panel}</ha-card>`;
  }
  vertical() {
    const hass = this._hass;
    const states = hass.states;
const norm = x => String(x ?? '').toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const esc = x => String(x ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const pool = Object.values(states).filter(s =>
    s.entity_id.startsWith('sensor.') &&
    (norm(s.entity_id).includes('eufymake') ||
     norm(s.attributes?.friendly_name).includes('eufymake'))
  );
  const find = suffix => {
    const exact = this.stateFor(suffix);
    if (exact) return exact;
    const target = norm(suffix);
    const matches = pool.filter(s =>
      norm(s.entity_id.replace(/_\d+$/, '')).endsWith(target) ||
      norm(s.attributes?.friendly_name).endsWith(target)
    );
    return matches.length === 1 ? matches[0] : null;
  };
  const valid = s => s &&
    !['unknown', 'unavailable', 'none', ''].includes(
      String(s.state).trim().toLowerCase()
    );
  const num = s => {
    if (!valid(s)) return null;
    const n = Number(s.state);
    return Number.isFinite(n) ? n : null;
  };
  const cap = n => Math.max(0, Math.min(100, n));
  const pct = n => n === null ? '—' : cap(n).toFixed(1) + '%';
  const days = n => n === null ? 'Expiry —'
    : n <= 0 ? 'Expired' : Math.floor(n) + 'd to expiry';

  // Read persistent dates from helpers. This card never overwrites them.
  const savedDate = key => {
    const helper = this.stateFor(key + '_expiration_date', 'date');
    if (!valid(helper)) return null;
    const match = String(helper.state).match(
      /^(\d{4})-(\d{2})-(\d{2})(?:$|[ T])/
    );
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const stamp = Date.UTC(year, month - 1, day);
    const check = new Date(stamp);
    if (check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day) return null;
    return {
      text: `${match[1]}-${match[2]}-${match[3]}`,
      stamp
    };
  };

  // Use Home Assistant's timezone for calendar-day calculations.
  const todayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: hass.config?.time_zone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const todayPart = type =>
    Number(todayParts.find(p => p.type === type).value);
  const todayStamp = Date.UTC(
    todayPart('year'), todayPart('month') - 1, todayPart('day')
  );
  const expiration = (key, sensor) => {
    const date = savedDate(key);
    const liveDays = num(sensor);
    return {
      date: date ? date.text : 'Date not saved',
      remaining: liveDays !== null ? liveDays
        : date ? Math.round((date.stamp - todayStamp) / 86400000)
        : null
    };
  };

  const time = s => {
    let n = num(s);
    if (n === null || n < 0) return '—';
    const u = s.attributes?.unit_of_measurement;
    if (u === 'min') n *= 60;
    if (u === 'h') n *= 3600;
    n = Math.floor(n);
    const h = Math.floor(n / 3600);
    const m = Math.floor(n % 3600 / 60);
    return h ? `${h}h ${m}m`
      : m ? `${m}m ${n % 60}s` : `${n}s`;
  };
  const icon = (name, color, size = 20) =>
    `<ha-icon icon="${name}" style="width:${size}px;
    height:${size}px;color:${color};flex-shrink:0;"></ha-icon>`;

  const statusSensor = find('printer_status');
  const stepSensor = find('printer_step');
  const progressSensor = find('print_progress');
  const printTimeSensor = find('print_time');
  const remainingSensor = find('time_remaining');
  const status = valid(statusSensor) ? statusSensor.state : 'No status';
  const mode = status.toLowerCase();
  const accent = mode === 'printing' ? '#22d3ee'
    : mode === 'paused' ? '#fbbf24'
    : mode === 'idle' ? '#34d399' : '#94a3b8';
  const progress = num(progressSensor);
  const p = progress === null ? 0 : cap(progress);
  const activity = mode === 'printing' ? 'Creating'
    : mode === 'paused' ? 'Print paused'
    : mode === 'idle' ? 'Standing by' : 'Waiting for status';

  const readings = [
    statusSensor, stepSensor, progressSensor,
    printTimeSensor, remainingSensor
  ];
  const warnings = [];
  const inks = [
    ['Cyan', 'cyan', '#22d3ee'],
    ['Magenta', 'magenta', '#f472b6'],
    ['Yellow', 'yellow', '#facc15'],
    ['Black', 'black', '#64748b'],
    ['White', 'white', '#f1f5f9'],
    ['Gloss', 'gloss', '#a78bfa']
  ];

  const inkHTML = inks.map(([label, key, color]) => {
    const levelSensor = find(key + '_ink_remaining');
    const expirySensor = find(key + '_ink_expiration');
    readings.push(levelSensor, expirySensor);
    const level = num(levelSensor);
    const expiryInfo = expiration(key, expirySensor);
    const expiry = expiryInfo.remaining;
    const low = level !== null && level <= 20;
    const soon = expiry !== null && expiry <= 30;
    if (low) warnings.push(label + ' ink low');
    if (soon) warnings.push(expiry <= 0
      ? label + ' ink expired'
      : label + ' expiry in ' + Math.floor(expiry) + 'd');
    return `
      <div style="padding:13px 6px;border-radius:16px;
        background:#ffffff06;text-align:center;min-width:0;
        border:1px solid ${low ? '#fb718580' : '#334155'};">
        <div style="font-size:12px;font-weight:650;color:#cbd5e1;">
          ${label}
        </div>
        <div style="position:relative;height:82px;width:36px;
          margin:12px auto;border-radius:9px;overflow:hidden;
          background:#ffffff08;border:1px solid #64748b60;">
          <div style="position:absolute;bottom:0;left:0;right:0;
            height:${level === null ? 0 : cap(level)}%;
            background:linear-gradient(0deg,${color},${color}aa);
            transition:height .6s ease;"></div>
          <div style="position:absolute;inset:0;
            background:repeating-linear-gradient(0deg,
            transparent 0px,transparent 19px,
            #0f172a40 19px,#0f172a40 20px);"></div>
        </div>
        <div style="font-size:19px;font-weight:750;
          color:${low ? '#fb7185' : '#f1f5f9'};">${pct(level)}</div>
        <div style="display:flex;justify-content:center;
          align-items:center;gap:3px 6px;flex-wrap:wrap;
          margin-top:5px;font-size:10px;
          color:${soon ? '#fbbf24' : '#94a3b8'};">
          <span>${days(expiry)}</span>
          <span style="white-space:nowrap;color:#cbd5e1;">
            ${esc(expiryInfo.date)}
          </span>
        </div>
      </div>`;
  }).join('');

  const wasteSensor = find('waste_tank_remaining');
  const wasteExpirySensor = find('waste_tank_expiration');
  readings.push(wasteSensor, wasteExpirySensor);
  const waste = num(wasteSensor);
  const wasteExpiryInfo = expiration('waste_tank', wasteExpirySensor);
  const wasteExpiry = wasteExpiryInfo.remaining;
  const wasteLow = waste !== null && waste <= 20;
  const wasteSoon = wasteExpiry !== null && wasteExpiry <= 30;
  if (wasteLow) warnings.push('Waste capacity low');
  if (wasteSoon) warnings.push(wasteExpiry <= 0
    ? 'Waste tank expired'
    : 'Waste tank expiry in ' + Math.floor(wasteExpiry) + 'd');
  const missing = readings.filter(s => !valid(s)).length;

  const metric = (label, value, symbol) => `
    <div style="background:#ffffff06;border:1px solid #334155;
      border-radius:13px;padding:12px 5px;text-align:center;
      min-width:0;">
      ${icon(symbol, '#94a3b8', 18)}
      <div style="font-size:16px;font-weight:700;margin-top:5px;
        overflow-wrap:anywhere;">${value}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;">
        ${label}
      </div>
    </div>`;

  const step = valid(stepSensor)
    ? (num(stepSensor) === null ? esc(stepSensor.state) : num(stepSensor))
    : '—';
  const summary = warnings.length
    ? warnings.join(' · ')
    : missing ? 'Waiting for sensor readings'
    : 'Supplies above alert thresholds';

  return `
    <div style="font-family:system-ui,sans-serif;line-height:1.4;">
      <div style="display:flex;justify-content:space-between;
        align-items:center;gap:10px;flex-wrap:wrap;">
        <div>
          <div style="font-size:10px;font-weight:700;
            letter-spacing:2px;color:#94a3b8;">UV PRINT STUDIO</div>
          <div style="font-size:28px;font-weight:800;
            letter-spacing:-1px;margin-top:3px;">
            eufy<span style="color:#22d3ee;">Make</span> E1
          </div>
        </div>
        <div style="padding:7px 12px;border-radius:20px;
          background:${accent}18;border:1px solid ${accent}50;
          color:${accent};font-size:12px;font-weight:700;">
          ● ${esc(status)}
        </div>
      </div>

      <div style="display:flex;align-items:center;
        justify-content:center;gap:20px;flex-wrap:wrap;
        margin:25px 0 20px;">
        <div style="width:142px;height:142px;flex:0 0 142px;
          box-sizing:border-box;padding:8px;border-radius:50%;
          background:conic-gradient(${accent} ${p}%,#33415570 0);
          box-shadow:0 0 25px ${accent}15;">
          <div style="height:100%;border-radius:50%;
            background:#111d2d;position:relative;">
            <div style="position:absolute;top:19px;left:0;right:0;text-align:center;">${icon('mdi:printer-3d', accent, 28)}</div>
            <div style="font-size:30px;font-weight:800;position:absolute;top:51px;left:0;right:0;text-align:center;line-height:1.1;">
              ${progress === null ? '—' : Math.round(p) + '%'}
            </div>
            <div style="font-size:9px;letter-spacing:2px;
              color:#94a3b8;position:absolute;top:88px;left:0;right:0;text-align:center;">PROGRESS</div>
          </div>
        </div>
        <div style="flex:1;min-width:110px;">
          <div style="font-size:10px;letter-spacing:1.5px;
            color:#94a3b8;">PRINTER ACTIVITY</div>
          <div style="font-size:23px;font-weight:750;
            color:${accent};margin-top:7px;">${activity}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:6px;">
            Live MQTT monitoring
          </div>
          <div style="height:5px;background:#33415570;
            border-radius:6px;overflow:hidden;margin-top:15px;">
            <div style="height:100%;width:${p}%;
              background:${accent};transition:width .6s ease;"></div>
          </div>
        </div>
      </div>

      <div style="display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
        ${metric('Print time', time(printTimeSensor), 'mdi:timer-outline')}
        ${metric('Remaining', time(remainingSensor), 'mdi:timer-sand')}
        ${metric('Printer step', step, 'mdi:counter')}
      </div>

      <div style="display:flex;align-items:center;gap:8px;
        margin:23px 0 12px;font-size:11px;font-weight:700;
        letter-spacing:1.8px;color:#cbd5e1;">
        ${icon('mdi:water', '#22d3ee', 18)} INK RESERVES
      </div>
      <div style="display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;">
        ${inkHTML}
      </div>

      <div style="margin-top:16px;padding:15px;border-radius:16px;
        background:#ffffff06;
        border:1px solid ${wasteLow ? '#fb718580' : '#334155'};">
        <div style="display:flex;align-items:center;
          justify-content:space-between;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;
            font-size:12px;font-weight:650;color:#cbd5e1;">
            ${icon('mdi:delete-outline', '#94a3b8')} Waste tank
          </div>
          <div style="font-size:20px;font-weight:750;
            color:${wasteLow ? '#fb7185' : '#f1f5f9'};">
            ${pct(waste)}
          </div>
        </div>
        <div style="height:9px;background:#33415570;
          border-radius:8px;overflow:hidden;margin:11px 0 8px;">
          <div style="height:100%;
            width:${waste === null ? 0 : cap(waste)}%;
            background:${wasteLow ? '#fb7185' : '#34d399'};
            border-radius:8px;transition:width .6s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;
          gap:8px;flex-wrap:wrap;font-size:10px;color:#94a3b8;">
          <span>Capacity remaining</span>
          <span style="display:flex;gap:3px 6px;flex-wrap:wrap;
            color:${wasteSoon ? '#fbbf24' : '#94a3b8'};">
            <span>${days(wasteExpiry)}</span>
            <span style="white-space:nowrap;color:#cbd5e1;">
              ${esc(wasteExpiryInfo.date)}
            </span>
          </span>
        </div>
      </div>

      <div style="margin-top:16px;padding-top:13px;
        border-top:1px solid #334155;font-size:11px;
        color:${warnings.length ? '#fbbf24' : '#94a3b8'};">
        <div style="display:flex;align-items:flex-start;gap:8px;">
          ${icon(warnings.length ? 'mdi:alert-circle-outline'
            : missing ? 'mdi:information-outline'
            : 'mdi:check-circle-outline',
            warnings.length ? '#fbbf24'
            : missing ? '#94a3b8' : '#34d399', 18)}
          <span>${esc(summary)}</span>
        </div>
        ${missing ? `<div style="margin-top:6px;color:#94a3b8;">
          ${missing} of ${readings.length} live readings unavailable or unmatched.
          Saved expiration dates remain visible.
        </div>` : ''}
      </div>
    </div>`;
  }
  horizontal() {
    const hass = this._hass;
    const states = hass.states;
const norm = x => String(x ?? '').toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const esc = x => String(x ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const pool = Object.values(states).filter(s =>
    s.entity_id.startsWith('sensor.') &&
    (norm(s.entity_id).includes('eufymake') ||
     norm(s.attributes?.friendly_name).includes('eufymake'))
  );
  const find = suffix => {
    const exact = this.stateFor(suffix);
    if (exact) return exact;
    const target = norm(suffix);
    const matches = pool.filter(s =>
      norm(s.entity_id.replace(/_\d+$/, '')).endsWith(target) ||
      norm(s.attributes?.friendly_name).endsWith(target)
    );
    return matches.length === 1 ? matches[0] : null;
  };
  const valid = s => s &&
    !['unknown', 'unavailable', 'none', ''].includes(
      String(s.state).trim().toLowerCase()
    );
  const num = s => {
    if (!valid(s)) return null;
    const n = Number(s.state);
    return Number.isFinite(n) ? n : null;
  };
  const cap = n => Math.max(0, Math.min(100, n));
  const pct = n => n === null ? '—' : cap(n).toFixed(1) + '%';
  const days = n => n === null ? 'Expiry —'
    : n <= 0 ? 'Expired' : Math.floor(n) + 'd to expiry';

  // Read persistent dates from helpers. This card never overwrites them.
  const savedDate = key => {
    const helper = this.stateFor(key + '_expiration_date', 'date');
    if (!valid(helper)) return null;
    const match = String(helper.state).match(
      /^(\d{4})-(\d{2})-(\d{2})(?:$|[ T])/
    );
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const stamp = Date.UTC(year, month - 1, day);
    const check = new Date(stamp);
    if (check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day) return null;
    return {
      text: `${match[1]}-${match[2]}-${match[3]}`,
      stamp
    };
  };

  // Use Home Assistant's timezone for calendar-day calculations.
  const todayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: hass.config?.time_zone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const todayPart = type =>
    Number(todayParts.find(p => p.type === type).value);
  const todayStamp = Date.UTC(
    todayPart('year'), todayPart('month') - 1, todayPart('day')
  );
  const expiration = (key, sensor) => {
    const date = savedDate(key);
    const liveDays = num(sensor);
    return {
      date: date ? date.text : 'Date not saved',
      remaining: liveDays !== null ? liveDays
        : date ? Math.round((date.stamp - todayStamp) / 86400000)
        : null
    };
  };

  const time = s => {
    let n = num(s);
    if (n === null || n < 0) return '—';
    const u = s.attributes?.unit_of_measurement;
    if (u === 'min') n *= 60;
    if (u === 'h') n *= 3600;
    n = Math.floor(n);
    const h = Math.floor(n / 3600);
    const m = Math.floor(n % 3600 / 60);
    return h ? `${h}h ${m}m`
      : m ? `${m}m ${n % 60}s` : `${n}s`;
  };
  const icon = (name, color, size = 20) =>
    `<ha-icon icon="${name}" style="width:${size}px;
    height:${size}px;color:${color};flex-shrink:0;"></ha-icon>`;

  const statusSensor = find('printer_status');
  const stepSensor = find('printer_step');
  const progressSensor = find('print_progress');
  const printTimeSensor = find('print_time');
  const remainingSensor = find('time_remaining');
  const status = valid(statusSensor) ? statusSensor.state : 'No status';
  const mode = status.toLowerCase();
  const accent = mode === 'printing' ? '#22d3ee'
    : mode === 'paused' ? '#fbbf24'
    : mode === 'idle' ? '#34d399' : '#94a3b8';
  const progress = num(progressSensor);
  const p = progress === null ? 0 : cap(progress);
  const activity = mode === 'printing' ? 'Creating'
    : mode === 'paused' ? 'Print paused'
    : mode === 'idle' ? 'Standing by' : 'Waiting for status';

  const readings = [
    statusSensor, stepSensor, progressSensor,
    printTimeSensor, remainingSensor
  ];
  const warnings = [];
  const inks = [
    ['Cyan', 'cyan', '#22d3ee'],
    ['Magenta', 'magenta', '#f472b6'],
    ['Yellow', 'yellow', '#facc15'],
    ['Black', 'black', '#64748b'],
    ['White', 'white', '#f1f5f9'],
    ['Gloss', 'gloss', '#a78bfa']
  ];

  const inkHTML = inks.map(([label, key, color]) => {
    const levelSensor = find(key + '_ink_remaining');
    const expirySensor = find(key + '_ink_expiration');
    readings.push(levelSensor, expirySensor);
    const level = num(levelSensor);
    const expiryInfo = expiration(key, expirySensor);
    const expiry = expiryInfo.remaining;
    const low = level !== null && level <= 20;
    const soon = expiry !== null && expiry <= 30;
    if (low) warnings.push(label + ' ink low');
    if (soon) warnings.push(expiry <= 0
      ? label + ' ink expired'
      : label + ' expiry in ' + Math.floor(expiry) + 'd');
    return `
      <div style="padding:13px 6px;border-radius:16px;
        background:#ffffff06;text-align:center;min-width:0;
        border:1px solid ${low ? '#fb718580' : '#334155'};">
        <div style="font-size:12px;font-weight:650;color:#cbd5e1;">
          ${label}
        </div>
        <div style="position:relative;height:82px;width:36px;
          margin:12px auto;border-radius:9px;overflow:hidden;
          background:#ffffff08;border:1px solid #64748b60;">
          <div style="position:absolute;bottom:0;left:0;right:0;
            height:${level === null ? 0 : cap(level)}%;
            background:linear-gradient(0deg,${color},${color}aa);
            transition:height .6s ease;"></div>
          <div style="position:absolute;inset:0;
            background:repeating-linear-gradient(0deg,
            transparent 0px,transparent 19px,
            #0f172a40 19px,#0f172a40 20px);"></div>
        </div>
        <div style="font-size:19px;font-weight:750;
          color:${low ? '#fb7185' : '#f1f5f9'};">${pct(level)}</div>
        <div style="display:flex;justify-content:center;
          align-items:center;gap:3px 6px;flex-wrap:wrap;
          margin-top:5px;font-size:10px;
          color:${soon ? '#fbbf24' : '#94a3b8'};">
          <span>${days(expiry)}</span>
          <span style="white-space:nowrap;color:#cbd5e1;">
            ${esc(expiryInfo.date)}
          </span>
        </div>
      </div>`;
  }).join('');

  const wasteSensor = find('waste_tank_remaining');
  const wasteExpirySensor = find('waste_tank_expiration');
  readings.push(wasteSensor, wasteExpirySensor);
  const waste = num(wasteSensor);
  const wasteExpiryInfo = expiration('waste_tank', wasteExpirySensor);
  const wasteExpiry = wasteExpiryInfo.remaining;
  const wasteLow = waste !== null && waste <= 20;
  const wasteSoon = wasteExpiry !== null && wasteExpiry <= 30;
  if (wasteLow) warnings.push('Waste capacity low');
  if (wasteSoon) warnings.push(wasteExpiry <= 0
    ? 'Waste tank expired'
    : 'Waste tank expiry in ' + Math.floor(wasteExpiry) + 'd');
  const missing = readings.filter(s => !valid(s)).length;

  const metric = (label, value, symbol) => `
    <div style="background:#ffffff06;border:1px solid #334155;
      border-radius:13px;padding:12px 5px;text-align:center;
      min-width:0;">
      ${icon(symbol, '#94a3b8', 18)}
      <div style="font-size:16px;font-weight:700;margin-top:5px;
        overflow-wrap:anywhere;">${value}</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;">
        ${label}
      </div>
    </div>`;

  const step = valid(stepSensor)
    ? (num(stepSensor) === null ? esc(stepSensor.state) : num(stepSensor))
    : '—';
  const summary = warnings.length
    ? warnings.join(' · ')
    : missing ? 'Waiting for sensor readings'
    : 'Supplies above alert thresholds';

  return `
    <div style="font-family:system-ui,sans-serif;line-height:1.4;">
      <div style="display:flex;justify-content:space-between;
        align-items:center;gap:10px;flex-wrap:wrap;">
        <div>
          <div style="font-size:10px;font-weight:700;
            letter-spacing:2px;color:#94a3b8;">UV PRINT STUDIO</div>
          <div style="font-size:28px;font-weight:800;
            letter-spacing:-1px;margin-top:3px;">
            eufy<span style="color:#22d3ee;">Make</span> E1
          </div>
        </div>
        <div style="padding:7px 12px;border-radius:20px;
          background:${accent}18;border:1px solid ${accent}50;
          color:${accent};font-size:12px;font-weight:700;">
          ● ${esc(status)}
        </div>
      </div>

      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;margin-top:20px;">
        <div style="flex:1 1 300px;min-width:0;">
      <div style="display:flex;align-items:center;
        justify-content:center;gap:20px;flex-wrap:wrap;
        margin:0 0 16px;">
        <div style="width:142px;height:142px;flex:0 0 142px;
          box-sizing:border-box;padding:8px;border-radius:50%;
          background:conic-gradient(${accent} ${p}%,#33415570 0);
          box-shadow:0 0 25px ${accent}15;">
          <div style="height:100%;border-radius:50%;
            background:#111d2d;position:relative;">
            <div style="position:absolute;top:19px;left:0;right:0;text-align:center;">${icon('mdi:printer-3d', accent, 28)}</div>
            <div style="font-size:30px;font-weight:800;position:absolute;top:51px;left:0;right:0;text-align:center;line-height:1.1;">
              ${progress === null ? '—' : Math.round(p) + '%'}
            </div>
            <div style="font-size:9px;letter-spacing:2px;
              color:#94a3b8;position:absolute;top:88px;left:0;right:0;text-align:center;">PROGRESS</div>
          </div>
        </div>
        <div style="flex:1;min-width:110px;">
          <div style="font-size:10px;letter-spacing:1.5px;
            color:#94a3b8;">PRINTER ACTIVITY</div>
          <div style="font-size:23px;font-weight:750;
            color:${accent};margin-top:7px;">${activity}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:6px;">
            Live MQTT monitoring
          </div>
          <div style="height:5px;background:#33415570;
            border-radius:6px;overflow:hidden;margin-top:15px;">
            <div style="height:100%;width:${p}%;
              background:${accent};transition:width .6s ease;"></div>
          </div>
        </div>
      </div>

      <div style="display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
        ${metric('Print time', time(printTimeSensor), 'mdi:timer-outline')}
        ${metric('Remaining', time(remainingSensor), 'mdi:timer-sand')}
        ${metric('Printer step', step, 'mdi:counter')}
      </div>

        </div>
        <div style="flex:2 1 600px;min-width:0;">
      <div style="display:flex;align-items:center;gap:8px;
        margin:0 0 12px;font-size:11px;font-weight:700;
        letter-spacing:1.8px;color:#cbd5e1;">
        ${icon('mdi:water', '#22d3ee', 18)} INK RESERVES
      </div>
      <div style="display:grid;
        grid-template-columns:repeat(auto-fit,minmax(85px,1fr));gap:9px;">
        ${inkHTML}
      </div>

      <div style="margin-top:16px;padding:15px;border-radius:16px;
        background:#ffffff06;
        border:1px solid ${wasteLow ? '#fb718580' : '#334155'};">
        <div style="display:flex;align-items:center;
          justify-content:space-between;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;
            font-size:12px;font-weight:650;color:#cbd5e1;">
            ${icon('mdi:delete-outline', '#94a3b8')} Waste tank
          </div>
          <div style="font-size:20px;font-weight:750;
            color:${wasteLow ? '#fb7185' : '#f1f5f9'};">
            ${pct(waste)}
          </div>
        </div>
        <div style="height:9px;background:#33415570;
          border-radius:8px;overflow:hidden;margin:11px 0 8px;">
          <div style="height:100%;
            width:${waste === null ? 0 : cap(waste)}%;
            background:${wasteLow ? '#fb7185' : '#34d399'};
            border-radius:8px;transition:width .6s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;
          gap:8px;flex-wrap:wrap;font-size:10px;color:#94a3b8;">
          <span>Capacity remaining</span>
          <span style="display:flex;gap:3px 6px;flex-wrap:wrap;
            color:${wasteSoon ? '#fbbf24' : '#94a3b8'};">
            <span>${days(wasteExpiry)}</span>
            <span style="white-space:nowrap;color:#cbd5e1;">
              ${esc(wasteExpiryInfo.date)}
            </span>
          </span>
        </div>
      </div>

        </div>
      </div>
      <div style="margin-top:16px;padding-top:13px;
        border-top:1px solid #334155;font-size:11px;
        color:${warnings.length ? '#fbbf24' : '#94a3b8'};">
        <div style="display:flex;align-items:flex-start;gap:8px;">
          ${icon(warnings.length ? 'mdi:alert-circle-outline'
            : missing ? 'mdi:information-outline'
            : 'mdi:check-circle-outline',
            warnings.length ? '#fbbf24'
            : missing ? '#94a3b8' : '#34d399', 18)}
          <span>${esc(summary)}</span>
        </div>
        ${missing ? `<div style="margin-top:6px;color:#94a3b8;">
          ${missing} of ${readings.length} live readings unavailable or unmatched.
          Saved expiration dates remain visible.
        </div>` : ''}
      </div>
    </div>`;
  }
}
if (!customElements.get('eufymake-e1-card')) customElements.define('eufymake-e1-card', EufyMakeE1Card);
window.customCards = window.customCards || [];
window.customCards.push({type:'eufymake-e1-card', name:'EufyMake E1 Studio', description:'Printer status, ink reserves, and persistent dates.'});

// Automatically registered sidebar panel; the same card can be used in Lovelace.
class EufyMakeE1Panel extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:'open'}); this._layout='horizontal'; }
  set hass(value) { this._hass=value; this.update(); }
  set panel(value) { this._panel=value; this.update(); }
  set narrow(value) { this._narrow=value; this.update(); }
  update() {
    if (!this._hass || !this._panel) return;
    if (!this._card) {
      this.shadowRoot.innerHTML = `<style>
      :host{display:block;box-sizing:border-box;min-height:100vh;background:var(--primary-background-color);color:var(--primary-text-color);font-family:var(--paper-font-body1_-_font-family,system-ui)}
      header{display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--divider-color)}
      h1{font-size:20px;margin:0;flex:1}.layout{background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:8px;padding:8px;cursor:pointer}
      main{max-width:1440px;margin:auto;padding:24px;box-sizing:border-box}footer{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}footer button{background:var(--card-background-color);color:var(--primary-text-color);border:1px solid var(--divider-color);border-radius:8px;padding:8px;cursor:pointer}small{display:block;color:var(--secondary-text-color);margin-bottom:8px}
      @media(max-width:600px){main{padding:12px}header{padding:8px}}
      </style><header><ha-menu-button></ha-menu-button><h1>EufyMake E1</h1><button class="layout">Vertical layout</button></header><main><eufymake-e1-card></eufymake-e1-card><footer></footer><small>Choose a consumable below the dashboard to edit its saved expiration date.</small></main>`;
      this._card=this.shadowRoot.querySelector('eufymake-e1-card');
      this.shadowRoot.querySelector('.layout').addEventListener('click', () => {
        this._layout=this._layout === 'horizontal' ? 'vertical' : 'horizontal';
        this.update();
      });
    }
    const menu=this.shadowRoot.querySelector('ha-menu-button');
    menu.hass=this._hass; menu.narrow=this._narrow;
    const device_id=this._panel.config.device_id;
    this._card.setConfig({device_id,layout:this._layout});
    this._card.hass=this._hass;
    this.shadowRoot.querySelector('.layout').textContent=this._layout === 'horizontal' ? 'Vertical layout' : 'Horizontal layout';
    const footer=this.shadowRoot.querySelector('footer');
    footer.replaceChildren();
    for (const key of ['cyan','magenta','yellow','black','white','gloss','waste_tank']) {
      const state=this._card.stateFor(key + '_expiration_date','date');
      if (!state) continue;
      const button=document.createElement('button');
      button.textContent=key.replace('_',' ').replace(/^./, c => c.toUpperCase()) + ' date';
      button.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', {
        detail:{entityId:state.entity_id},bubbles:true,composed:true
      })));
      footer.append(button);
    }
  }
}
if (!customElements.get('eufymake-e1-panel')) customElements.define('eufymake-e1-panel', EufyMakeE1Panel);
