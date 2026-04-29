// src/pages/DocumentsPage.js
import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, onSnapshot, orderBy, query, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase/config";
import { useUser } from "../context/UserContext";
import { format } from "date-fns";
import "./DocumentsPage.css";

const FOLDERS = ["General", "Campaigns", "Brand Assets", "Reports", "Templates", "Approvals"];

function fileSize(b) {
  if (!b) return "";
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

function fileIcon(name) {
  const ext = name?.split(".").pop()?.toLowerCase();
  return { pdf:"📄", doc:"📝", docx:"📝", xls:"📊", xlsx:"📊", ppt:"📋", pptx:"📋",
           jpg:"🖼️", jpeg:"🖼️", png:"🖼️", gif:"🖼️", mp4:"🎥", mov:"🎥",
           mp3:"🎵", zip:"🗜️", rar:"🗜️" }[ext] || "📁";
}

export default function DocumentsPage() {
  const { currentUser }           = useUser();
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeFolder, setActiveFolder] = useState("All");
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ folder: FOLDERS[0], description: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const r = ref(storage, `documents/${Date.now()}_${selectedFile.name}`);
      await uploadBytes(r, selectedFile);
      const url = await getDownloadURL(r);
      await addDoc(collection(db, "documents"), {
        name: selectedFile.name, url,
        size: selectedFile.size,
        folder: uploadForm.folder,
        description: uploadForm.description,
        uploadedBy: currentUser.id,
        uploadedByName: currentUser.name,
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      setSelectedFile(null);
      setUploadForm({ folder: FOLDERS[0], description: "" });
    } catch (err) { console.error(err); }
    setUploading(false);
  }

  async function handleDelete(d) {
    if (!window.confirm(`Delete "${d.name}"?`)) return;
    try {
      const r = ref(storage, `documents/${d.name}`);
      await deleteObject(r).catch(() => {});
      await deleteDoc(doc(db, "documents", d.id));
    } catch (err) { console.error(err); }
  }

  const counts = {};
  docs.forEach((d) => { counts[d.folder] = (counts[d.folder] || 0) + 1; });

  const filtered = docs.filter((d) => {
    if (activeFolder !== "All" && d.folder !== activeFolder) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="documents-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">{docs.length} files stored</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Upload File</button>
      </div>

      <div className="docs-layout">
        {/* Folders */}
        <div className="folder-panel card">
          <div className="folder-label">Folders</div>
          {["All", ...FOLDERS].map((f) => (
            <button key={f} className={`folder-btn${activeFolder === f ? " folder-btn--active" : ""}`} onClick={() => setActiveFolder(f)}>
              <span>📁 {f}</span>
              <span className="folder-count">{f === "All" ? docs.length : (counts[f] || 0)}</span>
            </button>
          ))}
        </div>

        {/* Files */}
        <div>
          <input className="input" style={{ marginBottom: 14, maxWidth: 280 }} placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📂</div><div className="empty-state-text">No files here</div></div>
          ) : (
            <div className="files-list">
              {filtered.map((d) => (
                <div key={d.id} className="file-item card">
                  <span className="file-icon">{fileIcon(d.name)}</span>
                  <div className="file-info">
                    <div className="file-name">{d.name}</div>
                    {d.description && <div className="file-desc">{d.description}</div>}
                    <div className="file-meta">
                      <span className="file-folder-tag">{d.folder}</span>
                      <span>{fileSize(d.size)}</span>
                      <span>·</span>
                      <span>{d.createdAt && format(d.createdAt.toDate?.() || new Date(d.createdAt), "MMM d, yyyy")}</span>
                      <span>·</span>
                      <span>by {d.uploadedByName}</span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <a href={d.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Open</a>
                    {(currentUser?.id === d.uploadedBy || currentUser?.role === "admin") && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d)}>Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3 className="modal-title">Upload File</h3><button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="label">File *</label>
                <div className="dropzone" onClick={() => fileRef.current?.click()}>
                  {selectedFile
                    ? <><div style={{ fontWeight: 600, fontSize: 14 }}>{selectedFile.name}</div><div style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 4 }}>{fileSize(selectedFile.size)}</div></>
                    : <><div style={{ fontSize: 24, marginBottom: 8 }}>⬆</div><div>Click to select a file</div></>}
                </div>
                <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => setSelectedFile(e.target.files[0])} />
              </div>
              <div className="form-group">
                <label className="label">Folder</label>
                <select className="input" value={uploadForm.folder} onChange={(e) => setUploadForm({ ...uploadForm, folder: e.target.value })}>
                  {FOLDERS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Description (optional)</label>
                <input className="input" value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="Brief description..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={!selectedFile || uploading}>
                {uploading ? <span className="spinner" /> : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
