import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

export default function DisputesView({
  disputes,
  setDisputes,
  backendHealth,
  adminToken,
  showToast,
  loading,
  setLoading
}) {
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'open' | 'under_review' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingDispute, setResolvingDispute] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Filtered disputes
  const filteredDisputes = disputes.filter(d => {
    const matchesStatus = filterStatus === 'all' ? true : d.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesStatus;

    const matchesSearch =
      (d.id && d.id.toLowerCase().includes(q)) ||
      (d.booking_id && d.booking_id.toLowerCase().includes(q)) ||
      (d.raiser_name && d.raiser_name.toLowerCase().includes(q)) ||
      (d.customer_name && d.customer_name.toLowerCase().includes(q)) ||
      (d.provider_name && d.provider_name.toLowerCase().includes(q)) ||
      (d.job_category && d.job_category.toLowerCase().includes(q)) ||
      (d.reason && d.reason.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const openCount = disputes.filter(d => d.status === 'open').length;
  const reviewCount = disputes.filter(d => d.status === 'under_review').length;
  const resolvedCount = disputes.filter(d => d.status === 'resolved').length;

  // Handle Mark Under Review
  const handleMarkUnderReview = async (dispute) => {
    setLoading(true);
    try {
      if (backendHealth.status === 'online') {
        const res = await fetch(`${API_BASE_URL}/admin/disputes/${dispute.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            status: 'under_review',
            resolution_notes: dispute.resolution_notes || 'Case moved to under_review by Admin. Reviewing proof of work photos and contacting parties.'
          })
        });

        if (res.ok) {
          const data = await res.json();
          setDisputes(prev => prev.map(item => item.id === dispute.id ? { ...item, ...data.dispute, status: 'under_review' } : item));
          showToast(`Dispute #${dispute.id.slice(-6)} moved to Under Review.`, 'info');
          return;
        }
      }

      // Local state fallback
      setDisputes(prev => prev.map(item => item.id === dispute.id ? {
        ...item,
        status: 'under_review',
        resolution_notes: item.resolution_notes || 'Case moved to under_review by Admin. Reviewing evidence.'
      } : item));
      showToast(`Dispute #${dispute.id.slice(-6)} moved to Under Review.`, 'info');
    } catch (err) {
      showToast(`Action failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Confirm Resolution
  const handleConfirmResolution = async () => {
    if (!resolvingDispute) return;
    const notes = resolutionNotes.trim() || 'Dispute resolved following admin mediation and verification.';

    setLoading(true);
    try {
      if (backendHealth.status === 'online') {
        const res = await fetch(`${API_BASE_URL}/admin/disputes/${resolvingDispute.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            status: 'resolved',
            resolution_notes: notes
          })
        });

        if (res.ok) {
          const data = await res.json();
          setDisputes(prev => prev.map(item => item.id === resolvingDispute.id ? {
            ...item,
            ...data.dispute,
            status: 'resolved',
            resolution_notes: notes
          } : item));
          showToast(`Dispute #${resolvingDispute.id.slice(-6)} resolved successfully!`, 'success');
          setResolvingDispute(null);
          setResolutionNotes('');
          return;
        }
      }

      // Local state fallback
      setDisputes(prev => prev.map(item => item.id === resolvingDispute.id ? {
        ...item,
        status: 'resolved',
        resolution_notes: notes,
        updated_at: new Date().toISOString()
      } : item));
      showToast(`Dispute #${resolvingDispute.id.slice(-6)} marked as Resolved.`, 'success');
      setResolvingDispute(null);
      setResolutionNotes('');
    } catch (err) {
      showToast(`Resolution failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add a quick test dispute to demonstrate workflow
  const handleCreateTestDispute = () => {
    const newId = `disp-${Date.now().toString().slice(-4)}`;
    const testDispute = {
      id: newId,
      booking_id: `b-test-${Math.floor(100 + Math.random() * 900)}`,
      raised_by: 'u-demo-test',
      raiser_name: 'Rahul Sharma',
      raiser_phone: '+919988776655',
      raiser_role: 'customer',
      booking_status: 'completed',
      booking_scheduled_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      booking_completed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      price_paise: 140000,
      job_id: 'j-test-99',
      job_description: 'Electrical switchboard repair and power socket installation',
      job_category: 'electrical',
      job_area: 'Kothrud',
      customer_name: 'Rahul Sharma',
      customer_phone: '+919988776655',
      customer_city: 'Pune',
      provider_name: 'Suresh Electrician',
      provider_phone: '+919999900042',
      before_photo_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
      after_photo_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80',
      job_photo_urls: [],
      reason: 'Work was incomplete: switchboard faceplate is loose and sparks when heavy appliances are plugged in. Requesting immediate provider inspection.',
      status: 'open',
      resolution_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setDisputes(prev => [testDispute, ...prev]);
    showToast(`Test dispute #${newId} created! You can now review and resolve it.`, 'success');
  };

  return (
    <div>
      {/* Header & Controls */}
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
            Dispute Arbitration Center
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Review customer and provider dispute submissions, audit before/after proof of work, and record mediation resolutions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleCreateTestDispute}
            style={{
              backgroundColor: '#FFFFFF',
              color: 'var(--primary)',
              border: '1px solid var(--border-color)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-btn)',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>+ Create Test Dispute</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 20px',
        border: '1px solid var(--border-color)',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Disputes', count: disputes.length },
            { id: 'open', label: 'Open', count: openCount, badgeColor: 'var(--danger)' },
            { id: 'under_review', label: 'Under Review', count: reviewCount, badgeColor: '#3B82F6' },
            { id: 'resolved', label: 'Resolved', count: resolvedCount, badgeColor: 'var(--accent)' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '13px',
                fontWeight: filterStatus === f.id ? 600 : 500,
                backgroundColor: filterStatus === f.id ? 'var(--primary)' : '#F1F5F9',
                color: filterStatus === f.id ? '#FFFFFF' : 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{f.label}</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: filterStatus === f.id ? 'rgba(255,255,255,0.25)' : (f.badgeColor || '#E2E8F0'),
                color: filterStatus === f.id ? '#FFFFFF' : (f.badgeColor ? '#FFFFFF' : 'var(--text-muted)'),
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '280px' }}>
          <input
            type="text"
            placeholder="Search by ID, name, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: 'var(--radius-btn)',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              backgroundColor: '#F8FAFC'
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '9px', fontSize: '13px', color: 'var(--text-muted)' }}>
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '7px',
                background: 'transparent',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Disputes List */}
      {filteredDisputes.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-card)',
          padding: '48px 24px',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚖️</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
            No disputes match your filter
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Try adjusting your search query or selecting a different dispute status filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredDisputes.map(dispute => {
            const isCustomer = dispute.raiser_role === 'customer';
            const priceInRupees = dispute.price_paise ? Math.round(dispute.price_paise / 100) : null;

            return (
              <div
                key={dispute.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Header Row: ID, status, date */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  borderBottom: '1px solid #F1F5F9',
                  paddingBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '14px',
                      color: 'var(--primary)',
                      fontFamily: 'monospace'
                    }}>
                      Dispute #{dispute.id.slice(-8)}
                    </span>

                    {/* Status Pill */}
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      backgroundColor:
                        dispute.status === 'open'
                          ? 'var(--danger-light)'
                          : dispute.status === 'under_review'
                          ? 'rgba(59, 130, 246, 0.12)'
                          : 'var(--accent-light)',
                      color:
                        dispute.status === 'open'
                          ? 'var(--danger)'
                          : dispute.status === 'under_review'
                          ? '#2563EB'
                          : 'var(--accent)'
                    }}>
                      {dispute.status === 'under_review' ? 'Under Review' : dispute.status}
                    </span>

                    {/* Booking Reference */}
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Booking: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>#{dispute.booking_id.slice(-6)}</strong>
                    </span>
                  </div>

                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Raised: {new Date(dispute.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Raiser & Parties Context */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '14px',
                  backgroundColor: '#F8FAFC',
                  padding: '14px 16px',
                  borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                      Complainant (Raised By)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        backgroundColor: isCustomer ? '#E0E7FF' : '#FEF3C7',
                        color: isCustomer ? '#4338CA' : '#92400E',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {isCustomer ? 'Customer' : 'Provider'}
                      </span>
                      <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                        {dispute.raiser_name || 'Anonymous'}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        ({dispute.raiser_phone || 'N/A'})
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
                      Job & Provider Context
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                      <strong>{dispute.provider_name || 'Assigned Provider'}</strong>
                      {dispute.provider_phone && ` (${dispute.provider_phone})`}
                      <span style={{ margin: '0 6px', color: 'var(--border-color)' }}>|</span>
                      <span style={{
                        textTransform: 'capitalize',
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        {dispute.job_category || 'Service'}
                      </span>
                      {priceInRupees && ` • ₹${priceInRupees.toLocaleString()}`}
                    </div>
                  </div>
                </div>

                {/* Dispute Reason Box */}
                <div style={{
                  borderLeft: '4px solid var(--danger)',
                  backgroundColor: '#FEF2F2',
                  padding: '12px 16px',
                  borderRadius: '0 8px 8px 0'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⚠️</span> Reason for Dispute:
                  </div>
                  <p style={{ fontSize: '13px', color: '#7F1D1D', lineHeight: 1.5, margin: 0 }}>
                    "{dispute.reason}"
                  </p>
                </div>

                {/* Proof of Work Photo Evidence */}
                {(dispute.before_photo_url || dispute.after_photo_url || (dispute.job_photo_urls && dispute.job_photo_urls.length > 0)) && (
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>
                      Photo Evidence & Proof of Work
                    </div>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                      {dispute.before_photo_url && (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={dispute.before_photo_url}
                            alt="Before photo"
                            onClick={() => setPreviewPhoto({ url: dispute.before_photo_url, label: 'Before Work Photo' })}
                            style={{
                              width: '110px',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              cursor: 'pointer'
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '4px',
                            left: '4px',
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px'
                          }}>
                            Before Work
                          </span>
                        </div>
                      )}

                      {dispute.after_photo_url && (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={dispute.after_photo_url}
                            alt="After photo"
                            onClick={() => setPreviewPhoto({ url: dispute.after_photo_url, label: 'After Work Photo' })}
                            style={{
                              width: '110px',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              cursor: 'pointer'
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '4px',
                            left: '4px',
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px'
                          }}>
                            After Work
                          </span>
                        </div>
                      )}

                      {dispute.job_photo_urls && dispute.job_photo_urls.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative' }}>
                          <img
                            src={url}
                            alt={`Job photo ${idx + 1}`}
                            onClick={() => setPreviewPhoto({ url, label: `Customer Job Photo #${idx + 1}` })}
                            style={{
                              width: '110px',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              cursor: 'pointer'
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '4px',
                            left: '4px',
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px'
                          }}>
                            Job Photo
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing Resolution Notes (If Resolved or in review) */}
                {dispute.resolution_notes && (
                  <div style={{
                    backgroundColor: dispute.status === 'resolved' ? 'var(--accent-light)' : '#F1F5F9',
                    borderLeft: `4px solid ${dispute.status === 'resolved' ? 'var(--accent)' : '#3B82F6'}`,
                    padding: '12px 16px',
                    borderRadius: '0 8px 8px 0'
                  }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: dispute.status === 'resolved' ? 'var(--accent)' : '#1E40AF',
                      textTransform: 'uppercase',
                      marginBottom: '4px'
                    }}>
                      Resolution & Mediation Notes:
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>
                      {dispute.resolution_notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid #F1F5F9'
                }}>
                  {dispute.status === 'open' && (
                    <button
                      onClick={() => handleMarkUnderReview(dispute)}
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-btn)',
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #BFDBFE'
                      }}
                    >
                      Investigate (Mark Under Review)
                    </button>
                  )}

                  {dispute.status !== 'resolved' ? (
                    <button
                      onClick={() => {
                        setResolvingDispute(dispute);
                        setResolutionNotes(dispute.resolution_notes || '');
                      }}
                      disabled={loading}
                      style={{
                        padding: '8px 18px',
                        borderRadius: 'var(--radius-btn)',
                        fontSize: '13px',
                        fontWeight: 600,
                        backgroundColor: 'var(--accent)',
                        color: '#FFFFFF'
                      }}
                    >
                      Resolve Dispute ✓
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>✓</span> Case Closed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Modal */}
      {resolvingDispute && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-card)',
            padding: '24px 28px',
            maxWidth: '540px',
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px' }}>
              Resolve Dispute #{resolvingDispute.id.slice(-8)}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Record the arbitration decision and agreed settlement terms. This will mark the dispute as <strong>Resolved</strong>.
            </p>

            {/* Quick Templates */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Quick Settlement Presets:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  'Provider completed complimentary rework to customer satisfaction.',
                  'Customer agreed to settle additional agreed material costs via UPI.',
                  'Mutual agreement reached. Job accepted as complete with no further dues.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setResolutionNotes(preset)}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#F1F5F9',
                      color: 'var(--primary)',
                      textAlign: 'left'
                    }}
                  >
                    Preset {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Resolution Notes <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Detail the outcome of mediation, refund status, or agreed rework schedule..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-btn)',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setResolvingDispute(null);
                  setResolutionNotes('');
                }}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-btn)',
                  backgroundColor: '#F1F5F9',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmResolution}
                disabled={loading || !resolutionNotes.trim()}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-btn)',
                  backgroundColor: resolutionNotes.trim() ? 'var(--accent)' : '#CBD5E1',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                {loading ? 'Submitting...' : 'Confirm Resolution ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#000000',
              borderRadius: '12px',
              padding: '12px',
              maxWidth: '700px',
              width: '100%',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#FFFFFF', marginBottom: '8px', padding: '0 8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{previewPhoto.label}</span>
              <button onClick={() => setPreviewPhoto(null)} style={{ color: '#FFFFFF', background: 'transparent', fontSize: '14px' }}>✕</button>
            </div>
            <img
              src={previewPhoto.url}
              alt={previewPhoto.label}
              style={{
                width: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
