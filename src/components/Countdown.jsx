import { useEffect, useState } from 'react';

const weddingDate = new Date('2027-06-12T14:00:00+02:00').getTime();
const getTimeLeft = () => { const diff = Math.max(0, weddingDate - Date.now()); return [Math.floor(diff / 86400000), Math.floor(diff % 86400000 / 3600000), Math.floor(diff % 3600000 / 60000), Math.floor(diff % 60000 / 1000)]; };

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  useEffect(() => { const timer = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000); return () => window.clearInterval(timer); }, []);
  return <section className="intro"><div className="wrap"><div className="divider"><span className="mark" /></div><p className="quote">&quot;Av alla människor, i all vår tid — valde vi varandra. Nu vill vi fira det med er.&quot;</p><div className="countdown">{['Dagar', 'Timmar', 'Minuter', 'Sekunder'].map((label, index) => <div className="count-cell" key={label}><div className="num">{index ? String(timeLeft[index]).padStart(2, '0') : timeLeft[index]}</div><div className="lab">{label}</div></div>)}</div></div></section>;
}
