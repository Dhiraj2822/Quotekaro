/**
 * Category & Pricing Bounds Service
 * Enforces min and max quote bounds per category to prevent outlier scams and predatory gouging
 * per 06_UIUX_SPEC.md §4.4 and 07_SECURITY.md §4.
 */

let categoryBounds = {
  plumbing: { min_price_paise: 10000, max_price_paise: 2000000 },    // ₹100 – ₹20,000
  electrical: { min_price_paise: 10000, max_price_paise: 2500000 },  // ₹100 – ₹25,000
  painting: { min_price_paise: 20000, max_price_paise: 10000000 },   // ₹200 – ₹100,000
  cleaning: { min_price_paise: 10000, max_price_paise: 1500000 }     // ₹100 – ₹15,000
};

function getCategoryBounds(category) {
  if (category) {
    return categoryBounds[category] || null;
  }
  return { ...categoryBounds };
}

function updateCategoryBounds(category, { min_price_paise, max_price_paise }) {
  const cat = (category || '').toLowerCase();
  if (!categoryBounds[cat]) {
    const error = new Error(`Category ${category} not found`);
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const current = categoryBounds[cat];
  const newMin = min_price_paise !== undefined ? min_price_paise : current.min_price_paise;
  const newMax = max_price_paise !== undefined ? max_price_paise : current.max_price_paise;

  if (newMin > newMax) {
    const error = new Error('min_price_paise cannot exceed max_price_paise');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  categoryBounds[cat] = {
    min_price_paise: newMin,
    max_price_paise: newMax
  };

  return {
    category: cat,
    ...categoryBounds[cat]
  };
}

function resetCategoryBounds() {
  categoryBounds = {
    plumbing: { min_price_paise: 10000, max_price_paise: 2000000 },
    electrical: { min_price_paise: 10000, max_price_paise: 2500000 },
    painting: { min_price_paise: 20000, max_price_paise: 10000000 },
    cleaning: { min_price_paise: 10000, max_price_paise: 1500000 }
  };
}

module.exports = {
  getCategoryBounds,
  updateCategoryBounds,
  resetCategoryBounds
};
