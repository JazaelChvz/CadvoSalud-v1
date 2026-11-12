import React, { useEffect, useState } from 'react';

const API = 'http://127.0.0.1:8000/api/demo';

export default function DemoRecords() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState('');
  const [reviews, setReviews] = useState([]);
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('5');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refreshReviews() {
    const response = await fetch(`${API}/reviews`);
    if (!response.ok) throw new Error('No fue posible cargar las opiniones.');
    setReviews(await response.json());
  }
  useEffect(() => {
    fetch(`${API}/records`).then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => { setRecords(data); if (data.length) setSelected(String(data[0].id)); }).catch(() => setError('No se pudieron cargar los expedientes de ejemplo.'));
    refreshReviews().catch(() => setError('No se pudieron cargar las opiniones.'));
  }, []);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch(`${API}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: author.trim(), comment: comment.trim(), rating: Number(rating) }) });
      if (!response.ok) throw new Error('Revisa el nombre ficticio y la opinión (mínimo cinco caracteres).');
      setAuthor(''); setComment(''); await refreshReviews();
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  const record = records.find(item => String(item.id) === selected);
  return <>
    <section id="expedientes" className="section demo-section"><div className="section-head"><div><div className="eyebrow">MATERIAL DE DEMOSTRACIÓN</div><h2>Historiales y laboratorios ficticios</h2><p>Datos inventados sin significado clínico. El acceso no es privado y no está vinculado al usuario de demostración.</p></div></div>
      <div className="demo-panel"><label>Selecciona un paciente ficticio<select value={selected} onChange={event => setSelected(event.target.value)}>{records.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{record && <><p><strong>Año de nacimiento ficticio:</strong> {record.birth_year} · <strong>Alergias:</strong> {record.allergies}</p><p>{record.notes}</p><div className="demo-columns"><div><h3>Historial de visitas</h3>{record.visits.map((visit, index) => <article className="demo-entry" key={index}><strong>{visit.visit_date} · {visit.specialty}</strong><p>{visit.summary}</p></article>)}</div><div><h3>Estudios de laboratorio</h3>{record.labs.map((lab, index) => <article className="demo-entry" key={index}><strong>{lab.lab_date} · {lab.title}</strong><p>{lab.result}</p></article>)}</div></div></>}</div>
    </section>
    <section id="opiniones" className="section demo-section"><div className="section-head"><div><div className="eyebrow">COMPARTE TU EXPERIENCIA</div><h2>Opiniones de demostración</h2><p>Comentarios ficticios sobre el prototipo, no sobre establecimientos ni valoraciones de Google. Son visibles para cualquier persona con acceso a esta aplicación local.</p></div></div><div className="demo-columns"><form className="demo-panel" onSubmit={submit}><label>Nombre ficticio<input value={author} onChange={event => setAuthor(event.target.value)} maxLength={60} required minLength={2} /></label><label>Calificación<select value={rating} onChange={event => setRating(event.target.value)}>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value} de 5</option>)}</select></label><label>Opinión ficticia<textarea value={comment} onChange={event => setComment(event.target.value)} maxLength={500} minLength={5} required rows={4} placeholder="No incluyas datos personales o médicos." /></label><button className="demo-button" disabled={busy}>Guardar opinión</button><p className="privacy-note">No incluyas información real, sensible ni comentarios sobre terceros.</p></form><div className="demo-panel"><h3>Opiniones guardadas</h3>{!reviews.length && <p>Aún no hay opiniones de demostración.</p>}{reviews.map(review => <article className="demo-entry" key={review.id}><strong>{review.author} · {review.rating}/5</strong><p>{review.comment}</p><small>{review.created_at} UTC</small></article>)}</div></div>{error && <p role="alert" className="login-error">{error}</p>}</section>
  </>;
}
