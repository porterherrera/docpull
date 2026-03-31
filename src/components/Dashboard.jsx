import { useState, useRef, useCallback } from 'react';
import {
  FileText, Upload, Download, Home, File, Settings,
  LogOut, Eye, Trash2, Check, RefreshCw, X,
  Clock, BarChart3, DollarSign,
} from 'lucide-react';
import { processDocument } from '../extraction.js';
import { exportToExcel, exportToCSV, exportAllToExcel } from '../export.js';
import './Dashboard.css';

export default function Dashboard({ user, onLogout, onGoLanding }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [view, setView] = useState('dashboard');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    const fileList = Array.from(files);

    for (const file of fileList) {
      const docId = crypto.randomUUID();
      const newDoc = {
        id: docId,
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + ' KB',
        uploadedAt: new Date().toISOString(),
        status: 'processing',
        extraction: null,
      };

      setDocuments((prev) => [newDoc, ...prev]);

      processDocument(file).then((extraction) => {
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId ? { ...d, status: 'completed', extraction } : d
          )
        );
      });
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const deleteDoc = (id) => setDocuments((prev) => prev.filter((d) => d.id !== id));

  const completedDocs = documents.filter((d) => d.status === 'completed');
  const totalExtracted = completedDocs.reduce((s, d) => s + (d.extraction?.total || 0), 0);
  const avgConfidence = completedDocs.length > 0
    ? (completedDocs.reduce((s, d) => s + (d.extraction?.confidence || 0), 0) / completedDocs.length).toFixed(1)
    : '—';

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
            <div className="dash-user-avatar">{user.name[0]}</div>
            <div>
              <div className="dash-user-name">{user.name}</div>
              <div className="dash-user-plan">{user.plan} Plan</div>
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
          {completedDocs.length > 0 && view !== 'settings' && (
            <button className="btn btn-sm" style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }} onClick={() => exportAllToExcel(documents)}>
              <Download size={14} /> Export All
            </button>
          )}
        </header>

        <div className="dash-content">
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
                className={`upload-zone ${dragActive ? 'active' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff"
                  style={{ display: 'none' }}
                  onChange={(e) => { if (e.target.files.length > 0) handleFiles(e.target.files); e.target.value = ''; }}
                />
                <Upload size={38} className="upload-zone-icon" />
                <p className="upload-zone-title">
                  {dragActive ? 'Drop your files here' : 'Upload invoices or receipts'}
                </p>
                <p className="upload-zone-sub">Drag & drop or click to browse. PDF, JPG, PNG accepted.</p>
                <div className="btn btn-primary" style={{ marginTop: 14 }}>Choose Files</div>
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
                {[['Name', user.name], ['Email', user.email], ['Plan', user.plan]].map(([k, v], i, arr) => (
                  <div key={k} className="settings-row" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <span className="settings-label">{k}</span>
                    <span className="settings-value">{v}</span>
                  </div>
                ))}
              </div>

              <div className="card settings-card">
                <h3 className="settings-heading">Usage This Month</h3>
                <div className="settings-row">
                  <span className="settings-label">{completedDocs.length} of 100 documents used</span>
                  <span className="settings-value">{completedDocs.length}%</span>
                </div>
                <div className="usage-bar">
                  <div className="usage-fill" style={{ width: `${Math.min(completedDocs.length, 100)}%` }} />
                </div>
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
              <span className="badge badge-blue">{selectedDoc.extraction.category}</span>
            </div>

            <div className="modal-fields">
              {[
                ['Invoice #', selectedDoc.extraction.invoiceNumber],
                ['Date', selectedDoc.extraction.date],
                ['Due Date', selectedDoc.extraction.dueDate],
                ['Currency', selectedDoc.extraction.currency],
                ['Subtotal', `$${selectedDoc.extraction.subtotal.toFixed(2)}`],
                ['Tax', `$${selectedDoc.extraction.tax.toFixed(2)}`],
              ].map(([k, v]) => (
                <div key={k} className="modal-field">
                  <div className="modal-field-label">{k}</div>
                  <div className="modal-field-value">{v}</div>
                </div>
              ))}
            </div>

            <div className="modal-total">
              <div className="modal-field-label">Total</div>
              <div className="modal-total-value">${selectedDoc.extraction.total.toFixed(2)}</div>
            </div>

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
                    <td>{li.qty}</td>
                    <td>${li.unitPrice.toFixed(2)}</td>
                    <td className="fw-600">${li.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

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

  return (
    <div className="doc-row animate-fade-in">
      <div className={`doc-status-icon ${isProcessing ? 'processing' : 'done'}`}>
        {isProcessing
          ? <RefreshCw size={16} className="animate-spin" />
          : <Check size={16} />}
      </div>
      <div className="doc-info">
        <div className="doc-name">{doc.fileName}</div>
        <div className="doc-meta">
          {isProcessing
            ? 'Extracting data...'
            : doc.extraction
              ? `${doc.extraction.vendor} · $${doc.extraction.total.toFixed(2)}`
              : ''}
        </div>
      </div>
      {!isProcessing && doc.extraction && (
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
