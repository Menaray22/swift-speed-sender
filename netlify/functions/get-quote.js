// ============================================================
// SWIFT SPEED SENDER — NETLIFY FUNCTION: get-quote
// Server-side quote calculation — prevents price manipulation
// ============================================================

const { createClient } = require('@supabase/supabase-js');

// Region mapping (country code → region key)
const COUNTRY_REGIONS = {
  // US
  US: 'US',
  // North America
  CA:'NA', MX:'NA',
  // Europe
  GB:'EU', DE:'EU', FR:'EU', IT:'EU', ES:'EU', NL:'EU', BE:'EU', SE:'EU',
  NO:'EU', DK:'EU', FI:'EU', PL:'EU', PT:'EU', AT:'EU', CH:'EU', IE:'EU',
  // Asia Pacific
  CN:'AP', JP:'AP', KR:'AP', AU:'AP', NZ:'AP', SG:'AP', IN:'AP', TH:'AP',
  VN:'AP', ID:'AP', MY:'AP', PH:'AP', HK:'AP', TW:'AP',
  // Middle East
  AE:'ME', SA:'ME', QA:'ME', KW:'ME', BH:'ME', OM:'ME', JO:'ME', IL:'ME',
  // Africa
  ZA:'AF', NG:'AF', KE:'AF', EG:'AF', GH:'AF', ET:'AF', TZ:'AF', MA:'AF',
  // Latin America
  BR:'LA', AR:'LA', CL:'LA', CO:'LA', PE:'LA', VE:'LA', EC:'LA', BO:'LA',
};

function getRegion(countryCode) {
  return COUNTRY_REGIONS[String(countryCode).toUpperCase()] || 'RW';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
  };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { origin_country, destination_country, weight_kg, package_type,
          declared_value, requester_name, requester_email } = body;

  // ---- Validation ----
  const weight = parseFloat(weight_kg);
  if (!origin_country || !destination_country) {
    return { statusCode: 422, headers, body: JSON.stringify({ error: 'Origin and destination countries are required' }) };
  }
  if (isNaN(weight) || weight <= 0 || weight > 1000) {
    return { statusCode: 422, headers, body: JSON.stringify({ error: 'Weight must be between 0.1 and 1000 kg' }) };
  }

  // ---- Fetch pricing rules from Supabase ----
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const originRegion = getRegion(origin_country);
  const destRegion   = getRegion(destination_country);

  const { data: rules, error } = await supabase
    .from('quote_pricing')
    .select('*')
    .eq('is_active', true)
    .or(`and(origin_region.eq.${originRegion},destination_region.eq.${destRegion}),and(origin_region.eq.${originRegion},destination_region.eq.RW)`)
    .order('destination_region', { ascending: false }) // Prefer specific match
    .limit(1);

  let rule;
  if (error || !rules || rules.length === 0) {
    // Fallback pricing
    rule = {
      base_rate: 40.00,
      rate_per_kg: 5.50,
      transit_days_min: 10,
      transit_days_max: 18,
      currency: 'USD'
    };
  } else {
    rule = rules[0];
  }

  // ---- Calculate ----
  const baseMin = parseFloat(rule.base_rate);
  const baseMax = baseMin * 1.15; // 15% variance
  const perKg   = parseFloat(rule.rate_per_kg);

  let estimatedMin = baseMin + (perKg * weight);
  let estimatedMax = baseMax + (perKg * weight * 1.1);

  // Add insurance for declared value > $200
  if (declared_value && parseFloat(declared_value) > 200) {
    const insuranceFee = parseFloat(declared_value) * 0.015;
    estimatedMin += insuranceFee;
    estimatedMax += insuranceFee;
  }

  // Round to 2dp
  estimatedMin = Math.round(estimatedMin * 100) / 100;
  estimatedMax = Math.round(estimatedMax * 100) / 100;

  // ---- Save quote to Supabase ----
  try {
    await supabase.from('quotes').insert({
      origin_country:    String(origin_country).toUpperCase(),
      destination_country: String(destination_country).toUpperCase(),
      weight_kg:         weight,
      package_type:      package_type || 'parcel',
      declared_value:    declared_value ? parseFloat(declared_value) : null,
      requester_name:    requester_name ? String(requester_name).trim().slice(0, 200) : null,
      requester_email:   requester_email ? String(requester_email).trim().slice(0, 320) : null,
      estimated_min:     estimatedMin,
      estimated_max:     estimatedMax,
      currency:          'USD',
      transit_days_min:  rule.transit_days_min,
      transit_days_max:  rule.transit_days_max
    });
  } catch (saveErr) {
    console.error('Quote save error:', saveErr);
    // Non-critical
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      quote: {
        estimated_min:    estimatedMin,
        estimated_max:    estimatedMax,
        currency:         'USD',
        transit_days_min: rule.transit_days_min,
        transit_days_max: rule.transit_days_max,
        origin_country:   String(origin_country).toUpperCase(),
        destination_country: String(destination_country).toUpperCase(),
        weight_kg:        weight
      }
    })
  };
};
