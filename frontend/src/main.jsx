import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import './blue.css';
import Chat from './Chat';
import DemoRecords from './DemoRecords';
import CenterReviews from './CenterReviews';
import ExternalRating, { VerificationNotice } from './externalRatings.jsx';
import DirectoryBooking from './DirectoryBooking.jsx';

const API = 'http://127.0.0.1:8000/api';
async function request(path, options) {
  const response = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.detail || 'No se pudo completar la operación.'); }
  return response.json();
}
const formatDate = value => new Date(value).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function App() {
  const [entered, setEntered] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [catalog, setCatalog] = useState({ clinics: [], doctors: [] });
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [role, setRole] = useState('patient');
  const [doctor, setDoctor] = useState('');
  const [bookingClinic, setBookingClinic] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [patient, setPatient] = useState('');
  const [message, setMessage] = useState('');
  const [alternatives, setAlternatives] = useState(null);
  const [busy, setBusy] = useState(false);
  const [states, setStates] = useState([]);
  const [state, setState] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [search, setSearch] = useState('');
  const [directory, setDirectory] = useState(null);
  const [page, setPage] = useState(1);
  const [directoryError, setDirectoryError] = useState('');
  const [sort, setSort] = useState('name');
  const [appliedOrder, setAppliedOrder] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [hasPhone, setHasPhone] = useState(false);

  async function refresh() {
    const [c, s, a] = await Promise.all([request('/catalog'), request('/slots'), request('/appointments')]);
    setCatalog(c); setSlots(s); setAppointments(a);
  }
  useEffect(() => { refresh().catch(() => setMessage('No se pudo conectar con el servidor. Comprueba que FastAPI esté en ejecución.')); }, []);
  useEffect(() => { request('/directory/states').then(setStates).catch(() => setDirectoryError('El directorio nacional no está disponible.')); }, []);
  async function findCenters(targetPage = 1) {
    if (!state) { setDirectoryError('Selecciona un estado.'); return; }
    try {
      if (sort === 'nearest' && !coordinates) { setDirectoryError('Primero pulsa «Usar mi ubicación» para ordenar por cercanía.'); return; }
      const query = new URLSearchParams({ state, municipality, search, page: String(targetPage), sort, has_phone: String(hasPhone), ...(sort === 'nearest' ? coordinates : {}) });
      const result = await request('/directory/centers?' + query);
      setDirectory({ ...result, nearby: false }); setPage(targetPage); setDirectoryError('');
      setAppliedOrder(sort === 'nearest' ? 'Resultados ordenados por cercanía aproximada a tu ubicación. Los centros sin coordenadas válidas aparecen al final.' : 'Resultados ordenados alfabéticamente por municipio y, dentro de cada municipio, por nombre del centro.');
    } catch (error) { setDirectoryError(error.message); }
  }
  function useLocation() {
    setDirectoryError('');
    if (!window.isSecureContext) { setDirectoryError('La ubicación requiere una conexión segura. En esta computadora abre http://localhost:5173 o http://127.0.0.1:5173. También puedes buscar manualmente.'); return; }
    if (!navigator.geolocation) { setDirectoryError('Este navegador no ofrece acceso a la ubicación. Selecciona un estado manualmente.'); return; }
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        setCoordinates({ lat: position.coords.latitude, lon: position.coords.longitude });
        const query = new URLSearchParams({ lat: position.coords.latitude, lon: position.coords.longitude });
        const result = await request('/directory/nearby?' + query);
        setDirectory({ ...result, nearby: true });
        setAppliedOrder('Resultados cercanos aproximados dentro de un área alrededor de tu ubicación, ordenados por cercanía; se muestran hasta 20.');
      } catch (error) { setDirectoryError(error.message); }
    }, error => {
      if (error.code === 1) setDirectoryError('Permiso de ubicación denegado. Revisa el permiso del sitio en tu navegador y la configuración de ubicación de Windows. También puedes buscar por estado y municipio.');
      else if (error.code === 2) setDirectoryError('No se pudo determinar la ubicación. Comprueba que el servicio de ubicación de Windows esté activado o busca por estado y municipio.');
      else if (error.code === 3) setDirectoryError('La ubicación tardó demasiado. Inténtalo de nuevo o busca por estado y municipio.');
      else setDirectoryError('No se pudo obtener la ubicación. Puedes buscar por estado y municipio.');
    }, { timeout: 20000, maximumAge: 300000 });
  }
  async function act(callback) {
    setBusy(true); setMessage('');
    try { await callback(); await refresh(); } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  const post = (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) });
  function book(slotId) {
    if (patient.trim().length < 2) { setMessage('Escribe un nombre ficticio de al menos dos caracteres.'); return; }
    act(async () => { await post('/appointments', { slot_id: slotId, patient_name: patient }); setAlternatives(null); setMessage('Solicitud simulada enviada. Falta la confirmación de recepción y del médico.'); });
  }
  async function chooseDirectoryCenter(clues) {
    setBusy(true);
    setDirectoryError('');
    try {
      const result = await post(`/demo/centers/${encodeURIComponent(clues)}/booking`, {});
      await refresh();
      setBookingClinic(String(result.clinic_id));
      setSpecialty('');
      setDoctor('');
      setAlternatives(null);
      setMessage('Centro seleccionado para demostración. El médico y los horarios son ficticios.');
      document.getElementById('horarios')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      setDirectoryError(error.message);
    } finally {
      setBusy(false);
    }
  }
  function decide(id, action, selectedRole = role) {
    act(async () => {
      await post(`/appointments/${id}/decision`, { role: selectedRole, action });
      if (action === 'reject' || action === 'cancel') {
        const choices = await request(`/appointments/${id}/alternatives`);
        setAlternatives({ id, choices });
        setMessage('La cita fue ' + (action === 'reject' ? 'rechazada' : 'cancelada') + '. Revisa las alternativas disponibles.');
      } else setMessage('Confirmación registrada.');
    });
  }
  const selectedDoctor = catalog.doctors.find(d => String(d.id) === doctor);
  const clinicDoctors = catalog.doctors.filter(d => String(d.clinic_id) === bookingClinic);
  const specialties = [...new Set(clinicDoctors.map(d => d.specialty))];
  const matchingDoctors = clinicDoctors.filter(d => d.specialty === specialty);
  const shownSlots = doctor ? slots.filter(s => String(s.doctor_id) === doctor) : [];

  if (!entered) return <div className="login-page"><div className="login-layout"><section className="login-intro"><a className="brand" href="#"><span>Cadvo<span>Salud</span><small>PROTOTIPO EDUCATIVO</small></span></a><div><div className="eyebrow">BIENVENIDO A CADVOSALUD</div><h1>Tu salud, más cerca de ti.</h1><p>Explora centros de salud y conoce cómo funcionaría una solicitud de cita.</p><p className="login-disclaimer">Fotografía ilustrativa · No se realizan citas reales.</p></div></section><section className="login-panel"><form onSubmit={event => { event.preventDefault(); if (demoName.trim().length < 2) { setLoginError('Escribe un nombre ficticio de al menos dos caracteres.'); return; } setPatient(demoName.trim()); setLoginError(''); setEntered(true); }}><div className="eyebrow">ENTORNO DE DEMOSTRACIÓN</div><h2>Ingresa al prototipo</h2><p>Elige un perfil y utiliza un nombre ficticio para explorar la aplicación.</p><label>Nombre ficticio<input value={demoName} onChange={e => setDemoName(e.target.value)} maxLength={80} placeholder="Ej. Usuario Ejemplo" autoComplete="off" /></label><label>Perfil de demostración<select value={role} onChange={e => setRole(e.target.value)}><option value="patient">Paciente</option><option value="reception">Recepción</option><option value="doctor">Médico</option></select></label>{loginError && <p role="alert" className="login-error">{loginError}</p>}<button type="submit" className="login-submit">Entrar a la demostración</button><p className="login-warning"><strong>Este acceso no es un inicio de sesión seguro.</strong> No uses datos ni contraseñas reales. Los perfiles pueden cambiarse libremente y no protegen la información.</p><p className="login-warning">En una emergencia real llama al <strong>911</strong>.</p></form></section></div></div>;

  return <div className="layout">
    <header><div className="top"><a className="brand" href="#inicio"><span>Cadvo<span>Salud</span><small>PROTOTIPO EDUCATIVO</small></span></a><nav><a href="#especialistas">Especialistas</a><a href="#centros">Centros médicos</a><a href="#citas">Mis citas</a></nav><button className="location switch-user" onClick={() => setEntered(false)}>Cambiar perfil</button></div></header>
    <div className="notice">DEMOSTRACIÓN: datos y horarios ficticios. No se realizan reservas reales. En una emergencia llama al <strong>911</strong>.</div>
    <main id="inicio">
      <section className="hero"><div><div className="eyebrow">CUIDARTE EMPIEZA AQUÍ</div><h1>Tu próxima cita,<br/><em>más cerca de ti.</em></h1><p>Encuentra especialistas, conoce los centros médicos y explora cómo solicitar una cita, todo en un solo lugar.</p><div className="hero-actions"><a className="button" href="#especialistas">Explorar especialistas</a><a className="text-link" href="#centros">Conocer centros</a></div><div className="hero-foot">Una experiencia diseñada para acompañarte</div></div><div className="hero-art"><img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1000&q=80" alt="Personal de salud en un consultorio" /><div className="art-card"><div><strong>Tu bienestar importa</strong><small>Información clara, en un solo lugar</small></div></div></div></section>
      <section className="quick"><div><span>01</span><strong>Explora</strong><small>Conoce los centros</small></div><div><span>02</span><strong>Elige</strong><small>Especialista y horario</small></div><div><span>03</span><strong>Solicita</strong><small>Espera ambas confirmaciones</small></div><div className="quick-note"><span>Atención más simple,<br/><b>para todos.</b></span></div></section>
      <div className="sort-options"><label>Orden del directorio (elige uno)<select value={sort} onChange={event => setSort(event.target.value)}><option value="name">Municipio y nombre</option><option value="nearest">Más cercanos (requiere ubicación)</option><option disabled>Mejor valorados en Google — no disponible</option><option disabled>Mayor disponibilidad — no disponible</option></select></label><p className="privacy-note">Para ordenar por cercanía, pulsa «Usar mi ubicación» en la sección de centros y después «Buscar centros». Las coordenadas son aproximadas. Valoraciones de Google y disponibilidad requieren fuentes externas verificadas.</p><a className="text-link" href="#centros">Ir al directorio de centros</a></div>
      <div className="directory-extra-filter"><label><input type="checkbox" checked={hasPhone} onChange={event => setHasPhone(event.target.checked)} /> Mostrar solo centros con teléfono registrado en CLUES</label><p className="privacy-note">Se aplica al buscar por estado; confirma el número antes de llamar.</p></div>
      <div className="order-explanation"><strong>¿Cómo se ordenan los centros?</strong><p>Por defecto, alfabéticamente por municipio y nombre. Si eliges cercanía y autorizas tu ubicación, se usa la distancia aproximada según las coordenadas del catálogo CLUES; los centros sin coordenadas válidas quedan al final.</p><p>Las opiniones ficticias no modifican el orden. No utilizamos calificaciones de Google ni disponibilidad real. Cambia el criterio y pulsa «Buscar centros» para aplicarlo.</p>{appliedOrder && <p role="status"><strong>Orden aplicado a los resultados actuales:</strong> {appliedOrder}</p>}</div>
      {message && <div className="message" role="status">{message}</div>}
      <section id="especialistas" className="section"><div className="section-head"><div><div className="eyebrow">ENCUENTRA ATENCIÓN</div><h2>Especialistas para ti</h2><p>Perfiles ficticios y fotografías ilustrativas: no representan a los profesionales reales.</p></div><span className="pill">Perfiles ficticios</span></div><div className="cards">{catalog.doctors.map((d, i) => <article className="doctor-card" key={d.id}><div className="avatar"><img src={['https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80','https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=600&q=80','https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=600&q=80'][i % 3]} alt="Fotografía ilustrativa de personal médico" /></div><div className="card-body"><span className="badge">{d.specialty}</span><h3>{d.name}</h3><p>{catalog.clinics.find(c => c.id === d.clinic_id)?.name} · demostración</p><button className="outline" onClick={() => { setBookingClinic(String(d.clinic_id)); setSpecialty(d.specialty); setDoctor(String(d.id)); setAlternatives(null); document.getElementById('horarios').scrollIntoView({ behavior: 'smooth' }); }}>Ver horarios</button></div></article>)}</div></section>
      <section id="horarios" className="booking"><div><div className="eyebrow">SOLICITA TU CITA</div><h2>Elige tu atención</h2><p>Elige un centro, el tipo de atención que buscas y un especialista. La solicitud y todos los horarios son de demostración; no se agenda una cita real.</p><label>Nombre ficticio<input value={patient} onChange={e => setPatient(e.target.value)} maxLength={80} placeholder="Ej. Paciente Ejemplo" /></label><label>1. Centro de demostración<select value={bookingClinic} onChange={e => { setBookingClinic(e.target.value); setSpecialty(''); setDoctor(''); setAlternatives(null); }}><option value="">Selecciona un centro</option>{catalog.clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{bookingClinic && <><label>2. ¿Qué tipo de atención buscas?<select value={specialty} onChange={e => { setSpecialty(e.target.value); setDoctor(''); setAlternatives(null); }}><option value="">Selecciona una especialidad</option>{specialties.map(item => <option key={item} value={item}>{item}</option>)}</select></label>{!specialties.length && <p>No hay especialidades de ejemplo para este centro.</p>}<p className="privacy-note">Si no sabes qué especialidad necesitas, consulta al centro o a un profesional de salud. No introduzcas síntomas ni datos médicos reales. Ante una emergencia, llama al 911.</p></>}{specialty && <><label>3. Especialista de demostración<select value={doctor} onChange={e => { setDoctor(e.target.value); setAlternatives(null); }}><option value="">Selecciona un especialista</option>{matchingDoctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>{!matchingDoctors.length && <p>No hay especialistas de ejemplo en esta especialidad.</p>}</>}</div><div className="slots"><strong>4. Horarios disponibles</strong><p>{selectedDoctor ? selectedDoctor.name : 'Selecciona un centro, una especialidad y un especialista para ver horarios ficticios.'}</p><div className="slot-grid">{shownSlots.slice(0, 16).map(s => <button key={s.id} disabled={busy} onClick={() => book(s.id)}>{formatDate(s.starts_at)}</button>)}</div>{doctor && !shownSlots.length && <p>No hay horarios de ejemplo disponibles.</p>}<p className="privacy-note">La solicitud requiere confirmación simulada de recepción y del médico.</p></div></section>
      <section id="centros" className="section"><div className="section-head"><div><div className="eyebrow">INFORMACIÓN ÚTIL</div><h2>Centros de salud en México</h2><p>Directorio nacional CLUES, corte octubre 2026. Confirma datos y servicios antes de acudir; no implica afiliación ni citas reales.</p><a className="text-link" href="http://www.dgis.salud.gob.mx/contenidos/intercambio/clues_gobmx.html" target="_blank" rel="noreferrer">Fuente: Secretaría de Salud — CLUES</a></div></div><div className="directory-filters"><label>Estado<select value={state} onChange={e => setState(e.target.value)}><option value="">Selecciona un estado</option>{states.map(s => <option key={s}>{s}</option>)}</select></label><label>Municipio<input value={municipality} onChange={e => setMunicipality(e.target.value)} placeholder="Nombre del municipio" /></label><label>Nombre del centro<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Opcional" /></label><button onClick={() => findCenters()}>Buscar centros</button><button onClick={useLocation}>Usar mi ubicación</button></div><p className="privacy-note">La ubicación solo se solicita al pulsar el botón y se envía al servidor local para buscar centros. No se guarda en la base de datos, pero puede aparecer en los registros del servidor. También puedes buscar manualmente.</p>{directoryError && <p role="alert">{directoryError}</p>}{directory && <><p className="privacy-note">{directory.nearby ? 'Resultados aproximados cercanos; las coordenadas pueden estar desactualizadas.' : `${directory.total} centros encontrados.`}</p><div className="centers">{directory.centers.map(c => <article key={c.clues}><div><h3>{c.name || 'Nombre no disponible'}</h3><p>{c.address || 'Dirección no disponible'} · {c.municipality}, {c.state}</p><p>Teléfono: {c.phone || 'No disponible'} · CLUES: {c.clues}</p><VerificationNotice clues={c.clues} /><DirectoryBooking clues={c.clues} busy={busy} onChoose={chooseDirectoryCenter} /><ExternalRating clues={c.clues} /><p>Ambulancia: <b>disponibilidad no verificada</b></p><div className="links"><a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${c.name} ${c.address} ${c.municipality} ${c.state} México`)} target="_blank" rel="noreferrer">Buscar en Maps</a></div></div></article>)}</div>{!directory.centers.length && <p>No se encontraron centros. Prueba otra búsqueda.</p>}{!directory.nearby && <div className="pagination"><button disabled={page <= 1} onClick={() => findCenters(page - 1)}>Anterior</button><span>Página {page}</span><button disabled={page * 20 >= directory.total} onClick={() => findCenters(page + 1)}>Siguiente</button></div>}</>}</section>
      <section id="citas" className="section appointments"><div className="section-head"><div><div className="eyebrow">PANEL DE DEMOSTRACIÓN</div><h2>Seguimiento de citas</h2><p>Selecciona un rol para probar el flujo. No existe inicio de sesión ni privacidad real.</p></div><select aria-label="Rol de demostración" value={role} onChange={e => setRole(e.target.value)}><option value="patient">Paciente</option><option value="reception">Recepción</option><option value="doctor">Médico</option></select></div>{!appointments.length && <div className="empty">Aún no hay solicitudes. Elige un horario para comenzar.</div>}{appointments.map(a => <article className="appointment" key={a.id}><div><span className={'status ' + a.status}>{a.status}</span><h3>{a.doctor_name} · {formatDate(a.starts_at)}</h3><p>{a.clinic_name} · Paciente ficticio: {a.patient_name}</p><small>Recepción: {a.reception_ok ? 'aprobada' : 'pendiente'} · Médico: {a.doctor_ok ? 'aprobada' : 'pendiente'}</small></div><div className="actions">{role === 'patient' && ['pendiente', 'confirmada'].includes(a.status) && <button disabled={busy} onClick={() => decide(a.id, 'cancel')}>Cancelar</button>}{role !== 'patient' && a.status === 'pendiente' && <><button disabled={busy || (role === 'doctor' ? a.doctor_ok : a.reception_ok)} onClick={() => decide(a.id, 'approve')}>Aprobar</button><button disabled={busy} onClick={() => decide(a.id, 'reject')}>Rechazar</button></>}{['cancelada','rechazada'].includes(a.status) && <button disabled={busy} onClick={() => act(async () => setAlternatives({ id: a.id, choices: await request(`/appointments/${a.id}/alternatives`) }))}>Ver alternativas</button>}</div></article>)}{alternatives && <div className="alternatives"><h3>Alternativas para la solicitud #{alternatives.id}</h3><p>Primero se muestran opciones del mismo día; elige una para solicitar una nueva cita.</p>{!alternatives.choices.length && <p>No hay alternativas disponibles en los horarios de ejemplo.</p>}<div className="slot-grid">{alternatives.choices.map(s => <button key={s.id} disabled={busy} onClick={() => book(s.id)}>{formatDate(s.starts_at)}</button>)}</div></div>}</section>
      <CenterReviews centers={directory?.centers} />
      <DemoRecords />
      <Chat />
    </main><footer><div><strong>CadvoSalud</strong><p>Un proyecto educativo, pensado para acercar la información de salud.</p></div><p>Prototipo independiente · México<br/>No sustituye la atención médica profesional.</p></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
