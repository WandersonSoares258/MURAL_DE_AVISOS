const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'database', 'mural.db')); // Definindo caminho correto para o banco
const SECRET_KEY = 'secreta-chave-jwt'; // Use uma chave mais segura e configurável

// Configurações
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Permitir requisições de qualquer origem
  res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});
app.set('view engine', 'ejs');

// Criar tabelas no banco de dados
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS departamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT UNIQUE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS avisos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      departamento_id INTEGER,
      usuario_id INTEGER,
      mensagem TEXT,
      data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `);
});

// Rota para registro de usuário
app.post('/registro', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10); // Criptografando a senha

    db.run(
      'INSERT INTO usuarios (username, password) VALUES (?, ?)',
      [username, hash],
      (err) => {
        if (err) {
          return res.status(500).send('Erro ao registrar usuário');
        }
        res.redirect('/login');
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao criptografar a senha');
  }
});

// Rota de login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM usuarios WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(401).send('Login falhou');
    }

    const validPassword = await bcrypt.compare(password, user.password); // Comparando senha

    if (!validPassword) {
      return res.status(401).send('Login falhou');
    }

    // Gerando o JWT
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);
    res.json({ token });
  });
});

// Middleware para verificar token JWT
function verificarToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    console.log('Token ausente');
    return res.status(403).send('Acesso negado');
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      console.log('Token inválido:', err);
      return res.status(403).send('Token inválido');
    }

    console.log('Token válido, usuário:', decoded.username); // Log do usuário decodificado
    req.user = decoded; // Adiciona o usuário decodificado à requisição
    next();
  });
}

// Rota para página de registro
app.get('/registro', (req, res) => {
  res.render('registro');
});

// Rota para página de login
app.get('/login', (req, res) => {
  res.render('login');
});

// Rota para página inicial (mural)
app.get('/', (req, res) => {
  res.render('index');
});


// Rota para listar avisos
app.get('/mural', verificarToken, (req, res) => {
  //app.get('/mural', (req, res) => {
  console.log('Token verificado, carregando o mural');
  const departamentoId = req.query.departamento; // Recebe o ID do departamento, se houver

  let query = `
    SELECT avisos.id, avisos.mensagem, avisos.data, usuarios.username, departamentos.nome as departamento
    FROM avisos
    JOIN usuarios ON avisos.usuario_id = usuarios.id
    JOIN departamentos ON avisos.departamento_id = departamentos.id
  `;
  const params = [];

  if (departamentoId) {
    query += ' WHERE avisos.departamento_id = ?';
    params.push(departamentoId);
  }

  query += ' ORDER BY avisos.data DESC';

  console.log("Executing query:", query, "With params:", params); // Log da query

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error fetching data:", err); // Log do erro
      return res.status(500).send('Erro ao carregar avisos');
    }
    console.log("Query result:", rows); // Log do resultado
    res.json(rows);
  });
});


// Rota para criar avisos
app.post('/avisos', verificarToken, (req, res) => {
  const { departamento_id, mensagem } = req.body;
  const usuario_id = req.user.id; // Usa o ID do usuário decodificado

  db.run(
    'INSERT INTO avisos (departamento_id, usuario_id, mensagem) VALUES (?, ?, ?)',
    [departamento_id, usuario_id, mensagem],
    (err) => {
      if (err) {
        return res.status(500).send('Erro ao postar aviso');
      }
      res.redirect('/mural');
    }
  );
});

// Rota para editar aviso
app.put('/avisos/:id', verificarToken, (req, res) => {
  const { mensagem } = req.body;
  const { id } = req.params;

  db.run(
    'UPDATE avisos SET mensagem = ? WHERE id = ?',
    [mensagem, id],
    (err) => {
      if (err) {
        return res.status(500).send('Erro ao editar aviso');
      }
      res.send('Aviso editado com sucesso');
    }
  );
});

// Rota para excluir aviso
app.delete('/avisos/:id', verificarToken, (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM avisos WHERE id = ?',
    [id],
    (err) => {
      if (err) {
        return res.status(500).send('Erro ao excluir aviso');
      }
      res.send('Aviso excluído com sucesso');
    }
  );
});

// Iniciar servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
