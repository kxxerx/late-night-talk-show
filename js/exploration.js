// exploration-site-starter: v0.1
import { supabase } from "./supabaseClient.js";
import { qs, showMessage, authEmailFromLoginId, revealMemberLinks, applyVisitorModeClass } from "./common.js";

await revealMemberLinks();

const ORG_LABELS = {
  baekildream: "백일몽 주식회사",
  disaster_agency: "초자연 재난관리국",
  entity: "괴이",
  unaffiliated: "무소속",
  other: "기타"
};

const DEPT_LABELS = {
  field_exploration: "현장탐사팀",
  research: "연구팀",
  security: "보안팀",
  agent: "요원",
  entity: "괴이",
  none: "없음",
  other: "기타"
};

const VISITOR_LABELS = {
  human: "일반",
  infected: "오염자",
  entity: "괴이"
};

function safeText(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function metricLabel(profile) {
  if (profile.visitor_type === "entity") {
    return `동기화 ${Number(profile.mask_collapse_rate || 0)}`;
  }
  return `오염도 ${Number(profile.pollution || 0)}`;
}

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function loadProfile() {
  const session = await getSession();
  if (!session) {
    qs("#loginPanel").hidden = false;
    qs("#profilePanel").hidden = true;
    qs("#roomPanel").hidden = true;
    return null;
  }

  qs("#loginPanel").hidden = true;
  document.querySelectorAll(".requires-login").forEach((node) => { node.hidden = false; });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      site_id,
      display_name,
      band_nickname,
      visitor_type,
      organization_code,
      department_code,
      affiliation_label,
      character_key,
      currency,
      pollution,
      mask_collapse_rate,
      status
    `)
    .eq("id", session.user.id)
    .single();

  if (error) throw error;
  if (profile.status === "withdrawn") {
    await supabase.auth.signOut();
    showMessage("비활성화된 계정입니다.", "error");
    qs("#loginPanel").hidden = false;
    return null;
  }

  applyVisitorModeClass(profile);
  renderProfile(profile);
  qs("#profilePanel").hidden = false;
  qs("#roomPanel").hidden = false;
  return profile;
}

function renderProfile(profile) {
  const organization = ORG_LABELS[profile.organization_code] || profile.organization_code || "무소속";
  const department = DEPT_LABELS[profile.department_code] || profile.department_code || "없음";
  const visitor = VISITOR_LABELS[profile.visitor_type] || profile.visitor_type || "일반";
  const affiliation = profile.affiliation_label || `${organization} / ${department}`;
  qs("#profileCard").innerHTML = `
    <div class="profile-mini-grid">
      <p><strong>캐릭터명</strong><br>${safeText(profile.display_name || "익명")}</p>
      <p><strong>밴드 닉네임</strong><br>${safeText(profile.band_nickname || "-")}</p>
      <p><strong>캐릭터 키</strong><br>${safeText(profile.character_key || "-")}</p>
      <p><strong>방문객 상태</strong><br>${safeText(visitor)}</p>
      <p><strong>기관</strong><br>${safeText(organization)}</p>
      <p><strong>팀/부서</strong><br>${safeText(department)}</p>
      <p><strong>표시 소속명</strong><br>${safeText(affiliation)}</p>
      <p><strong>유쾌주화</strong><br>${Number(profile.currency || 0)}</p>
      <p><strong>상태 수치</strong><br>${safeText(metricLabel(profile))}</p>
    </div>
  `;
}

qs("#explorationLoginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const loginId = qs("#explorationLoginId").value.trim();
  const password = qs("#explorationPassword").value;
  const email = authEmailFromLoginId(loginId);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage("로그인 실패: 아이디 또는 비밀번호를 확인하세요.", "error");
    return;
  }
  showMessage("탐사 로그인 완료.", "success");
  await loadProfile();
});

qs("#refreshProfile")?.addEventListener("click", async () => {
  try {
    await loadProfile();
    showMessage("현재 탐사자 정보를 다시 불러왔습니다.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  }
});

qs("#logoutButton")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "exploration.html";
});

qs("#roomDraftForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const scenario = qs("#scenarioSelect").value;
  const title = qs("#roomTitle").value.trim() || "이름 없는 탐사방";
  const maxPlayers = qs("#maxPlayers").value;
  const box = qs("#roomDraftResult");
  box.className = "message success";
  box.style.display = "block";
  box.textContent = `방 설정 확인: ${title} / 시나리오 ${scenario} / 최대 ${maxPlayers}명. 실제 방 생성은 다음 단계 DB 테이블 추가 후 연결합니다.`;
});

try {
  await loadProfile();
} catch (error) {
  showMessage(error.message, "error");
}
