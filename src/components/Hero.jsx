export default function Hero() {
  return <header className="hero" id="hero">
    <div className="hero__frame" />
    <div className="hero__inner">
      <div className="hero__monogram">E<span className="amp">&amp;</span>A</div>
      <p className="hero__pre">Vi gifter oss</p>
      <h1 className="couple-names">Emma<span className="amp">&amp;</span>Alexander</h1>
      <div className="hero__meta"><p className="hero__date">Fredag 11 juni – Välkomstmiddag</p><p className="hero__date">Lördag 12 juni – Bröllopsdag</p><p className="hero__place">Svärdsjö kyrka, Falun</p></div>
      <div className="hero__actions"><a href="#osa" className="btn">OSA till bröllopet</a><a href="#schema" className="btn btn--ghost">Se schemat</a></div>
    </div>
    <div className="scroll-cue"><span>Bläddra</span><span className="bar" /></div>
  </header>;
}
