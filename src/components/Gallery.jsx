import { useEffect, useRef, useState } from 'react';

const PHOTO_UPLOAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwPGnvcb_uHdbTlVKr6D7jnvsHfwzD7T0VtsD_jBDZ-iUBWAdceLjbGzvfAlz3QltAZDQ/exec';
const idleUpload = { phase: 'idle', total: 0, current: 0, completed: 0, currentFileName: '', stage: '', failed: [] };
const SWIPE_THRESHOLD = 50;
const PAGE_SIZE = 10;
const SKELETON_COUNT = 8;
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;
const REVEAL_ROOT_MARGIN = '400px 0px';
const REVEAL_STAGGER_MS = 120;

const withThumbSize = (url, width) => url.replace(/([?&]sz=)w\d+/, `$1w${width}`);
const toLightboxUrl = (url) => withThumbSize(url, 1600);

const getMosaicClass = (index) => {
  const pos = index % 6;
  if (pos === 0) return 'g-wide';
  if (pos === 3) return 'g-tall';
  return '';
};

const getSizesAttr = (index) => (getMosaicClass(index) === 'g-wide' ? '(max-width: 760px) 96vw, 46vw' : '(max-width: 760px) 48vw, 23vw');

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

const toJpegFileName = (name) => name.replace(/\.[^./]+$/, '') + '.jpg';

// Reads the EXIF Orientation tag (0x0112) straight out of the JPEG's APP1 segment.
// Canvas drawImage() does not reliably auto-rotate, so this is applied explicitly below.
const readJpegOrientation = async (file) => {
  if (file.type !== 'image/jpeg') return 1;
  try {
    const buffer = await file.slice(0, 131072).arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0, false) !== 0xffd8) return 1;
    let offset = 2;
    while (offset < view.byteLength - 1) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffe1) {
        if (view.getUint32(offset + 2, false) !== 0x45786966) return 1;
        const tiffOffset = offset + 8;
        const little = view.getUint16(tiffOffset, false) === 0x4949;
        const firstIfdOffset = view.getUint32(tiffOffset + 4, little);
        const dirStart = tiffOffset + firstIfdOffset;
        const entryCount = view.getUint16(dirStart, little);
        for (let i = 0; i < entryCount; i++) {
          const entryOffset = dirStart + 2 + i * 12;
          if (view.getUint16(entryOffset, little) === 0x0112) return view.getUint16(entryOffset + 8, little);
        }
        return 1;
      }
      if ((marker & 0xff00) !== 0xff00) break;
      offset += view.getUint16(offset, false);
    }
  } catch {
    return 1;
  }
  return 1;
};

// Standard EXIF orientation -> canvas transform table (values 1-8).
const applyOrientationTransform = (ctx, orientation, width, height) => {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, height, width); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
    default: break;
  }
};

// Resizes + re-encodes one image at a time (caller awaits sequentially). Skips files that are
// already small and need no rotation fix. Returns original/converted sizes for diagnostics.
const resizeImage = async (file) => {
  const orientation = await readJpegOrientation(file);
  const objectUrl = URL.createObjectURL(file);
  let img;
  try {
    img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Image decode failed'));
      image.src = objectUrl;
    });

    const longestEdge = Math.max(img.naturalWidth, img.naturalHeight);
    const needsRotation = orientation !== 1;
    if (longestEdge <= MAX_DIMENSION && !needsRotation) {
      return { file, originalSize: file.size, convertedSize: file.size, converted: false };
    }

    const scale = Math.min(1, MAX_DIMENSION / longestEdge);
    const drawWidth = Math.round(img.naturalWidth * scale);
    const drawHeight = Math.round(img.naturalHeight * scale);
    const swapped = orientation >= 5 && orientation <= 8;

    const canvas = document.createElement('canvas');
    canvas.width = swapped ? drawHeight : drawWidth;
    canvas.height = swapped ? drawWidth : drawHeight;
    const ctx = canvas.getContext('2d');
    applyOrientationTransform(ctx, orientation, drawWidth, drawHeight);
    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    canvas.width = 0;
    canvas.height = 0; // release the canvas's pixel buffer immediately (iOS Safari memory)

    if (!blob) return { file, originalSize: file.size, convertedSize: file.size, converted: false };
    const converted = new File([blob], toJpegFileName(file.name), { type: 'image/jpeg' });
    return { file: converted, originalSize: file.size, convertedSize: converted.size, converted: true };
  } finally {
    if (img) img.src = '';
    URL.revokeObjectURL(objectUrl);
  }
};

const markLoaded = (event) => {
  event.currentTarget.classList.add('is-loaded');
  console.log(`[gallery-diag] loaded: ${event.currentTarget.currentSrc || event.currentTarget.src}`);
};

export default function Gallery() {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [uploadState, setUploadState] = useState(idleUpload);
  const [drivePhotos, setDrivePhotos] = useState([]);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [revealed, setRevealed] = useState(() => new Set());
  const [failedImages, setFailedImages] = useState(() => new Set());
  const galleryInputRef = useRef(null);
  const touchStartXRef = useRef(null);
  const revealObserverRef = useRef(null);

  const allPhotos = drivePhotos.map((photo) => ({ driveUrl: photo.url, lightboxSrc: toLightboxUrl(photo.url), alt: photo.name }));
  const visiblePhotos = allPhotos.slice(0, visibleCount);
  const hasMore = allPhotos.length > visibleCount;
  const showSkeleton = loadStatus === 'loading' && drivePhotos.length === 0;
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

  // Explicit, staggered reveal: a tile's <img> only mounts once it's near the viewport, and
  // simultaneously-intersecting tiles (e.g. the whole first batch on initial load) are revealed
  // with a small delay between each rather than all firing their network request at once.
  useEffect(() => {
    revealObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        const driveUrl = entry.target.dataset.driveUrl;
        revealObserverRef.current.unobserve(entry.target);
        window.setTimeout(() => {
          setRevealed((prev) => (prev.has(driveUrl) ? prev : new Set(prev).add(driveUrl)));
        }, i * REVEAL_STAGGER_MS);
      });
    }, { rootMargin: REVEAL_ROOT_MARGIN, threshold: 0.01 });
    return () => revealObserverRef.current?.disconnect();
  }, []);

  const observeTile = (node, driveUrl) => {
    if (!node || !revealObserverRef.current) return;
    node.dataset.driveUrl = driveUrl;
    revealObserverRef.current.observe(node);
  };

  // TEMPORARY DIAGNOSTIC LOGGING — remove once the iPhone rendering issue is confirmed fixed.
  // Resource Timing exposes the real network outcome (status/size/duration) for each thumbnail
  // request without firing a duplicate request, letting us tell network failures (403/429) apart
  // from rendering failures (request succeeds, image never paints).
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.name.includes('drive.google.com/thumbnail')) return;
        const status = entry.responseStatus || 'unknown (no Timing-Allow-Origin from Drive)';
        console.log(`[gallery-diag] resource: ${entry.name} status=${status} transferSize=${entry.transferSize} duration=${Math.round(entry.duration)}ms`);
      });
    });
    observer.observe({ type: 'resource', buffered: true });
    return () => observer.disconnect();
  }, []);

  const handleImageError = (event, driveUrl) => {
    const img = event.currentTarget;
    const failingSrc = img.dataset.originalSrc || img.currentSrc || img.src;
    if (img.dataset.retried) {
      console.warn(`[gallery-diag] failed permanently after retry: ${failingSrc}`);
      setFailedImages((prev) => new Set(prev).add(driveUrl));
      return;
    }
    console.warn(`[gallery-diag] failed, retrying once in 1s: ${failingSrc}`);
    img.dataset.retried = 'true';
    img.dataset.originalSrc = failingSrc;
    window.setTimeout(() => {
      const bust = failingSrc.includes('?') ? '&' : '?';
      img.removeAttribute('srcset'); // force the browser to resolve `src` unambiguously on retry
      img.src = `${failingSrc}${bust}_retry=${Date.now()}`;
    }, 1000);
  };

  const fetchPhotos = async () => {
    setLoadStatus('loading');
    try {
      const response = await fetch(PHOTO_UPLOAD_ENDPOINT);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      const files = (data.files || []).filter((file) => !file.mimeType || file.mimeType.startsWith('image/'));
      setDrivePhotos(files);
      setLoadStatus('success');
    } catch {
      setLoadStatus('error');
    }
  };

  useEffect(() => { fetchPhotos(); }, []);

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploadState({ phase: 'uploading', total: files.length, current: 0, completed: 0, currentFileName: '', stage: 'processing', failed: [] });
    const failed = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadState((state) => ({ ...state, current: i + 1, currentFileName: file.name, stage: 'processing' }));
      let uploadFile = file;
      try {
        const result = await resizeImage(file);
        uploadFile = result.file;
        console.log(`[gallery-diag] ${file.name}: ${(result.originalSize / 1024).toFixed(0)}KB -> ${(result.convertedSize / 1024).toFixed(0)}KB ${result.converted ? '(converted)' : '(unchanged)'}`);
      } catch (err) {
        console.warn(`[gallery-diag] resize failed for ${file.name}, uploading original`, err);
      }
      setUploadState((state) => ({ ...state, stage: 'uploading' }));
      try {
        await uploadOne(uploadFile);
      } catch {
        failed.push(file);
      }
      setUploadState((state) => ({ ...state, completed: i + 1 }));
    }
    setUploadState({ phase: 'done', total: files.length, current: files.length, completed: files.length, currentFileName: '', stage: '', failed });
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

  return <section className="alt" id="galleri"><div className="wrap"><div className="section-head"><p className="kicker">Galleri</p><h2>Ögonblick</h2><p className="lead">Här fyller vi på med bilder före och efter den stora dagen.</p></div><div className="gallery-upload"><p className="gallery-upload__title">Dela era bilder från dagen</p>{isUploading && <div className="upload-progress" role="status" aria-live="polite"><p className="upload-progress__count">{uploadState.stage === 'processing' ? `Bearbetar bild ${uploadState.current} av ${uploadState.total}…` : `Laddar upp ${uploadState.current} av ${uploadState.total} bilder…`}</p><div className="upload-progress__bar"><div className="upload-progress__fill" style={{ width: `${(uploadState.completed / uploadState.total) * 100}%` }} /></div><p className="upload-progress__file">{uploadState.currentFileName}</p></div>}<div className="gallery-upload__actions"><input ref={galleryInputRef} className="gallery-upload__input" type="file" accept="image/*" multiple onChange={handleFileChange} disabled={isUploading} /><button className="gallery-upload__picker" type="button" onClick={() => galleryInputRef.current?.click()} disabled={isUploading}>Välj från galleriet</button></div><p className="gallery-upload__video-note">Har du filmat något? Filmer blir för stora för galleriet — skicka dem gärna till <a href="mailto:brollopemmaalexander@gmail.com?subject=Br%C3%B6llopsfilm">brollopemmaalexander@gmail.com</a> istället, så får vi se dem!</p>{uploadState.phase === 'done' && uploadState.failed.length === 0 && <p className="gallery-upload__message success" role="status">Klart! {uploadState.total} {uploadState.total === 1 ? 'bild' : 'bilder'} uppladdade 🎉</p>}{uploadState.phase === 'done' && uploadState.failed.length > 0 && <div className="gallery-upload__failure" role="alert"><p className="gallery-upload__message error">{uploadState.total - uploadState.failed.length} av {uploadState.total} bilder laddades upp. {uploadState.failed.length} misslyckades — försök gärna igen.</p><ul className="gallery-upload__failed-list">{uploadState.failed.map((file) => <li key={file.name}>{file.name}</li>)}</ul><button type="button" className="btn btn--ghost gallery-upload__retry" onClick={() => uploadFiles(uploadState.failed)}>Försök igen</button></div>}</div>{showSkeleton && <div className="gallery">{Array.from({ length: SKELETON_COUNT }).map((_, index) => <div className={`ph skeleton ${getMosaicClass(index)}`} key={index} />)}</div>}{!showSkeleton && drivePhotos.length > 0 && <div className="gallery-wrap"><div className="gallery">{visiblePhotos.map((photo, index) => <button className={`ph ${getMosaicClass(index)}`} key={photo.driveUrl} ref={(node) => observeTile(node, photo.driveUrl)} onClick={() => setSelectedIndex(index)}>{failedImages.has(photo.driveUrl) ? <span>Bild otillgänglig</span> : revealed.has(photo.driveUrl) ? <img className="fade-img" src={withThumbSize(photo.driveUrl, 800)} srcSet={`${withThumbSize(photo.driveUrl, 400)} 400w, ${withThumbSize(photo.driveUrl, 800)} 800w`} sizes={getSizesAttr(index)} alt={photo.alt} loading="lazy" onLoad={markLoaded} onError={(event) => handleImageError(event, photo.driveUrl)} /> : null}</button>)}</div>{hasMore && <div className="gallery-fade" />}</div>}{!showSkeleton && loadStatus === 'error' && drivePhotos.length === 0 && <p className="gallery-status gallery-status--error">Kunde inte hämta bilderna just nu. Försök igen senare.</p>}{!showSkeleton && loadStatus === 'success' && drivePhotos.length === 0 && <p className="gallery-status">Inga bilder än — bli först att dela ett minne!</p>}{hasMore && <button type="button" className="btn btn--ghost gallery-more" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Ladda fler bilder ({allPhotos.length - visibleCount} kvar)</button>}</div>{current && <div className="lightbox open" role="dialog" aria-modal="true" aria-label={current.alt} onClick={closeLightbox} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}><button className="lightbox__close" onClick={closeLightbox} aria-label="Stäng">×</button>{allPhotos.length > 1 && <button className="lightbox__nav lightbox__nav--prev" onClick={(event) => { event.stopPropagation(); goPrev(); }} aria-label="Föregående bild">‹</button>}<div className="ph" onClick={(event) => event.stopPropagation()}><img key={current.lightboxSrc} src={current.lightboxSrc} alt={current.alt} /></div>{allPhotos.length > 1 && <button className="lightbox__nav lightbox__nav--next" onClick={(event) => { event.stopPropagation(); goNext(); }} aria-label="Nästa bild">›</button>}{allPhotos.length > 1 && <p className="lightbox__position">{selectedIndex + 1} / {allPhotos.length}</p>}</div>}</section>;
}
