import React from 'react';

export default function DirectoryBooking({ clues, busy, onChoose }) {
  return <div className="directory-booking">
    <button type="button" className="outline" disabled={busy} onClick={() => onChoose(clues)}>
      Solicitar cita de demostración
    </button>
    <p className="privacy-note">Médicos y horarios ficticios; no se reserva una cita real ni se confirma relación con el centro.</p>
  </div>;
}
