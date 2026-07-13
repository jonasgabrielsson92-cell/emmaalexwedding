import { useEffect, useRef } from 'react';

const links = [['#historia', 'Vår historia'], ['#schema', 'Schema'], ['#plats', 'Plats'], ['#boende', 'Boende'], ['#info', 'Info'], ['#galleri', 'Galleri'], ['#faq', 'FAQ']];

export default function Navigation({ menuOpen, onMenuToggle, onNavigate, scrolled }) {
  const navRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const updateNavHeight = () => document.documentElement.style.setProperty('--nav-height', `${nav.offsetHeight}px`);
    updateNavHeight();
    const observer = new ResizeObserver(updateNavHeight);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--nav-height');
    };
  }, []);

  return <nav ref={navRef} className={`nav${scrolled ? ' scrolled' : ''}`} id="nav">
    <a href="#hero" className="nav__brand" onClick={onNavigate}><span className="monogram">E<span className="amp">&amp;</span>A</span><span className="wordmark">Emma &amp; Alexander</span></a>
    <button className={`nav__toggle${menuOpen ? ' open' : ''}`} onClick={onMenuToggle} aria-label="Meny" aria-expanded={menuOpen}><span /><span /><span /></button>
    <div className={`nav__links${menuOpen ? ' open' : ''}`}>{links.map(([href, label]) => <a href={href} key={href} onClick={onNavigate}>{label}</a>)}<a href="#osa" onClick={onNavigate}>OSA</a></div>
  </nav>;
}
