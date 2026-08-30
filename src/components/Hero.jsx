export default function Hero() {
  return <header className="hero" id="hero">
    <div className="hero__frame" />
    <div className="hero__inner">
      <div className="hero__monogram">E<span className="amp">&amp;</span>A</div>
      <p className="hero__pre">Vi gifter oss</p>
      <h1 className="couple-names">Emma<span className="amp">&amp;</span>Alexander</h1>
      <div className="hero__meta"><div className="hero__date"><span className="hero__date-day">Fredag 11 juni</span><span className="hero__date-label">Välkomstmiddag</span></div><div className="hero__date"><span className="hero__date-day">Lördag 12 juni</span><span className="hero__date-label">Bröllopsdag</span></div><p className="hero__place">Svärdsjö kyrka, Falun</p></div>
      <div className="hero__actions"><a href="#osa" className="btn">OSA till bröllopet</a><a href="#schema" className="btn btn--ghost">Se schemat</a></div>
    </div>
    <div className="scroll-cue"><span>Bläddra</span><span className="bar" /></div>
  </header>;
}
