import React, { useState, useEffect } from 'react';
import DisputesView from './components/DisputesView';
import AnalyticsView from './components/AnalyticsView';
import CategoryBoundsView from './components/CategoryBoundsView';
import { API_BASE_URL, API_ROOT_URL } from './config';

// Default initial demo providers for seamless local preview and testing
const INITIAL_DEMO_PROVIDERS = [
  {
    id: 'p-101',
    user_id: 'u-101',
    user_name: 'Ramesh Plumber',
    phone_number: '+919999900031',
    user_city: 'Pune',
    kyc_status: 'pending',
    kyc_document_url: 'https://storage.quotekaro.com/kyc/ramesh_aadhaar_card.pdf',
    categories: ['plumbing', 'electrical'],
    service_area_radius_km: 15,
    base_location_lat: 18.520430,
    base_location_lng: 73.856744,
    is_available: false,
    created_at: '2026-09-16T10:30:00Z',
    rejection_reason: null
  },
  {
    id: 'p-102',
    user_id: 'u-102',
    user_name: 'Suresh Electrician',
    phone_number: '+919999900042',
    user_city: 'Pune',
    kyc_status: 'pending',
    kyc_document_url: 'https://storage.quotekaro.com/kyc/suresh_trade_license.pdf',
    categories: ['electrical'],
    service_area_radius_km: 10,
    base_location_lat: 18.530200,
    base_location_lng: 73.845000,
    is_available: false,
    created_at: '2026-09-16T11:15:00Z',
    rejection_reason: null
  },
  {
    id: 'p-103',
    user_id: 'u-103',
    user_name: 'Mahesh Painter',
    phone_number: '+919999900043',
    user_city: 'Pune',
    kyc_status: 'approved',
    kyc_document_url: 'https://storage.quotekaro.com/kyc/mahesh_pan_verified.pdf',
    categories: ['painting'],
    service_area_radius_km: 20,
    base_location_lat: 18.508900,
    base_location_lng: 73.834000,
    is_available: true,
    created_at: '2026-09-15T14:20:00Z',
    rejection_reason: null
  },
  {
    id: 'p-104',
    user_id: 'u-104',
    user_name: 'Vikram Cleaning Crew',
    phone_number: '+919999900044',
    user_city: 'Mumbai',
    kyc_status: 'rejected',
    kyc_document_url: 'https://storage.quotekaro.com/kyc/vikram_blurry_scan.pdf',
    categories: ['cleaning'],
    service_area_radius_km: 12,
    base_location_lat: 19.076090,
    base_location_lng: 72.877426,
    is_available: false,
    created_at: '2026-09-14T09:00:00Z',
    rejection_reason: 'Document photo was too blurry to verify Aadhaar number.'
  }
];

// Initial demo disputes for local testing and jury review
const INITIAL_DEMO_DISPUTES = [
  {
    id: 'disp-001',
    booking_id: 'b-901',
    raised_by: 'u-105',
    raiser_name: 'Anjali Deshmukh',
    raiser_phone: '+919999900051',
    raiser_role: 'customer',
    booking_status: 'completed',
    booking_scheduled_at: '2026-09-17T14:00:00Z',
    booking_completed_at: '2026-09-17T16:30:00Z',
    price_paise: 180000,
    job_id: 'j-401',
    job_description: 'Kitchen sink mixer tap replacement and main pipe gasket repair',
    job_category: 'plumbing',
    job_area: 'Baner',
    customer_name: 'Anjali Deshmukh',
    customer_phone: '+919999900051',
    customer_city: 'Pune',
    provider_name: 'Ramesh Plumber',
    provider_phone: '+919999900031',
    before_photo_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
    after_photo_url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
    job_photo_urls: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80'],
    reason: 'The mixer tap installed by the provider began leaking from the joint within 2 hours after completion. Water pooled on the kitchen counter and provider is unresponsive to calls.',
    status: 'open',
    resolution_notes: null,
    created_at: '2026-09-17T18:15:00Z',
    updated_at: '2026-09-17T18:15:00Z'
  },
  {
    id: 'disp-002',
    booking_id: 'b-902',
    raised_by: 'u-102',
    raiser_name: 'Suresh Electrician',
    raiser_phone: '+919999900042',
    raiser_role: 'provider',
    booking_status: 'completed',
    booking_scheduled_at: '2026-09-16T11:00:00Z',
    booking_completed_at: '2026-09-16T13:00:00Z',
    price_paise: 120000,
    job_id: 'j-402',
    job_description: 'Living room chandelier wiring and MCB fuse replacement',
    job_category: 'electrical',
    job_area: 'Kothrud',
    customer_name: 'Vikram Mehta',
    customer_phone: '+919999900052',
    customer_city: 'Pune',
    provider_name: 'Suresh Electrician',
    provider_phone: '+919999900042',
    before_photo_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    after_photo_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80',
    job_photo_urls: [],
    reason: 'Customer agreed on-site to pay additional ₹400 for new 16A heavy-duty copper wiring, but paid only initial quote in cash and refused to settle material expenses.',
    status: 'under_review',
    resolution_notes: 'Support contacted customer via phone. Customer acknowledged material purchase and agreed to transfer ₹400 via UPI.',
    created_at: '2026-09-16T15:30:00Z',
    updated_at: '2026-09-16T17:00:00Z'
  },
  {
    id: 'disp-003',
    booking_id: 'b-903',
    raised_by: 'u-106',
    raiser_name: 'Pooja Kulkarni',
    raiser_phone: '+919999900053',
    raiser_role: 'customer',
    booking_status: 'completed',
    booking_scheduled_at: '2026-09-15T09:30:00Z',
    booking_completed_at: '2026-09-15T12:00:00Z',
    price_paise: 350000,
    job_id: 'j-403',
    job_description: 'Balcony waterproofing and primer coat painting',
    job_category: 'painting',
    job_area: 'Viman Nagar',
    customer_name: 'Pooja Kulkarni',
    customer_phone: '+919999900053',
    customer_city: 'Pune',
    provider_name: 'Mahesh Painter',
    provider_phone: '+919999900043',
    before_photo_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80',
    after_photo_url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80',
    job_photo_urls: [],
    reason: 'Primer coat was unevenly applied with visible patches. Customer requested rework.',
    status: 'resolved',
    resolution_notes: 'Provider returned on 2026-09-16 and applied second coat of primer free of charge. Customer inspected and verified completion.',
    created_at: '2026-09-15T14:10:00Z',
    updated_at: '2026-09-16T11:00:00Z'
  }
];

// Initial demo analytics
const INITIAL_DEMO_ANALYTICS = {
  summary: {
    total_bookings: 48,
    completed_bookings: 39,
    in_progress_bookings: 5,
    confirmed_bookings: 3,
    cancelled_bookings: 1,
    gmv_paise: 8750000,
    platform_revenue_paise: 875000,
    active_providers: 18,
    total_providers: 24,
    pending_kyc_providers: 4,
    total_customers: 62
  },
  city_wise: [
    {
      city: 'Pune',
      booking_count: 36,
      gmv_paise: 6420000,
      active_providers: 12
    },
    {
      city: 'Mumbai',
      booking_count: 12,
      gmv_paise: 2330000,
      active_providers: 6
    }
  ],
  category_breakdown: [
    {
      category: 'plumbing',
      job_count: 22,
      booking_count: 18,
      gmv_paise: 3240000
    },
    {
      category: 'electrical',
      job_count: 19,
      booking_count: 15,
      gmv_paise: 2700000
    },
    {
      category: 'painting',
      job_count: 8,
      booking_count: 6,
      gmv_paise: 1810000
    },
    {
      category: 'cleaning',
      job_count: 6,
      booking_count: 5,
      gmv_paise: 1000000
    }
  ],
  disputes_overview: {
    total: 3,
    open: 1,
    under_review: 1,
    resolved: 1
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('kyc'); // 'kyc' | 'disputes' | 'analytics' | 'pricing'
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', message: 'Checking backend...' });
  const [providers, setProviders] = useState(INITIAL_DEMO_PROVIDERS);
  const [disputes, setDisputes] = useState(INITIAL_DEMO_DISPUTES);
  const [analytics, setAnalytics] = useState(INITIAL_DEMO_ANALYTICS);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Rejection Modal State
  const [rejectModalProvider, setRejectModalProvider] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Document Preview Modal State
  const [previewDocUrl, setPreviewDocUrl] = useState(null);

  // Admin JWT Token (can be adjusted by user in dev mode)
  const [adminToken, setAdminToken] = useState('mock_admin_token');

  // Check Backend Health and fetch live data
  useEffect(() => {
    fetch(`${API_ROOT_URL}/health`)
      .then((res) => res.json())
      .then((data) => {
        setBackendHealth({ status: 'online', message: `${data.service} is online (${data.status})` });
        fetchLiveProviders();
        fetchLiveDisputes();
        fetchLiveAnalytics();
      })
      .catch(() => {
        setBackendHealth({ status: 'offline', message: 'Backend offline — Using local state & demo data' });
      });
  }, []);

  // Fetch providers from live backend if online
  const fetchLiveProviders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/providers`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.providers && data.providers.length > 0) {
          setProviders(data.providers);
        }
      }
    } catch (err) {
      console.log('Live fetch failed, continuing with current state', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch disputes from live backend if online
  const fetchLiveDisputes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/disputes`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.disputes && data.disputes.length > 0) {
          setDisputes(data.disputes);
        }
      }
    } catch (err) {
      console.log('Live disputes fetch failed, continuing with current state', err);
    }
  };

  // Fetch analytics from live backend if online
  const fetchLiveAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/admin/analytics`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setAnalytics(data);
          showToast('Live platform analytics updated.', 'info');
        }
      }
    } catch (err) {
      console.log('Live analytics fetch failed, continuing with current state', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle KYC Approval
  const handleApprove = async (provider) => {
    setLoading(true);
    try {
      // Try live API if online
      if (backendHealth.status === 'online') {
        const res = await fetch(`${API_BASE_URL}/admin/providers/${provider.id}/kyc`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ kyc_status: 'approved' })
        });
        if (res.ok) {
          const data = await res.json();
          setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, ...data.provider_profile, kyc_status: 'approved' } : p));
          showToast(`Provider ${provider.user_name} approved successfully!`, 'success');
          return;
        }
      }

      // Local state update (test/demo mode)
      setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, kyc_status: 'approved', rejection_reason: null } : p));
      showToast(`Provider ${provider.user_name} approved! They can now activate availability.`, 'success');
    } catch (err) {
      showToast(`Approval failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle KYC Rejection Confirmation
  const confirmRejection = async () => {
    if (!rejectModalProvider) return;
    const reason = rejectionReason.trim() || 'Document does not meet platform verification standards.';

    setLoading(true);
    try {
      if (backendHealth.status === 'online') {
        const res = await fetch(`${API_BASE_URL}/admin/providers/${rejectModalProvider.id}/kyc`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ kyc_status: 'rejected', rejection_reason: reason })
        });
        if (res.ok) {
          const data = await res.json();
          setProviders(prev => prev.map(p => p.id === rejectModalProvider.id ? { ...p, ...data.provider_profile, kyc_status: 'rejected', is_available: false } : p));
          showToast(`Provider ${rejectModalProvider.user_name} rejected. Availability blocked.`, 'warning');
          setRejectModalProvider(null);
          setRejectionReason('');
          return;
        }
      }

      // Local state update
      setProviders(prev => prev.map(p => p.id === rejectModalProvider.id ? { ...p, kyc_status: 'rejected', is_available: false, rejection_reason: reason } : p));
      showToast(`Provider ${rejectModalProvider.user_name} rejected. Availability blocked.`, 'warning');
      setRejectModalProvider(null);
      setRejectionReason('');
    } catch (err) {
      showToast(`Rejection failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setActionMessage({ text: msg, type });
    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  // Filtered providers
  const filteredProviders = providers.filter(p => {
    const matchesStatus = filterStatus === 'all' ? true : p.kyc_status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      (p.user_name && p.user_name.toLowerCase().includes(q)) ||
      (p.phone_number && p.phone_number.includes(q)) ||
      (p.user_city && p.user_city.toLowerCase().includes(q)) ||
      (p.categories && p.categories.some(c => c.toLowerCase().includes(q)));
    return matchesStatus && matchesSearch;
  });

  // Metrics
  const pendingCount = providers.filter(p => p.kyc_status === 'pending').length;
  const approvedCount = providers.filter(p => p.kyc_status === 'approved').length;
  const rejectedCount = providers.filter(p => p.kyc_status === 'rejected').length;
  const openDisputesCount = disputes.filter(d => d.status === 'open').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header style={{
        backgroundColor: 'var(--primary)',
        color: '#FFFFFF',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '20px',
            color: '#FFFFFF'
          }}>Q</div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>QuoteKaro Operations Hub</h1>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Platform Administrator Portal</span>
          </div>
        </div>

        {/* System Health / Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-btn)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: backendHealth.status === 'online' ? '#4ADE80' : 'var(--warning)'
            }}></span>
            <span>{backendHealth.message}</span>
          </div>

          <div style={{
            fontSize: '12px',
            backgroundColor: 'var(--accent)',
            color: '#FFFFFF',
            padding: '6px 12px',
            borderRadius: 'var(--radius-btn)',
            fontWeight: 600
          }}>
            Admin: Verified
          </div>
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 32px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '8px' }}>
          {[
            { id: 'kyc', label: '1. Provider KYC Queue', badge: pendingCount, active: true },
            { id: 'disputes', label: '2. Disputes', badge: openDisputesCount, badgeColor: 'var(--danger)' },
            { id: 'analytics', label: '3. Platform Analytics', badge: null, tag: 'City-Wise' },
            { id: 'pricing', label: '4. Category Bounds', badge: null, tag: 'Config' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'disputes') fetchLiveDisputes();
                if (tab.id === 'analytics') fetchLiveAnalytics();
              }}
              style={{
                padding: '14px 18px',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 600 : 500,
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{tab.label}</span>
              {tab.badge !== null && tab.badge > 0 && (
                <span style={{
                  backgroundColor: tab.badgeColor || 'var(--warning)',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)'
                }}>
                  {tab.badge}
                </span>
              )}
              {tab.tag && (
                <span style={{
                  backgroundColor: '#F1F5F9',
                  color: 'var(--text-muted)',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {tab.tag}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1 }}>
        {/* Toast / Notification Banner */}
        {actionMessage && (
          <div style={{
            padding: '12px 20px',
            borderRadius: 'var(--radius-btn)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: actionMessage.type === 'success' ? '#DEF7EC' : (actionMessage.type === 'warning' ? '#FEF08A' : '#FDE8E8'),
            color: actionMessage.type === 'success' ? '#03543F' : (actionMessage.type === 'warning' ? '#854D0E' : '#9B1C1C'),
            border: `1px solid ${actionMessage.type === 'success' ? '#31C48D' : (actionMessage.type === 'warning' ? '#FACC15' : '#F98080')}`,
            fontWeight: 500,
            fontSize: '14px',
            animation: 'fadeIn 0.2s ease-in'
          }}>
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              style={{ background: 'none', color: 'inherit', fontWeight: 'bold', fontSize: '16px' }}
            >×</button>
          </div>
        )}

        {activeTab === 'kyc' ? (
          <div>
            {/* Header & Description */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '20px'
            }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                  Provider KYC Verification Queue
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  Review government IDs, address proofs, and approve provider profiles to unlock job matching.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={fetchLiveProviders}
                  disabled={loading}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-btn)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🔄 {loading ? 'Refreshing...' : 'Refresh List'}
                </button>
              </div>
            </div>

            {/* Metrics Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-card)',
                padding: '16px 20px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Providers
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                  {providers.length}
                </div>
              </div>

              <div style={{
                backgroundColor: '#FEF9C3',
                borderRadius: 'var(--radius-card)',
                padding: '16px 20px',
                border: '1px solid #FACC15'
              }}>
                <div style={{ fontSize: '12px', color: '#854D0E', fontWeight: 600, textTransform: 'uppercase' }}>
                  Pending Verification
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#A16207', marginTop: '4px' }}>
                  {pendingCount}
                </div>
              </div>

              <div style={{
                backgroundColor: '#DCFCE7',
                borderRadius: 'var(--radius-card)',
                padding: '16px 20px',
                border: '1px solid #86EFAC'
              }}>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>
                  Approved & Verified
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#15803D', marginTop: '4px' }}>
                  {approvedCount}
                </div>
              </div>

              <div style={{
                backgroundColor: '#FEE2E2',
                borderRadius: 'var(--radius-card)',
                padding: '16px 20px',
                border: '1px solid #FCA5A5'
              }}>
                <div style={{ fontSize: '12px', color: '#991B1B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Rejected / Unverified
                </div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: '#B91C1C', marginTop: '4px' }}>
                  {rejectedCount}
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-card)',
              padding: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              marginBottom: '20px'
            }}>
              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'all', label: `All (${providers.length})` },
                  { id: 'pending', label: `Pending Review (${pendingCount})` },
                  { id: 'approved', label: `Approved (${approvedCount})` },
                  { id: 'rejected', label: `Rejected (${rejectedCount})` }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setFilterStatus(item.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-btn)',
                      fontSize: '13px',
                      fontWeight: filterStatus === item.id ? 600 : 500,
                      backgroundColor: filterStatus === item.id ? 'var(--primary)' : '#F1F5F9',
                      color: filterStatus === item.id ? '#FFFFFF' : 'var(--text-main)',
                      border: 'none'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div style={{ minWidth: '280px', flex: 1, maxWidth: '400px' }}>
                <input
                  type="text"
                  placeholder="Search by name, phone, city, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-btn)',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Provider Verification Cards List */}
            {filteredProviders.length === 0 ? (
              <div style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-card)',
                padding: '48px 24px',
                textAlign: 'center',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '6px' }}>
                  No providers found
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  No provider profiles currently match your filter criteria ({filterStatus}).
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredProviders.map(p => (
                  <div
                    key={p.id}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-card)',
                      border: '1px solid var(--border-color)',
                      padding: '20px 24px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '20px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Provider Info */}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', minWidth: '320px', flex: 2 }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: 'var(--primary)'
                      }}>
                        {p.user_name ? p.user_name.charAt(0) : 'P'}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                            {p.user_name || 'Unnamed Provider'}
                          </h3>
                          
                          {/* Status Badge */}
                          {p.kyc_status === 'approved' && (
                            <span style={{
                              backgroundColor: 'rgba(84, 130, 53, 0.15)',
                              color: 'var(--accent)',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              ✓ APPROVED
                            </span>
                          )}

                          {p.kyc_status === 'pending' && (
                            <span style={{
                              backgroundColor: 'rgba(191, 143, 0, 0.15)',
                              color: '#A16207',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              ⏳ PENDING REVIEW
                            </span>
                          )}

                          {p.kyc_status === 'rejected' && (
                            <span style={{
                              backgroundColor: 'rgba(220, 38, 38, 0.15)',
                              color: 'var(--danger)',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              ✕ REJECTED
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          📞 {p.phone_number} • 📍 {p.user_city || 'Pune'} • 🌐 Radius: {p.service_area_radius_km || 15} km
                        </div>

                        {/* Category Badges */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {p.categories && p.categories.map((c, i) => (
                            <span key={i} style={{
                              backgroundColor: '#F1F5F9',
                              color: 'var(--primary)',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              textTransform: 'capitalize'
                            }}>
                              {c}
                            </span>
                          ))}
                        </div>

                        {/* Rejection Reason notice if present */}
                        {p.kyc_status === 'rejected' && p.rejection_reason && (
                          <div style={{
                            marginTop: '8px',
                            fontSize: '12px',
                            color: 'var(--danger)',
                            backgroundColor: '#FEE2E2',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>
                            Reason: {p.rejection_reason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Availability Gate Status & Document Preview */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Availability Gate (Test Case 4):
                      </div>
                      <div style={{
                        display: 'inline-block',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-btn)',
                        backgroundColor: p.is_available ? '#DCFCE7' : '#F1F5F9',
                        color: p.is_available ? '#15803D' : '#64748B'
                      }}>
                        {p.is_available ? '● Active / Ready for Jobs' : '○ Offline (Requires KYC)'}
                      </div>

                      {p.kyc_document_url && (
                        <div style={{ marginTop: '10px' }}>
                          <button
                            onClick={() => setPreviewDocUrl(p.kyc_document_url)}
                            style={{
                              backgroundColor: 'transparent',
                              color: 'var(--primary-light)',
                              textDecoration: 'underline',
                              fontSize: '12px',
                              fontWeight: 500,
                              padding: 0
                            }}
                          >
                            📄 View KYC Document
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {p.kyc_status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(p)}
                          disabled={loading}
                          style={{
                            backgroundColor: 'var(--accent)',
                            color: '#FFFFFF',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-btn)',
                            fontSize: '13px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          ✓ Approve KYC
                        </button>
                      )}

                      {p.kyc_status !== 'rejected' && (
                        <button
                          onClick={() => {
                            setRejectModalProvider(p);
                            setRejectionReason('');
                          }}
                          disabled={loading}
                          style={{
                            backgroundColor: '#FFFFFF',
                            color: 'var(--danger)',
                            border: '1px solid var(--danger)',
                            padding: '8px 14px',
                            borderRadius: 'var(--radius-btn)',
                            fontSize: '13px',
                            fontWeight: 600
                          }}
                        >
                          ✕ Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'disputes' ? (
          <DisputesView
            disputes={disputes}
            setDisputes={setDisputes}
            backendHealth={backendHealth}
            adminToken={adminToken}
            showToast={showToast}
            loading={loading}
            setLoading={setLoading}
          />
        ) : activeTab === 'analytics' ? (
          <AnalyticsView
            analytics={analytics}
            onRefresh={fetchLiveAnalytics}
            loading={loading}
            backendHealth={backendHealth}
          />
        ) : (
          <CategoryBoundsView
            backendHealth={backendHealth}
            adminToken={adminToken}
            showToast={showToast}
            loading={loading}
            setLoading={setLoading}
          />
        )}
      </main>

      {/* Rejection Modal Dialog */}
      {rejectModalProvider && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-card)',
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--danger)', marginBottom: '8px' }}>
              Reject Provider KYC
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Rejecting <strong>{rejectModalProvider.user_name}</strong> will prevent them from activating their availability or bidding on customer jobs.
            </p>

            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
              Rejection Reason (visible to provider):
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Identity proof scan is blurry; Name does not match certificate..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                marginBottom: '12px',
                outline: 'none',
                resize: 'vertical'
              }}
            />

            {/* Preset reasons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {[
                'Document photo unreadable/blurred',
                'ID name mismatch',
                'Expired trade license',
                'Missing address proof'
              ].map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  + {reason}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setRejectModalProvider(null);
                  setRejectionReason('');
                }}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-muted)'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRejection}
                disabled={loading}
                style={{
                  backgroundColor: 'var(--danger)',
                  color: '#FFFFFF',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDocUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-card)',
            maxWidth: '540px',
            width: '100%',
            padding: '24px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--primary)', margin: 0 }}>
                KYC Document Verification
              </h3>
              <button
                onClick={() => setPreviewDocUrl(null)}
                style={{ background: 'none', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-muted)' }}
              >×</button>
            </div>

            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 'var(--radius-btn)',
              padding: '20px',
              border: '1px dashed var(--border-color)',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>📄</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Secure Document File
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                {previewDocUrl}
              </div>
            </div>

            <div style={{
              backgroundColor: '#FEF9C3',
              borderRadius: 'var(--radius-btn)',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#854D0E',
              marginBottom: '16px'
            }}>
              🔒 <strong>Security Policy (07_SECURITY.md §2):</strong> KYC documents are stored in private cloud storage. In production, this link resolves to a short-lived signed URL.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <a
                href={previewDocUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: '#FFFFFF',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Open External Link
              </a>
              <button
                onClick={() => setPreviewDocUrl(null)}
                style={{
                  backgroundColor: '#F1F5F9',
                  color: 'var(--text-main)',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-btn)',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '16px',
        color: 'var(--text-muted)',
        fontSize: '12px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-surface)'
      }}>
        QuoteKaro Platform Operations • MIT ADT University • PBL 2026
      </footer>
    </div>
  );
}

export default App;
