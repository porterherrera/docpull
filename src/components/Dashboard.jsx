import { useState, useRef, useCallback, useEffect } from 'react';
import {
  FileText, Upload, Download, Home, File, Settings,
  LogOut, Eye, Trash2, Check, RefreshCw, X,
  Clock, BarChart3, DollarSign, AlertCircle, Lock, CreditCard,
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { exportToExcel, exportToCSV, exportAllToExcel } from '../export.js';
import './Dashboard.css';

const PLAN_LIMITS = { demo: 1, pro: 100, business: 500 };

export default function Dashboard({ user, profile, onProfileUpdate, onLogout, onGoLanding }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [view, setView] = useState('dashboard');
  const [dragActive, setDragActive] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const fileInputRef = useRef(null);

  const plan = profile?.plan || 'demo';
  const docsUsed = plan === 'demo'
    ? (profile?.demo_remaining === 0 ? 1 : 0)
    : (profile?.docs_used_this_month || 0);
  const docsLimit = PLAN_LIMITS[plan] || 1;
  const canExtract = docsUsed < docsLimit;

  // Load documents from Supabase on mount
  useEffect(() => {
    if (!user?.id) return;
    loadDocuments();
  }, [user?.id]);

  async function loadDocuments() {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setDocuments(data.map(mapDoc));
    }
  }

  function mapDoc(d) {
    return {
      id: d.id,
      fileName: d.file_name,
      fileSize: d.file_size ? (d.file_size / 1024).toFixed(1) + ' KB' : '',
      uploadedAt: d.created_at,
      status: d.status,
      extraction: d.extracted_data
        ? { ...d.extracted_data, confidence: d.confidence || 95 }
        : null,
    };
  }

  const handleFiles = useCallback(async (files) => {
    if (!canExtract) {
      setUpgradeModal(true);
      return;
    }

    const fileList = Array.from(files);

    for (const file of fileList) {
      // Create document record in Supabase first
      const { data: docRecord, error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create document:', insertError);
        continue;
      }

      const docId = docRecord.id;

      // Add to local state immediately
      setDocuments((prev) => [{
        id: docId,
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + ' KB',
        uploadedAt: new Date().toISOString(),
        status: 'processing',
        extraction: null,
      }, ...prev]);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1]; // Remove data:...;base64, prefix

        try {
          // Get auth token for secure API call
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          // Call extraction API with auth
          const response = await fetch('/api/extract', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              fileBase64: base64,
              fileType: file.type,
              fileName: file.name,
              documentId: docId,
            }),
          });

          let result;
          try {
            result = await response.json();
          } catch (parseErr) {
            console.error('Failed to parse response. Status:', response.status);
            throw new Error(`Server returned ${response.status}`);
          }

          if (result.success) {
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === docId
                  ? { ...d, status: 'completed', extraction: { ...result.data, confidence: result.confidence } }
                  : d
              )
            );

            // Refresh profile to update usage counts
            const { data: updatedProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            if (updatedProfile && onProfileUpdate) onProfileUpdate(updatedProfile);
          } else {
            // Mark as failed — log the server error for debugging
            console.error('Extraction API error:', JSON.stringify(result));
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === docId ? { ...d, status: 'failed' } : d
              )
            );
            await supabase
              .from('documents')
              .update({ status: 'failed' })
              .eq('id', docId);
          }
        } catch (err) {
          console.error('Extraction failed:', err);
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === docId ? { ...d, status: 'failed' } : d
            )
          );
        }
      };
      reader.readAsDataURL(file);
    }
  }, [user?.id, canExtract]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const deleteDoc = async (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await supabase.from('documents').delete().eq('id', id);
  };

  const handleUpgrade = async (planId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });
      const result = await response.json();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const completedDocs = documents.filter((d) => d.status === 'completed');
  const totalExtracted = completedDocs.reduce((s, d) => s + (d.extraction?.total || 0), 0);
  const avgConfidence = completedDocs.length > 0
    ? (completedDocs.reduce((s, d) => s + (d.extraction?.confidence || 0), 0) / completedDocs.length).toFixed(1)
    : '—';

  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const displayPlan = plan === 'demo' ? 'Free Trial' : plan.charAt(0).toUpperCase() + plan.slice(1);

  const sidebarItems = [
    { id: 'dashboard', icon: <Home size={18} />, label: 'Dashboard' },
    { id: 'history', icon: <File size={18} />, label: 'Documents' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  return (
    <div className="dash">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo" onClick={onGoLanding}>
          <div className="logo-icon" style={{ width: 30, height: 30, borderRadius: 7 }}>
            <FileText size={15} color="#fff" />
          </div>
          <span className="logo-text" style={{ fontSize: 17 }}>DocPull</span>
        </div>

        <nav className="dash-sidebar-nav">
          {sidebarItems.map((item) => (
            <div
              key={item.id}
              className={`dash-nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => setView(item.id)}
            >
              {item.icon} {item.label}
            </div>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <div className="dash-user">
            <div className="dash-user-avatar">{displayName[0]}</div>
            <div>
              <div className="dash-user-name">{displayName}</div>
              <div className="dash-user-plan">{displayPlan} Plan</div>
            </div>
          </div>
          <div className="dash-signout" onClick={onLogout}>
            <LogOut size={14} /> Sign Out
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="dash-main">
        <header className="dash-topbar">
          <h1 className="dash-page-title">
            {view === 'dashboard' && 'Dashboard'}
            {view === 'history' && 'Documents'}
            {view === 'settings' && 'Settings'}
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {plan === 'demo' && (
              <button
                className="btn btn-sm"
                style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
                onClick={() => setUpgradeModal(true)}
              >
                <CreditCard size={14} /> Upgrade
              </button>
            )}
            {completedDocs.length > 0 && view !== 'settings' && (
              <button className="btn btn-sm" style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }} onClick={() => exportAllToExcel(documents)}>
                <Download size={14} /> Export All
              </button>
            )}
          </div>
        </header>

        <div className="dash-content">
          {/* Usage warning */}
          {!canExtract && plan === 'demo' && (
            <div className="usage-warning">
              <AlertCircle size={16} />
              <span>You've used your free extraction. <strong onClick={() => setUpgradeModal(true)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Upgrade to Pro</strong> for 100 documents/month.</span>
            </div>
          )}

          {/* DASHBOARD */}
          {view === 'dashboard' && (
            <>
              <div className="stats-row">
                <StatCard label="Documents Processed" value={completedDocs.length} icon={<FileText size={18} />} color="blue" />
                <StatCard label="Total Extracted" value={`$${totalExtracted.toFixed(2)}`} icon={<DollarSign size={18} />} color="green" />
                <StatCard label="Avg. Confidence" value={avgConfidence !== '—' ? avgConfidence + '%' : '—'} icon={<BarChart3 size={18} />} color="sky" />
                <StatCard label="Time Saved" value={completedDocs.length > 0 ? `~${(completedDocs.length * 4.5).toFixed(0)} min` : '—'} icon={<Clock size={18} />} color="amber" />
              </div>

              <div
                className={`upload-zone ${dragActive ? 'active' : ''} ${!canExtract ? 'disabled' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => canExtract ? fileInputRef.current?.click() : setUpgradeModal(true)}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff"
                  style={{ display: 'none' }}
                  onChange={(e) => { if (e.target.files.length > 0) handleFiles(e.target.files); e.target.value = ''; }}
                />
                {canExtract ? (
                  <>
                    <Upload size={38} className="upload-zone-icon" />
                    <p className="upload-zone-title">
                      {dragActive ? 'Drop your files here' : 'Upload invoices or receipts'}
                    </p>
                    <p className="upload-zone-sub">Drag & drop or click to browse. PDF, JPG, PNG accepted.</p>
                    <div className="btn btn-primary" style={{ marginTop: 14 }}>Choose Files</div>
                  </>
                ) : (
                  <>
                    <Lock size={38} className="upload-zone-icon" style={{ opacity: 0.4 }} />
                    <p className="upload-zone-title">Upgrade to continue extracting</p>
                    <p className="upload-zone-sub">You've used your free extraction. Upgrade for unlimited access.</p>
                    <div className="btn btn-primary" style={{ marginTop: 14 }}>View Plans</div>
                  </>
                )}
              </div>

              {documents.length > 0 && (
                <div className="recent-section">
                  <h3 className="recent-title">Recent Extractions</h3>
                  <div className="doc-list">
                    {documents.slice(0, 10).map((doc) => (
                      <DocRow
                        key={doc.id}
                        doc={doc}
                        onView={() => setSelectedDoc(doc)}
                        onExportExcel={() => exportToExcel(doc)}
                        onExportCSV={() => exportToCSV(doc)}
                        onDelete={() => deleteDoc(doc.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* HISTORY */}
          {view === 'history' && (
            <>
              {documents.length === 0 ? (
                <div className="empty-state">
                  <FileText size={44} style={{ opacity: 0.25 }} />
                  <p>No documents yet. Upload your first invoice to get started.</p>
                </div>
              ) : (
                <div className="doc-list">
                  {documents.map((doc) => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      onView={() => setSelectedDoc(doc)}
                      onExportExcel={() => exportToExcel(doc)}
                      onExportCSV={() => exportToCSV(doc)}
                      onDelete={() => deleteDoc(doc.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* SETTINGS */}
          {view === 'settings' && (
            <div className="settings-container">
              <div className="card settings-card">
                <h3 className="settings-heading">Account</h3>
                {[['Name', displayName], ['Email', user?.email || ''], ['Plan', displayPlan]].map(([k, v], i, arr) => (
                  <div key={k} className="settings-row" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <span className="settings-label">{k}</span>
                    <span className="settings-value">{v}</span>
                  </div>
                ))}
              </div>

              <div className="card settings-card">
                <h3 className="settings-heading">Usage This Month</h3>
                <div className="settings-row">
                  <span className="settings-label">{docsUsed} of {docsLimit} documents used</span>
                  <span className="settings-value">{Math.min(Math.round((docsUsed / docsLimit) * 100), 100)}%</span>
                </div>
                <div className="usage-bar">
                  <div className="usage-fill" style={{ width: `${Math.min((docsUsed / docsLimit) * 100, 100)}%` }} />
                </div>
                {plan === 'demo' && (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 14 }}
                    onClick={() => setUpgradeModal(true)}
                  >
                    Upgrade Plan
                  </button>
                )}
              </div>

              <div className="card settings-card">
                <h3 className="settings-heading">Export Preferences</h3>
                {['Include line items in export', 'Add source filename column', 'Auto-download after extraction'].map((pref, i, arr) => (
                  <div key={pref} className="settings-row" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <span className="settings-label">{pref}</span>
                    <div className={`toggle ${i === 0 ? 'on' : ''}`}>
                      <div className="toggle-knob" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedDoc?.extraction && (
        <div className="modal-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{selectedDoc.extraction.vendor}</h2>
                <p className="modal-sub">{selectedDoc.fileName} · Extracted {new Date(selectedDoc.uploadedAt).toLocaleString()}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedDoc(null)}><X size={18} /></button>
            </div>

            <div className="modal-badges">
              <span className="badge badge-green">{selectedDoc.extraction.confidence}% confidence</span>
              {selectedDoc.extraction.category && (
                <span className="badge badge-blue">{selectedDoc.extraction.category}</span>
              )}
            </div>

            <div className="modal-fields">
              {[
                ['Invoice #', selectedDoc.extraction.invoiceNumber],
                ['Date', selectedDoc.extraction.date],
                ['Due Date', selectedDoc.extraction.dueDate],
                ['Currency', selectedDoc.extraction.currency],
                ['Subtotal', selectedDoc.extraction.subtotal != null ? `$${Number(selectedDoc.extraction.subtotal).toFixed(2)}` : '—'],
                ['Tax', selectedDoc.extraction.tax != null ? `$${Number(selectedDoc.extraction.tax).toFixed(2)}` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="modal-field">
                  <div className="modal-field-label">{k}</div>
                  <div className="modal-field-value">{v || '—'}</div>
                </div>
              ))}
            </div>

            <div className="modal-total">
              <div className="modal-field-label">Total</div>
              <div className="modal-total-value">
                ${selectedDoc.extraction.total != null ? Number(selectedDoc.extraction.total).toFixed(2) : '0.00'}
              </div>
            </div>

            {selectedDoc.extraction.lineItems && selectedDoc.extraction.lineItems.length > 0 && (
              <>
                <h3 className="modal-section-title">Line Items</h3>
                <table className="modal-table">
                  <thead>
                    <tr>
                      {['Description', 'Qty', 'Unit Price', 'Amount'].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDoc.extraction.lineItems.map((li, i) => (
                      <tr key={i}>
                        <td>{li.description}</td>
                        <td>{li.quantity || li.qty || 1}</td>
                        <td>${Number(li.unitPrice || li.unit_price || 0).toFixed(2)}</td>
                        <td className="fw-600">${Number(li.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => exportToExcel(selectedDoc)}>
                <Download size={15} /> Export Excel
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => exportToCSV(selectedDoc)}>
                <Download size={15} /> Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {upgradeModal && (
        <div className="modal-overlay" onClick={() => setUpgradeModal(false)}>
          <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Upgrade Your Plan</h2>
                <p className="modal-sub">Pick the plan that pays for itself in the first week.</p>
              </div>
              <button className="modal-close" onClick={() => setUpgradeModal(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 0' }}>
              <div className="card" style={{ padding: 24, border: '2px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>Pro</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>100 documents/month</p>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>$49<span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span></div>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => handleUpgrade('pro')}
                >
                  Start Pro Plan
                </button>
              </div>

              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>Business</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>500 documents/month</p>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>$149<span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span></div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => handleUpgrade('business')}
                >
                  Start Business Plan
                </button>
              </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              30-day "5 hours saved" guarantee · Cancel anytime
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* -- Sub-components -- */

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: { bg: 'var(--primary-bg)', fg: 'var(--primary)' },
    green: { bg: 'var(--green-bg)', fg: 'var(--green)' },
    sky: { bg: '#F0F9FF', fg: '#0EA5E9' },
    amber: { bg: 'var(--warning-bg)', fg: 'var(--warning)' },
  };
  const { bg, fg } = colorMap[color] || colorMap.blue;

  return (
    <div className="card stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-icon" style={{ background: bg, color: fg }}>{icon}</div>
      </div>
      <div className="stat-card-value">{value}</div>
    </div>
  );
}

function DocRow({ doc, onView, onExportExcel, onExportCSV, onDelete }) {
  const isProcessing = doc.status === 'processing';
  const isFailed = doc.status === 'failed';

  return (
    <div className="doc-row animate-fade-in">
      <div className={`doc-status-icon ${isProcessing ? 'processing' : isFailed ? 'failed' : 'done'}`}>
        {isProcessing
          ? <RefreshCw size={16} className="animate-spin" />
          : isFailed
            ? <AlertCircle size={16} />
            : <Check size={16} />}
      </div>
      <div className="doc-info">
        <div className="doc-name">{doc.fileName}</div>
        <div className="doc-meta">
          {isProcessing
            ? 'Extracting data...'
            : isFailed
              ? 'Extraction failed'
              : doc.extraction
                ? `${doc.extraction.vendor || 'Unknown'} · $${Number(doc.extraction.total || 0).toFixed(2)}`
                : ''}
        </div>
      </div>
      {!isProcessing && !isFailed && doc.extraction && (
        <div className="doc-actions">
          <button className="btn btn-sm doc-btn view" onClick={onView}><Eye size={12} /> View</button>
          <button className="btn btn-sm doc-btn excel" onClick={onExportExcel}><Download size={12} /> Excel</button>
          <button className="btn btn-sm doc-btn csv" onClick={onExportCSV}>CSV</button>
          <button className="btn btn-sm doc-btn delete" onClick={onDelete}><Trash2 size={12} /></button>
        </div>
      )}
    </div>
  );
}
