import React, { useEffect, useState } from 'react';
import { externalRatings } from './externalRatings.jsx';

export default function CenterReviews({ centers }) {
  const [clues, setClues] = useState('');
  const [reviews, setReviews] = useState([]);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const api = `http://127.0.0.1:8000/api/demo/centers/${encodeURIComponent(clues)}/reviews`;
  useEffect(() => { setClues(''); setReviews([]); setError(''); }, [centers]);
  useEffect(() => {
    if (!clues) return;
    const controller = new AbortController();
    setReviews([]); setError('');
    fetch(api, { signal: controller.signal }).then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(setReviews).catch(error => { if (error.name !== 'AbortError') setError('No se pudieron cargar las opiniones.'); });
    return () => controller.abort();
  }, [clues]);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author: author.trim(), comment: comment.trim(), rating: Number(rating) }) });
      if (!response.ok) throw new Error('No se pudo guardar la opinión; revisa los campos.');
      setAuthor(''); setComment('');
      const refreshed = await fetch(api);
      if (!refreshed.ok) throw new Error('Se guardó la opinión, pero no se pudo actualizar la lista.');
      setReviews(await refreshed.json());
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  if (!centers?.length) return null;
  return <section className="section demo-section" id="opiniones-centros"><div className="section-head"><div><div className="eyebrow">OPINIONES Y REFERENCIAS</div><h2>Opiniones por centro</h2><p>Selecciona un centro de los resultados mostrados. Las opiniones de demostración son ficticias y no representan experiencias reales ni valoraciones de Google.</p></div></div><div className="demo-panel"><label>Centro de salud<select value={clues} onChange={event => setClues(event.target.value)}><option value="">Selecciona un centro</option>{centers.map(center => <option key={center.clues} value={center.clues}>{center.name} · {center.municipality} · {center.clues}</option>)}</select></label>{clues && <div className="external-rating"><h3>Calificación de referencia externa</h3>{externalRatings[clues] ? <p>{externalRatings[clues].rating} de 5 · {externalRatings[clues].count} votos según <a href={externalRatings[clues].url} target="_blank" rel="noreferrer">{externalRatings[clues].source}</a>. Consultado el {externalRatings[clues].checked}. Dato puntual de un tercero, sin actualización ni verificación directa con Google Maps.</p> : <p>No hay una calificación externa verificada para este centro. Puedes consultar el enlace de Maps del directorio.</p>}</div>}{clues && <div className="demo-columns"><form onSubmit={submit}><label>Nombre ficticio<input value={author} onChange={event => setAuthor(event.target.value)} minLength={2} maxLength={60} required /></label><label>Calificación ficticia<select value={rating} onChange={event => setRating(event.target.value)}>{[5,4,3,2,1].map(value => <option value={value} key={value}>{value} de 5</option>)}</select></label><label>Comentario ficticio<textarea value={comment} onChange={event => setComment(event.target.value)} minLength={5} maxLength={500} required rows={3} placeholder="No incluyas datos personales, médicos ni hechos reales." /></label><button className="demo-button" disabled={busy}>Guardar opinión ficticia</button></form><div><h3>Opiniones ficticias guardadas</h3>{!reviews.length && <p>No hay opiniones para este centro.</p>}{reviews.map(review => <article className="demo-entry" key={review.id}><strong>{review.author} · {review.rating}/5</strong><p>{review.comment}</p><small>{review.created_at} UTC · opinión ficticia</small></article>)}</div></div>}{error && <p role="alert">{error}</p>}</div></section>;
}
