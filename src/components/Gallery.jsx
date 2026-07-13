import { useEffect, useRef, useState } from 'react';

const PHOTO_UPLOAD_ENDPOINT = import.meta.env.VITE_PHOTO_UPLOAD_ENDPOINT;
const photos = [{ src: '/images/frieriet-alperna.jpg', alt: 'Förlovningsringen i Alperna', className: 'g-tall' }, { src: '/images/emma-ostron.jpg', alt: 'Emma med ostron i skärgården' }, { src: '/images/elsie.jpg', alt: 'Lilla Elsie' }, { src: '/images/alexander-ostron.jpg', alt: 'Alexander med ostron i skärgården', className: 'g-tall' }];

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function Gallery() {
  const [selected, setSelected] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => { const close = (event) => event.key === 'Escape' && setSelected(null); window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploadStatus('sending');
    try {
      if (!PHOTO_UPLOAD_ENDPOINT) throw new Error('Missing photo upload endpoint');
      await Promise.all(files.map(async (file) => {
        const data = await fileToBase64(file);
        const response = await fetch(PHOTO_UPLOAD_ENDPOINT, { method: 'POST', body: JSON.stringify({ fileName: file.name, mimeType: file.type, data }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
        if (!response.ok) throw new Error('Photo upload failed');
      }));
      setUploadStatus('success');
    } catch {
      setUploadStatus('error');
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    uploadFiles(files);
  };

  const isUploading = uploadStatus === 'sending';

  return <section className="alt" id="galleri"><div className="wrap"><div className="section-head"><p className="kicker">Galleri</p><h2>Ögonblick</h2><p className="lead">Här fyller vi på med bilder före och efter den stora dagen.</p></div><div className="gallery-upload"><p className="gallery-upload__title">Dela era bilder från dagen</p><div className="gallery-upload__actions"><input ref={cameraInputRef} className="gallery-upload__input" type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={isUploading} /><button className="gallery-upload__camera" type="button" onClick={() => cameraInputRef.current?.click()} disabled={isUploading}>{isUploading ? 'Laddar upp…' : '📸 Ta en bild'}</button><input ref={galleryInputRef} className="gallery-upload__input" type="file" accept="image/*" multiple onChange={handleFileChange} disabled={isUploading} /><button className="gallery-upload__picker" type="button" onClick={() => galleryInputRef.current?.click()} disabled={isUploading}>Välj från galleriet</button></div>{uploadStatus === 'success' && <p className="gallery-upload__message success" role="status">Bild uppladdad! 🎉</p>}{uploadStatus === 'error' && <p className="gallery-upload__message error" role="alert">Kunde inte ladda upp bilden. Försök igen.</p>}</div><div className="gallery">{photos.map((photo) => <button className={`ph ${photo.className || ''}`} key={photo.src} onClick={() => setSelected(photo)}><img src={photo.src} alt={photo.alt} /></button>)}</div></div>{selected && <div className="lightbox open" role="dialog" aria-modal="true" aria-label={selected.alt} onClick={() => setSelected(null)}><button className="lightbox__close" onClick={() => setSelected(null)} aria-label="Stäng">×</button><div className="ph" onClick={(event) => event.stopPropagation()}><img src={selected.src} alt={selected.alt} /></div></div>}</section>;
}
