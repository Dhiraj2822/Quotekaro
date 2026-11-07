import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function SubscriptionsView({ adminToken, showToast }) {
  const [plans, setPlans] = useState([
    {
      id: 'plan-basic',
      name: 'Care Basic',
      tier: 'basic',
      monthly_price_paise: 19900,
      annual_price_paise: 199900,
      features: [
        'Unlimited Appliance Health Registration',
        'AI Preventive Maintenance Alerts',
        'Digital Appliance Service History & Bills',
        'Warranty Expiry Reminders'
      ],
      maintenance_visits_per_year: 1,
      service_discount_percent: 5,
      is_active: true
    },
    {
      id: 'plan-standard',
      name: 'Care Standard',
      tier: 'standard',
      monthly_price_paise: 49900,
      annual_price_paise: 499900,
      features: [
        'Everything in Basic Plan',
        '2 Comprehensive Scheduled Checkups Included',
        '15% Flat Discount on All Marketplace Services',
        'Priority Professional Dispatch & Auto-Match'
      ],
      maintenance_visits_per_year: 2,
      service_discount_percent: 15,
      is_active: true
    },
    {
      id: 'plan-premium',
      name: 'Care Premium (Total Home Shield)',
      tier: 'premium',
      monthly_price_paise: 99900,
      annual_price_paise: 999900,
      features: [
        'Everything in Standard Plan',
        '4 Free Comprehensive Maintenance Visits / Year',
        'Zero Visiting Charges All Year Round',
        '25% Discount on Genuine OEM Spare Parts',
        '1-Hour Emergency Priority Dispatch Gate'
      ],
      maintenance_visits_per_year: 4,
      service_discount_percent: 25,
      is_active: true
    }
  ]);

  const [overview, setOverview] = useState({
    total_subscribers: 142,
    active_subscriptions: 128,
    monthly_recurring_revenue_paise: 7380000,
    basic_subscribers: 42,
    standard_subscribers: 68,
    premium_subscribers: 18,
    scheduled_maintenance_due_this_month: 27
  });

  const [subscribers, setSubscribers] = useState([
    {
      id: 'sub-1',
      customer_name: 'Rahul Deshmukh',
      phone: '+919999900020',
      plan_name: 'Care Standard',
      tier: 'standard',
      billing_cycle: 'monthly',
      status: 'active',
      next_renewal: '2026-10-15',
      visits_remaining: 2
    },
    {
      id: 'sub-2',
      customer_name: 'Kavita Patil',
      phone: '+919999900010',
      plan_name: 'Care Premium (Total Home Shield)',
      tier: 'premium',
      billing_cycle: 'annual',
      status: 'active',
      next_renewal: '2027-04-10',
      visits_remaining: 4
    },
    {
      id: 'sub-3',
      customer_name: 'Pooja Kulkarni',
      phone: '+919999900030',
      plan_name: 'Care Basic',
      tier: 'basic',
      billing_cycle: 'monthly',
      status: 'active',
      next_renewal: '2026-09-30',
      visits_remaining: 1
    }
  ]);

  const [editingPlan, setEditingPlan] = useState(null);
  const [editPriceRs, setEditPriceRs] = useState('');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/subscriptions`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.overview) setOverview(data.overview);
        if (data.plans) setPlans(data.plans);
        if (data.recent_subscribers) setSubscribers(data.recent_subscribers);
      }
    } catch (_) {}
  };

  const handleSavePlanPrice = (plan) => {
    const rs = parseFloat(editPriceRs);
    if (isNaN(rs) || rs <= 0) {
      showToast('Please enter a valid price in Rupees', 'danger');
      return;
    }
    const paise = Math.round(rs * 100);
    setPlans(plans.map((p) => (p.id === plan.id ? { ...p, monthly_price_paise: paise } : p)));
    setEditingPlan(null);
    setEditPriceRs('');
    showToast(`Updated monthly price for ${plan.name} to ₹${rs}`, 'success');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-color)' }}>
            AI Home Maintenance & Subscriptions
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            QuoteKaro flagship differentiator: Configurable monthly/annual care plans, subscriber cohorts & MRR
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Active Subscriptions</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
            {overview.active_subscriptions}
          </div>
          <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>↑ +14% this month</span>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monthly Recurring (MRR)</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>
            ₹{Math.round(overview.monthly_recurring_revenue_paise / 100).toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Prepaid automated recurring</span>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Maintenance Due (AI Forecast)</span>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706', marginTop: '4px' }}>
            {overview.scheduled_maintenance_due_this_month} units
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Upcoming in next 30 days</span>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Plan Cohort Breakdown</span>
          <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>
            <span style={{ color: '#2563EB' }}>Standard: 48%</span> | <span style={{ color: '#16A34A' }}>Basic: 30%</span> | <span style={{ color: '#7C3AED' }}>Premium: 22%</span>
          </div>
        </div>
      </div>

      {/* Subscription Plans Configuration */}
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
        Configurable Subscription Tiers
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {plans.map((p) => (
          <div
            key={p.id}
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              border: p.tier === 'standard' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            {p.tier === 'standard' && (
              <span style={{
                position: 'absolute',
                top: '-10px',
                right: '16px',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                POPULAR
              </span>
            )}
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>{p.name}</h4>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', margin: '8px 0 16px 0' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
                  ₹{Math.round(p.monthly_price_paise / 100)}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ month</span>
              </div>
              <ul style={{ paddingLeft: '18px', margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-color)', lineHeight: 1.6 }}>
                {p.features && p.features.map((feat, idx) => (
                  <li key={idx}>{feat}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => {
                setEditingPlan(p);
                setEditPriceRs(Math.round(p.monthly_price_paise / 100).toString());
              }}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Edit Pricing
            </button>
          </div>
        ))}
      </div>

      {/* Active Subscribers Table */}
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
        Subscriber Ledger & Appliance Coverage
      </h3>
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Subscriber</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Plan Tier</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Cycle</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Visits Remaining</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Next Renewal</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                  <div>{s.customer_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.phone}</div>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary)' }}>
                  {s.plan_name}
                </td>
                <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{s.billing_cycle}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '11px' }}>
                    {s.visits_remaining} visits left
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{s.next_renewal}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '11px' }}>
                    ACTIVE
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Edit Plan Monthly Price</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>{editingPlan.name}</p>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Monthly Subscription Rate (₹):
            </label>
            <input
              type="number"
              value={editPriceRs}
              onChange={(e) => setEditPriceRs(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '15px',
                fontWeight: 600,
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setEditingPlan(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSavePlanPrice(editingPlan)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Update Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
