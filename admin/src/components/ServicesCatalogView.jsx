import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function ServicesCatalogView({ showToast }) {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingService, setEditingService] = useState(null);
  const [newPriceRs, setNewPriceRs] = useState('');

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      const catRes = await fetch(`${API_BASE_URL}/catalog/categories`);
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }
      const srvRes = await fetch(`${API_BASE_URL}/catalog/services`);
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        setServices(srvData.services || []);
      }
    } catch (_) {}
  };

  const handleUpdatePrice = (service) => {
    const rs = parseFloat(newPriceRs);
    if (isNaN(rs) || rs <= 0) {
      showToast('Please enter a valid price in Rupees', 'danger');
      return;
    }
    const paise = Math.round(rs * 100);
    setServices(services.map((s) => (s.id === service.id ? { ...s, base_price_paise: paise } : s)));
    setEditingService(null);
    setNewPriceRs('');
    showToast(`Updated price for ${service.name} to ₹${rs}`, 'success');
  };

  const toggleServiceActive = (serviceId) => {
    setServices(
      services.map((s) => (s.id === serviceId ? { ...s, is_active: !s.is_active } : s))
    );
    showToast('Service availability toggled', 'success');
  };

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter((s) => s.category_slug === selectedCategory || s.category_id === selectedCategory);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-color)' }}>
            Service & Package Management
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Configure Urban Company style service categories, packages, add-ons, and base pricing
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: selectedCategory === 'all' ? 'var(--primary)' : '#E2E8F0',
            color: selectedCategory === 'all' ? '#fff' : 'var(--text-color)'
          }}
        >
          All Categories ({services.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.slug)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: selectedCategory === c.slug ? 'var(--primary)' : '#E2E8F0',
              color: selectedCategory === c.slug ? '#fff' : 'var(--text-color)'
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {filteredServices.map((srv) => (
          <div
            key={srv.id}
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB'
                }}>
                  {srv.category_slug || 'service'}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: srv.is_active !== false ? '#DCFCE7' : '#FEE2E2',
                  color: srv.is_active !== false ? '#15803D' : '#B91C1C'
                }}>
                  {srv.is_active !== false ? 'LIVE' : 'DISABLED'}
                </span>
              </div>

              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-color)' }}>
                {srv.name}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                {srv.description}
              </p>

              {/* Packages preview */}
              {srv.packages && srv.packages.length > 0 && (
                <div style={{ backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Available Packages ({srv.packages.length}):
                  </span>
                  {srv.packages.map((pkg) => (
                    <div key={pkg.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', margin: '2px 0' }}>
                      <span>{pkg.name}</span>
                      <span style={{ fontWeight: 600 }}>₹{Math.round(pkg.price_paise / 100)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Base Price: </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                  ₹{Math.round((srv.base_price_paise || 0) / 100)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setEditingService(srv);
                    setNewPriceRs(Math.round(srv.base_price_paise / 100).toString());
                  }}
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Edit Price
                </button>
                <button
                  onClick={() => toggleServiceActive(srv.id)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: srv.is_active !== false ? '#FEE2E2' : '#DCFCE7',
                    color: srv.is_active !== false ? '#DC2626' : '#16A34A',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {srv.is_active !== false ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Price Modal */}
      {editingService && (
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
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Edit Service Price</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>{editingService.name}</p>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Base Price (INR ₹):
            </label>
            <input
              type="number"
              value={newPriceRs}
              onChange={(e) => setNewPriceRs(e.target.value)}
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
                onClick={() => setEditingService(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdatePrice(editingService)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
              >
                Save Price
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
