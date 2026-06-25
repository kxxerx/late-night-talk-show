// pollution-shop-version: v5.1
import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getMyProfile, formatDate, applyVisitorModeClass } from "./common.js";

async function loadSubmissions() {
  const profile = await getMyProfile();
applyVisitorModeClass(profile);
  if (!profile) return;

  const { data, error } = await supabase
    .from("event_submissions")
    .select("*, event_codes(code, title)")
    .eq("user_id", profile.id)
    .order("submitted_at", { ascending: false });

  if (error) throw error;

  qs("#submissionList").innerHTML = (data || []).map(row => `
    <article class="submission-row">
      <strong>${row.event_codes?.title || row.event_codes?.code || "이벤트"}</strong>
      <span class="status ${row.status}">${row.status}</span>
      <p class="muted">${formatDate(row.submitted_at)}</p>
    </article>
  `).join("") || `<p class="muted">제출 내역이 없습니다.</p>`;
}

qs("#codeForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const code = qs("#eventCode").value.trim();

  const { data, error } = await supabase.rpc("submit_event_code", {
    p_code: code,
    p_proof_text: ""
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showMessage(data.message || "제출되었습니다.", "success");
  qs("#eventCode").value = "";
  await loadSubmissions();
});

loadSubmissions().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
