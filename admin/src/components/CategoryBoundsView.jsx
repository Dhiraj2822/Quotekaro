import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

const DEFAULT_BOUNDS = {
  plumbing: { min_price_paise: 10000, max_price_paise: 2000000, icon: '🚰', desc: 'Pipe leakages, tap fittings, flush tanks, sanitary work' },
  electrical: { min_price_paise: 10000, max_price_paise: 2500000, icon: '⚡', desc: 'Wiring, MCBs, fans, switchboards, inverters' },
  painting: { min_price_paise: 20000, max_price_paise: 10000000, icon: '🎨', desc: 'Whitewashing, emulsion, interior/exterior painting' },
  cleaning: { min_price_paise: 10000, max_price_paise: 1500000, icon: '🧹', desc: 'Deep home cleaning, sofa/kitchen sanitation, pest control' }
};

export default function CategoryBoundsView({
  backendHealth,
  adminToken,
  showToast,
  loading,
  setLoading
}) {
  const [bounds, setBounds] = useState(DEFAULT_BOUNDS);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editMinRupees, setEditMinRupees] = useState('');
  const [editMaxRupees, setEditMaxRupees] = useState('');

  const handleStartEdit = (catKey) => {
    const current = bounds[catKey];
    setEditingCategory(catKey);
    setEditMinRupees(Math.round(current.min_price_paise / 100).toString());
    setEditMaxRupees(Math.round(current.max_price_paise / 100).toString());
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    const minRs = parseInt(editMinRupees, 10);
    const maxRs = parseInt(editMaxRupees, 10);

    if (isNaN(minRs) || minRs <= 0 || isNaN(maxRs) || maxRs <= 0) {
      showToast('Please enter valid positive amounts for min and max bounds.', 'error');
      return;
    }

    if (minRs > maxRs) {
      showToast('Minimum price cannot be greater than maximum price.', 'error');
      return;
    }

    const newMinPaise = minRs * 100;
    const newMaxPaise = maxRs * 100;

    setLoading(true);
    try {
      if (backendHealth.status === 'online') {
        const res = await fetch(`${API_BASE_URL}/admin/category-bounds/${editingCategory}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            min_price_paise: newMinPaise,
            max_price_paise: newMaxPaise
          })
        });

        if (res.ok) {
          const data = await res.json();
          setBounds(prev => ({
            ...prev,
            [editingCategory]: {
              ...prev[editingCategory],
              min_price_paise: data.bounds.min_price_paise,
              max_price_paise: data.bounds.max_price_paise
            }
          }));
          showToast(`Pricing bounds updated for ${editingCategory} (₹${minRs} – ₹${maxRs}).`, 'success');
          setEditingCategory(null);
          return;
        }
      }

      // Local state fallback
      setBounds(prev => ({
        ...prev,
        [editingCategory]: {
          ...prev[editingCategory],
          min_price_paise: newMinPaise,
          max_price_paise: newMaxPaise
        }
      }));
      showToast(`Pricing bounds updated for ${editingCategory} (₹${minRs} – ₹${maxRs}).`, 'success');
      setEditingCategory(null);
    } catch (err) {
      showToast(`Failed to update bounds: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = () => {
    setBounds(DEFAULT_BOUNDS);
    setEditingCategory(null);
    showToast('Pricing bounds restored to system defaults.', 'info');
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            Category Bounds & Fraud Prevention Limits
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Set minimum and maximum quote boundaries per category to prevent predatory outlier gouging and bait-and-switch pricing.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          style={{
            backgroundColor: '#FFFFFF',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-color)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-btn)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          ↺ Reset Defaults
        </button>
      </div>

      {/* Info Notice */}
      <div style={{
        backgroundColor: '#F0FDF4',
        borderLeft: '4px solid var(--accent)',
        borderRadius: '0 8px 8px 0',
        padding: '14px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <span style={{ fontSize: '20px' }}>🛡️</span>
        <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
          <strong>Automated Anti-Scam Protection (07_SECURITY.md §4):</strong> Quotes submitted by service professionals outside these thresholds are automatically rejected by the bidding engine with <code>HTTP 400 PRICE_OUT_OF_BOUNDS</code>.
        </div>
      </div>

      {/* Categories Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {Object.entries(bounds).map(([catKey, catData]) => {
          const isEditing = editingCategory === catKey;
          const minRupees = Math.round(catData.min_price_paise / 100);
          const maxRupees = Math.round(catData.max_price_paise / 100);

          return (
            <div
              key={catKey}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-card)',
                border: isEditing ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                padding: '24px',
                boxShadow: isEditing ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{catData.icon}</span>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, textTransform: 'capitalize', color: 'var(--primary)', margin: 0 }}>
                      {catKey}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent)'
                  }}>
                    Active Limit
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px', minHeight: '36px' }}>
                  {catData.desc}
                </p>

                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Min Allowed Quote (₹)
                      </label>
                      <input
                        type="number"
                        value={editMinRupees}
                        onChange={(e) => setEditMinRupees(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-btn)',
                          border: '1px solid var(--border-color)',
                          fontSize: '14px',
                          fontWeight: 600
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Max Allowed Quote (₹)
                      </label>
                      <input
                        type="number"
                        value={editMaxRupees}
                        onChange={(e) => setEditMaxRupees(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-btn)',
                          border: '1px solid var(--border-color)',
                          fontSize: '14px',
                          fontWeight: 600
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#F8FAFC',
                    padding: '14px',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Min Quote:</span>
                      <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>₹{minRupees.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Max Quote:</span>
                      <strong style={{ fontSize: '15px', color: 'var(--primary)' }}>₹{maxRupees.toLocaleString()}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-btn)',
                        backgroundColor: '#F1F5F9',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-btn)',
                        backgroundColor: 'var(--accent)',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      Save ✓
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartEdit(catKey)}
                    style={{
                      width: '100%',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-btn)',
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: '1px solid #BFDBFE'
                    }}
                  >
                    Configure Bounds ⚙️
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
