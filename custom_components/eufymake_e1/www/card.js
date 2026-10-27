// EufyMake E1 Monitor. Dashboard artwork derived from the user's approved card.
class EufyMakeE1Card extends HTMLElement {
  constructor() {
    super(); this.attachShadow({mode:'open'});
    this.shadowRoot.addEventListener('click', event => {
      if(event.target.closest?.('button[data-copy-codes]')) { this.copyCodes(); return; }
      const button = event.target.closest?.('button[data-ink-unit]');
      if (!button) return;
      if (!this._config || !['percent', 'ml'].includes(button.dataset.inkUnit)) return;
      this._inkUnit = button.dataset.inkUnit;
      try { window.localStorage.setItem(this.unitStorageKey(this._config.device_id), this._inkUnit); }
      catch (_) { /* Storage may be disabled; keep the current session usable. */ }
      this.render();
    });
  }
  setConfig(config) {
    if (!/^eufymake_e1_[a-z0-9]+$/.test(config.device_id || '')) throw new Error('Set a valid printer device_id');
    if (config.ink_unit !== undefined && !['percent', 'ml'].includes(config.ink_unit)) {
      throw new Error('ink_unit must be percent or ml');
    }
    if (this._config?.device_id !== config.device_id || this._config?.ink_unit !== config.ink_unit) {
      let saved;
      try { saved = window.localStorage.getItem(this.unitStorageKey(config.device_id)); }
      catch (_) { /* Use the configured default when storage is unavailable. */ }
      this._inkUnit = ['percent', 'ml'].includes(saved) ? saved : config.ink_unit || 'percent';
    }
    this._config = {layout:'horizontal', ...config};
    this.render();
  }
  unitStorageKey(deviceId) { return 'eufymake_e1:ink_unit:' + deviceId; }
  set hass(value) { this._hass = value; this.render(); }
  connectedCallback() { this._timer = setInterval(() => this.render(), 10000); }
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
  bedWarning() {
    const value = this.stateFor('bed_present');
    if (!value || String(value.state).toLowerCase() !== 'false') return '';
    return '<div role="status" style="margin-top:14px;padding:12px;border:1px solid #fbbf24;border-radius:12px;color:#fbbf24">Bed not detected. Make sure a bed is installed and its locking latch is fully closed.</div>';
  }
  printerDetails() {
    const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    const valid = value => value && !['unknown','unavailable','none',''].includes(String(value.state).toLowerCase());
    const fields = [['bed_type','Bed'],['accessory_type','Accessory'],['bed_present','Bed present'],['surface_height','Measured surface height'],['printer_light','Printer light'],['maintenance_operation','Maintenance'],['connection_status','Connection']];
    return `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px">${fields.map(([key,label]) => {
      const value = this.stateFor(key);
      const dimensions = key === 'bed_type' && valid(value) ? {'Mini Flatbed':'335 × 90 mm / 13.19 × 3.54 in','Standard Flatbed':'335 × 420 mm / 13.19 × 16.54 in'}[value.state] : null;
      const stamp = value?.attributes?.reading_received;
      const date = stamp ? new Date(stamp) : null;
      const time = date && Number.isFinite(date.getTime()) ? date.toLocaleString(this._hass.locale?.language || 'en-US', {timeZone:this._config.time_zone || 'America/Los_Angeles'}) : null;
      return `<div style="flex:1;min-width:150px;padding:12px;border:1px solid #334155;border-radius:12px"><small>${label}</small><div>${valid(value) ? esc(key === 'surface_height' ? Number(value.state).toFixed(1) + ' mm' : key === 'bed_present' ? (String(value.state).toLowerCase() === 'true' ? 'Yes' : 'No') : value.state) : 'Unavailable'}</div>${dimensions ? '<small>' + dimensions + '</small><br>' : ''}<small>${time ? 'Last reported: ' + esc(time) : 'Not reported since startup'}</small>${value?.attributes?.configuration_status ? '<small style="display:block">' + esc(value.attributes.configuration_status) + '</small>' : ''}</div>`;
    }).join('')}</div>`;
  }
  escape(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  formatSeconds(value) {
    if(typeof value!=='number'||!Number.isFinite(value)||value<0)return 'Unavailable';
    const n=Math.floor(value),h=Math.floor(n/3600),m=Math.floor(n%3600/60);
    return (h?h+'h ':'')+(m||h?m+'m ':'')+(n%60)+'s';
  }
  localTime(value) {
    const date=new Date(value);
    return value && Number.isFinite(date.getTime())?date.toLocaleString(this._hass.locale?.language||'en-US',{timeZone:this._config.time_zone||'America/Los_Angeles',timeZoneName:'short'}):'Not reported';
  }
  lowThreshold(key) {
    const threshold=this.stateFor('connection_status')?.attributes?.low_ink_thresholds?.[key];
    return typeof threshold==='number'&&Number.isFinite(threshold)&&threshold>=0&&threshold<=100?threshold:10;
  }
  missingReadings() {
    const esc=x=>this.escape(x), valid=s=>s&&!['unknown','unavailable','none',''].includes(String(s.state).toLowerCase());
    const status=this.stateFor('printer_status'),active=['printing','paused'].includes(String(status?.state).toLowerCase());
    const fields=[['printer_status','Printer status'],['printer_step','Printer step'],['waste_tank_remaining','Waste tank level'],['waste_tank_expiration','Waste tank countdown']];
    for(const color of ['cyan','magenta','yellow','black','white','gloss'])fields.push([color+'_ink_remaining',color+' ink level'],[color+'_ink_expiration',color+' expiration countdown']);
    if(active)fields.push(['print_progress','Print progress'],['print_time','Elapsed print time'],['time_remaining','Remaining print time']);
    const missing=fields.filter(([key])=>!valid(this.stateFor(key))&&!(key==='printer_status'&&valid(this.stateFor('printer_state'))));
    const expected=[];
    if(!active)expected.push('Print progress, elapsed time and remaining time are not expected while no print is active.');
    const expired=missing.filter(([key])=>key.endsWith('_ink_expiration')&&valid(this.stateFor(key.replace('_ink_expiration','_expiration_date'))));
    if(expired.length)expected.push('Missing expiration countdowns can be expected for expired ink; saved printer-reported dates remain visible.');
    return `<div style="margin-top:8px;color:#94a3b8;font-size:12px">${missing.length?'Unavailable readings: '+missing.map(([,name])=>esc(name)).join(', ')+'.':'Expected live readings are available.'}${expected.length?'<div>'+expected.map(esc).join(' ')+'</div>':''}</div>`;
  }
  freshness() {
    const sensor=this.stateFor('connection_status'),stamp=sensor?.attributes?.last_telemetry_utc||this.stateFor('printer_status')?.attributes?.last_received;
    const age=stamp?(Date.now()-new Date(stamp).getTime())/1000:NaN;
    const disconnected=String(sensor?.state).toLowerCase()==='disconnected';
    const stale=disconnected||String(sensor?.state).toLowerCase()==='stale'||!Number.isFinite(age)||age<0||age>120;
    const text=Number.isFinite(age)&&age>=0?'Updated '+this.formatSeconds(age)+' ago':'No valid telemetry timestamp';
    return `<p role="status" style="color:${stale?'#fbbf24':'#94a3b8'};font-size:12px">${this.escape(text)}${stale?' · '+(disconnected?'Disconnected':'Telemetry stale / unavailable'):''}</p>`;
  }
  unknownStatus() {
    const state=this.stateFor('printer_state'),step=this.stateFor('printer_step');
    if(String(this.stateFor('printer_status')?.state).toLowerCase()!=='unknown'||!state||!step)return '';
    if(!Number.isFinite(Number(state.state))||!Number.isFinite(Number(step.state)))return '';
    return `<p>State ${this.escape(state.state)} / step ${this.escape(step.state)} — Meaning not yet confirmed. <button type="button" data-copy-codes>Copy codes</button><span data-copy-feedback role="status"></span></p>`;
  }
  async copyCodes() {
    const text='EufyMake E1 state='+this.stateFor('printer_state')?.state+' step='+this.stateFor('printer_step')?.state;
    let copied=false;
    try { if(typeof navigator!=='undefined'&&navigator.clipboard){await navigator.clipboard.writeText(text);copied=true;} } catch(_){}
    if(!copied && typeof document!=='undefined') {
      const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.top='0';this.shadowRoot.appendChild(area);area.select();
      try {copied=document.execCommand('copy');}catch(_){}area.remove();
    }
    const feedback=this.shadowRoot.querySelector('[data-copy-feedback]');if(feedback)feedback.textContent=copied?' Copied':' Copy unavailable; select the displayed codes.';
  }
  historySection() {
    const history=this.stateFor('connection_status')?.attributes?.history||{},esc=x=>this.escape(x);
    const prints=history.prints||[],completed=prints.slice().reverse().find(p=>p.completion_confirmed),maintenance=history.maintenance||[];
    const remaining=this.stateFor('time_remaining'),received=remaining?.attributes?.reading_received,seconds=Number(remaining?.state),stamp=Date.parse(received),age=Date.now()-stamp;
    const eta=String(this.stateFor('printer_status')?.state).toLowerCase()==='printing'&&Number.isFinite(seconds)&&seconds>=0&&Number.isFinite(stamp)&&age>=0&&age<=120000;
    const usage=record=>{
      const u=record.usage||{},q=record.reported_quantities;
      return `<small>${esc(u.status||'Usage unavailable')}${typeof u.total_estimated_ml==='number'?' · '+esc(u.total_estimated_ml.toFixed(2))+' mL estimated total':''}${q?'<br>Printer job quantities (units unverified): print '+esc(q.print_quantity??'—')+', pump '+esc(q.pump_quantity??'—')+', six-channel total '+esc(q.six_channel_total??'—'):''}</small>`;
    };
    const latest={};maintenance.forEach(m=>{latest[m.operation]=m;});
    const changes=history.cartridge_changes||[],points=history.ink_history||[],colors=['#22d3ee','#f472b6','#facc15','#94a3b8','#f1f5f9','#a78bfa'];
    const graph=points.length>1?`<svg viewBox="0 0 600 120" role="img" aria-label="Reported ink supply history, zero to 100 percent" style="width:100%;max-height:180px;background:#0f172a">${colors.map((color,i)=>'<polyline fill="none" stroke="'+color+'" stroke-width="2" points="'+points.map((p,j)=>{const first=Date.parse(points[0].time),span=Date.parse(points[points.length-1].time)-first;const x=span>0?(Date.parse(p.time)-first)/span*600:j/(points.length-1)*600;return Number.isFinite(p.levels_percent?.[i])?x.toFixed(1)+','+(120-Math.max(0,Math.min(100,p.levels_percent[i]))*1.2).toFixed(1):'';}).join(' ')+'"/>').join('')}${points.map((p,j)=>p.cartridge_change?'<line stroke="#fbbf24" stroke-dasharray="3 3" x1="'+(j/(points.length-1)*600)+'" x2="'+(j/(points.length-1)*600)+'" y1="0" y2="120"/>':'').join('')}</svg><small>${esc(this.localTime(points[0].time))} — ${esc(this.localTime(points[points.length-1].time))} · 0–100%, C/M/Y/K/W/G. Dashed markers indicate reported identity changes.</small>`:'<p>Collecting ink history…</p>';
    return `<div style="margin-top:14px">${eta?'<p>Estimated finish: '+esc(this.localTime(new Date(stamp+seconds*1000).toISOString()))+'</p>':''}${completed?'<p><strong>Last completed print</strong><br>'+esc(this.localTime(completed.end))+' · Last reported elapsed: '+esc(this.formatSeconds(completed.elapsed_seconds))+'<br>'+usage(completed)+'</p>':''}<details><summary>Print, maintenance and connection history</summary><p>Observed maintenance durations require both transitions in one connection. Long post-maintenance states are excluded.</p>${Object.values(latest).map(m=>'<p>'+esc(m.operation)+' · '+esc(this.localTime(m.end))+' · '+esc(this.formatSeconds(m.duration_seconds))+'<br>'+usage(m)+'</p>').join('')}${prints.slice().reverse().map(p=>'<p>'+esc(p.completion_confirmed?'Print completed':'Print ended; completion unconfirmed')+' · '+esc(this.localTime(p.end))+' · '+esc(this.formatSeconds(p.elapsed_seconds))+'<br>'+usage(p)+'</p>').join('')}<h4>Connection history</h4>${(history.connections||[]).slice(-10).reverse().map(c=>'<p>'+esc(this.localTime(c.time))+' · '+(c.connected?'Connected':'Disconnected')+(typeof c.previous_duration_seconds==='number'?' · Previous '+(c.previous_connected?'connection':'outage')+': '+esc(this.formatSeconds(c.previous_duration_seconds)):'')+'</p>').join('')}</details><details><summary>Ink Supply history and cartridge changes</summary>${graph}<p>Inventory readings include printing and maintenance. Usage is estimated from fresh boundary readings for 100 mL cartridges; adjacent activities can overlap. Missing readings, observed inventory increases and reported identity changes invalidate estimates.</p>${changes.slice().reverse().map(c=>'<p>'+esc(c.color)+' cartridge identity changed · '+esc(this.localTime(c.time))+' · '+(typeof c.level_percent==='number'?esc(c.level_percent.toFixed(1))+'%':'Level unavailable')+' · Expiration '+(c.expiration_timestamp?esc(new Date(c.expiration_timestamp*1000).toISOString().slice(0,10)):'unavailable')+'</p>').join('')||'<p>No cartridge identity changes observed. Level changes alone do not establish replacement.</p>'}</details></div>`;
  }

  getCardSize() { return this._config?.layout === 'vertical' ? 12 : 6; }
  render() {
    if (!this._hass || !this._config) return;
    const panel = this._config.layout === 'vertical' ? this.vertical() : this.horizontal();
    const received = this.stateFor('printer_status')?.attributes?.last_received;
    const receivedDate = received ? new Date(received) : null;
    const receivedText = receivedDate && Number.isFinite(receivedDate.getTime())
      ? receivedDate.toLocaleString(this._hass.locale?.language || 'en-US', {
          timeZone: this._config.time_zone || 'America/Los_Angeles',
          year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', second:'2-digit'
        }) : 'No live data received since integration startup';
    this.shadowRoot.innerHTML = `<ha-card><style>
      :host{display:block;min-width:0}ha-card{display:block;box-sizing:border-box;padding:20px;
      border-radius:24px;background:linear-gradient(145deg,#18283b,#0b1220);
      border:1px solid #334155;box-shadow:0 12px 30px #00000035;color:#f1f5f9}
      .ink-units{display:flex;justify-content:flex-end;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:12px;font-size:12px;color:#cbd5e1}
      .ink-units button{border:1px solid #64748b;background:#0f172a;color:#cbd5e1;border-radius:8px;padding:6px 10px;cursor:pointer}
      .ink-units button[aria-pressed="true"]{background:#164e63;color:#fff;border-color:#22d3ee}
      .ink-units button:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}
    </style><div class="ink-units" role="group" aria-label="Ink display units">
      <span>Estimated ink:</span>
      <button type="button" data-ink-unit="percent" aria-pressed="${this._inkUnit !== 'ml'}">%</button>
      <button type="button" data-ink-unit="ml" aria-pressed="${this._inkUnit === 'ml'}">mL</button>
    </div>${panel}${this.bedWarning()}${this.unknownStatus()}${this.printerDetails()}${this.freshness()}${this.historySection()}<div class="last-received" style="margin-top:10px;font-size:11px;color:#94a3b8"></div></ha-card>`;
    this.shadowRoot.querySelector('.last-received').textContent = receivedDate && Number.isFinite(receivedDate.getTime())
      ? 'Last live data received: ' + receivedText : receivedText;
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

  // Read persistent expiration dates from read-only sensors.
  const savedDate = key => {
    const helper = this.stateFor(key + '_expiration_date', 'sensor');
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
    return h ? `${h}h ${m}m ${n % 60}s`
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
  const status = valid(statusSensor) || (String(statusSensor?.state).toLowerCase() === 'unknown' && num(find('printer_state')) !== null) ? statusSensor.state : 'No status';
  const mode = status.toLowerCase();
  const accent = mode === 'printing' ? '#22d3ee'
    : mode === 'paused' ? '#fbbf24'
    : mode === 'idle' ? '#34d399' : '#94a3b8';
  const printRelevant = ['printing', 'paused'].includes(mode);
  const activityRelevant = ['taking snapshot', 'injecting ink', 'automatic flash clean', 'automatic deep cleaning', 'automatic moisturizing'].includes(mode);
  const progress = printRelevant ? num(progressSensor) : activityRelevant ? num(find('activity_progress')) : null;
  const progressLabel = printRelevant ? 'PRINT PROGRESS' : mode === 'taking snapshot' ? 'SNAPSHOT PROGRESS' : mode === 'injecting ink' ? 'INK INJECTION' : activityRelevant ? 'MAINTENANCE PROGRESS' : 'NO ACTIVE PRINT';
  const p = progress === null ? 0 : cap(progress);
  const activity = mode === 'printing' ? 'Creating'
    : mode === 'paused' ? 'Print paused'
    : mode === 'idle' ? 'Standing by'
    : mode === 'automatic flash clean' ? 'Automatic flash clean'
    : ['Taking snapshot', 'Transferring print file', 'Waiting for Start',
      'Priming print head', 'Automatic deep cleaning', 'Updating firmware',
      'Calibration / self-check', 'Maintenance — inject ink before printing',
      'Injecting ink', 'Automatic moisturizing', 'Maintenance — ink injection required after moisturizing'].includes(status)
      ? status : mode === 'unknown' ? 'Unrecognized activity — state ' + (num(find('printer_state')) ?? '?') + ', step ' + (num(stepSensor) ?? '?') : 'Waiting for status';

  const readings = [
    statusSensor, stepSensor,
    ...(printRelevant ? [progressSensor, printTimeSensor, remainingSensor] : [])
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
    const low = level !== null && level <= this.lowThreshold(key);
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
          color:${low ? '#fb7185' : '#f1f5f9'};">${level === null ? '—' : cap(level).toFixed(1) + (this._inkUnit === 'ml' ? ' mL' : '%')}</div>
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
  const wasteFilled = waste === null ? null : 100 - cap(waste);
  const wasteColor = wasteFilled === null ? '#94a3b8' : wasteFilled >= 80 ? '#fb7185' : wasteFilled >= 60 ? '#fbbf24' : '#34d399';
  const wasteExpiryInfo = expiration('waste_tank', wasteExpirySensor);
  const wasteExpiry = wasteExpiryInfo.remaining;
  const wasteLow = waste !== null && waste <= 20;
  const wasteSoon = wasteExpiry !== null && wasteExpiry <= 30;
  if (wasteLow) warnings.push('Waste tank nearly full');
  if (wasteSoon) warnings.push(wasteExpiry <= 0
    ? 'Waste tank expired'
    : 'Waste tank expiry in ' + Math.floor(wasteExpiry) + 'd');
  const missing = readings.filter(s => !valid(s) && !(s === statusSensor && mode === 'unknown' && num(find('printer_state')) !== null)).length;

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
            letter-spacing:2px;color:#94a3b8;">PRINTER MONITOR</div>
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
              color:#94a3b8;position:absolute;top:88px;left:0;right:0;text-align:center;">${esc(progressLabel)}</div>
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
        ${metric('Print time', printRelevant ? time(printTimeSensor) : 'Not printing', 'mdi:timer-outline')}
        ${metric('Remaining', printRelevant ? time(remainingSensor) : '—', 'mdi:timer-sand')}
        ${metric('Printer step', step, 'mdi:counter')}
      </div>

      <div style="display:flex;align-items:center;gap:8px;
        margin:23px 0 12px;font-size:11px;font-weight:700;
        letter-spacing:1.8px;color:#cbd5e1;">
        ${icon('mdi:water', '#22d3ee', 18)} INK SUPPLY
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
            ${pct(wasteFilled)}
          </div>
        </div>
        <div style="height:9px;background:#33415570;
          border-radius:8px;overflow:hidden;margin:11px 0 8px;">
          <div data-waste-fill style="height:100%;
            width:${wasteFilled === null ? 0 : wasteFilled}%;
            background:${wasteColor};
            border-radius:8px;transition:width .6s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;
          gap:8px;flex-wrap:wrap;font-size:10px;color:#94a3b8;">
          <span>Tank filled</span>
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
        ${this.missingReadings()}
        <div style="margin-top:6px;color:#94a3b8;">
          Expiration dates are reported by the printer and retained while offline. This monitor does not change cartridge dates or bypass printing lockouts.
        </div>
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

  // Read persistent expiration dates from read-only sensors.
  const savedDate = key => {
    const helper = this.stateFor(key + '_expiration_date', 'sensor');
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
    return h ? `${h}h ${m}m ${n % 60}s`
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
  const status = valid(statusSensor) || (String(statusSensor?.state).toLowerCase() === 'unknown' && num(find('printer_state')) !== null) ? statusSensor.state : 'No status';
  const mode = status.toLowerCase();
  const accent = mode === 'printing' ? '#22d3ee'
    : mode === 'paused' ? '#fbbf24'
    : mode === 'idle' ? '#34d399' : '#94a3b8';
  const printRelevant = ['printing', 'paused'].includes(mode);
  const activityRelevant = ['taking snapshot', 'injecting ink', 'automatic flash clean', 'automatic deep cleaning', 'automatic moisturizing'].includes(mode);
  const progress = printRelevant ? num(progressSensor) : activityRelevant ? num(find('activity_progress')) : null;
  const progressLabel = printRelevant ? 'PRINT PROGRESS' : mode === 'taking snapshot' ? 'SNAPSHOT PROGRESS' : mode === 'injecting ink' ? 'INK INJECTION' : activityRelevant ? 'MAINTENANCE PROGRESS' : 'NO ACTIVE PRINT';
  const p = progress === null ? 0 : cap(progress);
  const activity = mode === 'printing' ? 'Creating'
    : mode === 'paused' ? 'Print paused'
    : mode === 'idle' ? 'Standing by'
    : mode === 'automatic flash clean' ? 'Automatic flash clean'
    : ['Taking snapshot', 'Transferring print file', 'Waiting for Start',
      'Priming print head', 'Automatic deep cleaning', 'Updating firmware',
      'Calibration / self-check', 'Maintenance — inject ink before printing',
      'Injecting ink', 'Automatic moisturizing', 'Maintenance — ink injection required after moisturizing'].includes(status)
      ? status : mode === 'unknown' ? 'Unrecognized activity — state ' + (num(find('printer_state')) ?? '?') + ', step ' + (num(stepSensor) ?? '?') : 'Waiting for status';

  const readings = [
    statusSensor, stepSensor,
    ...(printRelevant ? [progressSensor, printTimeSensor, remainingSensor] : [])
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
    const low = level !== null && level <= this.lowThreshold(key);
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
          color:${low ? '#fb7185' : '#f1f5f9'};">${level === null ? '—' : cap(level).toFixed(1) + (this._inkUnit === 'ml' ? ' mL' : '%')}</div>
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
  const wasteFilled = waste === null ? null : 100 - cap(waste);
  const wasteColor = wasteFilled === null ? '#94a3b8' : wasteFilled >= 80 ? '#fb7185' : wasteFilled >= 60 ? '#fbbf24' : '#34d399';
  const wasteExpiryInfo = expiration('waste_tank', wasteExpirySensor);
  const wasteExpiry = wasteExpiryInfo.remaining;
  const wasteLow = waste !== null && waste <= 20;
  const wasteSoon = wasteExpiry !== null && wasteExpiry <= 30;
  if (wasteLow) warnings.push('Waste tank nearly full');
  if (wasteSoon) warnings.push(wasteExpiry <= 0
    ? 'Waste tank expired'
    : 'Waste tank expiry in ' + Math.floor(wasteExpiry) + 'd');
  const missing = readings.filter(s => !valid(s) && !(s === statusSensor && mode === 'unknown' && num(find('printer_state')) !== null)).length;

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
            letter-spacing:2px;color:#94a3b8;">PRINTER MONITOR</div>
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
              color:#94a3b8;position:absolute;top:88px;left:0;right:0;text-align:center;">${esc(progressLabel)}</div>
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
        ${metric('Print time', printRelevant ? time(printTimeSensor) : 'Not printing', 'mdi:timer-outline')}
        ${metric('Remaining', printRelevant ? time(remainingSensor) : '—', 'mdi:timer-sand')}
        ${metric('Printer step', step, 'mdi:counter')}
      </div>

        </div>
        <div style="flex:2 1 600px;min-width:0;">
      <div style="display:flex;align-items:center;gap:8px;
        margin:0 0 12px;font-size:11px;font-weight:700;
        letter-spacing:1.8px;color:#cbd5e1;">
        ${icon('mdi:water', '#22d3ee', 18)} INK SUPPLY
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
            ${pct(wasteFilled)}
          </div>
        </div>
        <div style="height:9px;background:#33415570;
          border-radius:8px;overflow:hidden;margin:11px 0 8px;">
          <div data-waste-fill style="height:100%;
            width:${wasteFilled === null ? 0 : wasteFilled}%;
            background:${wasteColor};
            border-radius:8px;transition:width .6s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;
          gap:8px;flex-wrap:wrap;font-size:10px;color:#94a3b8;">
          <span>Tank filled</span>
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
        ${this.missingReadings()}
        <div style="margin-top:6px;color:#94a3b8;">
          Expiration dates are reported by the printer and retained while offline. This monitor does not change cartridge dates or bypass printing lockouts.
        </div>
      </div>
    </div>`;
  }
}
if (!customElements.get('eufymake-e1-card')) customElements.define('eufymake-e1-card', EufyMakeE1Card);
window.customCards = window.customCards || [];
window.customCards.push({type:'eufymake-e1-card', name:'EufyMake E1 Monitor', description:'Printer status, ink reserves, and persistent dates.'});

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
      </style><header><ha-menu-button></ha-menu-button><h1>EufyMake E1 Monitor</h1><button class="layout">Vertical layout</button></header><main><eufymake-e1-card></eufymake-e1-card></main>`;
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

  }
}
if (!customElements.get('eufymake-e1-panel')) customElements.define('eufymake-e1-panel', EufyMakeE1Panel);
