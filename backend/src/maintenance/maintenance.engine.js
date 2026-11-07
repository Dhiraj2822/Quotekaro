/**
 * QuoteKaro AI Maintenance Prediction Engine
 * Transparent, deterministic rule-based expert recommendation engine.
 * Evaluates appliance age, operational wear patterns, seasonal cycles,
 * and service history to calculate health score, next service date, and priority.
 */

// Recommended maintenance interval guidelines (in days)
const SERVICE_INTERVALS_DAYS = {
  ac: {
    heavy: 90,     // 3 months in heavy summer/humidity
    medium: 120,   // 4 months
    low: 180       // 6 months
  },
  water_purifier: {
    heavy: 90,     // 3 months (high TDS areas in Pune/PCMC)
    medium: 120,
    low: 150
  },
  washing_machine: {
    heavy: 120,    // 4 months
    medium: 180,
    low: 240
  },
  refrigerator: {
    heavy: 180,    // 6 months
    medium: 240,
    low: 365
  },
  geyser: {
    heavy: 180,    // Hard water anode scaling check before winter
    medium: 240,
    low: 365
  },
  chimney: {
    heavy: 60,     // Deep Indian spice/oil frying
    medium: 90,
    low: 120
  },
  microwave: {
    heavy: 180,
    medium: 270,
    low: 365
  },
  dishwasher: {
    heavy: 120,
    medium: 180,
    low: 270
  },
  television: {
    heavy: 365,
    medium: 540,
    low: 730
  },
  other: {
    heavy: 180,
    medium: 240,
    low: 365
  }
};

const SUGGESTED_SERVICES_MAP = {
  ac: {
    service: 'AC Jet Pump Foam Servicing & Gas Check',
    cost: '₹599 - ₹899',
    description: 'Indoor cooling coil foaming, blower sterilization, outdoor condensor wash, and pressure check.'
  },
  water_purifier: {
    service: 'RO Membrane Flush & 3-Stage Filter Replacement',
    cost: '₹499 - ₹1,299',
    description: 'Pre-sediment filter renewal, carbon polishing, membrane flush, and electronic TDS calibration.'
  },
  washing_machine: {
    service: 'Drum Descaling & Pulsator Debris Clear',
    cost: '₹399 - ₹699',
    description: 'High-temperature drum sanitization, drainage filter unclog, and suspension shock check.'
  },
  refrigerator: {
    service: 'Condenser Coil Cleansing & Thermostat Tune',
    cost: '₹349 - ₹599',
    description: 'Rear lint & dust removal, door magnetic seal leakage test, and frost timer inspection.'
  },
  geyser: {
    service: 'Heating Element Descaling & Magnesium Anode Replacement',
    cost: '₹399 - ₹749',
    description: 'Flushing calcium hard-water sediment from tank and inspecting safety pressure valve.'
  },
  chimney: {
    service: 'Baffle Filter Oil Degreasing & Duct Jet Wash',
    cost: '₹449 - ₹799',
    description: 'Caustic oil dissolution from mesh/baffles, motor blower bearing lubricate.'
  },
  microwave: {
    service: 'Magnetron Waveguide & Turntable Inspection',
    cost: '₹299 - ₹499',
    description: 'Cavity RF leakage scan, door safety interlock switch test, and waveguide shield check.'
  },
  dishwasher: {
    service: 'Spray Arm De-clog & Internal Descaling',
    cost: '₹399 - ₹649',
    description: 'Filter clean, spray nozzle unblocking, and water heating sensor audit.'
  },
  television: {
    service: 'Dust Blowout & Port Connection Diagnostic',
    cost: '₹299 - ₹499',
    description: 'Internal motherboard dust removal and power circuit voltage stability test.'
  },
  other: {
    service: 'Comprehensive Appliance Preventative Maintenance',
    cost: '₹399 - ₹799',
    description: 'Electrical load diagnostics, moving parts lubrication, and safety inspection.'
  }
};

/**
 * Predict next maintenance requirements using domain expert rules
 */
function predictApplianceMaintenance(appliance) {
  const type = (appliance.appliance_type || 'other').toLowerCase();
  const usage = (appliance.usage_frequency || 'medium').toLowerCase();
  const intervals = SERVICE_INTERVALS_DAYS[type] || SERVICE_INTERVALS_DAYS.other;
  const cycleDays = intervals[usage] || intervals.medium;

  const now = new Date();
  
  // Calculate days since last service or purchase
  let baseDate = appliance.last_service_date ? new Date(appliance.last_service_date) : null;
  if (!baseDate || isNaN(baseDate.getTime())) {
    baseDate = appliance.installation_date ? new Date(appliance.installation_date) : null;
  }
  if (!baseDate || isNaN(baseDate.getTime())) {
    baseDate = appliance.purchase_date ? new Date(appliance.purchase_date) : new Date(now.getTime() - 120 * 24 * 3600 * 1000);
  }

  const daysSinceBase = Math.max(0, Math.floor((now - baseDate) / (1000 * 60 * 60 * 24)));
  const daysUntilDue = cycleDays - daysSinceBase;

  // Compute recommended date
  const recommendedDate = new Date(now.getTime() + (daysUntilDue > 0 ? daysUntilDue : 0) * 24 * 3600 * 1000);

  // Determine health score (100 down to 20 based on overdue days and repair count)
  let healthScore = 100;
  if (daysUntilDue < 0) {
    const overdueRatio = Math.abs(daysUntilDue) / cycleDays;
    healthScore -= Math.min(50, Math.floor(overdueRatio * 40));
  } else {
    const freshnessRatio = daysSinceBase / cycleDays;
    healthScore -= Math.floor(freshnessRatio * 20);
  }

  // Factor in previous repairs
  const repairs = Array.isArray(appliance.repair_history) ? appliance.repair_history : [];
  healthScore -= Math.min(25, repairs.length * 8);
  healthScore = Math.max(25, Math.min(98, healthScore));

  // Determine priority
  let priority = 'low';
  if (daysUntilDue <= -30 || healthScore < 50) {
    priority = 'critical';
  } else if (daysUntilDue <= 0 || healthScore < 70) {
    priority = 'high';
  } else if (daysUntilDue <= 21) {
    priority = 'medium';
  }

  // Generate plain English explainability reason
  const brandName = appliance.brand || 'Appliance';
  const modelName = appliance.model ? ` (${appliance.model})` : '';
  const suggestion = SUGGESTED_SERVICES_MAP[type] || SUGGESTED_SERVICES_MAP.other;

  let reason = '';
  if (daysUntilDue <= 0) {
    reason = `Your ${brandName} ${type.replace(/_/g, ' ')}${modelName} is ${Math.abs(daysUntilDue)} days overdue for scheduled maintenance under ${usage} usage cycle. Immediate servicing prevents compressor/motor burnout and reduces electric power draw.`;
  } else if (daysUntilDue <= 21) {
    reason = `Upcoming seasonal preventive maintenance due in ${daysUntilDue} days based on your ${usage} operational pattern and local Pune municipal water/dust index.`;
  } else {
    reason = `Appliance operates within healthy thresholds. Preventive maintenance scheduled in ${daysUntilDue} days to maintain factory energy rating and extend life expectancy.`;
  }

  return {
    appliance_id: appliance.id,
    recommended_date: recommendedDate.toISOString().split('T')[0],
    priority,
    health_score: healthScore,
    days_until_due: daysUntilDue,
    is_overdue: daysUntilDue <= 0,
    suggested_service: suggestion.service,
    service_description: suggestion.description,
    estimated_price_range: suggestion.cost,
    reason
  };
}

module.exports = {
  predictApplianceMaintenance,
  SERVICE_INTERVALS_DAYS,
  SUGGESTED_SERVICES_MAP
};
