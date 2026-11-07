const db = require('../config/db');

// In-memory fallback catalog data for robust development & tests without requiring live DB seed
const DEFAULT_CATEGORIES = [
  {
    id: 'c-clean',
    name: 'Cleaning',
    slug: 'cleaning',
    icon: 'cleaning_services',
    image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
    description: 'Expert home, bathroom, kitchen and deep cleaning services',
    sort_order: 1,
    is_active: true
  },
  {
    id: 'c-elec',
    name: 'Electrician',
    slug: 'electrician',
    icon: 'electrical_services',
    image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
    description: 'Fan repair, switches, MCBs, wiring, and light installation',
    sort_order: 2,
    is_active: true
  },
  {
    id: 'c-plumb',
    name: 'Plumbing',
    slug: 'plumbing',
    icon: 'plumbing',
    image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
    description: 'Tap repair, pipe leakage, drain cleaning, and toilet fixtures',
    sort_order: 3,
    is_active: true
  },
  {
    id: 'c-carp',
    name: 'Carpentry',
    slug: 'carpentry',
    icon: 'carpenter',
    image_url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=600&q=80',
    description: 'Door repairs, lock installation, furniture assembly, and woodwork',
    sort_order: 4,
    is_active: true
  },
  {
    id: 'c-appliance',
    name: 'Appliance Repair',
    slug: 'appliance-repair',
    icon: 'home_repair_service',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    description: 'AC servicing, refrigerator, washing machine, and RO maintenance',
    sort_order: 5,
    is_active: true
  },
  {
    id: 'c-other',
    name: 'Painting & Other',
    slug: 'other-services',
    icon: 'format_paint',
    image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    description: 'Pest control, waterproofing, wall painting, and wellness services',
    sort_order: 6,
    is_active: true
  }
];

const DEFAULT_SERVICES = [
  // Cleaning
  {
    id: 's-clean-1',
    category_id: 'c-clean',
    category_slug: 'cleaning',
    name: 'Full Home Deep Cleaning',
    slug: 'full-home-deep-cleaning',
    description: 'Comprehensive top-to-bottom sanitization and deep cleaning of entire apartment or villa.',
    base_price_paise: 249900,
    estimated_duration_min: 240,
    image_url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
    rating: 4.88,
    review_count: 512,
    is_popular: true,
    is_recommended: true,
    inclusions: ['All rooms floor scrubbing', 'Balcony & windows cleaning', 'Cobweb removal', 'Bathroom descaling', 'Kitchen grease degreasing'],
    exclusions: ['Inside locked cabinets without presence', 'Terrace waterproofing', 'Exterior wall painting'],
    packages: [
      { id: 'pkg-c1-1', name: 'Standard (1-2 BHK)', description: 'Thorough vacuuming, scrubbing & sanitization for compact homes', price_paise: 249900, estimated_duration_min: 180, is_default: true },
      { id: 'pkg-c1-2', name: 'Premium (3-4 BHK)', description: 'Includes steam sterilization, tile joint scrubbing & chandelier cleaning', price_paise: 399900, estimated_duration_min: 300, is_default: false },
      { id: 'pkg-c1-3', name: 'Villa Ultra Deep Clean', description: 'Full mechanized deep cleaning with carpet shampooing', price_paise: 599900, estimated_duration_min: 420, is_default: false }
    ],
    addons: [
      { id: 'adn-c1-1', name: 'Balcony Jet Wash', price_paise: 29900, description: 'High-pressure wash for grimy outdoor balconies' },
      { id: 'adn-c1-2', name: 'Refrigerator Interior Degreasing', price_paise: 34900, description: 'Deep antibacterial defrost cleaning' },
      { id: 'adn-c1-3', name: 'Chimney Degreasing', price_paise: 44900, description: 'Baffle filter and duct grease removal' }
    ],
    faqs: [
      { q: 'Do I need to supply any cleaning detergents or machines?', a: 'No, our certified QuoteKaro cleaning crew brings hospital-grade chemicals and single-disc scrubbers.' },
      { q: 'How long does 2BHK cleaning take?', a: 'Typically 3.5 to 4 hours with a 2-person crew.' }
    ]
  },
  {
    id: 's-clean-2',
    category_id: 'c-clean',
    category_slug: 'cleaning',
    name: 'Bathroom Cleaning & Descaling',
    slug: 'bathroom-cleaning',
    description: 'Hard water stain removal, tile descaling, commode sanitization and mirror shine.',
    base_price_paise: 49900,
    estimated_duration_min: 60,
    image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
    rating: 4.82,
    review_count: 830,
    is_popular: true,
    is_recommended: false,
    inclusions: ['Hard water scale removal', 'Tile & grout scrubbing', 'Mirror & fitting buffing', 'Sanitizing toilet bowl & jet spray'],
    exclusions: ['Tile re-grouting or crack repairs'],
    packages: [
      { id: 'pkg-c2-1', name: '1 Bathroom Intensive', price_paise: 49900, estimated_duration_min: 60, is_default: true },
      { id: 'pkg-c2-2', name: '2 Bathrooms Combo', price_paise: 89900, estimated_duration_min: 100, is_default: false },
      { id: 'pkg-c2-3', name: '3 Bathrooms Deep Clean', price_paise: 129900, estimated_duration_min: 150, is_default: false }
    ],
    addons: [
      { id: 'adn-c2-1', name: 'Exhaust Fan Deep Scrub', price_paise: 14900, description: 'Oil and grime removal from exhaust fan blades' }
    ]
  },
  {
    id: 's-clean-3',
    category_id: 'c-clean',
    category_slug: 'cleaning',
    name: 'Kitchen Deep Degreasing',
    slug: 'kitchen-cleaning',
    description: 'Degrease oil residues, gas stove, kitchen tiles, sink buffing, and countertops.',
    base_price_paise: 119900,
    estimated_duration_min: 120,
    image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
    rating: 4.79,
    review_count: 340,
    is_popular: false,
    is_recommended: true,
    inclusions: ['Cabinets exterior wipe', 'Slab & tile degreasing', 'Sink sanitizing', 'Stove burn marks buffing'],
    exclusions: ['Appliance internal repairs'],
    packages: [
      { id: 'pkg-c3-1', name: 'Standard Kitchen Clean', price_paise: 119900, estimated_duration_min: 120, is_default: true },
      { id: 'pkg-c3-2', name: 'Modular Kitchen Inside-Out', price_paise: 179900, estimated_duration_min: 180, is_default: false }
    ],
    addons: []
  },
  {
    id: 's-clean-4',
    category_id: 'c-clean',
    category_slug: 'cleaning',
    name: 'Sofa & Carpet Dry Cleaning',
    slug: 'sofa-carpet-cleaning',
    description: 'Mechanized vacuuming, shampoo foam injection, and stain extraction for sofas and carpets.',
    base_price_paise: 69900,
    estimated_duration_min: 90,
    image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
    rating: 4.85,
    review_count: 210,
    is_popular: false,
    is_recommended: false,
    inclusions: ['Dry vacuum dust extraction', 'Foam shampoo treatment', 'Moisture wet extraction'],
    exclusions: ['Torn fabric stitching'],
    packages: [
      { id: 'pkg-c4-1', name: '3-Seater Sofa Clean', price_paise: 69900, estimated_duration_min: 60, is_default: true },
      { id: 'pkg-c4-2', name: '5-Seater (3+1+1) Sofa', price_paise: 109900, estimated_duration_min: 90, is_default: false },
      { id: 'pkg-c4-3', name: 'Medium Living Room Carpet', price_paise: 59900, estimated_duration_min: 45, is_default: false }
    ],
    addons: []
  },

  // Electrician
  {
    id: 's-elec-1',
    category_id: 'c-elec',
    category_slug: 'electrician',
    name: 'Ceiling Fan Installation & Repair',
    slug: 'fan-repair',
    description: 'Ceiling fan mounting, capacitor replacement, regulator testing, and wobble correction.',
    base_price_paise: 19900,
    estimated_duration_min: 30,
    image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
    rating: 4.92,
    review_count: 940,
    is_popular: true,
    is_recommended: true,
    inclusions: ['Step ladder setup', 'Wiring connection check', 'Safety blade tightening', '30-day service warranty'],
    exclusions: ['Spare parts (capacitors, regulator switches billed at MRP if required)'],
    packages: [
      { id: 'pkg-e1-1', name: 'Fan Repair / Diagnosis', price_paise: 19900, estimated_duration_min: 30, is_default: true },
      { id: 'pkg-e1-2', name: 'New Fan Installation', price_paise: 29900, estimated_duration_min: 40, is_default: false },
      { id: 'pkg-e1-3', name: 'Exhaust Fan Installation', price_paise: 24900, estimated_duration_min: 35, is_default: false }
    ],
    addons: [
      { id: 'adn-e1-1', name: 'Branded Heavy Duty Capacitor', price_paise: 9900, description: 'Original Havells/Anchor replacement capacitor' }
    ]
  },
  {
    id: 's-elec-2',
    category_id: 'c-elec',
    category_slug: 'electrician',
    name: 'Switch, Socket & MCB Repair',
    slug: 'switch-socket-mcb-repair',
    description: 'Fix tripping MCB breakers, sparking wall switches, 16A power sockets, and short circuits.',
    base_price_paise: 14900,
    estimated_duration_min: 30,
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    rating: 4.86,
    review_count: 670,
    is_popular: true,
    is_recommended: false,
    inclusions: ['Line voltage test', 'Ground earthing test', 'Safe switchboard dismantling'],
    exclusions: ['Concealed wall re-wiring (>5 meters billed separately)'],
    packages: [
      { id: 'pkg-e2-1', name: 'Single Switch/Socket Replacement', price_paise: 14900, estimated_duration_min: 25, is_default: true },
      { id: 'pkg-e2-2', name: 'MCB / Fuse Box Troubleshooting', price_paise: 34900, estimated_duration_min: 45, is_default: false },
      { id: 'pkg-e2-3', name: 'Home Earthing Check & Repair', price_paise: 49900, estimated_duration_min: 60, is_default: false }
    ],
    addons: []
  },
  {
    id: 's-elec-3',
    category_id: 'c-elec',
    category_slug: 'electrician',
    name: 'Chandelier & Designer Light Installation',
    slug: 'light-installation',
    description: 'Drilling, mounting and secure electrical hookup for strip lights, wall lamps and chandeliers.',
    base_price_paise: 24900,
    estimated_duration_min: 45,
    image_url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=600&q=80',
    rating: 4.81,
    review_count: 290,
    is_popular: false,
    is_recommended: false,
    inclusions: ['Anchoring screws & brackets setup', 'Load testing'],
    exclusions: ['Light fixture fixture procurement'],
    packages: [
      { id: 'pkg-e3-1', name: 'Wall Sconce / Tube Light Mount', price_paise: 24900, estimated_duration_min: 30, is_default: true },
      { id: 'pkg-e3-2', name: 'Heavy Crystal Chandelier', price_paise: 79900, estimated_duration_min: 90, is_default: false }
    ],
    addons: []
  },

  // Plumbing
  {
    id: 's-plumb-1',
    category_id: 'c-plumb',
    category_slug: 'plumbing',
    name: 'Tap Repair & Mixer Leakage',
    slug: 'tap-repair',
    description: 'Fix dripping taps, replace faulty spindle/cartridges, and resolve water mixer leaks.',
    base_price_paise: 19900,
    estimated_duration_min: 30,
    image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
    rating: 4.89,
    review_count: 1100,
    is_popular: true,
    is_recommended: true,
    inclusions: ['Washer & thread seal Teflon tape', 'Pressure leak check', 'Cleanup of repair area'],
    exclusions: ['New brass bibcock/tap replacement unit cost'],
    packages: [
      { id: 'pkg-p1-1', name: 'Standard Tap Leak Repair', price_paise: 19900, estimated_duration_min: 30, is_default: true },
      { id: 'pkg-p1-2', name: 'Wall Mixer / Diverter Repair', price_paise: 39900, estimated_duration_min: 45, is_default: false },
      { id: 'pkg-p1-3', name: 'Complete Tap Replacement (Labor)', price_paise: 24900, estimated_duration_min: 35, is_default: false }
    ],
    addons: [
      { id: 'adn-p1-1', name: 'High Quality Ceramic Cartridge', price_paise: 14900, description: 'Smooth 1/4-turn replacement ceramic disk' }
    ]
  },
  {
    id: 's-plumb-2',
    category_id: 'c-plumb',
    category_slug: 'plumbing',
    name: 'Drain Cleaning & Blockage Removal',
    slug: 'drain-cleaning',
    description: 'Clear clogged kitchen sinks, bathroom floor drains, and sewage trap blockages with drain snakes.',
    base_price_paise: 29900,
    estimated_duration_min: 45,
    image_url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
    rating: 4.84,
    review_count: 530,
    is_popular: true,
    is_recommended: false,
    inclusions: ['Mechanical snake auger clearance', 'Chemical descaler flush', 'Flow test verification'],
    exclusions: ['Main building municipal sewer mainline dig-up'],
    packages: [
      { id: 'pkg-p2-1', name: 'Kitchen Sink / Washbasin Blockage', price_paise: 29900, estimated_duration_min: 35, is_default: true },
      { id: 'pkg-p2-2', name: 'Severe Bathroom Floor Trap Blockage', price_paise: 49900, estimated_duration_min: 60, is_default: false }
    ],
    addons: []
  },
  {
    id: 's-plumb-3',
    category_id: 'c-plumb',
    category_slug: 'plumbing',
    name: 'Toilet & Flush Tank Repair',
    slug: 'toilet-repair',
    description: 'Western and Indian commode flush valves, syphon replacement, jet spray installation, and seals.',
    base_price_paise: 24900,
    estimated_duration_min: 40,
    image_url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
    rating: 4.77,
    review_count: 420,
    is_popular: false,
    is_recommended: false,
    inclusions: ['Flush handle/button mechanism tune', 'Inlet ball-cock adjustment'],
    exclusions: ['New ceramic toilet commode purchase'],
    packages: [
      { id: 'pkg-p3-1', name: 'Flush Tank Leakage / Syphon Fix', price_paise: 24900, estimated_duration_min: 40, is_default: true },
      { id: 'pkg-p3-2', name: 'Health Faucet (Jet Spray) Install/Fix', price_paise: 19900, estimated_duration_min: 25, is_default: false }
    ],
    addons: []
  },

  // Carpentry
  {
    id: 's-carp-1',
    category_id: 'c-carp',
    category_slug: 'carpentry',
    name: 'Door Lock Installation & Repair',
    slug: 'door-repair-lock-installation',
    description: 'Main door lock mortise, latch repair, Godrej lock installation, and door realignment.',
    base_price_paise: 29900,
    estimated_duration_min: 45,
    image_url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=600&q=80',
    rating: 4.87,
    review_count: 360,
    is_popular: true,
    is_recommended: true,
    inclusions: ['Chisel wood groove prep', 'Deadbolt alignment test', 'Door stopper setup'],
    exclusions: ['Lock hardware cost'],
    packages: [
      { id: 'pkg-k1-1', name: 'Door Lock Installation', price_paise: 29900, estimated_duration_min: 45, is_default: true },
      { id: 'pkg-k1-2', name: 'Door Hinges & Shaving (Jamming Door)', price_paise: 34900, estimated_duration_min: 50, is_default: false }
    ],
    addons: []
  },
  {
    id: 's-carp-2',
    category_id: 'c-carp',
    category_slug: 'carpentry',
    name: 'Furniture Assembly & Repair',
    slug: 'furniture-repair',
    description: 'Bed frame tightening, wardrobe hinges, drawer channels, dining chairs, and modular furniture setup.',
    base_price_paise: 39900,
    estimated_duration_min: 60,
    image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
    rating: 4.82,
    review_count: 240,
    is_popular: false,
    is_recommended: false,
    inclusions: ['Nut-bolt tightening', 'Channel realignment', 'Wood adhesive application'],
    exclusions: ['Complete wood carpentry fabrication'],
    packages: [
      { id: 'pkg-k2-1', name: 'Standard Furniture Repair (Up to 2 items)', price_paise: 39900, estimated_duration_min: 60, is_default: true },
      { id: 'pkg-k2-2', name: 'Bed / Wardrobe Assembly from Box', price_paise: 69900, estimated_duration_min: 120, is_default: false }
    ],
    addons: []
  },

  // Appliance Repair
  {
    id: 's-app-1',
    category_id: 'c-appliance',
    category_slug: 'appliance-repair',
    name: 'AC Servicing & Gas Charging',
    slug: 'ac-repair-servicing',
    description: 'High-pressure jet pump wash, indoor coil cleansing, gas leak diagnosis, and cooling optimization.',
    base_price_paise: 59900,
    estimated_duration_min: 60,
    image_url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
    rating: 4.93,
    review_count: 1450,
    is_popular: true,
    is_recommended: true,
    inclusions: ['High pressure jet pump wash', 'Drain pipe flushing', 'Outdoor unit wash', 'Ampere & grill temp test'],
    exclusions: ['Refrigerant top-up (billed as separate package/addon)'],
    packages: [
      { id: 'pkg-a1-1', name: 'Jet Pump Foam Servicing', price_paise: 59900, estimated_duration_min: 60, is_default: true },
      { id: 'pkg-a1-2', name: 'AC Comprehensive Servicing + Gas Top-up', price_paise: 189900, estimated_duration_min: 90, is_default: false },
      { id: 'pkg-a1-3', name: 'AC Uninstallation & Reinstallation', price_paise: 149900, estimated_duration_min: 120, is_default: false }
    ],
    addons: [
      { id: 'adn-a1-1', name: 'Anti-Rust Coating Spray for Coil', price_paise: 34900, description: 'Protects cooling coil against Pune moisture and corrosion' }
    ],
    faqs: [
      { q: 'How often should I service my AC?', a: 'Every 3 to 4 months for optimal electricity consumption and cooling efficiency.' }
    ]
  },
  {
    id: 's-app-2',
    category_id: 'c-appliance',
    category_slug: 'appliance-repair',
    name: 'Washing Machine Repair & Service',
    slug: 'washing-machine-repair',
    description: 'Front load and top load spin error, drainage blockage, drum vibration, PCB diagnostics.',
    base_price_paise: 29900,
    estimated_duration_min: 45,
    image_url: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80',
    rating: 4.84,
    review_count: 810,
    is_popular: true,
    is_recommended: false,
    inclusions: ['Complete diagnostics inspection', 'Drum descaling tablet run', 'Drain pump check'],
    exclusions: ['Motor or electronic PCB board replacement parts'],
    packages: [
      { id: 'pkg-a2-1', name: 'Diagnostics & Minor Fix', price_paise: 29900, estimated_duration_min: 45, is_default: true },
      { id: 'pkg-a2-2', name: 'Drum Deep Descaling & Maintenance', price_paise: 59900, estimated_duration_min: 60, is_default: false }
    ],
    addons: []
  },
  {
    id: 's-app-3',
    category_id: 'c-appliance',
    category_slug: 'appliance-repair',
    name: 'Water Purifier (RO) Filter Service',
    slug: 'water-purifier-servicing',
    description: 'Sediment, pre-carbon filter replacement, membrane flush, TDS calibration, and UV lamp check.',
    base_price_paise: 34900,
    estimated_duration_min: 45,
    image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
    rating: 4.88,
    review_count: 690,
    is_popular: true,
    is_recommended: true,
    inclusions: ['TDS water quality testing before & after', 'Sanitizing RO storage tank', 'Leakage inspection'],
    exclusions: ['RO Membrane replacement cartridge cost'],
    packages: [
      { id: 'pkg-a3-1', name: 'General RO Health Check & Service', price_paise: 34900, estimated_duration_min: 40, is_default: true },
      { id: 'pkg-a3-2', name: 'Complete Filter Kit Replacement', price_paise: 129900, estimated_duration_min: 60, is_default: false }
    ],
    addons: []
  },
  {
    id: 's-app-4',
    category_id: 'c-appliance',
    category_slug: 'appliance-repair',
    name: 'Refrigerator Repair & Cooling Fix',
    slug: 'refrigerator-repair',
    description: 'Compressor check, thermostat replacement, freezer ice buildup, defroster heater, and gas refilling.',
    base_price_paise: 29900,
    estimated_duration_min: 45,
    image_url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80',
    rating: 4.81,
    review_count: 490,
    is_popular: false,
    is_recommended: false,
    inclusions: ['Thermostat calibration', 'Condenser coil cleaning', 'Door magnetic gasket seal check'],
    exclusions: ['Replacement compressor part'],
    packages: [
      { id: 'pkg-a4-1', name: 'Cooling Diagnosis & Fix', price_paise: 29900, estimated_duration_min: 45, is_default: true },
      { id: 'pkg-a4-2', name: 'Full Refrigerant Gas Recharge', price_paise: 169900, estimated_duration_min: 75, is_default: false }
    ],
    addons: []
  },

  // Other Services
  {
    id: 's-oth-1',
    category_id: 'c-other',
    category_slug: 'other-services',
    name: 'Pest Control & Cockroach Gel',
    slug: 'pest-control',
    description: 'Odorless Bayer herbal gel treatment for German cockroaches, kitchen pests, and ants.',
    base_price_paise: 89900,
    estimated_duration_min: 60,
    image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    rating: 4.86,
    review_count: 510,
    is_popular: true,
    is_recommended: true,
    inclusions: ['Cabinet corner gel dots', 'Drain spray treatment', '100% odorless & pet-safe', '90-day warranty'],
    exclusions: ['Bed bug multi-stage eradication (separate service)'],
    packages: [
      { id: 'pkg-o1-1', name: '1-2 BHK Pest Control', price_paise: 89900, estimated_duration_min: 50, is_default: true },
      { id: 'pkg-o1-2', name: '3-4 BHK Comprehensive Treatment', price_paise: 139900, estimated_duration_min: 80, is_default: false }
    ],
    addons: []
  },
  {
    id: 's-oth-2',
    category_id: 'c-other',
    category_slug: 'other-services',
    name: 'Home Painting Consultation & Touchup',
    slug: 'home-painting',
    description: 'Wall moisture meter inspection, shade consultation, crack putty filling, and touchup painting.',
    base_price_paise: 49900,
    estimated_duration_min: 90,
    image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    rating: 4.75,
    review_count: 220,
    is_popular: false,
    is_recommended: false,
    inclusions: ['Laser room measurement', 'Wall moisture analysis', 'Asian Paints / Berger shade palette'],
    exclusions: ['Paint supplies'],
    packages: [
      { id: 'pkg-o2-1', name: 'Measurement & Color Consultation', price_paise: 49900, estimated_duration_min: 60, is_default: true },
      { id: 'pkg-o2-2', name: 'Single Accent Wall Painting', price_paise: 199900, estimated_duration_min: 180, is_default: false }
    ],
    addons: []
  }
];

/**
 * Fetch all categories
 */
async function getCategories() {
  try {
    const res = await db.query(
      'SELECT * FROM service_categories WHERE is_active = true ORDER BY sort_order ASC, name ASC'
    );
    if (res && res.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (err) {
    // Fall back gracefully to memory catalog if DB tables haven't been seeded yet
  }
  return DEFAULT_CATEGORIES.filter((c) => c.is_active);
}

/**
 * Fetch all services with optional category slug/id, search query, sorting
 */
async function getServices({ category, query, sort, is_popular, is_recommended, min_price, max_price }) {
  let items = [...DEFAULT_SERVICES];

  // Try DB first
  try {
    const dbRes = await db.query(`
      SELECT 
        s.*,
        c.slug AS category_slug,
        c.name AS category_name
      FROM catalog_services s
      JOIN service_categories c ON s.category_id = c.id
      WHERE s.is_active = true
      ORDER BY s.is_popular DESC, s.rating DESC
    `);
    if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
      items = dbRes.rows;
    }
  } catch (err) {
    // Keep DEFAULT_SERVICES
  }

  // Filter by category
  if (category) {
    const catLower = category.toLowerCase();
    items = items.filter(
      (s) => (s.category_slug && s.category_slug.toLowerCase() === catLower) ||
             (s.category_id && s.category_id.toLowerCase() === catLower)
    );
  }

  // Filter by search query
  if (query) {
    const qLower = query.toLowerCase();
    items = items.filter(
      (s) => s.name.toLowerCase().includes(qLower) ||
             (s.description && s.description.toLowerCase().includes(qLower))
    );
  }

  // Filter by popularity / recommendation
  if (is_popular === true || is_popular === 'true') {
    items = items.filter((s) => s.is_popular);
  }
  if (is_recommended === true || is_recommended === 'true') {
    items = items.filter((s) => s.is_recommended);
  }

  // Filter by price bounds
  if (min_price) {
    items = items.filter((s) => s.base_price_paise >= Number(min_price));
  }
  if (max_price) {
    items = items.filter((s) => s.base_price_paise <= Number(max_price));
  }

  // Sorting
  if (sort === 'price_asc') {
    items.sort((a, b) => a.base_price_paise - b.base_price_paise);
  } else if (sort === 'price_desc') {
    items.sort((a, b) => b.base_price_paise - a.base_price_paise);
  } else if (sort === 'rating_desc') {
    items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else {
    // Default popularity / recommendation sort
    items.sort((a, b) => (b.is_popular ? 1 : 0) - (a.is_popular ? 1 : 0) || (b.rating || 0) - (a.rating || 0));
  }

  return items;
}

/**
 * Get detailed service with packages, addons, and FAQs
 */
async function getServiceDetails(idOrSlug) {
  let service = DEFAULT_SERVICES.find((s) => s.id === idOrSlug || s.slug === idOrSlug);

  try {
    const res = await db.query(
      `SELECT s.*, c.slug AS category_slug, c.name AS category_name 
       FROM catalog_services s 
       JOIN service_categories c ON s.category_id = c.id 
       WHERE s.id::text = $1 OR s.slug = $1`,
      [idOrSlug]
    );
    if (res && res.rows && res.rows.length > 0) {
      service = res.rows[0];

      // Fetch packages
      const pkgsRes = await db.query(
        'SELECT * FROM service_packages WHERE service_id = $1 ORDER BY sort_order ASC, price_paise ASC',
        [service.id]
      );
      service.packages = pkgsRes.rows;

      // Fetch addons
      const addonsRes = await db.query(
        'SELECT * FROM service_addons WHERE service_id = $1 ORDER BY price_paise ASC',
        [service.id]
      );
      service.addons = addonsRes.rows;
    }
  } catch (err) {
    // If DB fails, fallback service is already loaded
  }

  if (!service) {
    const err = new Error('Service not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  return service;
}

module.exports = {
  getCategories,
  getServices,
  getServiceDetails,
  DEFAULT_CATEGORIES,
  DEFAULT_SERVICES
};

