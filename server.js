import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// Permite JSON en el body (imágenes base64 si las agregas después)
app.use(express.json({ limit: '15mb' }));

// Sirve el frontend desde la carpeta public/
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// POOL DE CONEXIÓN A MYSQL
// Variables de entorno definidas en docker-compose
// ─────────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'db',        // nombre del servicio MySQL en docker-compose
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || 'password',
  database: process.env.DB_NAME     || 'autosdb',
  port:     process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',             // soporta tildes, ñ, caracteres especiales
});

// ─────────────────────────────────────────────
// ASEGURA QUE LA TABLA `autos` EXISTA
// No borra datos si ya existe
// ─────────────────────────────────────────────
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS autos (
      id     INT          AUTO_INCREMENT PRIMARY KEY,
      marca  VARCHAR(100) NOT NULL,
      modelo VARCHAR(100) NOT NULL,
      anio   INT          NOT NULL,
      color  VARCHAR(50)  DEFAULT NULL,
      precio DECIMAL(10,2) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('Tabla `autos` verificada/creada.');
}

// ─────────────────────────────────────────────
// CORS — permite peticiones desde el frontend
// en desarrollo (ajusta origin en producción)
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─────────────────────────────────────────────
// RUTAS CRUD — /api/autos
// ─────────────────────────────────────────────

// GET ALL — lista todos los autos
app.get('/api/autos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM autos ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/autos >', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET ONE — obtiene un auto por id
app.get('/api/autos/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM autos WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Auto no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/autos/:id >', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST — crea un nuevo auto
app.post('/api/autos', async (req, res) => {
  try {
    const { marca, modelo, anio, color, precio } = req.body;

    if (!marca || !modelo || !anio) {
      return res.status(400).json({ error: 'Los campos marca, modelo y anio son requeridos.' });
    }

    const [result] = await pool.query(
      'INSERT INTO autos (marca, modelo, anio, color, precio) VALUES (?, ?, ?, ?, ?)',
      [marca, modelo, anio, color || null, precio || null]
    );

    const [row] = await pool.query('SELECT * FROM autos WHERE id = ?', [result.insertId]);
    res.status(201).json(row[0]);
  } catch (err) {
    console.error('POST /api/autos >', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT — actualiza un auto existente
app.put('/api/autos/:id', async (req, res) => {
  try {
    const { marca, modelo, anio, color, precio } = req.body;

    if (!marca || !modelo || !anio) {
      return res.status(400).json({ error: 'Los campos marca, modelo y anio son requeridos.' });
    }

    const [check] = await pool.query('SELECT id FROM autos WHERE id = ?', [req.params.id]);
    if (check.length === 0) return res.status(404).json({ error: 'Auto no encontrado' });

    await pool.query(
      'UPDATE autos SET marca = ?, modelo = ?, anio = ?, color = ?, precio = ? WHERE id = ?',
      [marca, modelo, anio, color || null, precio || null, req.params.id]
    );

    const [row] = await pool.query('SELECT * FROM autos WHERE id = ?', [req.params.id]);
    res.json(row[0]);
  } catch (err) {
    console.error('PUT /api/autos/:id >', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE — elimina un auto
app.delete('/api/autos/:id', async (req, res) => {
  try {
    const [check] = await pool.query('SELECT id FROM autos WHERE id = ?', [req.params.id]);
    if (check.length === 0) return res.status(404).json({ error: 'Auto no encontrado' });

    await pool.query('DELETE FROM autos WHERE id = ?', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /api/autos/:id >', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Ruta raíz → sirve el index.html del frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// INICIO DEL SERVIDOR
// Reintenta conexión a MySQL hasta 10 veces
// (el contenedor de MySQL puede tardar en arrancar)
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

async function start() {
  for (let intento = 1; intento <= 10; intento++) {
    try {
      await ensureSchema();
      break;
    } catch (err) {
      console.log(`Esperando a MySQL (intento ${intento}/10)... ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  app.listen(PORT, () => {
    console.log(`\n🚗 AutoElite API escuchando en puerto ${PORT}`);
    console.log(`   → http://localhost:${PORT}/api/autos\n`);
  });
}

start();