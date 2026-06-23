import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getMyProfile, renderNav, formatDate, profileAvatar, pollutionLabel } from "./common.js";

await renderNav();

async function loadDashboard() {
  const profile = await getMyProfile();
  if (!profile) return;

  qs("#profileHero").innerHTML = `
    <div class="avatar big">${profileAvatar(profile)}</div>
    <div>
      <h1>${profile.display_name || profile.site_id}</h1>
      <p class="muted">@${profile.site_id} · ${pollutionLabel(profile.pollution)}</p>
    </div>
  `;

  qs("#siteId").textContent = profile.site_id;
  qs("#email").textContent = profile.email || "-";
  qs("#displayName").value = profile.display_name || "";
  qs("#bandNickname").value = profile.band_nickname || "";
  qs("#avatarUrl").value = profile.avatar_url || "";
  qs("#currency").textContent = profile.currency;
  qs("#pollution").textContent = profile.pollution;
  qs("#role").textContent = profile.role;

  const bar = qs("#pollutionBar");
  bar.style.width = `${profile.pollution}%`;
  bar.textContent = `${profile.pollution}%`;

  const { data: currencyLogs } = await supabase
    .from("currency_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: pollutionLogs } = await supabase
    .from("pollution_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  qs("#currencyLogs").innerHTML = (currencyLogs || []).map(log => `
    <li>${formatDate(log.created_at)} / ${log.change_amount > 0 ? "+" : ""}${log.change_amount} / ${log.reason}</li>
  `).join("") || `<li>재화 기록 없음</li>`;

  qs("#pollutionLogs").innerHTML = (pollutionLogs || []).map(log => `
    <li>${formatDate(log.created_at)} / ${log.change_amount > 0 ? "+" : ""}${log.change_amount} / ${log.reason}</li>
  `).join("") || `<li>오염도 기록 없음</li>`;
}

qs("#profileForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const displayName = qs("#displayName").value;
  const bandNickname = qs("#bandNickname").value;
  const avatarUrl = qs("#avatarUrl").value;

  const { error } = await supabase.rpc("update_my_profile", {
    p_display_name: displayName,
    p_band_nickname: bandNickname,
    p_avatar_url: avatarUrl
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showMessage("프로필 저장 완료", "success");
  await loadDashboard();
});

qs("#withdrawBtn")?.addEventListener("click", async () => {
  const ok = confirm("정말 탈퇴 처리할까요? 보유 재화, 오염도, 아이템 수량이 초기화됩니다. 이 작업은 테스트용 비활성화에 가깝고, Supabase Auth 계정의 완전 삭제는 관리자가 별도로 해야 합니다.");
  if (!ok) return;

  const { data, error } = await supabase.rpc("withdraw_my_account");

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showMessage(data.message, "success");
  await supabase.auth.signOut();
  setTimeout(() => location.href = "login.html", 700);
});

loadDashboard().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
