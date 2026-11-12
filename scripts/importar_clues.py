"""Importa el catálogo CLUES oficial a una base separada de las citas ficticias."""
from pathlib import Path
import sqlite3
import sys
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'clues_202610.xlsx'
destination = ROOT / 'directorio_clues.db'
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
rows = workbook[workbook.sheetnames[0]].iter_rows(values_only=True)
headers = [str(value).strip() for value in next(rows)]
indexes = {name: headers.index(name) for name in ['CLUES', 'ENTIDAD', 'MUNICIPIO', 'LOCALIDAD', 'NOMBRE DE LA UNIDAD', 'NOMBRE COMERCIAL', 'TIPO DE VIALIDAD', 'VIALIDAD', 'NUMERO EXTERIOR', 'ESTATUS DE OPERACION', 'TELEFONO 1 DEL ESTABLECIMIENTO', 'LATITUD', 'LONGITUD']}
with sqlite3.connect(destination) as db:
    db.execute('CREATE TABLE IF NOT EXISTS centers (clues TEXT PRIMARY KEY, state TEXT, municipality TEXT, locality TEXT, name TEXT, address TEXT, status TEXT, phone TEXT, latitude REAL, longitude REAL)')
    db.execute('DELETE FROM centers')
    def convert(row):
        def get(key): return row[indexes[key]]
        address = ' '.join(str(get(k)).strip() for k in ('TIPO DE VIALIDAD', 'VIALIDAD', 'NUMERO EXTERIOR') if get(k) is not None)
        def number(value):
            try: return float(value)
            except (ValueError, TypeError): return None
        return (get('CLUES'), get('ENTIDAD'), get('MUNICIPIO'), get('LOCALIDAD'), get('NOMBRE COMERCIAL') or get('NOMBRE DE LA UNIDAD'), address, get('ESTATUS DE OPERACION'), str(get('TELEFONO 1 DEL ESTABLECIMIENTO') or ''), number(get('LATITUD')), number(get('LONGITUD')))
    db.executemany('INSERT OR REPLACE INTO centers VALUES (?,?,?,?,?,?,?,?,?,?)', (convert(row) for row in rows if row[indexes['CLUES']]))
    db.execute('CREATE INDEX IF NOT EXISTS centers_location ON centers(state, municipality)')
    print('Establecimientos importados:', db.execute('SELECT COUNT(*) FROM centers').fetchone()[0])
workbook.close()
