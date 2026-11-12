import React, { useState } from 'react';

export default function Chat() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(event) {
    event.preventDefault();
    const value = question.trim();
    if (value.length < 2) { setError('Escribe una pregunta de al menos dos caracteres.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: value }),
      });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(typeof body.detail === 'string' ? body.detail : 'No se pudo consultar la ayuda. Inténtalo de nuevo.'); }
      const answer = await response.json();
      setMessages(previous => [...previous, { question: value, ...answer }]);
      setQuestion('');
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }

  return <section id="ayuda" className="section chat-section">
    <div className="section-head"><div><div className="eyebrow">AYUDA PARA EL PACIENTE</div><h2>¿Tienes alguna duda?</h2><p>La IA local responde usando documentos ficticios de demostración. Puede cometer errores y no consulta información actual del hospital.</p></div></div>
    <div className="chat-box"><div className="chat-info"><strong>Asistente de ayuda</strong><p>No escribas nombres, síntomas ni otros datos personales o médicos. No ofrece diagnósticos ni atiende emergencias. En caso de emergencia, llama al 911.</p></div>
      <div className="chat-messages" aria-live="polite">{messages.length === 0 && <p className="chat-empty">Prueba: «¿Cómo solicito una cita de demostración?»</p>}{messages.map((message, index) => <div className="chat-exchange" key={index}><div className="chat-question"><strong>Tu pregunta</strong><p>{message.question}</p></div><div className="chat-answer"><strong>Ayuda de CadvoSalud</strong><p>{message.answer}</p>{message.sources.length > 0 && <p className="chat-source">Fuente: {message.sources.map(source => `${source.document} — ${source.section}`).join(', ')}</p>}<small>{message.notice}</small></div></div>)}</div>
      <form className="chat-form" onSubmit={send}><label htmlFor="chat-question">Tu pregunta</label><div><input id="chat-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Escribe una pregunta general" maxLength={500} autoComplete="off"/><button disabled={busy} type="submit">{busy ? 'Buscando…' : 'Consultar'}</button></div></form>{error && <p role="alert" className="login-error">{error}</p>}
    </div>
  </section>;
}
