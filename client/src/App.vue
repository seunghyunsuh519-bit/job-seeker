<script setup>
import { ref, onMounted } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// 상태값
const jobs = ref([])
const title = ref('')
const company = ref('')
const deadline = ref('')
const status = ref('서류작성')
const filterMonth = ref(new Date().toISOString().slice(0, 7))

// 공고 목록 불러오기
const fetchJobs = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/jobs`)
    if (res.ok) {
      jobs.value = await res.json()
    }
  } catch (err) {
    console.error('공고 불러오기 실패:', err)
  }
}

// 새 공고 추가
const addJob = async () => {
  if (!company.value || !title.value || !deadline.value) {
    alert('기업명, 공고명, 마감일을 모두 입력해주세요.')
    return
  }
  try {
    const res = await fetch(`${API_BASE}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: company.value,
        title: title.value,
        deadline: deadline.value,
        status: status.value
      })
    })
    if (res.ok) {
      company.value = ''
      title.value = ''
      deadline.value = ''
      status.value = '서류작성'
      await fetchJobs()
    }
  } catch (err) {
    console.error('공고 등록 실패:', err)
  }
}

// 공고 삭제
const deleteJob = async (id) => {
  if (!confirm('정말 삭제하시겠습니까?')) return
  try {
    const res = await fetch(`${API_BASE}/api/jobs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchJobs()
    }
  } catch (err) {
    console.error('삭제 실패:', err)
  }
}

onMounted(() => {
  fetchJobs()
})
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>💼 취준 일정 캘린더 대시보드</h1>
      <p>목표 기업 공고와 전형 일정을 한눈에 관리하세요.</p>
    </header>

    <!-- 일정 등록 폼 -->
    <section class="card form-card">
      <h2>📌 새 공고 일정 등록</h2>
      <form @submit.prevent="addJob" class="form-grid">
        <input v-model="company" placeholder="기업명 (예: 네이버, 라인)" required />
        <input v-model="title" placeholder="지원 직무 / 공고명" required />
        <input v-model="deadline" type="date" required />
        <select v-model="status">
          <option value="서류작성">서류작성</option>
          <option value="서류제출">서류제출</option>
          <option value="인적성/코테">인적성/코테</option>
          <option value="1차면접">1차면접</option>
          <option value="최종면접">최종면접</option>
          <option value="합격">합격 🎉</option>
          <option value="불합격">불합격</option>
        </select>
        <button type="submit" class="btn-primary">일정 추가</button>
      </form>
    </section>

    <!-- 공고 목록 대시보드 -->
    <section class="card list-card">
      <div class="list-header">
        <h2>📋 전체 지원 현황 ({{ jobs.length }}건)</h2>
      </div>

      <div v-if="jobs.length === 0" class="empty-state">
        등록된 취준 일정이 없습니다. 새 공고를 등록해보세요!
      </div>

      <div v-else class="job-grid">
        <div v-for="job in jobs" :key="job.id" class="job-card">
          <div class="job-badge" :class="job.status">{{ job.status }}</div>
          <h3>{{ job.company }}</h3>
          <p class="job-title">{{ job.title }}</p>
          <p class="job-date">⏳ 마감: <strong>{{ job.deadline }}</strong></p>
          <button @click="deleteJob(job.id)" class="btn-delete">삭제</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 30px 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #2c3e50;
}
.header {
  text-align: center;
  margin-bottom: 30px;
}
.header h1 {
  font-size: 26px;
  margin-bottom: 8px;
}
.card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) auto;
  gap: 12px;
  margin-top: 15px;
}
input, select {
  padding: 10px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
}
.btn-primary {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 600;
}
.btn-primary:hover { background: #2563eb; }
.job-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 20px;
}
.job-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  position: relative;
  background: #fafafa;
}
.job-badge {
  display: inline-block;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #e5e7eb;
  font-weight: bold;
  margin-bottom: 8px;
}
.job-badge.서류작성 { background: #e0f2fe; color: #0369a1; }
.job-badge.서류제출 { background: #fef3c7; color: #b45309; }
.job-badge.합격 { background: #dcfce7; color: #15803d; }
.job-badge.불합격 { background: #fee2e2; color: #b91c1c; }
.job-title { color: #4b5563; font-size: 14px; margin: 4px 0; }
.job-date { font-size: 13px; color: #1f2937; }
.btn-delete {
  margin-top: 10px;
  padding: 4px 10px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.btn-delete:hover { background: #e5e7eb; color: #ef4444; }
.empty-state {
  text-align: center;
  color: #9ca3af;
  padding: 40px 0;
}
</style>