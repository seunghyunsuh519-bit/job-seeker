<template>
  <div class="app-layout">
    <!-- 1. 링커리어 스타일 상단 고정 헤더 -->
    <header class="global-navbar">
      <div class="nav-content">
        <div class="nav-left">
          <span class="nav-logo">취준 캘린더</span>
          <span class="nav-subtitle">취업 일정 관리 캘린더</span>
        </div>

        <!-- 헤더 우측: 로그인 / 회원가입 / 유저 프로필 -->
        <div class="nav-right">
          <template v-if="currentUser">
            <span class="user-greeting"><strong>{{ currentUser.name }}</strong>님 환영합니다!</span>
            <button @click="handleLogout" class="btn-auth-text">로그아웃</button>
          </template>
          <template v-else>
            <button @click="openAuthModal('login')" class="btn-auth-outline">로그인</button>
            <button @click="openAuthModal('signup')" class="btn-auth-solid">회원가입</button>
          </template>
        </div>
      </div>
    </header>

    <!-- 2. 메인 본문: 달력(왼쪽) + 통계 사이드바(오른쪽) 2단 레이아웃 -->
    <main class="main-body">
      <!-- 월 이동 컨트롤러 -->
      <div class="calendar-controls">
        <button @click="prevMonth" class="btn-nav">&lt;</button>
        <h2>{{ currentYear }}년 {{ currentMonth + 1 }}월</h2>
        <button @click="nextMonth" class="btn-nav">&gt;</button>
      </div>

      <div class="dashboard-grid">
        <!-- 왼쪽 메인: 달력 그리드 -->
        <div class="calendar-wrapper">
          <div class="calendar-grid">
            <div v-for="day in ['일', '월', '화', '수', '목', '금', '토']" :key="day" class="calendar-header-cell">
              {{ day }}
            </div>

            <div
              v-for="cell in calendarCells"
              :key="cell.dateString"
              class="calendar-cell"
              :class="{ 'other-month': !cell.isCurrentMonth, 'is-today': cell.isToday }"
              @click="openAddModal(cell.dateString)"
            >
              <div class="date-number">{{ cell.dayNumber }}</div>
              <div class="tag-list">
                <div
                  v-for="app in getAppsForDate(cell.dateString)"
                  :key="app.id"
                  class="app-tag"
                  :class="getStatusClass(app.status)"
                >
                  <span class="tag-company">{{ app.company_name }}</span>
                  <span class="tag-role">({{ app.role }})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 오른쪽 사이드 패널: 취업 통계 & 요약 카드 -->
        <aside class="side-panel">
          <div class="panel-card user-summary-card">
            <div class="card-title">취업 지원 현황</div>
            <div class="stat-list">
              <div class="stat-box">
                <span class="label">총 지원</span>
                <span class="val">{{ totalApplied }}<small>건</small></span>
              </div>
              <div class="stat-box blue">
                <span class="label">서류 통과</span>
                <span class="val">{{ passedDocs }}<small>건</small></span>
              </div>
              <div class="stat-box green">
                <span class="label">서류 합격률</span>
                <span class="val">{{ passRate }}<small>%</small></span>
              </div>
            </div>
          </div>

          <div class="panel-card tip-card">
            <div class="card-title">💡 캘린더 사용 팁</div>
            <p>달력의 원하는 날짜 칸을 클릭하면 해당 일자에 서류 마감 일정을 바로 등록할 수 있습니다.</p>
          </div>
        </aside>
      </div>

      <!-- 하단: 공고 상세 목록 테이블 -->
      <div class="detail-section">
        <h3>전체 지원 공고 현황</h3>
        <table class="simple-table">
          <thead>
            <tr>
              <th>기업명</th>
              <th>직무</th>
              <th>마감일</th>
              <th>전형 상태</th>
              <th class="text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="apps.length === 0">
              <td colspan="5" class="empty-msg">등록된 일정이 없습니다. 달력 칸을 클릭해 일정을 등록해 보세요!</td>
            </tr>
            <tr v-for="app in apps" :key="app.id">
              <td class="font-bold">{{ app.company_name }}</td>
              <td>{{ app.role }}</td>
              <td>{{ app.deadline || '-' }}</td>
              <td>
                <select :value="app.status" @change="updateStatus(app.id, $event.target.value)" class="status-select">
                  <option value="서류작성중">서류작성중</option>
                  <option value="서류제출">서류제출</option>
                  <option value="서류합격">서류합격</option>
                  <option value="서류탈락">서류탈락</option>
                  <option value="면접합격">면접합격</option>
                  <option value="최종합격">최종합격</option>
                </select>
              </td>
              <td class="text-right">
                <button @click="deleteApp(app.id)" class="btn-delete">삭제</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- 공고 등록 모달 -->
    <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
      <div class="modal-box">
        <h3>{{ selectedDate }} 일정 등록</h3>
        <form @submit.prevent="submitApp">
          <div class="form-group">
            <label>기업명</label>
            <input v-model="appForm.company" placeholder="예: 현대자동차" required />
          </div>
          <div class="form-group">
            <label>지원 직무</label>
            <input v-model="appForm.role" placeholder="예: 디자인 / 개발" required />
          </div>
          <div class="form-group">
            <label>마감 날짜</label>
            <input v-model="appForm.deadline" type="date" />
          </div>
          <div class="form-group">
            <label>전형 상태</label>
            <select v-model="appForm.status">
              <option value="서류작성중">서류작성중</option>
              <option value="서류제출">서류제출</option>
              <option value="서류합격">서류합격</option>
              <option value="서류탈락">서류탈락</option>
              <option value="면접합격">면접합격</option>
              <option value="최종합격">최종합격</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showAddModal = false" class="btn-secondary">취소</button>
            <button type="submit" class="btn-primary" :disabled="loading">등록하기</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 로그인 / 회원가입 모달 -->
    <div v-if="authModalMode" class="modal-backdrop" @click.self="authModalMode = null">
      <div class="modal-box">
        <h3>{{ authModalMode === 'login' ? '로그인' : '회원가입' }}</h3>
        <form @submit.prevent="submitAuth">
          <div v-if="authModalMode === 'signup'" class="form-group">
            <label>이름</label>
            <input v-model="authForm.name" placeholder="홍길동" required />
          </div>
          <div class="form-group">
            <label>이메일</label>
            <input v-model="authForm.email" type="email" placeholder="example@email.com" required />
          </div>
          <div class="form-group">
            <label>비밀번호</label>
            <input v-model="authForm.password" type="password" placeholder="비밀번호를 입력하세요" required />
          </div>
          <p v-if="authError" class="auth-error-msg">{{ authError }}</p>
          <div class="modal-actions">
            <button type="button" @click="authModalMode = null" class="btn-secondary">취소</button>
            <button type="submit" class="btn-primary" :disabled="loading">
              {{ authModalMode === 'login' ? '로그인' : '가입하기' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// 기존: const API_BASE = 'http://localhost:4000'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const apps = ref([])
const loading = ref(false)

// 로그인 및 사용자 세션 상태
const currentUser = ref(null)
const authModalMode = ref(null) // 'login' | 'signup' | null
const authError = ref('')
const authForm = ref({ name: '', email: '', password: '' })

// 캘린더 상태
const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())

// 등록 모달 상태
const showAddModal = ref(false)
const selectedDate = ref('')
const appForm = ref({ company: '', role: '', deadline: '', status: '서류작성중' })

// 공고 목록 조회
const fetchApps = async () => {
  try {
    const url = currentUser.value ? `${API_BASE}/applications?userId=${currentUser.value.id}` : `${API_BASE}/applications`
    const res = await fetch(url)
    apps.value = await res.json()
  } catch (err) {
    console.error('데이터 조회 오류:', err)
  }
}

// 캘린더 날짜 42칸 고정 생성
const calendarCells = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value

  const firstDayIndex = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()
  const prevLastDate = new Date(year, month, 0).getDate()

  const cells = []

  // 이전 달 날짜 채우기
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevLastDate - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ dateString: dateStr, dayNumber: d, isCurrentMonth: false, isToday: false })
  }

  // 이번 달 날짜 채우기
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  for (let i = 1; i <= lastDate; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    cells.push({
      dateString: dateStr,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateStr === todayStr
    })
  }

  // 42칸 고정될 때까지 다음 달 날짜 채우기
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    const m = month + 2 > 12 ? 1 : month + 2
    const y = month + 2 > 12 ? year + 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    cells.push({ dateString: dateStr, dayNumber: i, isCurrentMonth: false, isToday: false })
  }

  return cells
})

const getAppsForDate = (dateString) => {
  return apps.value.filter(app => app.deadline === dateString)
}

const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

// 모달 열기 및 일정 등록
const openAddModal = (dateString) => {
  selectedDate.value = dateString
  appForm.value = {
    company: '',
    role: '',
    deadline: dateString,
    status: '서류작성중'
  }
  showAddModal.value = true
}

const submitApp = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: appForm.value.company,
        role: appForm.value.role,
        deadline: appForm.value.deadline || null,
        status: appForm.value.status,
        user_id: currentUser.value?.id || null
      })
    })
    if (res.ok) {
      showAddModal.value = false
      await fetchApps()
    }
  } catch (err) {
    console.error('공고 등록 실패:', err)
  }
  loading.value = false
}

const updateStatus = async (id, newStatus) => {
  try {
    await fetch(`${API_BASE}/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    await fetchApps()
  } catch (err) {
    console.error('상태 변경 실패:', err)
  }
}

const deleteApp = async (id) => {
  if (!confirm('해당 일정을 삭제하시겠습니까?')) return
  try {
    await fetch(`${API_BASE}/applications/${id}`, { method: 'DELETE' })
    await fetchApps()
  } catch (err) {
    console.error('삭제 실패:', err)
  }
}

// 인증 관련 메서드
const openAuthModal = (mode) => {
  authModalMode.value = mode
  authError.value = ''
  authForm.value = { name: '', email: '', password: '' }
}

const submitAuth = async () => {
  authError.value = ''
  loading.value = true
  const endpoint = authModalMode.value === 'signup' ? '/auth/signup' : '/auth/login'
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm.value)
    })
    const data = await res.json()
    if (!res.ok) {
      authError.value = data.error || '인증에 실패했습니다.'
    } else {
      currentUser.value = data.user
      localStorage.setItem('job_seeker_user', JSON.stringify(data.user))
      authModalMode.value = null
      await fetchApps()
    }
  } catch (err) {
    authError.value = '서버와의 통신에 실패했습니다.'
  }
  loading.value = false
}

const handleLogout = () => {
  currentUser.value = null
  localStorage.removeItem('job_seeker_user')
  fetchApps()
}

// 태그 색상 및 통계
const getStatusClass = (status) => {
  switch (status) {
    case '서류합격':
    case '면접합격': return 'tag-blue'
    case '최종합격': return 'tag-green'
    case '서류탈락': return 'tag-gray'
    default: return 'tag-amber'
  }
}

const totalApplied = computed(() => apps.value.length)
const passedDocs = computed(() => apps.value.filter(a => ['서류합격', '면접합격', '최종합격'].includes(a.status)).length)
const passRate = computed(() => {
  if (totalApplied.value === 0) return 0
  return ((passedDocs.value / totalApplied.value) * 100).toFixed(1)
})

onMounted(() => {
  const savedUser = localStorage.getItem('job_seeker_user')
  if (savedUser) {
    try {
      currentUser.value = JSON.parse(savedUser)
    } catch (e) {
      localStorage.removeItem('job_seeker_user')
    }
  }
  fetchApps()
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background-color: #f8fafc; /* 어두운 #0f1117 제거 */
  padding-top: 64px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1e293b;
  box-sizing: border-box;
}

/* 상단 글로벌 헤더 */
.global-navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 64px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  z-index: 1000;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
}
.nav-content {
  width: 100%;
  max-width: 1240px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.nav-logo {
  font-size: 20px;
  font-weight: 800;
  color: #0066ff;
}
.nav-subtitle {
  font-size: 13px;
  color: #64748b;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-greeting {
  font-size: 14px;
  color: #334155;
  margin-right: 6px;
}
.btn-auth-outline {
  padding: 6px 14px;
  border: 1px solid #0066ff;
  background: transparent;
  color: #0066ff;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-auth-solid {
  padding: 6px 14px;
  border: 1px solid #0066ff;
  background: #0066ff;
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-auth-text {
  padding: 6px 12px;
  background: none;
  border: none;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

/* 본문 레이아웃 */
.main-body {
  width: 1240px;
  max-width: 96vw;
  margin: 0 auto;
  padding: 24px 0 60px 0;
}

.calendar-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}
.calendar-controls h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b; /* 배경이 밝아졌으므로 흰색(#fff)에서 짙은 먹색으로 변경 */
}

.btn-nav {
  background: #ffffff;
  color: #334155;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
/* 2단 대시보드 그리드 (달력 75% + 사이드바 25%) */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 20px;
  align-items: start;
}

/* 달력 */
.calendar-wrapper {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: 40px repeat(6, 110px);
}
.calendar-header-cell {
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #edf2f7;
}
.calendar-header-cell:nth-child(7) { border-right: none; }

.calendar-cell {
  height: 110px;
  padding: 6px;
  border-right: 1px solid #edf2f7;
  border-bottom: 1px solid #edf2f7;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}
.calendar-cell:nth-child(7n) { border-right: none; }
.calendar-cell:hover { background: #f8fafc; }
.other-month { background: #fafafa; opacity: 0.35; }
.is-today .date-number {
  background: #111318;
  color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.date-number {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.tag-list::-webkit-scrollbar { width: 3px; }
.tag-list::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 3px; }

.app-tag {
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.tag-amber { background: #fef3c7; color: #92400e; }
.tag-blue { background: #dbeafe; color: #1e40af; }
.tag-green { background: #d1fae5; color: #065f46; }
.tag-gray { background: #f3f4f6; color: #4b5563; text-decoration: line-through; }
.tag-company { font-weight: 600; margin-right: 2px; }

/* 오른쪽 통계 패널 */
.side-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}
.stat-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.stat-box {
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stat-box .label {
  font-size: 13px;
  color: #64748b;
}
.stat-box .val {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}
.stat-box .val small {
  font-size: 12px;
  font-weight: 400;
  margin-left: 2px;
}
.stat-box.blue { background: #eff6ff; }
.stat-box.blue .val { color: #2563eb; }
.stat-box.green { background: #f0fdf4; }
.stat-box.green .val { color: #16a34a; }

.tip-card p {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

/* 하단 공고 관리 테이블 */
.detail-section {
  margin-top: 32px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03); /* 은은한 그림자 추가 */
}

.detail-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.simple-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.simple-table th {
  text-align: left;
  padding: 10px;
  border-bottom: 1px solid #e2e8f0;
  color: #718096;
}
.simple-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #edf2f7;
}
.font-bold { font-weight: 600; }
.text-right { text-align: right; }
.btn-delete { background: none; border: none; color: #e53e3e; cursor: pointer; }
.status-select {
  padding: 4px 8px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 12px;
}
.empty-msg {
  text-align: center;
  color: #a0aec0;
  padding: 24px !important;
}

/* 모달 스타일 */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.modal-box {
  background: #fff;
  padding: 24px;
  border-radius: 14px;
  width: 360px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
.modal-box h3 { margin: 0 0 16px 0; }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.form-group label { font-size: 12px; font-weight: 600; color: #4a5568; }
.form-group input, .form-group select {
  padding: 9px 12px;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  font-size: 13px;
}
.auth-error-msg {
  color: #e53e3e;
  font-size: 12px;
  margin: 4px 0 12px 0;
}
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.btn-secondary {
  background: #edf2f7;
  border: none;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}
.btn-primary {
  background: #0066ff;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
</style>