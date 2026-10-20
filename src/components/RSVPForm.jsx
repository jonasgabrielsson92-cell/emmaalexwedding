import { useState } from 'react';

const GOOGLE_SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz5Wc9NEh1caJan6GGR4PN3DHk94uuOd7qJuMJM8YQvrEPQ7twAwsMKwSZc6ROnCBkZ/exec';
const initialForm = { name: '', email: '', attending: '', dietaryNotes: '', busPlats: false, message: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Backend tolkar svar som börjar med "Ja" som ja – behåll den inledningen i etiketterna.
const ATTENDANCE_OPTIONS = [{ value: 'bada', label: 'Ja, jag kommer båda dagarna', detail: 'Fredag & lördag', friday: true }, { value: 'lordag', label: 'Ja, men bara på lördagen', detail: 'Bröllopsdagen', friday: false }, { value: 'nej', label: 'Nej, jag kan tyvärr inte komma', friday: false }];

const getFirstName = (fullName) => fullName.trim().split(/\s+/)[0] || '';

export default function RSVPForm() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [confirmedName, setConfirmedName] = useState('');

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setForm((current) => (name === 'attending' && value === 'nej' ? { ...current, attending: value, dietaryNotes: '', busPlats: false } : { ...current, [name]: nextValue }));
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Ange ditt namn.';
    if (!form.email.trim()) next.email = 'Ange din e-postadress.';
    else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Ange en giltig e-postadress.';
    if (!form.attending) next.attending = 'Välj om och vilka dagar du kommer.';
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setStatus('sending');
    const attendance = ATTENDANCE_OPTIONS.find((option) => option.value === form.attending);
    try {
      await fetch(GOOGLE_SHEET_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), attending: attendance.label.startsWith('Ja') ? attendance.label : 'Nej', fridayAttending: attendance.friday, dietaryNotes: form.dietaryNotes, busPlats: form.busPlats, message: form.message }) });
      setConfirmedName(form.name.trim());
      setStatus('success');
      setForm(initialForm);
    } catch {
      setStatus('error');
    }
  };

  const isSending = status === 'sending';
  const firstName = getFirstName(confirmedName);

  return <section className="rsvp" id="osa"><div className="wrap">{status === 'success' ? <div className="form-success show" role="status"><div className="seal">♡</div><h3>Tack{firstName ? `, ${firstName}` : ''}!</h3><p>Vi har tagit emot ditt svar. En bekräftelse är skickad till din e-post.</p><p className="form-success__note">Dyker den inte upp i inkorgen? Kolla gärna skräpposten — och markera den gärna som "inte skräppost" så att kommande mejl från oss hamnar rätt.</p></div> : <><div className="section-head"><p className="kicker">OSA</p><h2>Kommer ni?</h2><div className="divider"><span className="mark" /></div><p className="lead">Fyll i formuläret per person och svara senast <strong>1 februari 2027</strong>.</p><p className="lead">Kommer ni som par? Så roligt! Fyll ändå i ett formulär var, så att vi får med allas svar, allergier och önskemål.</p></div><form className="form" onSubmit={submit} noValidate><div className={`field${errors.name ? ' error' : ''}`}><label htmlFor="name">Namn <span className="req">*</span></label><input id="name" name="name" value={form.name} onChange={update} /><span className="err-msg">{errors.name}</span></div><div className={`field${errors.email ? ' error' : ''}`}><label htmlFor="email">E-post <span className="req">*</span></label><input id="email" name="email" type="email" value={form.email} onChange={update} /><span className="err-msg">{errors.email}</span><p className="hint">Vi skickar en bekräftelse hit.</p></div><div className={`field${errors.attending ? ' error' : ''}`}><label>Kommer du? <span className="req">*</span></label><p className="hint attend__hint">Fredagen den 11 juni är välkomstmiddag och lördagen den 12 juni är själva bröllopet.</p><div className="attend attend--three">{ATTENDANCE_OPTIONS.map(({ value, label, detail }) => <label key={value}><input type="radio" name="attending" value={value} checked={form.attending === value} onChange={update} /><span className="opt">{label}{detail && <small>{detail}</small>}</span></label>)}</div><span className="err-msg">{errors.attending}</span></div><div className={`guest-extra${form.attending && form.attending !== 'nej' ? ' show' : ''}`}><div className="field"><label htmlFor="dietaryNotes">Allergier eller matpreferenser</label><input id="dietaryNotes" name="dietaryNotes" value={form.dietaryNotes} onChange={update} placeholder="Till exempel vegetarisk eller allergi" /><p className="hint">Gäller alla måltider du är med på – både välkomstmiddagen på fredagen och bröllopsmiddagen på lördagen.</p></div><div className="field"><label className="check-label"><input type="checkbox" name="busPlats" checked={form.busPlats} onChange={update} /><span>Jag önskar plats på bussen till och från kyrkan</span></label></div></div><div className="field"><label htmlFor="message">Meddelande till brudparet</label><textarea id="message" name="message" value={form.message} onChange={update} /></div><button className="btn form__submit" disabled={isSending}>{isSending ? 'Skickar…' : 'Skicka OSA'}</button>{status === 'error' && <p className="form-message error" role="alert">Något gick fel. Försök igen eller kontakta oss via mejl.</p>}</form></>}</div></section>;
}
