import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function MarketingCouponsView({ adminToken, showToast }) {
  const [coupons, setCoupons] = useState([
    {
      code: 'WELCOME50',
      title: 'First Home Service Discount',
      description: 'Flat ₹50 off on first service booking',
      discount_type: 'flat',
      discount_value: 5000,
      min_order_paise: 29900,
      is_active: true
    },
    {
      code: 'PUNE20',
      title: 'Pune Super Saver',
      description: '20% off on deep cleaning & AC servicing',
      discount_type: 'percentage',
      discount_value: 20,
      min_order_paise: 49900,
      is_active: true
    },
    {
      code: 'CARE100',
      title: 'Home Care Subscriber Bonus',
      description: 'Flat ₹100 discount for subscription members',
      discount_type: 'flat',
      discount_value: 10000,
      min_order_paise: 59900,
      is_active: true
    }
  ]);

  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [discountType, setDiscountType] = useState('flat');
  const [discountVal, setDiscountVal] = useState('');
  const [minOrder, setMinOrder] = useState('');

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/coupons`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.coupons && data.coupons.length > 0) {
          setCoupons(data.coupons);
        }
      }
    } catch (_) {}
  };

  const handleCreateCoupon = (e) => {
    e.preventDefault();
    if (!newCode.trim()) {
      showToast('Please enter a coupon code', 'danger');
      return;
    }
    const val = parseFloat(discountVal);
    if (isNaN(val) || val <= 0) {
      showToast('Please enter a valid discount value', 'danger');
      return;
    }

    const newCoupon = {
      code: newCode.trim().toUpperCase(),
      title: newTitle || 'Seasonal Promotional Discount',
      description: `${discountType === 'percentage' ? `${val}%` : `₹${val}`} discount on booking`,
      discount_type: discountType,
      discount_value: discountType === 'flat' ? Math.round(val * 100) : val,
      min_order_paise: minOrder ? Math.round(parseFloat(minOrder) * 100) : 0,
      is_active: true
    };

    setCoupons([newCoupon, ...coupons]);
    setNewCode('');
    setNewTitle('');
    setDiscountVal('');
    setMinOrder('');
    showToast(`Coupon ${newCoupon.code} created successfully`, 'success');
  };

  const toggleCoupon = (code) => {
    setCoupons(coupons.map((c) => (c.code === code ? { ...c, is_active: !c.is_active } : c)));
    showToast('Coupon status updated', 'success');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-color)' }}>
            Marketing, Coupons & Referrals
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Drive customer acquisition and repeat service bookings across Pune with promotional campaigns
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Create Coupon Form */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0' }}>Create New Promo Coupon</h3>
          <form onSubmit={handleCreateCoupon}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Promo Code:</label>
              <input
                type="text"
                placeholder="e.g. DIWALI30"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: 700, fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Title / Campaign:</label>
              <input
                type="text"
                placeholder="e.g. Festival Home Deep Clean"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Type:</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                >
                  <option value="flat">Flat ₹ Off</option>
                  <option value="percentage">Percentage % Off</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Value ({discountType === 'flat' ? '₹' : '%'}):</label>
                <input
                  type="number"
                  placeholder={discountType === 'flat' ? '100' : '20'}
                  value={discountVal}
                  onChange={(e) => setDiscountVal(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Minimum Order (₹):</label>
              <input
                type="number"
                placeholder="e.g. 499"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '13px' }}
              />
            </div>
            <button
              type="submit"
              style={{ width: '100%', padding: '10px', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
            >
              Publish Coupon
            </button>
          </form>
        </div>

        {/* Coupons List */}
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Campaign</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Discount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Min Order</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.code} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                    {c.code}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.description}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                    {c.discount_type === 'flat' ? `₹${Math.round(c.discount_value / 100)}` : `${c.discount_value}%`}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    ₹{c.min_order_paise ? Math.round(c.min_order_paise / 100) : 0}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      backgroundColor: c.is_active ? '#DCFCE7' : '#FEE2E2',
                      color: c.is_active ? '#15803D' : '#B91C1C',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '11px'
                    }}>
                      {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => toggleCoupon(c.code)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {c.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

