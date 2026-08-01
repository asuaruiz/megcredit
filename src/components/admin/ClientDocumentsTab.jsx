import { useEffect, useRef, useState } from 'react';
import { fetchDocumentFile, reviewDocument } from '../../lib/adminApi.js';

export default function ClientDocumentsTab({ documents, onReload, t }) {
  const [selectedId, setSelectedId] = useState(documents[0]?.id || null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewError, setReviewError] = useState('');
  const previewUrlRef = useRef(null);

  const DOCUMENT_LABEL = {
    id_front: t('adminClientDetail.documentIdFront'),
    id_back: t('adminClientDetail.documentIdBack'),
    selfie_with_id: t('adminClientDetail.documentSelfie'),
    ssn_card: t('adminClientDetail.documentSsn'),
    proof_of_residency: t('adminClientDetail.documentProof'),
  };

  useEffect(() => {
    if (!selectedId && documents.length > 0) {
      setSelectedId(documents[0].id);
    }
  }, [documents, selectedId]);

  useEffect(() => {
    const doc = documents.find((entry) => entry.id === selectedId);
    if (!doc) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    setDocumentError('');
    fetchDocumentFile(doc.id)
      .then((file) => {
        if (cancelled) return;
        const url = URL.createObjectURL(file);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreview({ url, mimeType: file.type, title: DOCUMENT_LABEL[doc.document_type] || doc.original_filename || doc.document_type });
      })
      .catch((error) => {
        if (!cancelled) setDocumentError(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const selectedDoc = documents.find((entry) => entry.id === selectedId) || null;

  const handleReview = async (docId, newStatus) => {
    setReviewingId(docId);
    setReviewError('');
    try {
      await reviewDocument(docId, newStatus);
      const nextPending = documents.find((entry) => entry.id !== docId && entry.status === 'pending');
      await onReload();
      setSelectedId(nextPending ? nextPending.id : docId);
    } catch (error) {
      setReviewError(error.message);
    } finally {
      setReviewingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <section className="admin-block">
        <h2>{t('adminClientDetail.documentsTitle')}</h2>
        <p className="portal-sub">{t('adminClientDetail.noDocuments')}</p>
      </section>
    );
  }

  return (
    <section className="admin-block">
      <h2>{t('adminClientDetail.documentsTitle')}</h2>
      <div className="doc-review-split">
        <div className="doc-review-list">
          {documents.map((doc) => (
            <button
              key={doc.id}
              type="button"
              className="doc-review-row"
              data-active={selectedId === doc.id ? 'true' : 'false'}
              onClick={() => setSelectedId(doc.id)}
            >
              <span className="ws-body">{DOCUMENT_LABEL[doc.document_type] || doc.document_type}</span>
              <span className={`status-badge ${doc.status}`}>{doc.status}</span>
            </button>
          ))}
        </div>

        <div className="doc-preview-pane">
          {loadingPreview && <div className="doc-preview-body">{t('adminClientDetail.openingDocument')}</div>}
          {!loadingPreview && !selectedDoc && <div className="doc-preview-body">{t('adminClientDetail.selectDocumentHint')}</div>}
          {!loadingPreview && selectedDoc && preview && (
            <div className="doc-preview-body">
              {preview.mimeType?.startsWith('image/') ? (
                <img src={preview.url} alt={preview.title} />
              ) : (
                <iframe src={preview.url} title={preview.title} />
              )}
            </div>
          )}
          {documentError && <p className="form-error" role="alert">{documentError}</p>}
          {reviewError && <p className="form-error" role="alert">{reviewError}</p>}
          {selectedDoc && (
            <div className="doc-preview-actions">
              <button
                className="btn btn-primary"
                type="button"
                disabled={reviewingId === selectedDoc.id || selectedDoc.status === 'approved'}
                onClick={() => handleReview(selectedDoc.id, 'approved')}
              >
                {t('adminClientDetail.approve')}
              </button>
              <button
                className="btn btn-outline danger"
                type="button"
                disabled={reviewingId === selectedDoc.id || selectedDoc.status === 'rejected'}
                onClick={() => handleReview(selectedDoc.id, 'rejected')}
              >
                {t('adminClientDetail.reject')}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
