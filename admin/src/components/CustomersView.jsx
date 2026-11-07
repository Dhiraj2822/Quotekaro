import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function CustomersView({ adminToken, showToast }) {
  const [customers, setCustomers] = useState([
    {
      id: '20000000-0000-0000-0000-000000000001',
      name: 'Kavita Patil',
      phone_number: '+919999900010',
      email: 'kavita.patil@example.com',
      city: 'Pune',
      is_active: true,
      total_bookings: 3,
      created_at: '2026-09-01T10:00:00Z'
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      name: 'Rahul Deshmukh',
      phone_number: '+919999900020',
      email: 'rahul.deshmukh@example.com',
      city: 'Pune',
      is_active: true,
      total_bookings: 5,
      created_at: '2026-09-05T14:30:00Z'
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      name: 'Pooja Kulkarni',
      phone_number: '+919999900030',
      email: 'pooja.kulkarni@example.com',
      city: 'Pune',
      is_active: true,
      total_bookings: 2,
      created_at: '2026-09-10T11:15:00Z'
    },
    {
      id: '20000000-0000-0000-0000-000000000004',
      name: 'Anjali Deshmukh',
      phone_number: '+919999900051',
      email: 'anjali.deshmukh@example.com',
      city: 'Pune',
      is_active: false,
      total_bookings: 4,
      created_at: '2026-09-12T09:40:00Z'
    }
  ]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/customers`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.customers && data.customers.length > 0) {
          setCustomers(data.customers);
        }
      }
    } catch (_) {
      // Keep demo list
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerStatus = async (id, currentStatus) => {
    const nextStatus = !currentStatus;
    try {
      await fetch(`${API_BASE_URL}/admin/customers/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ is_active: nextStatus })
      });
    } catch (_) {}

    setCustomers(customers.map((c) => (c.id === id ? { ...c, is_active: nextStatus } : c)));
    showToast(nextStatus ? 'Customer account activated' : 'Customer account suspended', nextStatus ? 'success' : 'warning');
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return !q || (c.name && c.name.toLowerCase().includes(q)) || (c.phone_number && c.phone_number.includes(q)) || (c.email && c.email.toLowerCase().includes(q));
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-color)' }}>
            Customer Management
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            View customer profiles, active bookings count, and manage account statuses across Pune
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              width: '280px'
            }}
          />
          <button
            onClick={fetchCustomers}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
            <tr>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Customer Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Phone</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Email</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>City</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Bookings</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--primary)' }}>
                  {c.name || 'Anonymous Customer'}
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>{c.phone_number}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                <td style={{ padding: '14px 16px' }}>{c.city || 'Pune'}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ backgroundColor: '#EBF3FB', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    {c.total_bookings || 0} orders
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    backgroundColor: c.is_active ? '#DCFCE7' : '#FEE2E2',
                    color: c.is_active ? '#15803D' : '#B91C1C',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '11px'
                  }}>
                    {c.is_active ? 'ACTIVE' : 'SUSPENDED'}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => toggleCustomerStatus(c.id, c.is_active)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: `1px solid ${c.is_active ? '#F87171' : '#4ADE80'}`,
                      backgroundColor: c.is_active ? '#FEF2F2' : '#F0FDF4',
                      color: c.is_active ? '#DC2626' : '#16A34A',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {c.is_active ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

