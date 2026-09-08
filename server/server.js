const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs') // 1. 암호화 라이브러리 추가

const app = express()
const db = new Database('job_tracker.db')

app.use(cors())
app.use(express.json())

// 1. 테이블 초기화 (users 테이블 & applications 테이블)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    company_name TEXT NOT NULL,
    role TEXT NOT NULL,
    deadline TEXT,
    status TEXT DEFAULT '서류작성중'
  );
`)

// 2. 인증 API: 회원가입
app.post('/api/auth/signup', (req, res) => {
  const { email, password, name } = req.body
  if (!email || !password || !name) {
    return res.status(400).json({ error: '모든 항목을 입력해주세요.' })
  }
  try {
    // 비밀번호를 복호화 불가능한 난수형 문자열로 변환 (솔트 라운드 10)
    const hashedPassword = bcrypt.hashSync(password, 10)

    const stmt = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)')
    const info = stmt.run(email, hashedPassword, name)
    const user = { id: info.lastInsertRowid, email, name }
    res.json({ success: true, user })
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '이미 존재하는 이메일입니다.' })
    }
    res.status(500).json({ error: '회원가입 실패' })
  }
})

// 3. 로그인: 입력된 비번과 암호화된 비번 비교
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  
  // 먼저 이메일로 사용자를 찾음
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' })
  }

  // 사용자가 입력한 비밀번호와 DB의 해시 암호문 비교
  const isMatch = bcrypt.compareSync(password, user.password)
  if (!isMatch) {
    return res.status(401).json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' })
  }

  res.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name }
  })
})

// 공고 조회: userId가 없으면 빈 배열 반환
app.get('/api/applications', (req, res) => {
  const userId = req.query.userId
  if (!userId) {
    return res.json([]) // 로그인하지 않은 경우 아무것도 안 보여줌
  }
  const rows = db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY id DESC').all(userId)
  res.json(rows)
})

// 공고 등록: 로그인된 user_id 필수 검증
app.post('/api/applications', (req, res) => {
  const { company_name, role, deadline, status, user_id } = req.body
  if (!user_id) {
    return res.status(401).json({ error: '로그인이 필요한 작업입니다.' })
  }
  const stmt = db.prepare(
    'INSERT INTO applications (company_name, role, deadline, status, user_id) VALUES (?, ?, ?, ?, ?)'
  )
  const info = stmt.run(company_name, role, deadline || null, status || '서류작성중', user_id)
  res.json({ id: info.lastInsertRowid })
})
// 6. 공고 상태 수정
app.patch('/api/applications/:id', (req, res) => {
  const { status } = req.body
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ success: true })
})

// 7. 공고 삭제
app.delete('/api/applications/:id', (req, res) => {
  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

app.listen(4000, () => {
  console.log('서버가 포트 4000에서 실행 중입니다.')
})