import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getMyProfile, renderNav, formatDate } from "./common.js";

await renderNav();

async function loadDashboard() {
  const profile = await getMyProfile();
  if (!profile) return;

  qs("#siteId").textContent = profile.site_id;
  qs("#email").textContent = profile.email || "-";
  qs("#displayName").value = profile.display_name || "";
  qs("#bandNickname").value = profile.band_nickname || "";
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

  const { error } = await supabase.rpc("update_my_profile", {
    p_display_name: displayName,
    p_band_nickname: bandNickname
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showMessage("프로필 저장 완료", "success");
  await loadDashboard();
});

loadDashboard().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
