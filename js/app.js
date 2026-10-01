// 화면 렌더링 / 진행 상태 / 채점. 문제 내용은 data.js 에 있습니다.

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";
const app = document.getElementById("app");

// 문제가 있는 교시만 진행
const periods = PERIODS
  .map((p) => ({ ...p, questions: QUESTIONS.filter((q) => q.subject === p.subject) }))
  .filter((p) => p.questions.length);

const state = { name: "", periodIndex: 0, qIndex: 0, answers: new Map() };

const period = () => periods[state.periodIndex];
const currentQ = () => period().questions[state.qIndex];
const periodNo = () => period().no ?? state.periodIndex + 1;
const points = (q) => q.points ?? 2;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

function render(html) {
  app.innerHTML = html;
}

function go(screen) {
  screen();
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- 공통 조각

function examineeBoxes() {
  return `
    <div class="id-boxes">
      <div class="id-box"><span>성명</span><b>${esc(state.name || "")}</b></div>
      <div class="id-box"><span>수험번호</span><b>${EXAM.examNumber}</b></div>
    </div>`;
}

function coverPage({ badge, heading, notices, button, action }) {
  return `
    <div class="sheet cover">
      <div class="badge">${badge}</div>
      <p class="cover-title">${EXAM.title} 문제지</p>
      <h1 class="cover-heading">${heading}</h1>
      ${examineeBoxes()}
      <ul class="notice">${notices.map((n) => `<li>${n}</li>`).join("")}</ul>
      <button class="btn primary" onclick="${action}">${button}</button>
      <p class="cover-foot">※ 시험 시작 전까지 표지를 넘기지 마시오.</p>
    </div>`;
}

// ---------------------------------------------------------------- 시작 / 본인 확인

function showStart() {
  render(`
    <div class="sheet cover">
      <p class="cover-title">${EXAM.title}</p>
      <h1 class="cover-heading">생일축하능력시험</h1>
      <ul class="notice">
        <li>본 시험은 총 ${new Set(periods.map((p, i) => p.no ?? i + 1)).size}교시, ${QUESTIONS.length}문항으로 구성되어 있습니다.</li>
        <li>문항에 따라 배점이 다르니, 각 물음의 끝에 표시된 배점을 참고하시오.</li>
        <li>답안지는 컴퓨터용 사인펜 대신 손가락을 사용하시오.</li>
        <li>부정행위(친구에게 정답 물어보기 등) 적발 시 케이크가 몰수될 수 있습니다.</li>
      </ul>
      <p class="warning">※ 본 시험은 실제 대학수학능력시험과 아무런 관련이 없습니다.</p>
      <button class="btn primary" onclick="go(showInfo)">응시하기</button>
      <p class="cover-foot">※ 시험 시작 전까지 표지를 넘기지 마시오.</p>
    </div>`);
}

function showInfo() {
  render(`
    <form class="sheet info" onsubmit="event.preventDefault(); submitInfo(this)">
      <h2>응시자 본인 확인</h2>
      <label>성명 <input name="examinee" required maxlength="20" autocomplete="off"></label>
      <label>수험번호 <input name="examNumber" required maxlength="20" inputmode="numeric" autocomplete="off"></label>
      <p class="error" id="info-error" hidden>성명 또는 수험번호가 일치하지 않습니다.<br>수험표를 다시 확인하시오.</p>
      <label class="check"><input type="checkbox" required> 본인은 오늘의 주인공임을 확인합니다.</label>
      <p class="small supervisor">감독관 확인란: 김의서 <span class="stamp-spot">(인)<span class="stamp">김의서</span></span></p>
      <button class="btn primary">확인</button>
    </form>`);
}

// 성명과 수험번호가 data.js 의 값과 모두 일치해야 시험 시작 (띄어쓰기는 무시)
function submitInfo(form) {
  const norm = (s) => s.replace(/\s+/g, "");
  if (norm(form.examinee.value) !== norm(EXAM.friendName) || norm(form.examNumber.value) !== norm(EXAM.examNumber)) {
    document.getElementById("info-error").hidden = false;
    return;
  }
  state.name = EXAM.friendName;
  go(showPeriodCover);
}

// ---------------------------------------------------------------- 교시

function showPeriodCover() {
  const p = period();
  render(coverPage({
    badge: `제${periodNo()}교시`,
    heading: `${p.name}${p.sub ? ` <small>(${p.sub})</small>` : ""}`,
    notices: [
      `이번 교시는 ${p.questions.length}문항입니다.`,
      "답안지의 해당란에 답을 정확하게 표기하시오.",
      "마지막 문항에서 '답안 제출'을 누르면 다음 교시로 넘어갑니다.",
    ],
    button: "시험 시작",
    action: "state.qIndex = 0; go(showQuestion)",
  }));
}

function showQuestion() {
  const p = period();
  const total = p.questions.length;
  const answered = p.questions.filter((q) => state.answers.has(q)).length;
  const isLast = state.qIndex === total - 1;

  render(`
    <div class="exam">
      <header class="exam-head">
        <div class="head-row">
          <span class="badge">제${periodNo()}교시</span>
          <span class="head-title">${EXAM.title}</span>
          <span class="head-name">${esc(state.name || "")} · ${EXAM.examNumber}</span>
        </div>
        <div class="head-row">
          <h1 class="subject">${p.name}${p.sub ? ` <small>(${p.sub})</small>` : ""}</h1>
          <span class="progress-text">${state.qIndex + 1} / ${total} 문항 · 표기 ${answered}</span>
        </div>
        <div class="progress"><span style="width:${((state.qIndex + 1) / total) * 100}%"></span></div>
      </header>

      <div class="exam-body">
        <main class="paper">${renderQuestion(currentQ(), state.qIndex + 1)}</main>
        ${renderOMR(p)}
      </div>

      <nav class="exam-nav">
        <button class="btn" onclick="move(-1)" ${state.qIndex === 0 ? "disabled" : ""}>이전</button>
        <button class="btn primary" onclick="${isLast ? "submitPeriod()" : "move(1)"}">${isLast ? "답안 제출" : "다음"}</button>
      </nav>
    </div>`);
}

function move(step) {
  state.qIndex += step;
  go(showQuestion);
}

function jump(i) {
  state.qIndex = i;
  go(showQuestion);
}

function choose(i, value) {
  state.qIndex = i;
  state.answers.set(currentQ(), value);
  showQuestion();
}

function typeAnswer(value) {
  if (value.trim()) state.answers.set(currentQ(), value);
  else state.answers.delete(currentQ());
  document.getElementById("omr").outerHTML = renderOMR(period());
}

function submitPeriod() {
  const left = period().questions.filter((q) => !state.answers.has(q)).length;
  if (left && !confirm(`표기하지 않은 문항이 ${left}개 있습니다. 제출할까요?`)) return;

  if (state.periodIndex < periods.length - 1) {
    state.periodIndex++;
    go(showPeriodCover);
  } else {
    go(showResult);
  }
}

// ---------------------------------------------------------------- 문제 / 답안지

function renderQuestion(q, no) {
  const body = q.type === "subjective" ? renderSubjective(q) : renderMultipleChoice(q);
  return `
    <article class="question">
      ${q.passage ? renderPassage(q) : ""}
      <p class="q-text"><b class="q-no">${no}.</b> ${q.question} <span class="pts">[${points(q)}점]</span></p>
      ${q.example ? renderExample(q) : ""}
      ${q.image ? `<figure class="q-image"><img src="${q.image}" alt="" onerror="this.parentNode.innerHTML='(사진 자리: ${q.image})'"></figure>` : ""}
      ${body}
    </article>`;
}

function renderExample(q) {
  const label = q.exampleLabel ?? "&lt;보 기&gt;";
  return `
    <div class="example">
      ${label ? `<span class="example-label">${label}</span>` : ""}
      ${q.example}
    </div>`;
}

// 같은 지문을 쓰는 연속된 문제를 찾아 "[1~3]" 범위를 붙임
function renderPassage(q) {
  const qs = period().questions;
  let first = qs.indexOf(q);
  let last = first;
  while (first > 0 && qs[first - 1].passage === q.passage) first--;
  while (last < qs.length - 1 && qs[last + 1].passage === q.passage) last++;
  const range = first === last ? `${first + 1}` : `${first + 1}~${last + 1}`;
  return `
    <p class="passage-head">[${range}] 다음 글을 읽고 물음에 답하시오.</p>
    <div class="passage">${q.passage.replace('<div class="grid-slot"></div>', renderGrid())}</div>`;
}

// 좌표평면 — 점을 누른 순서대로 선이 이어짐 (문제를 넘겨도 그림은 유지)
const sketch = [];
const GRID = 5;      // -5 ~ 5
const CELL = 24;

function renderGrid() {
  const size = GRID * 2 * CELL;
  const x = (v) => (v + GRID) * CELL;
  const y = (v) => (GRID - v) * CELL;
  let lines = "";
  let dots = "";
  for (let v = -GRID; v <= GRID; v++) {
    const axis = v === 0 ? ' class="axis"' : "";
    lines += `<line${axis} x1="${x(v)}" y1="0" x2="${x(v)}" y2="${size}"/><line${axis} x1="0" y1="${y(v)}" x2="${size}" y2="${y(v)}"/>`;
    for (let w = -GRID; w <= GRID; w++) {
      dots += `<circle class="dot" cx="${x(v)}" cy="${y(w)}" r="7" onclick="addPoint(${v}, ${w})"/>`;
    }
  }
  const path = sketch.map(([a, b]) => `${x(a)},${y(b)}`).join(" ");
  const picked = sketch.map(([a, b]) => `<circle class="picked" cx="${x(a)}" cy="${y(b)}" r="3.5"/>`).join("");
  return `
    <div class="grid-wrap">
      <svg class="grid" viewBox="-6 -6 ${size + 12} ${size + 12}">
        <g class="lines">${lines}</g>
        <polyline class="sketch" points="${path}"/>
        ${picked}${dots}
      </svg>
      <button class="btn" onclick="clearSketch()">지우기</button>
    </div>`;
}

function addPoint(a, b) {
  sketch.push([a, b]);
  showQuestion();
}

function clearSketch() {
  sketch.length = 0;
  showQuestion();
}

function renderMultipleChoice(q) {
  const picked = state.answers.get(q);
  const cols = (cells) => [].concat(cells).map((c) => `<span class="col">${c}</span>`).join("");
  return `
    <ol class="options ${q.optionHeader ? "table" : ""}">
      ${q.optionHeader ? `<li class="option-head"><span class="mark"></span>${cols(q.optionHeader)}</li>` : ""}
      ${q.options.map((opt, i) => `
        <li>
          <button class="option ${picked === i + 1 ? "selected" : ""}" onclick="choose(${state.qIndex}, ${i + 1})">
            <span class="mark">${CIRCLED[i]}</span>${cols(opt)}
          </button>
        </li>`).join("")}
    </ol>`;
}

function renderSubjective(q) {
  return `
    <label class="subjective">
      <span>답 :</span>
      <input value="${esc(state.answers.get(q) ?? "")}" oninput="typeAnswer(this.value)" autocomplete="off" placeholder="답을 입력하시오">
    </label>`;
}

function renderOMR(p) {
  return `
    <aside class="omr" id="omr">
      <div class="omr-head">답안지 <small>${p.name}</small></div>
      <div class="omr-rows">
        ${p.questions.map((q, i) => {
          const a = state.answers.get(q);
          const cells = q.type === "subjective"
            ? `<span class="omr-text">${a ? esc(a) : ""}</span>`
            : q.options.map((_, j) => `
                <button class="bubble ${a === j + 1 ? "filled" : ""}" onclick="choose(${i}, ${j + 1})">${CIRCLED[j]}</button>`).join("");
          return `
            <div class="omr-row ${i === state.qIndex ? "current" : ""}">
              <button class="omr-no" onclick="jump(${i})">${i + 1}</button>
              <div class="omr-cells">${cells}</div>
            </div>`;
        }).join("")}
      </div>
    </aside>`;
}

// ---------------------------------------------------------------- 채점 / 결과

function isCorrect(q, a) {
  if (a === undefined) return false;
  if (q.type !== "subjective") return a === q.answer;
  const norm = (s) => String(s).replace(/\s+/g, "").toLowerCase();
  return [].concat(q.answer).some((ans) => norm(ans) === norm(a));
}

function scorePeriod(p) {
  const full = p.questions.reduce((s, q) => s + points(q), 0);
  const got = p.questions.reduce((s, q) => s + (isCorrect(q, state.answers.get(q)) ? points(q) : 0), 0);
  const correct = p.questions.filter((q) => isCorrect(q, state.answers.get(q))).length;
  const score = Math.round((got / full) * 100);
  const grade = Math.min(9, Math.max(1, 10 - Math.floor(score / 10)));
  return { correct, total: p.questions.length, score, grade };
}

function showResult() {
  const results = periods.map(scorePeriod);
  const sum = results.reduce((s, r) => s + r.score, 0);
  const avg = Math.round(sum / results.length);
  const row = (label, fn) => `<tr><th>${label}</th>${results.map((r) => `<td>${fn(r)}</td>`).join("")}</tr>`;

  render(`
    <div class="sheet result">
      <p class="cover-title">${EXAM.title}</p>
      <h1 class="cover-heading">성적통지표</h1>
      ${examineeBoxes()}
      <div class="table-wrap">
        <table>
          <tr><th>영역</th>${periods.map((p) => `<th>${p.name}${p.sub ? `<br><small>${p.sub}</small>` : ""}</th>`).join("")}</tr>
          ${row("맞은 문항", (r) => `${r.correct} / ${r.total}`)}
          ${row("점수", (r) => r.score)}
          ${row("등급", (r) => `<b>${r.grade}</b>`)}
        </table>
      </div>
      <p class="total">총점 <b>${sum}</b> / ${results.length * 100} · 평균 <b>${avg}</b>점</p>
      <button class="btn primary" onclick="go(showFinal)">다음</button>
    </div>`);
}

function showFinal() {
  render(`
    <div class="sheet final">
      <h1>${EXAM.finalTitle}</h1>
      <p>${EXAM.finalMessage}</p>
      <button class="btn" onclick="location.reload()">처음으로</button>
    </div>`);
}

go(showStart);
