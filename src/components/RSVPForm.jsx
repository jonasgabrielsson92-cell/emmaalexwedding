import { useState } from 'react';

// Replace this with the deployed Google Apps Script Web App URL before publishing.
const GOOGLE_SHEET_ENDPOINT = 'https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec';
const initialForm = { name: '', email: '', attending: '', dietaryNotes: '', message: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RSVPForm() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => (name === 'attending' && value === 'nej' ? { ...current, attending: value, dietaryNotes: '' } : { ...current, [name]: value }));
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Ange ditt namn.';
    if (!form.email.trim()) next.email = 'Ange din e-postadress.';
    else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Ange en giltig e-postadress.';
    if (!form.attending) next.attending = 'Välj om du kommer.';
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setStatus('sending');
    try {
      await fetch(GOOGLE_SHEET_ENDPOINT, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), attending: form.attending, dietaryNotes: form.dietaryNotes, message: form.message }) });
      setStatus('success');
      setForm(initialForm);
    } catch {
      setStatus('error');
    }
  };

  const isSending = status === 'sending';

  return <section className="rsvp" id="osa"><div className="wrap"><div className="section-head"><p className="kicker">OSA</p><h2>Kommer ni?</h2><div className="divider"><span className="mark" /></div><p className="lead">Fyll i formuläret per person och svara senast <strong>1 april 2027</strong>.</p><p className="lead">Kommer ni som par? Så roligt! Fyll ändå i ett formulär var, så att vi får med allas svar, allergier och önskemål.</p></div><form className="form" onSubmit={submit} noValidate><div className={`field${errors.name ? ' error' : ''}`}><label htmlFor="name">Namn <span className="req">*</span></label><input id="name" name="name" value={form.name} onChange={update} /><span className="err-msg">{errors.name}</span></div><div className={`field${errors.email ? ' error' : ''}`}><label htmlFor="email">E-post <span className="req">*</span></label><input id="email" name="email" type="email" value={form.email} onChange={update} /><span className="err-msg">{errors.email}</span><p className="hint">Vi skickar en bekräftelse hit.</p></div><div className={`field${errors.attending ? ' error' : ''}`}><label>Kommer du? <span className="req">*</span></label><div className="attend">{[['ja', 'Ja, jag kommer'], ['nej', 'Nej, jag kan tyvärr inte komma']].map(([value, label]) => <label key={value}><input type="radio" name="attending" value={value} checked={form.attending === value} onChange={update} /><span className="opt">{label}</span></label>)}</div><span className="err-msg">{errors.attending}</span></div><div className={`guest-extra${form.attending === 'ja' ? ' show' : ''}`}><div className="field"><label htmlFor="dietaryNotes">Allergier eller matpreferenser</label><input id="dietaryNotes" name="dietaryNotes" value={form.dietaryNotes} onChange={update} placeholder="Till exempel vegetarisk eller allergi" /></div></div><div className="field"><label htmlFor="message">Meddelande till brudparet</label><textarea id="message" name="message" value={form.message} onChange={update} /></div><button className="btn form__submit" disabled={isSending}>{isSending ? 'Skickar…' : 'Skicka OSA'}</button>{status === 'success' && <p className="form-message success" role="status">Tack! Vi har tagit emot ditt svar och skickat en bekräftelse till din e-post.</p>}{status === 'error' && <p className="form-message error" role="alert">Något gick fel. Försök igen eller kontakta oss via mejl.</p>}</form></div></section>;
}
