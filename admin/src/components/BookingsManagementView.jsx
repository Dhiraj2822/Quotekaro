import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function BookingsManagementView({ adminToken, showToast }) {
  const [bookings, setBookings] = useState([
    {
      id: 'b-901',
      status: 'completed',
      category: 'plumbing',
      description: 'Kitchen sink mixer tap replacement and main pipe gasket repair',
      area: 'Baner',
      customer_name: 'Anjali Deshmukh',
      customer_phone: '+919999900051',
      provider_name: 'Ramesh Plumber',
      provider_phone: '+919999900031',
      total_price_paise: 180000,
      scheduled_at: '2026-09-17T14:00:00Z',
      start_otp: '394812',
      completion_otp: '817264',
      created_at: '2026-09-17T12:00:00Z'
    },
    {
      id: 'b-902',
      status: 'in_progress',
      category: 'electrical',
      description: '3 Ceiling fans rewiring and bedroom light fitting',
      area: 'Kothrud',
      customer_name: 'Kavita Patil',
      customer_phone: '+919999900010',
      provider_name: 'Suresh Electrician',
      provider_phone: '+919999900001',
      total_price_paise: 95000,
      scheduled_at: '2026-09-18T10:00:00Z',
      start_otp: '551290',
      completion_otp: '992014',
      created_at: '2026-09-18T08:30:00Z'
    },
    {
      id: 'b-903',
      status: 'confirmed',
      category: 'appliance-repair',
      description: 'Daikin Inverter AC Jet Foam Foam Servicing',
      area: 'Aundh',
      customer_name: 'Rahul Deshmukh',
      customer_phone: '+919999900020',
      provider_name: 'Ramesh Plumber',
      provider_phone: '+919999900002',
      total_price_paise: 59900,
      scheduled_at: '2026-09-19T11:00:00Z',
      start_otp: '482910',
      completion_otp: '739182',
      created_at: '2026-09-18T14:00:00Z'
    }
  ]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/bookings`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.bookings && data.bookings.length > 0) {
          setBookings(data.bookings);
        }
      }
    } catch (_) {}
  };

  const handleStatusChange = (bookingId, newStatus) => {
    setBookings(bookings.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b)));
    showToast(`Booking ${bookingId} status updated to ${newStatus}`, 'success');
  };

  const filtered = filterStatus === 'all' ? bookings : bookings.filter((b) => b.status === filterStatus);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return { bg: '#DCFCE7', text: '#15803D' };
      case 'in_progress': return { bg: '#FEF3C7', text: '#B45309' };
      case 'confirmed': return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'cancelled': return { bg: '#FEE2E2', text: '#B91C1C' };
      default: return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-color)' }}>
            Booking Management & Dispatch
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Monitor real-time customer bookings, provider assignments, OTP validations, and scheduled slots
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: filterStatus === st ? 'var(--primary)' : '#fff',
                color: filterStatus === st ? '#fff' : 'var(--text-color)'
              }}
            >
              {st.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>ID / Date</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Service Requirements</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Customer</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Assigned Pro</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>OTPs (Start / End)</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const stStyle = getStatusColor(b.status);
              return (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>{b.id}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(b.created_at || Date.now()).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{b.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📍 {b.area || 'Pune'}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{b.customer_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.customer_phone}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{b.provider_name || 'Unassigned'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.provider_phone || '—'}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px' }}>
                    <span style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>
                      Start: {b.start_otp || '123456'}
                    </span>
                    <span style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                      End: {b.completion_otp || '123456'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                    ₹{Math.round((b.total_price_paise || b.quote_price_paise || 49900) / 100)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      backgroundColor: stStyle.bg,
                      color: stStyle.text,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      fontSize: '11px'
                    }}>
                      {b.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => handleStatusChange(b.id, 'in_progress')}
                        style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #93C5FD', background: '#EFF6FF', color: '#1D4ED8', cursor: 'pointer', fontWeight: 600, marginRight: '4px' }}
                      >
                        Start
                      </button>
                    )}
                    {b.status === 'in_progress' && (
                      <button
                        onClick={() => handleStatusChange(b.id, 'completed')}
                        style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #86EFAC', background: '#F0FDF4', color: '#15803D', cursor: 'pointer', fontWeight: 600, marginRight: '4px' }}
                      >
                        Complete
                      </button>
                    )}
                    {b.status !== 'cancelled' && b.status !== 'completed' && (
                      <button
                        onClick={() => handleStatusChange(b.id, 'cancelled')}
                        style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

