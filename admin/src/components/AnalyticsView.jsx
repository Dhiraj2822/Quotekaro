import React from 'react';

export default function AnalyticsView({
  analytics,
  onRefresh,
  loading,
  backendHealth
}) {
  const summary = analytics?.summary || {
    total_bookings: 0,
    completed_bookings: 0,
    in_progress_bookings: 0,
    confirmed_bookings: 0,
    cancelled_bookings: 0,
    gmv_paise: 0,
    platform_revenue_paise: 0,
    active_providers: 0,
    total_providers: 0,
    pending_kyc_providers: 0,
    total_customers: 0
  };

  const cityWise = analytics?.city_wise || [];
  const categoryBreakdown = analytics?.category_breakdown || [];
  const disputesOverview = analytics?.disputes_overview || { total: 0, open: 0, under_review: 0, resolved: 0 };

  const gmvRupees = Math.round((summary.gmv_paise || 0) / 100);
  const revenueRupees = Math.round((summary.platform_revenue_paise || 0) / 100);

  // Calculate highest booking count for relative progress bar scaling
  const maxCityBookings = Math.max(...cityWise.map(c => c.booking_count), 1);
  const maxCategoryGMV = Math.max(...categoryBreakdown.map(c => c.gmv_paise), 1);

  return (
    <div>
      {/* Header & Refresh */}
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
            Platform Operations & City-Wise Analytics
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Aggregated Gross Merchandise Value (GMV), 10% universal commission ledger, active provider distribution, and city-level demand.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            backgroundColor: '#FFFFFF',
            color: 'var(--primary)',
            border: '1px solid var(--border-color)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-btn)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>🔄</span>
          <span>{loading ? 'Refreshing...' : 'Refresh Live Analytics'}</span>
        </button>
      </div>

      {/* Primary KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* GMV */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          padding: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
            Gross Merchandise Value (GMV)
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--primary)', marginTop: '8px', letterSpacing: '-0.5px' }}>
            ₹{gmvRupees.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px', fontWeight: 600 }}>
            {summary.completed_bookings} Completed Bookings
          </div>
        </div>

        {/* Universal 10% Platform Commission */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          padding: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
            Platform Revenue (10%)
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent)', marginTop: '8px', letterSpacing: '-0.5px' }}>
            ₹{revenueRupees.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Auto-deducted via Wallet Ledger
          </div>
        </div>

        {/* Total Bookings */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          padding: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
            Total Bookings
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px', letterSpacing: '-0.5px' }}>
            {summary.total_bookings}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {summary.in_progress_bookings} in progress • {summary.confirmed_bookings} confirmed
          </div>
        </div>

        {/* Active Providers */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          padding: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
            Active Providers
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563EB', marginTop: '8px', letterSpacing: '-0.5px' }}>
            {summary.active_providers}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            of {summary.total_providers} verified providers ({summary.pending_kyc_providers} KYC pending)
          </div>
        </div>

        {/* Customers */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          padding: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
            Customer Base
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px', letterSpacing: '-0.5px' }}>
            {summary.total_customers}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Hyperlocal marketplace accounts
          </div>
        </div>
      </div>

      {/* City-Wise Booking Analytics Section (Definition of Done) */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-card)',
        padding: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '28px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📍</span>
              <span>City-Wise Booking Analytics</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Geographic performance distribution across operating cities (Module 8 Definition of Done).
            </p>
          </div>

          <span style={{
            fontSize: '11px',
            backgroundColor: 'var(--primary-light)',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            fontWeight: 600
          }}>
            {cityWise.length} Operating Cities
          </span>
        </div>

        {/* City Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>City</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Bookings</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Booking Share</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Completed GMV</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Platform Cut (10%)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Active Providers</th>
              </tr>
            </thead>
            <tbody>
              {cityWise.map(c => {
                const cityGMV = Math.round((c.gmv_paise || 0) / 100);
                const cityCut = Math.round(cityGMV * 0.10);
                const sharePercent = summary.total_bookings > 0
                  ? Math.round((c.booking_count / summary.total_bookings) * 100)
                  : 0;

                return (
                  <tr key={c.city} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                      {c.city}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      {c.booking_count}
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: '150px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          flex: 1,
                          height: '6px',
                          backgroundColor: '#E2E8F0',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${(c.booking_count / maxCityBookings) * 100}%`,
                            height: '100%',
                            backgroundColor: 'var(--primary)',
                            borderRadius: '3px'
                          }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, minWidth: '32px' }}>
                          {sharePercent}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{cityGMV.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--accent)' }}>
                      ₹{cityCut.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '12px',
                        fontWeight: 700
                      }}>
                        {c.active_providers} Online
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two-Column Grid: Category Breakdown & Disputes Health */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {/* Category Breakdown Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          padding: '24px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🛠️</span>
            <span>Category Performance</span>
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Demand, booking volume, and GMV breakdown across service categories.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {categoryBreakdown.map(cat => {
              const catGMV = Math.round((cat.gmv_paise || 0) / 100);
              const gmvWidthPercent = maxCategoryGMV > 0
                ? Math.round((cat.gmv_paise / maxCategoryGMV) * 100)
                : 0;

              return (
                <div key={cat.category} style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '13px' }}>
                      {cat.category}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
                      ₹{catGMV.toLocaleString()}
                    </span>
                  </div>

                  <div style={{
                    height: '5px',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '6px'
                  }}>
                    <div style={{
                      width: `${gmvWidthPercent}%`,
                      height: '100%',
                      backgroundColor: 'var(--accent)',
                      borderRadius: '3px'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{cat.job_count} Jobs Posted</span>
                    <span>{cat.booking_count} Bookings Completed</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Disputes & Platform Health Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          padding: '24px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚖️</span>
              <span>Dispute & Trust Metrics</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Platform dispute resolution rate and operational integrity indicators.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <div style={{ backgroundColor: '#FEF2F2', padding: '12px 8px', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--danger)' }}>
                  {disputesOverview.open}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#991B1B', marginTop: '2px' }}>
                  Open
                </div>
              </div>

              <div style={{ backgroundColor: '#EFF6FF', padding: '12px 8px', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563EB' }}>
                  {disputesOverview.under_review}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#1E40AF', marginTop: '2px' }}>
                  Under Review
                </div>
              </div>

              <div style={{ backgroundColor: '#F0FDF4', padding: '12px 8px', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>
                  {disputesOverview.resolved}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#166534', marginTop: '2px' }}>
                  Resolved
                </div>
              </div>
            </div>

            {/* Health Meter */}
            <div style={{
              backgroundColor: '#F8FAFC',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Resolution Ratio
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                  {disputesOverview.total > 0
                    ? `${Math.round((disputesOverview.resolved / disputesOverview.total) * 100)}%`
                    : '100%'}
                </span>
              </div>
              <div style={{
                height: '6px',
                backgroundColor: '#E2E8F0',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: disputesOverview.total > 0
                    ? `${(disputesOverview.resolved / disputesOverview.total) * 100}%`
                    : '100%',
                  height: '100%',
                  backgroundColor: 'var(--accent)'
                }} />
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '20px',
            paddingTop: '12px',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}>
            <span>Backend Status: {backendHealth.status === 'online' ? '🟢 Connected' : '🟡 Demo Mode'}</span>
            <span>Data updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
