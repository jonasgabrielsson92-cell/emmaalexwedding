import { useEffect, useRef, useState } from 'react';

const PHOTO_UPLOAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwPGnvcb_uHdbTlVKr6D7jnvsHfwzD7T0VtsD_jBDZ-iUBWAdceLjbGzvfAlz3QltAZDQ/exec';
const photos = [{ src: '/images/frieriet-alperna.jpg', alt: 'Förlovningsringen i Alperna', className: 'g-tall' }, { src: '/images/emma-ostron.jpg', alt: 'Emma med ostron i skärgården' }, { src: '/images/elsie.jpg', alt: 'Lilla Elsie' }, { src: '/images/alexander-ostron.jpg', alt: 'Alexander med ostron i skärgården', className: 'g-tall' }];
const idleUpload = { phase: 'idle', total: 0, current: 0, completed: 0, currentFileName: '', failed: [] };
const SWIPE_THRESHOLD = 50;

const toLightboxUrl = (url) => url.replace(/([?&]sz=)w\d+/, '$1w1600');

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const uploadOne = async (file) => {
  const fileData = await fileToBase64(file);
  const response = await fetch(PHOTO_UPLOAD_ENDPOINT, { method: 'POST', body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileData }) });
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Upload failed');
};

export default function Gallery() {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [uploadState, setUploadState] = useState(idleUpload);
  const [drivePhotos, setDrivePhotos] = useState([]);
  const [loadStatus, setLoadStatus] = useState('loading');
  const galleryInputRef = useRef(null);
  const touchStartXRef = useRef(null);

  const allPhotos = [...photos.map((photo) => ({ src: photo.src, lightboxSrc: photo.src, alt: photo.alt, className: photo.className })), ...drivePhotos.map((photo) => ({ src: photo.url, lightboxSrc: toLightboxUrl(photo.url), alt: photo.name }))];
  const current = selectedIndex !== null ? allPhotos[selectedIndex] : null;
  const isUploading = uploadState.phase === 'uploading';

  const closeLightbox = () => setSelectedIndex(null);
  const goPrev = () => setSelectedIndex((index) => (index - 1 + allPhotos.length) % allPhotos.length);
  const goNext = () => setSelectedIndex((index) => (index + 1) % allPhotos.length);

  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKey = (event) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedIndex, allPhotos.length]);

  useEffect(() => {
    if (selectedIndex === null) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [selectedIndex !== null]);

  useEffect(() => {
    if (!isUploading) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isUploading]);

  const fetchPhotos = async () => {
    setLoadStatus('loading');
    try {
      const response = await fetch(PHOTO_UPLOAD_ENDPOINT);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      setDrivePhotos(data.files || []);
      setLoadStatus('success');
    } catch {
      setLoadStatus('error');
    }
  };

  useEffect(() => { fetchPhotos(); }, []);

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploadState({ phase: 'uploading', total: files.length, current: 0, completed: 0, currentFileName: '', failed: [] });
    const failed = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadState((state) => ({ ...state, current: i + 1, currentFileName: file.name }));
      try {
        await uploadOne(file);
      } catch {
        failed.push(file);
      }
      setUploadState((state) => ({ ...state, completed: i + 1 }));
    }
    setUploadState({ phase: 'done', total: files.length, current: files.length, completed: files.length, currentFileName: '', failed });
    fetchPhotos();
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    uploadFiles(files);
  };

  const onTouchStart = (event) => { touchStartXRef.current = event.touches[0].clientX; };
  const onTouchEnd = (event) => {
    if (touchStartXRef.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX > 0) goPrev(); else goNext();
  };

  return <section className="alt" id="galleri"><div className="wrap"><div className="section-head"><p className="kicker">Galleri</p><h2>Ögonblick</h2><p className="lead">Här fyller vi på med bilder före och efter den stora dagen.</p></div><div className="gallery-upload"><p className="gallery-upload__title">Dela era bilder från dagen</p>{isUploading && <div className="upload-progress" role="status" aria-live="polite"><p className="upload-progress__count">Laddar upp {uploadState.current} av {uploadState.total} bilder…</p><div className="upload-progress__bar"><div className="upload-progress__fill" style={{ width: `${(uploadState.completed / uploadState.total) * 100}%` }} /></div><p className="upload-progress__file">{uploadState.currentFileName}</p></div>}<div className="gallery-upload__actions"><input ref={galleryInputRef} className="gallery-upload__input" type="file" accept="image/*" multiple onChange={handleFileChange} disabled={isUploading} /><button className="gallery-upload__picker" type="button" onClick={() => galleryInputRef.current?.click()} disabled={isUploading}>Välj från galleriet</button></div><p className="gallery-upload__video-note">Har du filmat något? Filmer blir för stora för galleriet — skicka dem gärna till <a href="mailto:brollopemmaalexander@gmail.com?subject=Br%C3%B6llopsfilm">brollopemmaalexander@gmail.com</a> istället, så får vi se dem!</p>{uploadState.phase === 'done' && uploadState.failed.length === 0 && <p className="gallery-upload__message success" role="status">Klart! {uploadState.total} {uploadState.total === 1 ? 'bild' : 'bilder'} uppladdade 🎉</p>}{uploadState.phase === 'done' && uploadState.failed.length > 0 && <div className="gallery-upload__failure" role="alert"><p className="gallery-upload__message error">{uploadState.total - uploadState.failed.length} av {uploadState.total} bilder laddades upp. {uploadState.failed.length} misslyckades — försök gärna igen.</p><ul className="gallery-upload__failed-list">{uploadState.failed.map((file) => <li key={file.name}>{file.name}</li>)}</ul><button type="button" className="btn btn--ghost gallery-upload__retry" onClick={() => uploadFiles(uploadState.failed)}>Försök igen</button></div>}</div><div className="gallery">{allPhotos.map((photo, index) => <button className={`ph ${photo.className || ''}`} key={photo.src} onClick={() => setSelectedIndex(index)}><img src={photo.src} alt={photo.alt} loading="lazy" /></button>)}</div>{loadStatus === 'loading' && <p className="gallery-status">Laddar bilder…</p>}{loadStatus === 'error' && <p className="gallery-status gallery-status--error">Kunde inte hämta bilderna just nu. Försök igen senare.</p>}{loadStatus === 'success' && drivePhotos.length === 0 && <p className="gallery-status">Inga bilder än — bli först att dela en!</p>}</div>{current && <div className="lightbox open" role="dialog" aria-modal="true" aria-label={current.alt} onClick={closeLightbox} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}><button className="lightbox__close" onClick={closeLightbox} aria-label="Stäng">×</button>{allPhotos.length > 1 && <button className="lightbox__nav lightbox__nav--prev" onClick={(event) => { event.stopPropagation(); goPrev(); }} aria-label="Föregående bild">‹</button>}<div className="ph" onClick={(event) => event.stopPropagation()}><img src={current.lightboxSrc} alt={current.alt} /></div>{allPhotos.length > 1 && <button className="lightbox__nav lightbox__nav--next" onClick={(event) => { event.stopPropagation(); goNext(); }} aria-label="Nästa bild">›</button>}{allPhotos.length > 1 && <p className="lightbox__position">{selectedIndex + 1} / {allPhotos.length}</p>}</div>}</section>;
}
