from fastapi.testclient import TestClient
from backend import main
import sqlite3


def test_health(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB_PATH', tmp_path / 'test.db')
    with TestClient(main.app) as client:
        response = client.get('/health')
        assert response.status_code == 200
        assert response.json() == {'status': 'ok'}


def test_directory_excludes_closed_centers(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB_PATH', tmp_path / 'test.db')
    directory = tmp_path / 'directory.db'
    monkeypatch.setattr(main, 'DIRECTORY_PATH', directory)
    with sqlite3.connect(directory) as db:
        db.execute('CREATE TABLE centers (clues TEXT, state TEXT, municipality TEXT, locality TEXT, name TEXT, address TEXT, status TEXT, phone TEXT, latitude REAL, longitude REAL)')
        db.executemany('INSERT INTO centers VALUES (?,?,?,?,?,?,?,?,?,?)', [
            ('A', 'DURANGO', 'SANTIAGO', '', 'Centro abierto', '', 'EN OPERACION', '123', 25.0, -105.0),
            ('B', 'DURANGO', 'SANTIAGO', '', 'Centro cerrado', '', 'FUERA DE OPERACION', '', 25.0, -105.0),
            ('C', 'DURANGO', 'SANTIAGO', '', 'Centro sin teléfono', '', 'EN OPERACION', '', 25.1, -105.0),
        ])
    with TestClient(main.app) as client:
        result = client.get('/api/directory/centers', params={'state': 'DURANGO'}).json()
        assert result['total'] == 2
        assert result['centers'][0]['clues'] == 'A'
        nearby = client.get('/api/directory/nearby', params={'lat': 25, 'lon': -105}).json()
        assert [c['clues'] for c in nearby['centers']] == ['A', 'C']
        filtered = client.get('/api/directory/centers', params={'state': 'DURANGO', 'has_phone': 'true'}).json()
        assert [c['clues'] for c in filtered['centers']] == ['A']
        assert client.get('/api/directory/centers', params={'state': 'DURANGO', 'sort': 'nearest'}).status_code == 422
        ordered = client.get('/api/directory/centers', params={'state': 'DURANGO', 'sort': 'nearest', 'lat': 25, 'lon': -105}).json()
        assert ordered['centers'][0]['clues'] == 'A'
        assert client.get('/api/directory/centers', params={'state': 'DURANGO', 'sort': 'google'}).status_code == 422
        payload = {'author': 'Autor ficticio', 'comment': 'Comentario de ejemplo', 'rating': 4}
        assert client.post('/api/demo/centers/A/reviews', json=payload).status_code == 201
        assert client.post('/api/demo/centers/no-existe/reviews', json=payload).status_code == 404
        assert len(client.get('/api/demo/centers/A/reviews').json()) == 1
        assert client.get('/api/demo/centers/C/reviews').json() == []
        prepared = client.post('/api/demo/centers/C/booking')
        assert prepared.status_code == 200
        clinic_id = prepared.json()['clinic_id']
        catalog = client.get('/api/catalog').json()
        doctors = [doctor for doctor in catalog['doctors'] if doctor['clinic_id'] == clinic_id]
        assert len(doctors) == 1 and doctors[0]['name'] == 'Médico ficticio de demostración'
        slots = client.get('/api/slots', params={'doctor_id': doctors[0]['id']}).json()
        assert slots
        booking = client.post('/api/appointments', json={'slot_id': slots[0]['id'], 'patient_name': 'Ejemplo ficticio'})
        assert booking.status_code == 201
        assert client.post('/api/demo/centers/C/booking').json()['clinic_id'] == clinic_id
        assert client.post('/api/appointments', json={'slot_id': slots[0]['id'], 'patient_name': 'Otro ejemplo'}).status_code == 409
        assert client.post('/api/demo/centers/B/booking').status_code == 404
    with TestClient(main.app) as client:
        assert client.get('/api/demo/centers/A/reviews').json()[0]['comment'] == 'Comentario de ejemplo'


def test_demo_records_and_persisted_reviews(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB_PATH', tmp_path / 'test.db')
    with TestClient(main.app) as client:
        records = client.get('/api/demo/records').json()
        assert len(records) == 2 and records[0]['visits'] and records[0]['labs']
        result = client.post('/api/demo/reviews', json={'author': 'Paciente ficticio', 'comment': 'Me gusta esta demostración.', 'rating': 5})
        assert result.status_code == 201
        assert client.post('/api/demo/reviews', json={'author': '   ', 'comment': 'Prueba', 'rating': 5}).status_code == 422
    with TestClient(main.app) as client:
        reviews = client.get('/api/demo/reviews').json()
        assert len(reviews) == 1 and reviews[0]['comment'] == 'Me gusta esta demostración.'
        assert len(client.get('/api/demo/records').json()) == 2


def test_chat_uses_documents_and_handles_unknown(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB_PATH', tmp_path / 'test.db')
    docs = tmp_path / 'docs'
    docs.mkdir()
    (docs / 'ejemplo.md').write_text('# Ejemplo\n\n## ¿Cómo solicito una cita?\n\nLa cita es ficticia.\n', encoding='utf-8')
    monkeypatch.setattr(main, 'DOCUMENTS_PATH', docs)
    calls = []
    def fake_generate(question, heading, context):
        calls.append((question, heading, context))
        return 'La cita es ficticia.'
    monkeypatch.setattr(main, 'generate_answer', fake_generate)
    monkeypatch.setattr(main, 'select_section', lambda question, sections: None)
    with TestClient(main.app) as client:
        response = client.post('/api/chat', json={'question': '¿Cómo solicito una cita?'}).json()
        assert response['answer'] == 'La cita es ficticia.'
        assert response['sources'][0]['document'] == 'ejemplo.md'
        unknown = client.post('/api/chat', json={'question': '¿Cuál es el precio de cardiología?'}).json()
        assert not unknown['sources']
        assert len(calls) == 1
        emergency = client.post('/api/chat', json={'question': 'Es una emergencia'}).json()
        assert '911' in emergency['answer']
        assert not client.post('/api/chat', json={'question': '¿Qué medicamento debo tomar para mi cita?'}).json()['sources']
        assert len(calls) == 1
        assert client.post('/api/chat', json={'question': ' '}).status_code == 422


def test_chat_semantic_fallback(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB_PATH', tmp_path / 'test.db')
    docs = tmp_path / 'docs'
    docs.mkdir()
    (docs / 'ejemplo.md').write_text('## Solicitud\nEscoge un horario ficticio.', encoding='utf-8')
    monkeypatch.setattr(main, 'DOCUMENTS_PATH', docs)
    monkeypatch.setattr(main, 'select_section', lambda question, sections: sections[0])
    monkeypatch.setattr(main, 'generate_answer', lambda *args: 'Escoge un horario ficticio.')
    with TestClient(main.app) as client:
        result = client.post('/api/chat', json={'question': '¿Cómo reservo?'}).json()
        assert result['answer'] == 'Escoge un horario ficticio.'
        assert result['sources'][0]['document'] == 'ejemplo.md'


def test_chat_reports_unavailable_model(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB_PATH', tmp_path / 'test.db')
    docs = tmp_path / 'docs'
    docs.mkdir()
    (docs / 'ejemplo.md').write_text('## Citas\nLa cita es ficticia.', encoding='utf-8')
    monkeypatch.setattr(main, 'DOCUMENTS_PATH', docs)
    def unavailable(*args):
        raise main.HTTPException(503, 'Ollama no disponible')
    monkeypatch.setattr(main, 'generate_answer', unavailable)
    with TestClient(main.app) as client:
        assert client.post('/api/chat', json={'question': 'cita ficticia'}).status_code == 503


def test_chat_replaces_unsupported_generation(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB_PATH', tmp_path / 'test.db')
    docs = tmp_path / 'docs'
    docs.mkdir()
    (docs / 'ejemplo.md').write_text('## Cita\nLa cita es ficticia.', encoding='utf-8')
    monkeypatch.setattr(main, 'DOCUMENTS_PATH', docs)
    monkeypatch.setattr(main, 'generate_answer', lambda *args: 'Llame al hospital para reservar.')
    with TestClient(main.app) as client:
        result = client.post('/api/chat', json={'question': 'cita ficticia'}).json()
        assert result['answer'] == 'La cita es ficticia.'


def test_double_confirmation_and_conflict(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB_PATH', tmp_path / 'test.db')
    with TestClient(main.app) as client:
        slot = client.get('/api/slots').json()[0]
        payload = {'slot_id': slot['id'], 'patient_name': 'Paciente ficticio'}
        created = client.post('/api/appointments', json=payload)
        assert created.status_code == 201
        assert client.post('/api/appointments', json=payload).status_code == 409
        identifier = created.json()['id']
        first = client.post(f'/api/appointments/{identifier}/decision', json={'role': 'doctor', 'action': 'approve'})
        assert first.json()['status'] == 'pendiente'
        second = client.post(f'/api/appointments/{identifier}/decision', json={'role': 'reception', 'action': 'approve'})
        assert second.json()['status'] == 'confirmada'


def test_rejection_releases_slot_and_offers_same_day(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB_PATH', tmp_path / 'test.db')
    with TestClient(main.app) as client:
        slot = client.get('/api/slots?doctor_id=1').json()[0]
        identifier = client.post('/api/appointments', json={'slot_id': slot['id'], 'patient_name': 'Ejemplo'}).json()['id']
        rejected = client.post(f'/api/appointments/{identifier}/decision', json={'role': 'reception', 'action': 'reject'})
        assert rejected.json()['status'] == 'rechazada'
        choices = client.get(f'/api/appointments/{identifier}/alternatives').json()
        assert choices and choices[0]['starts_at'][:10] == slot['starts_at'][:10]
        assert all(item['id'] != slot['id'] for item in choices)
        assert client.post('/api/appointments', json={'slot_id': slot['id'], 'patient_name': 'Otro ejemplo'}).status_code == 201
