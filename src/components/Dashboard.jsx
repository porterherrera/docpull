import { useState, useRef, useCallback, useEffect } from 'react';
import {
  FileText, Upload, Download, Home, File, Settings,
  LogOut, Eye, Trash2, Check, RefreshCw, X,
  Clock, BarChart3, DollarSign, AlertCircle, Lock, CreditCard,
  CheckCircle, XCircle, Loader2, Files, Zap, TrendingUp,
  Menu, Search, RotateCcw,
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { exportToExcel, exportToCSV, exportAllToExcel } from '../export.js';
import './Dashboard.css';

const PLAN_LIMITS = { demo: 3, pro: 100, business: 500 };

export default function Dashboard({ user, profile, onProfileUpdate, onLogout, onGoLanding }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [view, setView] = useState('dashboard');
  const [dragActive, setDragActive] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null); // { total, completed, failed, current }
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null); // { message, type }
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  const plan = profile?.plan || 'demo';
  const docsUsed = plan === 'demo'
    ? (profile?.demo_remaining === 0 ? 1 : 0)
    : (profile?.docs_used_this_month || 0);
  const docsLimit = PLAN_LIMITS[plan] || 1;
  const canExtract = docsUsed < docsLimit;
  const remaining = Math.max(0, docsLimit - docsUsed);

  // Load documents from Supabase on mount
  useEffect(() => {
    if (!user?.id) return;
    loadDocuments();
  }, [user?.id]);

  // Check for checkout success/cancel in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      // Refresh profile to get updated plan
      refreshProfile();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('checkout') === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function refreshProfile() {
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (updatedProfile && onProfileUpdate) onProfileUpdate(updatedProfile);
  }

  async function loadDocuments() {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setDocuments(data.map(mapDoc));
    }
    setLoading(false);
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
    const maxFiles = Math.min(fileList.length, remaining);

    if (maxFiles < fileList.length) {
      // Can only process some files
      showToast(`Processing ${maxFiles} of ${fileList.length} files (plan limit: ${remaining} remaining)`, 'warning');
    }

    const filesToProcess = fileList.slice(0, maxFiles);

    if (filesToProcess.length > 1) {
      setBatchProgress({ total: filesToProcess.length, completed: 0, failed: 0, current: filesToProcess[0].name });
    }

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];

      if (filesToProcess.length > 1) {
        setBatchProgress(prev => ({ ...prev, current: file.name }));
      }

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
        if (filesToProcess.length > 1) {
          setBatchProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
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

      // Convert file to base64 and extract
      try {
        const base64 = await fileToBase64(file);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

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
        } catch {
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
          if (filesToProcess.length > 1) {
            setBatchProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
          }
        } else {
          console.error('Extraction API error:', JSON.stringify(result));
          setDocuments((prev) =>
            prev.map((d) => d.id === docId ? { ...d, status: 'failed' } : d)
          );
          await supabase.from('documents').update({ status: 'failed' }).eq('id', docId);
          if (filesToProcess.length > 1) {
            setBatchProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
          }
        }
      } catch (err) {
        console.error('Extraction failed:', err);
        setDocuments((prev) =>
          prev.map((d) => d.id === docId ? { ...d, status: 'failed' } : d)
        );
        if (filesToProcess.length > 1) {
          setBatchProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }
    }

    // Batch complete — refresh profile
    setBatchProgress(null);
    refreshProfile();
    const successes = filesToProcess.length - (filesToProcess.length > 1 ? 0 : 0);
    if (filesToProcess.length === 1) {
      showToast('Document extracted successfully!');
    } else {
      showToast(`Batch complete! Processed ${filesToProcess.length} documents.`);
    }
  }, [user?.id, canExtract, remaining]);

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const deleteDoc = async (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    await supabase.from('documents').delete().eq('id', id);
  };

  const retryExtraction = async (docId, fileName) => {
    // Mark as processing again
    setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, status: 'processing' } : d));
    await supabase.from('documents').update({ status: 'processing' }).eq('id', docId);

    // Re-prompt the user to upload the file again via the file input
    showToast('Please re-upload the file to retry extraction.', 'warning');
    fileInputRef.current?.click();
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
      } else {
        console.error('No checkout URL:', result);
        showToast('Failed to start checkout. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Failed to start checkout. Please try again.');
    }
  };

  const completedDocs = documents.filter((d) => d.status === 'completed');
  const totalExtracted = completedDocs.reduce((s, d) => s + (d.extraction?.total || 0), 0);
  const avgConfidence = completedDocs.length > 0
    ? (completedDocs.reduce((s, d) => s + (d.extraction?.confidence || 0), 0) / completedDocs.length).toFixed(1)
    : null;

  const filteredDocs = searchQuery
    ? documents.filter((d) =>
        d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.extraction?.vendor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.extraction?.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const displayPlan = plan === 'demo' ? 'Free Trial' : plan.charAt(0).toUpperCase() + plan.slice(1);

  const sidebarItems = [
    { id: 'dashboard', icon: <Home size={18} />, label: 'Dashboard' },
    { id: 'history', icon: <File size={18} />, label: 'Documents' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  return (
    <div className="dash">
      {/* Mobile overlay */}
      {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`dash-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="dash-sidebar-logo" onClick={onGoLanding}>
          <div className="logo-icon" style={{ width: 30, height: 30, borderRadius: 7 }}>
            <FileText size={15} color="#fff" />
          </div>
          <span className="logo-text" style={{ fontSize: 17 }}>DocumentPull</span>
        </div>

        <nav className="dash-sidebar-nav">
          {sidebarItems.map((item) => (
            <div
              key={item.id}
              className={`dash-nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => { setView(item.id); setMobileMenuOpen(false); }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="dash-page-title">
              {view === 'dashboard' && 'Dashboard'}
              {view === 'history' && 'Documents'}
              {view === 'settings' && 'Settings'}
            </h1>
          </div>
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
              <span>You've used all 3 free extractions. <strong onClick={() => setUpgradeModal(true)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Upgrade to Pro</strong> for 100 documents/month.</span>
            </div>
          )}

          {/* Batch progress banner */}
          {batchProgress && (
            <div className="batch-progress">
              <div className="batch-progress-header">
                <Files size={16} />
                <span>Processing {batchProgress.completed + batchProgress.failed + 1} of {batchProgress.total} files</span>
              </div>
              <div className="batch-progress-bar">
                <div
                  className="batch-progress-fill"
                  style={{ width: `${((batchProgress.completed + batchProgress.failed) / batchProgress.total) * 100}%` }}
                />
              </div>
              <div className="batch-progress-detail">
                <Loader2 size={12} className="animate-spin" />
                <span>{batchProgress.current}</span>
                {batchProgress.completed > 0 && <span className="batch-done">{batchProgress.completed} done</span>}
                {batchProgress.failed > 0 && <span className="batch-fail">{batchProgress.failed} failed</span>}
              </div>
            </div>
          )}

          {/* DASHBOARD */}
          {view === 'dashboard' && (
            <>
              <div className="stats-row">
                <StatCard label="Documents Processed" value={completedDocs.length} icon={<FileText size={18} />} color="blue" />
                <StatCard label="Total Extracted" value={`$${totalExtracted.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon={<DollarSign size={18} />} color="green" />
                <StatCard label="Avg. Confidence" value={avgConfidence ? avgConfidence + '%' : '—'} icon={<BarChart3 size={18} />} color="sky" />
                <StatCard label="Time Saved" value={completedDocs.length > 0 ? `~${(completedDocs.length * 5).toFixed(0)} min` : '—'} icon={<Clock size={18} />} color="amber" />
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
                    <p className="upload-zone-sub">Drag & drop or click to browse. PDF, JPG, PNG accepted. Select multiple files at once.</p>
                    <div className="btn btn-primary" style={{ marginTop: 14 }}>
                      <Upload size={14} /> Choose Files
                    </div>
                    <p className="upload-zone-remaining">{remaining} extraction{remaining !== 1 ? 's' : ''} remaining</p>
                  </>
                ) : (
                  <>
                    <Lock size={38} className="upload-zone-icon" style={{ opacity: 0.4 }} />
                    <p className="upload-zone-title">Upgrade to continue extracting</p>
                    <p className="upload-zone-sub">You've used all 3 free extractions. Upgrade for up to 500 documents/month.</p>
                    <div className="btn btn-primary" style={{ marginTop: 14 }}>
                      <Zap size={14} /> View Plans
                    </div>
                  </>
                )}
              </div>

              {completedDocs.length >= 2 && <AnalyticsChart documents={documents} />}

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
              {documents.length > 0 && (
                <div className="search-bar">
                  <Search size={16} className="search-bar-icon" />
                  <input
                    type="text"
                    placeholder="Search by filename, vendor, or invoice #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-bar-input"
                  />
                  {searchQuery && (
                    <button className="search-bar-clear" onClick={() => setSearchQuery('')}><X size={14} /></button>
                  )}
                </div>
              )}
              {loading ? (
                <div className="skeleton-list">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="skeleton-row">
                      <div className="skeleton skeleton-icon" />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton skeleton-text-lg" />
                        <div className="skeleton skeleton-text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="empty-state">
                  <FileText size={44} style={{ opacity: 0.25 }} />
                  <p>{searchQuery ? 'No documents match your search.' : 'No documents yet. Upload your first invoice to get started.'}</p>
                </div>
              ) : (
                <div className="doc-list">
                  {filteredDocs.map((doc) => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      onView={() => setSelectedDoc(doc)}
                      onExportExcel={() => exportToExcel(doc)}
                      onExportCSV={() => exportToCSV(doc)}
                      onDelete={() => deleteDoc(doc.id)}
                      onRetry={() => retryExtraction(doc.id, doc.fileName)}
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

      {/* Toast notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle size={16} />}
          {toast.type === 'error' && <XCircle size={16} />}
          {toast.type === 'warning' && <AlertCircle size={16} />}
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)}><X size={14} /></button>
        </div>
      )}

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
              <span className={`badge ${selectedDoc.extraction.confidence >= 90 ? 'badge-green' : selectedDoc.extraction.confidence >= 70 ? 'badge-amber' : 'badge-red'}`}>
                {selectedDoc.extraction.confidence}% confidence
              </span>
            </div>

            <div className="modal-fields">
              {[
                ['Invoice #', selectedDoc.extraction.invoiceNumber],
                ['Date', selectedDoc.extraction.date],
                ['Due Date', selectedDoc.extraction.dueDate],
                ['Currency', selectedDoc.extraction.currency],
                ['Subtotal', selectedDoc.extraction.subtotal != null ? `$${Number(selectedDoc.extraction.subtotal).toFixed(2)}` : null],
                ['Tax', selectedDoc.extraction.tax != null ? `$${Number(selectedDoc.extraction.tax).toFixed(2)}` : null],
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
                ${selectedDoc.extraction.total != null ? Number(selectedDoc.extraction.total).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
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

            {selectedDoc.extraction.billTo && (selectedDoc.extraction.billTo.name || selectedDoc.extraction.billTo.address) && (
              <div className="modal-billto">
                <h3 className="modal-section-title">Bill To</h3>
                {selectedDoc.extraction.billTo.name && <div className="modal-billto-name">{selectedDoc.extraction.billTo.name}</div>}
                {selectedDoc.extraction.billTo.address && <div className="modal-billto-addr">{selectedDoc.extraction.billTo.address}</div>}
              </div>
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
              <div className="card upgrade-card recommended">
                <div className="upgrade-badge">Most Popular</div>
                <div className="upgrade-card-inner">
                  <div>
                    <h3 className="upgrade-plan-name">Pro</h3>
                    <p className="upgrade-plan-desc">100 documents/month</p>
                    <ul className="upgrade-features">
                      <li><Check size={13} /> AI-powered data extraction</li>
                      <li><Check size={13} /> Excel & CSV export</li>
                      <li><Check size={13} /> Priority processing</li>
                    </ul>
                  </div>
                  <div className="upgrade-price-block">
                    <div className="upgrade-price">$49<span>/mo</span></div>
                    <div className="upgrade-price-sub">$0.49 per document</div>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleUpgrade('pro')}>
                  Start Pro Plan
                </button>
              </div>

              <div className="card upgrade-card">
                <div className="upgrade-card-inner">
                  <div>
                    <h3 className="upgrade-plan-name">Business</h3>
                    <p className="upgrade-plan-desc">500 documents/month</p>
                    <ul className="upgrade-features">
                      <li><Check size={13} /> Everything in Pro</li>
                      <li><Check size={13} /> Bulk batch processing</li>
                      <li><Check size={13} /> Dedicated support</li>
                    </ul>
                  </div>
                  <div className="upgrade-price-block">
                    <div className="upgrade-price">$149<span>/mo</span></div>
                    <div className="upgrade-price-sub">$0.30 per document</div>
                  </div>
                </div>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleUpgrade('business')}>
                  Start Business Plan
                </button>
              </div>
            </div>

            <p className="upgrade-guarantee">
              <CheckCircle size={14} /> 30-day "5 hours saved" guarantee · Cancel anytime
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

function AnalyticsChart({ documents }) {
  const completed = documents.filter((d) => d.status === 'completed' && d.uploadedAt);

  // Group by day (last 14 days)
  const now = new Date();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push({ key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
  }

  const grouped = {};
  const amounts = {};
  days.forEach((d) => { grouped[d.key] = 0; amounts[d.key] = 0; });

  completed.forEach((doc) => {
    const key = new Date(doc.uploadedAt).toISOString().split('T')[0];
    if (grouped[key] !== undefined) {
      grouped[key]++;
      amounts[key] += Number(doc.extraction?.total || 0);
    }
  });

  const counts = days.map((d) => grouped[d.key]);
  const totals = days.map((d) => amounts[d.key]);
  const maxCount = Math.max(...counts, 1);
  const maxAmount = Math.max(...totals, 1);

  const chartW = 100; // percentage width
  const chartH = 140;
  const barWidth = 100 / days.length;

  // Build sparkline for amounts
  const points = totals.map((val, i) => {
    const x = (i / (days.length - 1)) * 100;
    const y = chartH - (val / maxAmount) * (chartH - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="analytics-section">
      <div className="analytics-header">
        <h3 className="analytics-title"><TrendingUp size={16} /> Extraction Activity</h3>
        <span className="analytics-period">Last 14 days</span>
      </div>
      <div className="analytics-grid">
        {/* Bar chart - documents per day */}
        <div className="card analytics-card">
          <div className="analytics-card-label">Documents per Day</div>
          <div className="analytics-chart-container">
            <svg width="100%" height={chartH} viewBox={`0 0 ${days.length * 28} ${chartH}`} preserveAspectRatio="none">
              {counts.map((count, i) => {
                const barH = Math.max((count / maxCount) * (chartH - 30), count > 0 ? 4 : 0);
                const x = i * 28 + 4;
                const y = chartH - barH - 20;
                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={y}
                      width={20}
                      height={barH}
                      rx={3}
                      fill={count > 0 ? 'var(--primary)' : 'var(--border)'}
                      opacity={count > 0 ? 0.85 : 0.3}
                    />
                    {count > 0 && (
                      <text x={x + 10} y={y - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="600">
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* x-axis labels - show every other */}
              {days.map((d, i) => (
                i % 2 === 0 ? (
                  <text key={`label-${i}`} x={i * 28 + 14} y={chartH - 4} textAnchor="middle" fill="var(--text-muted)" fontSize="8">
                    {d.label.split(' ')[1]}
                  </text>
                ) : null
              ))}
            </svg>
          </div>
        </div>

        {/* Sparkline - amount extracted per day */}
        <div className="card analytics-card">
          <div className="analytics-card-label">Amount Extracted per Day</div>
          <div className="analytics-chart-container">
            <svg width="100%" height={chartH} viewBox={`0 0 100 ${chartH}`} preserveAspectRatio="none">
              {/* Area fill */}
              <polygon
                points={`0,${chartH - 10} ${points} 100,${chartH - 10}`}
                fill="var(--green)"
                opacity="0.08"
              />
              {/* Line */}
              <polyline
                points={points}
                fill="none"
                stroke="var(--green)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {/* Dots */}
              {totals.map((val, i) => {
                if (val === 0) return null;
                const x = (i / (days.length - 1)) * 100;
                const y = chartH - (val / maxAmount) * (chartH - 20) - 10;
                return (
                  <circle key={i} cx={x} cy={y} r="2.5" fill="var(--green)" stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                );
              })}
            </svg>
            <div className="analytics-sparkline-labels">
              {days.filter((_, i) => i % 3 === 0).map((d, i) => (
                <span key={i}>{d.label.split(' ')[1]}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocRow({ doc, onView, onExportExcel, onExportCSV, onDelete, onRetry }) {
  const isProcessing = doc.status === 'processing';
  const isFailed = doc.status === 'failed';

  return (
    <div className={`doc-row animate-fade-in ${isProcessing ? 'doc-row-processing' : ''}`}>
      <div className={`doc-status-icon ${isProcessing ? 'processing' : isFailed ? 'failed' : 'done'}`}>
        {isProcessing
          ? <RefreshCw size={16} className="animate-spin" />
          : isFailed
            ? <XCircle size={16} />
            : <CheckCircle size={16} />}
      </div>
      <div className="doc-info">
        <div className="doc-name">{doc.fileName}</div>
        <div className="doc-meta">
          {isProcessing
            ? 'Extracting data...'
            : isFailed
              ? 'Extraction failed — click retry to try again'
              : doc.extraction
                ? `${doc.extraction.vendor || 'Unknown'} · $${Number(doc.extraction.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} · ${doc.extraction.confidence}%`
                : ''}
        </div>
      </div>
      <div className="doc-actions">
        {isProcessing && <span className="doc-processing-label">Processing...</span>}
        {isFailed && (
          <>
            {onRetry && <button className="btn btn-sm doc-btn retry" onClick={onRetry}><RotateCcw size={12} /> Retry</button>}
            <button className="btn btn-sm doc-btn delete" onClick={onDelete}><Trash2 size={12} /></button>
          </>
        )}
        {!isProcessing && !isFailed && doc.extraction && (
          <>
            <button className="btn btn-sm doc-btn view" onClick={onView}><Eye size={12} /> View</button>
            <button className="btn btn-sm doc-btn excel" onClick={onExportExcel}><Download size={12} /> Excel</button>
            <button className="btn btn-sm doc-btn csv" onClick={onExportCSV}>CSV</button>
            <button className="btn btn-sm doc-btn delete" onClick={onDelete}><Trash2 size={12} /></button>
          </>
        )}
      </div>
    </div>
  );
}
