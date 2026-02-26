// ============================================================
// SWIFT SPEED SENDER — ADMIN DASHBOARD JS (continued)
// ============================================================

  document.getElementById('checkpoint-section').classList.remove('hidden');
  loadCheckpoints(id);
};

window.manageCheckpoints = async function(packageId, trackingNum) {
  activePackageForCheckpoints = packageId;
  editingPackageId = packageId;

  // Open modal in checkpoint-focused mode
  document.getElementById('modal-package-title').textContent = `Checkpoints — ${trackingNum}`;
  document.getElementById('checkpoint-section').classList.remove('hidden');
  document.getElementById('modal-package').classList.add('active');
  loadCheckpoints(packageId);
};

window.deletePackage = async function(id) {
  const ok = await confirmDelete(
    'This package will be soft-deleted and hidden from customers. You can restore it from the database.',
    'Delete Package?'
  );
  if (!ok) return;

  const { error } = await db
    .from('packages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    showToast('Failed to delete package', 'error');
    await logError('admin_package_delete', error.message);
    return;
  }

  showToast('Package deleted', 'success');
  loadPackages();
};

// Package form submit
document.getElementById('package-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('pkg-save');
  setButtonLoading(btn, true, 'Saving…');

  const id          = document.getElementById('pkg-id').value;
  const trackingNum = document.getElementById('pkg-tracking').value.trim().toUpperCase();
  const service     = document.getElementById('pkg-service').value;
  const status      = document.getElementById('pkg-status').value;

  // Validate required fields
  let valid = true;
  const required = [
    ['pkg-sender-name',    'Sender name is required'],
    ['pkg-sender-country', 'Sender country is required'],
    ['pkg-recv-name',      'Receiver name is required'],
    ['pkg-recv-country',   'Receiver country is required'],
  ];

  required.forEach(([fieldId, msg]) => {
    const el = document.getElementById(fieldId);
    const group = el?.closest('.form-group');
    if (!el?.value.trim()) {
      valid = false;
      if (group) {
        group.classList.add('has-error');
        const errEl = group.querySelector('.form-error');
        if (errEl) errEl.textContent = msg;
      }
    } else {
      group?.classList.remove('has-error');
    }
  });

  if (!service) {
    showToast('Please select a service type', 'error');
    setButtonLoading(btn, false);
    return;
  }

  if (!valid) {
    setButtonLoading(btn, false);
    return;
  }

  const payload = {
    service_type:         service,
    status:               status,
    sender_name:          document.getElementById('pkg-sender-name').value.trim(),
    sender_email:         document.getElementById('pkg-sender-email').value.trim() || null,
    sender_phone:         document.getElementById('pkg-sender-phone').value.trim() || null,
    sender_country:       document.getElementById('pkg-sender-country').value.trim(),
    sender_address:       document.getElementById('pkg-sender-address').value.trim() || null,
    receiver_name:        document.getElementById('pkg-recv-name').value.trim(),
    receiver_email:       document.getElementById('pkg-recv-email').value.trim() || null,
    receiver_phone:       document.getElementById('pkg-recv-phone').value.trim() || null,
    receiver_country:     document.getElementById('pkg-recv-country').value.trim(),
    receiver_address:     document.getElementById('pkg-recv-address').value.trim() || null,
    weight_kg:            parseFloat(document.getElementById('pkg-weight').value) || null,
    dimensions_cm:        document.getElementById('pkg-dimensions').value.trim() || null,
    declared_value:       parseFloat(document.getElementById('pkg-value').value) || null,
    description:          document.getElementById('pkg-description').value.trim() || null,
    current_location_name: document.getElementById('pkg-current-location').value.trim() || null,
    current_lat:          parseFloat(document.getElementById('pkg-lat').value) || null,
    current_lng:          parseFloat(document.getElementById('pkg-lng').value) || null,
    estimated_delivery:   document.getElementById('pkg-eta').value || null,
    actual_delivery:      status === 'delivered' ? new Date().toISOString() : null,
  };

  let error;

  if (id) {
    // Update existing
    ({ error } = await db.from('packages').update(payload).eq('id', id));
  } else {
    // Create new — generate tracking number if empty
    payload.tracking_number = trackingNum ||
      `SSS-${new Date().getFullYear()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    const { error: insertError, data: newPkg } = await db
      .from('packages')
      .insert(payload)
      .select('id')
      .single();

    error = insertError;

    if (!error && newPkg) {
      editingPackageId = newPkg.id;
      document.getElementById('pkg-id').value = newPkg.id;
      document.getElementById('checkpoint-section').classList.remove('hidden');
      loadCheckpoints(newPkg.id);
    }
  }

  setButtonLoading(btn, false);

  if (error) {
    const errEl = document.getElementById('package-form-error');
    if (error.code === '23505') {
      errEl.textContent = 'That tracking number already exists. Please use a different one.';
    } else {
      errEl.textContent = 'Failed to save package. Please try again.';
    }
    errEl.classList.remove('hidden');
    await logError('admin_package_save', error.message);
    return;
  }

  showToast(id ? 'Package updated!' : 'Package created!', 'success');
  loadPackages();
});

// New package button
document.getElementById('btn-new-package')?.addEventListener('click', () => {
  editingPackageId = null;
  document.getElementById('package-form').reset();
  document.getElementById('pkg-id').value = '';
  document.getElementById('modal-package-title').textContent = 'New Package';
  document.getElementById('checkpoint-section').classList.add('hidden');
  document.getElementById('package-form-error').classList.add('hidden');
  document.getElementById('modal-package').classList.add('active');
});

document.getElementById('pkg-cancel')?.addEventListener('click', () => {
  document.getElementById('modal-package').classList.remove('active');
});

// ============================================================
// CHECKPOINTS
// ============================================================
async function loadCheckpoints(packageId) {
  const listEl = document.getElementById('checkpoint-list');
  if (!listEl) return;

  listEl.innerHTML = '<div style="color:var(--text-light);font-size:0.8rem;padding:0.5rem">Loading checkpoints…</div>';

  const { data, error } = await db
    .from('tracking_checkpoints')
    .select('*')
    .eq('package_id', packageId)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false });

  if (error) {
    listEl.innerHTML = '<div style="color:var(--red-alert);font-size:0.8rem">Failed to load checkpoints.</div>';
    return;
  }

  if (!data || data.length === 0) {
    listEl.innerHTML = '<div style="color:var(--text-light);font-size:0.8rem;padding:0.5rem">No checkpoints yet. Add the first one.</div>';
    return;
  }

  const STATUS_LABELS = {
    pending:'Pending', picked_up:'Picked Up', in_transit:'In Transit',
    customs:'Customs', out_for_delivery:'Out for Delivery',
    delivered:'Delivered', exception:'Exception', returned:'Returned'
  };

  listEl.innerHTML = data.map(cp => `
    <div class="checkpoint-item">
      <div class="checkpoint-item__content">
        <div class="checkpoint-item__status">${STATUS_LABELS[cp.status] || cp.status}</div>
        <div class="checkpoint-item__location">
          <i class="fas fa-location-dot" style="color:var(--gold);margin-right:3px"></i>
          ${escapeHtml(cp.location_name)}
          ${cp.lat && cp.lng ? `<span style="font-family:var(--font-mono);font-size:0.65rem;color:var(--text-light);margin-left:4px">(${cp.lat}, ${cp.lng})</span>` : ''}
        </div>
        ${cp.description ? `<div style="font-size:0.78rem;color:var(--text-mid)">${escapeHtml(cp.description)}</div>` : ''}
        <div class="checkpoint-item__time">${formatDateTime(cp.occurred_at)}</div>
      </div>
      <button class="btn btn--danger btn--sm" onclick="deleteCheckpoint('${cp.id}', '${packageId}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

document.getElementById('btn-add-checkpoint')?.addEventListener('click', () => {
  if (!editingPackageId) return;
  document.getElementById('cp-package-id').value = editingPackageId;
  document.getElementById('cp-id').value = '';
  document.getElementById('checkpoint-form').reset();
  document.getElementById('cp-occurred').value = new Date().toISOString().slice(0, 16);
  document.getElementById('cp-form-error').classList.add('hidden');
  document.getElementById('modal-checkpoint').classList.add('active');
});

document.getElementById('cp-cancel')?.addEventListener('click', () => {
  document.getElementById('modal-checkpoint').classList.remove('active');
});

document.getElementById('checkpoint-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn      = document.getElementById('cp-save');
  const pkgId    = document.getElementById('cp-package-id').value;
  const status   = document.getElementById('cp-status').value;
  const location = document.getElementById('cp-location').value.trim();
  const occurred = document.getElementById('cp-occurred').value;
  const desc     = document.getElementById('cp-description').value.trim();
  const lat      = parseFloat(document.getElementById('cp-lat').value) || null;
  const lng      = parseFloat(document.getElementById('cp-lng').value) || null;

  if (!location || !occurred) {
    document.getElementById('cp-form-error').textContent = 'Location and date/time are required.';
    document.getElementById('cp-form-error').classList.remove('hidden');
    return;
  }

  setButtonLoading(btn, true, 'Saving…');

  const { error } = await db.from('tracking_checkpoints').insert({
    package_id:    pkgId,
    status,
    location_name: location,
    description:   desc || null,
    lat,
    lng,
    occurred_at:   new Date(occurred).toISOString()
  });

  setButtonLoading(btn, false);

  if (error) {
    document.getElementById('cp-form-error').textContent = 'Failed to save checkpoint. Try again.';
    document.getElementById('cp-form-error').classList.remove('hidden');
    await logError('admin_checkpoint_save', error.message);
    return;
  }

  // Also update package current location if lat/lng provided
  if (lat && lng) {
    await db.from('packages').update({
      current_lat: lat,
      current_lng: lng,
      current_location_name: location,
      status
    }).eq('id', pkgId);
  } else {
    await db.from('packages').update({ status }).eq('id', pkgId);
  }

  showToast('Checkpoint added!', 'success');
  document.getElementById('modal-checkpoint').classList.remove('active');
  loadCheckpoints(pkgId);
  loadPackages();
});

window.deleteCheckpoint = async function(id, packageId) {
  const ok = await confirmDelete('Delete this checkpoint?', 'Delete Checkpoint?');
  if (!ok) return;

  const { error } = await db
    .from('tracking_checkpoints')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    showToast('Failed to delete checkpoint', 'error');
    return;
  }

  showToast('Checkpoint deleted', 'success');
  loadCheckpoints(packageId);
};

// ============================================================
// CONTACTS
// ============================================================
async function loadContacts() {
  const loading = document.getElementById('contacts-loading');
  const list    = document.getElementById('contacts-list');
  const empty   = document.getElementById('contacts-empty');
  const badge   = document.getElementById('unread-badge');

  loading.classList.remove('hidden');
  list.classList.add('hidden');
  empty.classList.add('hidden');

  const { data, error } = await db
    .from('contacts')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  loading.classList.add('hidden');

  if (error) {
    showToast('Failed to load messages', 'error');
    return;
  }

  if (!data || data.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  const unread = data.filter(c => !c.is_read).length;
  if (badge) {
    badge.textContent = unread;
    badge.classList.toggle('hidden', unread === 0);
  }

  list.innerHTML = data.map(contact => `
    <div class="contact-card ${!contact.is_read ? 'unread' : ''}" id="contact-${contact.id}">
      <div class="contact-card__header">
        <div>
          <div class="contact-card__name">${escapeHtml(contact.name)}</div>
          <div class="contact-card__meta">
            <a href="mailto:${escapeHtml(contact.email)}" style="color:var(--gold)">${escapeHtml(contact.email)}</a>
            ${contact.phone ? ` · <a href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phone)}</a>` : ''}
            · ${formatDateTime(contact.created_at)}
          </div>
        </div>
        <span>${contact.is_read
          ? '<span style="font-size:0.75rem;color:var(--text-light)">Read</span>'
          : '<span class="badge badge--picked_up">New</span>'
        }</span>
      </div>
      ${contact.subject ? `<div class="contact-card__subject">${escapeHtml(contact.subject)}</div>` : ''}
      <div class="contact-card__message" id="msg-${contact.id}">${escapeHtml(contact.message)}</div>
      <div class="contact-card__actions">
        <a href="mailto:${escapeHtml(contact.email)}?subject=Re: ${encodeURIComponent(contact.subject || 'Your enquiry')}" class="btn btn--primary btn--sm">
          <i class="fas fa-reply"></i> Reply
        </a>
        ${!contact.is_read ? `
        <button class="btn btn--outline btn--sm" onclick="markRead('${contact.id}')">
          <i class="fas fa-check"></i> Mark Read
        </button>` : ''}
        <button class="btn btn--outline btn--sm" onclick="toggleMessage('${contact.id}')">
          <i class="fas fa-expand"></i> Expand
        </button>
        <button class="btn btn--danger btn--sm" onclick="deleteContact('${contact.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  list.classList.remove('hidden');
}

window.markRead = async function(id) {
  const { error } = await db.from('contacts').update({ is_read: true }).eq('id', id);
  if (!error) {
    loadContacts();
    showToast('Marked as read', 'success');
  }
};

window.toggleMessage = function(id) {
  const el = document.getElementById(`msg-${id}`);
  el?.classList.toggle('expanded');
};

window.deleteContact = async function(id) {
  const ok = await confirmDelete('Delete this message?', 'Delete Message?');
  if (!ok) return;

  const { error } = await db
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (!error) {
    showToast('Message deleted', 'success');
    loadContacts();
  }
};

// ============================================================
// SERVICES
// ============================================================
const ICON_OPTIONS = {
  'zap':'⚡ Express','package':'📦 Package','anchor':'⚓ Freight',
  'clock':'🕐 Same-Day','thermometer':'🌡️ Cold Chain','file-check':'📋 Customs',
  'truck':'🚚 Truck','globe':'🌍 Global','shield':'🛡️ Insurance'
};

async function loadServices() {
  const loading = document.getElementById('services-loading');
  const list    = document.getElementById('services-list');
  const empty   = document.getElementById('services-empty');

  loading.classList.remove('hidden');
  list.classList.add('hidden');
  empty.classList.add('hidden');

  const { data, error } = await db
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true });

  loading.classList.add('hidden');

  if (error) { showToast('Failed to load services', 'error'); return; }
  if (!data || data.length === 0) { empty.classList.remove('hidden'); return; }

  list.innerHTML = data.map(svc => `
    <div class="service-admin-card ${!svc.is_active ? 'service-admin-card__inactive' : ''}">
      <span style="font-size:1.2rem;width:28px;text-align:center">${Object.keys(ICON_OPTIONS).includes(svc.icon) ? ICON_OPTIONS[svc.icon].split(' ')[0] : '📦'}</span>
      <div class="service-admin-card__title">${escapeHtml(svc.title)}</div>
      <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--gold)">
        ${svc.price_from ? `From $${svc.price_from}` : ''}
      </span>
      <span class="badge ${svc.is_active ? 'badge--delivered' : 'badge--returned'}">
        ${svc.is_active ? 'Active' : 'Hidden'}
      </span>
      <div class="table-actions">
        <button class="btn btn--outline btn--sm" onclick="editService('${svc.id}')">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn btn--danger btn--sm" onclick="deleteService('${svc.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  list.classList.remove('hidden');
}

document.getElementById('btn-new-service')?.addEventListener('click', () => {
  document.getElementById('svc-id').value = '';
  document.getElementById('service-form').reset();
  document.getElementById('svc-active').checked = true;
  document.getElementById('modal-service-title').textContent = 'New Service';
  document.getElementById('svc-form-error').classList.add('hidden');
  document.getElementById('modal-service').classList.add('active');
});

window.editService = async function(id) {
  const { data, error } = await db.from('services').select('*').eq('id', id).single();
  if (error || !data) { showToast('Service not found', 'error'); return; }

  document.getElementById('svc-id').value          = data.id;
  document.getElementById('svc-title').value       = data.title;
  document.getElementById('svc-description').value = data.description;
  document.getElementById('svc-icon').value        = data.icon;
  document.getElementById('svc-price').value       = data.price_from || '';
  document.getElementById('svc-order').value       = data.sort_order;
  document.getElementById('svc-active').checked    = data.is_active;
  document.getElementById('modal-service-title').textContent = 'Edit Service';
  document.getElementById('svc-form-error').classList.add('hidden');
  document.getElementById('modal-service').classList.add('active');
};

window.deleteService = async function(id) {
  const ok = await confirmDelete('Delete this service? It will be removed from the public site.', 'Delete Service?');
  if (!ok) return;

  const { error } = await db.from('services').delete().eq('id', id);
  if (!error) { showToast('Service deleted', 'success'); loadServices(); }
};

document.getElementById('service-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn   = document.getElementById('svc-save');
  const id    = document.getElementById('svc-id').value;
  const title = document.getElementById('svc-title').value.trim();
  const desc  = document.getElementById('svc-description').value.trim();

  if (!title || !desc) {
    document.getElementById('svc-form-error').textContent = 'Title and description are required.';
    document.getElementById('svc-form-error').classList.remove('hidden');
    return;
  }

  setButtonLoading(btn, true, 'Saving…');

  const payload = {
    title,
    description: desc,
    icon:        document.getElementById('svc-icon').value,
    price_from:  parseFloat(document.getElementById('svc-price').value) || null,
    sort_order:  parseInt(document.getElementById('svc-order').value) || 1,
    is_active:   document.getElementById('svc-active').checked,
  };

  const { error } = id
    ? await db.from('services').update(payload).eq('id', id)
    : await db.from('services').insert(payload);

  setButtonLoading(btn, false);

  if (error) {
    document.getElementById('svc-form-error').textContent = 'Failed to save service. Try again.';
    document.getElementById('svc-form-error').classList.remove('hidden');
    return;
  }

  showToast(id ? 'Service updated!' : 'Service created!', 'success');
  document.getElementById('modal-service').classList.remove('active');
  loadServices();
});

document.getElementById('svc-cancel')?.addEventListener('click', () => {
  document.getElementById('modal-service').classList.remove('active');
});

// ============================================================
// SITE SETTINGS
// ============================================================

// Group settings by category
const SETTINGS_GROUPS = {
  'Company Info': ['company_name','company_tagline','company_established','company_email','company_phone','company_address','company_hours'],
  'Social Links': ['social_facebook','social_instagram','social_whatsapp','social_twitter','social_linkedin'],
  'Hero Section': ['hero_headline','hero_subtext','hero_image_url','hero_cta_primary','hero_cta_secondary'],
  'Statistics':   ['stat_countries','stat_packages','stat_years','stat_satisfaction'],
  'About Page':   ['about_headline','about_story','about_image_url','about_mission'],
  'Footer':       ['footer_tagline','footer_copyright'],
  'Map Defaults': ['map_default_lat','map_default_lng','map_default_zoom'],
  'SEO':          ['meta_description'],
};

async function loadSettings() {
  const loading  = document.getElementById('settings-loading');
  const formWrap = document.getElementById('settings-form-wrap');

  loading.classList.remove('hidden');
  formWrap.classList.add('hidden');

  const { data, error } = await db
    .from('site_settings')
    .select('*')
    .order('key');

  loading.classList.add('hidden');

  if (error) { showToast('Failed to load settings', 'error'); return; }

  // Convert to map
  const settingsMap = {};
  data.forEach(s => { settingsMap[s.key] = s; });

  // Build grouped UI
  formWrap.innerHTML = Object.entries(SETTINGS_GROUPS).map(([groupName, keys]) => {
    const fields = keys.map(key => {
      const setting = settingsMap[key];
      if (!setting) return '';
      const isLong  = setting.value_type === 'text' && (setting.value || '').length > 80;
      const isImage = setting.value_type === 'image';
      const isUrl   = setting.value_type === 'url';

      return `
        <div class="settings-field ${isLong || isImage ? 'settings-field--full' : ''}">
          <label class="settings-label" for="setting-${key}">${escapeHtml(setting.label || key)}</label>
          ${setting.description ? `<p class="settings-desc">${escapeHtml(setting.description)}</p>` : ''}
          ${isLong
            ? `<textarea id="setting-${key}" class="form-textarea" rows="3" data-setting-key="${key}">${escapeHtml(setting.value || '')}</textarea>`
            : `<input type="${isUrl ? 'url' : 'text'}" id="setting-${key}" class="form-input" value="${escapeHtml(setting.value || '')}" data-setting-key="${key}">`
          }
          ${isImage ? `
            <div style="margin-top:0.4rem">
              ${setting.value ? `<img src="${escapeHtml(setting.value)}" alt="Preview" style="max-height:80px;border-radius:4px;margin-bottom:4px;display:block">` : ''}
              <p style="font-size:0.72rem;color:var(--text-light)">
                Upload images to <a href="https://supabase.com/dashboard/project/_/storage/buckets" target="_blank" rel="noopener" style="color:var(--gold)">Supabase Storage</a>, copy the public URL, paste here.
              </p>
            </div>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="settings-section">
        <div class="settings-section__header">
          <span class="settings-section__title">${escapeHtml(groupName)}</span>
          <button class="btn btn--primary btn--sm settings-save-btn" data-group="${escapeHtml(groupName)}">
            <i class="fas fa-save"></i> Save ${escapeHtml(groupName)}
          </button>
        </div>
        <div class="settings-section__body">
          <div class="settings-grid">${fields}</div>
        </div>
      </div>`;
  }).join('');

  formWrap.classList.remove('hidden');

  // Attach save handlers
  formWrap.querySelectorAll('.settings-save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const groupName = btn.dataset.group;
      const keys = SETTINGS_GROUPS[groupName];
      if (!keys) return;

      setButtonLoading(btn, true, 'Saving…');

      const updates = keys.map(key => {
        const el = document.getElementById(`setting-${key}`);
        if (!el) return null;
        return { key, value: el.value };
      }).filter(Boolean);

      let allOk = true;
      for (const u of updates) {
        const { error } = await db
          .from('site_settings')
          .update({ value: u.value })
          .eq('key', u.key);
        if (error) { allOk = false; await logError('admin_settings_save', error.message); }
      }

      setButtonLoading(btn, false);

      if (allOk) {
        clearSettingsCache();
        showToast(`${groupName} saved!`, 'success');
      } else {
        showToast('Some settings failed to save', 'error');
      }
    });
  });
}

// ============================================================
// QUOTE PRICING
// ============================================================
async function loadPricing() {
  const loading = document.getElementById('pricing-loading');
  const wrap    = document.getElementById('pricing-wrap');
  const tbody   = document.getElementById('pricing-tbody');

  loading.classList.remove('hidden');
  wrap.classList.add('hidden');

  const { data, error } = await db
    .from('quote_pricing')
    .select('*')
    .order('zone_name');

  loading.classList.add('hidden');

  if (error) { showToast('Failed to load pricing', 'error'); return; }

  tbody.innerHTML = (data || []).map(rule => `
    <tr>
      <td>${escapeHtml(rule.zone_name)}</td>
      <td><code>${escapeHtml(rule.origin_region)}</code></td>
      <td><code>${escapeHtml(rule.destination_region)}</code></td>
      <td>
        <input type="number" class="form-input" style="width:90px;padding:0.4rem" 
          value="${rule.base_rate}" data-id="${rule.id}" data-field="base_rate" step="0.01" min="0">
      </td>
      <td>
        <input type="number" class="form-input" style="width:80px;padding:0.4rem" 
          value="${rule.rate_per_kg}" data-id="${rule.id}" data-field="rate_per_kg" step="0.01" min="0">
      </td>
      <td>
        <span style="font-size:0.8rem">
          <input type="number" class="form-input" style="width:55px;padding:0.4rem;display:inline" 
            value="${rule.transit_days_min}" data-id="${rule.id}" data-field="transit_days_min" min="1">
          –
          <input type="number" class="form-input" style="width:55px;padding:0.4rem;display:inline" 
            value="${rule.transit_days_max}" data-id="${rule.id}" data-field="transit_days_max" min="1">
        </span>
      </td>
      <td>
        <label style="cursor:pointer">
          <input type="checkbox" data-id="${rule.id}" data-field="is_active" 
            ${rule.is_active ? 'checked' : ''} onchange="savePricingField(this)">
        </label>
      </td>
      <td>
        <button class="btn btn--primary btn--sm" onclick="savePricingRow('${rule.id}')">
          <i class="fas fa-save"></i>
        </button>
      </td>
    </tr>
  `).join('');

  wrap.classList.remove('hidden');
}

window.savePricingRow = async function(id) {
  const fields = ['base_rate','rate_per_kg','transit_days_min','transit_days_max'];
  const update = {};

  fields.forEach(field => {
    const el = document.querySelector(`[data-id="${id}"][data-field="${field}"]`);
    if (el) update[field] = parseFloat(el.value);
  });

  const activeEl = document.querySelector(`[data-id="${id}"][data-field="is_active"]`);
  if (activeEl) update.is_active = activeEl.checked;

  const { error } = await db.from('quote_pricing').update(update).eq('id', id);
  if (error) {
    showToast('Failed to save pricing rule', 'error');
  } else {
    showToast('Pricing rule saved!', 'success');
  }
};

window.savePricingField = async function(el) {
  const id    = el.dataset.id;
  const field = el.dataset.field;
  const value = el.type === 'checkbox' ? el.checked : parseFloat(el.value);
  await db.from('quote_pricing').update({ [field]: value }).eq('id', id);
};

// ============================================================
// ERROR LOGS
// ============================================================
async function loadErrors() {
  const loading = document.getElementById('errors-loading');
  const wrap    = document.getElementById('errors-wrap');
  const tbody   = document.getElementById('errors-tbody');
  const empty   = document.getElementById('errors-empty');

  loading.classList.remove('hidden');
  wrap.classList.add('hidden');
  empty.classList.add('hidden');

  const { data, error } = await db
    .from('error_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  loading.classList.add('hidden');

  if (error) { showToast('Failed to load error logs', 'error'); return; }
  if (!data || data.length === 0) { empty.classList.remove('hidden'); return; }

  tbody.innerHTML = data.map(e => `
    <tr>
      <td style="font-family:var(--font-mono);font-size:0.72rem;white-space:nowrap">${formatDateTime(e.created_at)}</td>
      <td><code style="font-size:0.75rem;background:var(--cream);padding:2px 6px;border-radius:3px">${escapeHtml(e.error_type || '—')}</code></td>
      <td style="font-size:0.8rem;max-width:300px">${escapeHtml(e.error_message || '—')}</td>
      <td style="font-size:0.75rem;color:var(--text-light);max-width:200px;word-break:break-all">${escapeHtml(e.page_url || '—')}</td>
    </tr>
  `).join('');

  wrap.classList.remove('hidden');
}

// ============================================================
// INIT
// ============================================================
async function init() {
  const authed = await checkAuth();
  if (!authed) return;

  initTabs();
  initSidebar();
  initLogout();

  // Load initial tab
  loadPackages();

  // Load unread badge
  const { count } = await db
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
    .is('deleted_at', null);

  if (count > 0) {
    const badge = document.getElementById('unread-badge');
    if (badge) { badge.textContent = count; badge.classList.remove('hidden'); }
  }
}

document.addEventListener('DOMContentLoaded', init);
