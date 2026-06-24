
import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getMyProfile, renderNav, formatDate, profileAvatar, pollutionLabel, visitorStatusText, visitorStatusClass, visitorMetricValue, visitorKindLabel, applyVisitorModeClass } from "./common.js";

await renderNav();
let currentProfile = null;

function displayVisitorName(profile) {
  return profile?.band_nickname || profile?.display_name || "익명";
}

function safeFileName(name) {
  return String(name || "avatar.png").toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 80);
}

async function uploadAvatarIfSelected(profile) {
  const input = qs("#avatarFile");
  const file = input?.files?.[0];
  if (!file) return qs("#avatarUrl")?.value.trim() || profile.avatar_url || "";
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있습니다.");
  if (file.size > 2 * 1024 * 1024) throw new Error("프로필 이미지는 2MB 이하로 올려주세요.");
  const path = `${profile.id}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "3600", upsert: true });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

async function loadDashboard() {
  const profile = await getMyProfile();
applyVisitorModeClass(profile);
  if (!profile) return;
  currentProfile = profile;
  const visitorName = displayVisitorName(profile);

  qs("#profileHero").innerHTML = `
    <div class="avatar big">${profileAvatar({ ...profile, display_name: visitorName })}</div>
    <div>
      <h1 class="visitor-name" title="${visitorName}">${visitorName}</h1>
      <p class="muted">${profile.visitor_type === "entity" ? `${visitorKindLabel(profile)} ${visitorMetricValue(profile)} / 100` : `방문객 상태 ${profile.pollution} / 100 · ${visitorStatusText(profile)}`}</p>
    </div>
  `;

  if (qs("#siteId")) qs("#siteId").textContent = profile.site_id;
  if (qs("#email")) qs("#email").textContent = profile.email || "-";
  if (qs("#displayName")) qs("#displayName").value = profile.display_name || "익명";
  if (qs("#bandNickname")) qs("#bandNickname").value = profile.band_nickname || "";
  if (qs("#avatarUrl")) qs("#avatarUrl").value = profile.avatar_url || "";
  if (qs("#currency")) qs("#currency").textContent = profile.currency;
  if (qs("#pollution")) qs("#pollution").textContent = visitorMetricValue(profile);
  if (qs("#pollutionStatusLabel")) { qs("#pollutionStatusLabel").textContent = visitorKindLabel(profile); qs("#pollutionStatusLabel").className = `status-inline ${visitorStatusClass(profile)}`; }
  if (qs("#visitorStatusText")) qs("#visitorStatusText").textContent = visitorStatusText(profile);
  if (qs("#role")) qs("#role").textContent = profile.role;

  const bar = qs("#pollutionBar");
  if (bar) {
    bar.style.width = `${profile.pollution}%`;
    bar.textContent = `${profile.pollution}%`;
  }

  const { data: currencyLogs } = await supabase.from("currency_logs").select("*").order("created_at", { ascending: false }).limit(5);
  const { data: pollutionLogs } = await supabase.from("pollution_logs").select("*").order("created_at", { ascending: false }).limit(5);

  qs("#currencyLogs").innerHTML = (currencyLogs || []).map(log => `<li>${formatDate(log.created_at)} / ${log.change_amount > 0 ? "+" : ""}${log.change_amount} / ${log.reason}</li>`).join("") || `<li>유쾌주화 기록 없음</li>`;
  qs("#pollutionLogs").innerHTML = (pollutionLogs || []).map(log => `<li>${formatDate(log.created_at)} / ${log.change_amount > 0 ? "+" : ""}${log.change_amount} / ${log.reason}</li>`).join("") || `<li>방문객 상태 기록 없음</li>`;
}

qs("#profileForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const displayName = currentProfile.display_name || "익명";
    const bandNickname = qs("#bandNickname")?.value || "";
    const avatarUrl = await uploadAvatarIfSelected(currentProfile);
    const { error } = await supabase.rpc("update_my_profile", { p_display_name: displayName, p_band_nickname: bandNickname, p_avatar_url: avatarUrl });
    if (error) throw error;
    showMessage("방문객 정보 저장 완료", "success");
    if (qs("#avatarFile")) qs("#avatarFile").value = "";
    await loadDashboard();
  } catch (error) {
    console.error(error);
    showMessage(error.message, "error");
  }
});

function makeDontLeaveText() {
  return Array.from({ length: 170 }, () => "나가지마").join("");
}

function openExitModal() {
  let modal = document.querySelector("#exitHorrorModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "exitHorrorModal";
    modal.innerHTML = `
      <div class="exit-horror-box" style="width:min(780px,100%);max-height:min(720px,90vh);overflow:hidden;border:1px solid #8b0000;background:#000;box-shadow:0 0 55px rgba(255,0,0,.45);padding:36px 30px;text-align:center;">
        <h2 style="color:#ff0000;font-size:clamp(34px,6vw,62px);line-height:1.05;margin:0 0 20px;text-shadow:0 0 14px rgba(255,0,0,.92);">완전히 소각당하시겠습니까?</h2>
        <p style="color:#ff0000;font-size:10px;line-height:1.22;word-break:break-all;max-height:240px;overflow:hidden;opacity:.9;margin:0 0 24px;">${makeDontLeaveText()}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
          <button id="confirmExitBtn" type="button" style="border-radius:0;background:#210000;color:#ff0000;border:1px solid #ff0000;padding:10px 14px;font-size:13px;font-weight:800;cursor:pointer;">기념품샵 떠나기</button>
          <button id="cancelExitBtn" type="button" style="border-radius:0;background:#080808;color:#ff0000;border:1px solid #a00000;padding:10px 14px;font-size:13px;font-weight:800;cursor:pointer;">아직 머무르기</button>
        </div>
      </div>`;
    Object.assign(modal.style, { position: "fixed", inset: "0", zIndex: "2147483647", display: "none", alignItems: "center", justifyContent: "center", padding: "20px", background: "#000" });
    document.body.appendChild(modal);
    modal.querySelector("#cancelExitBtn").addEventListener("click", () => { modal.style.display = "none"; });
    modal.addEventListener("click", (event) => { if (event.target === modal) modal.style.display = "none"; });
    modal.querySelector("#confirmExitBtn").addEventListener("click", async (event) => {
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = "소각 중...";
      const { data, error } = await supabase.rpc("withdraw_my_account");
      if (error) {
        showMessage(error.message, "error");
        event.currentTarget.disabled = false;
        event.currentTarget.textContent = "기념품샵 떠나기";
        modal.style.display = "none";
        return;
      }
      showMessage(data.message, "success");
      await supabase.auth.signOut();
      setTimeout(() => location.href = "index.html", 700);
    });
  }
  modal.style.display = "flex";
}

qs("#withdrawBtn")?.addEventListener("click", () => openExitModal());

loadDashboard().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
