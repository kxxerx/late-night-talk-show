import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getMyProfile, renderNav, formatDate } from "./common.js";

await renderNav();

async function loadSubmissions() {
  const profile = await getMyProfile();
  if (!profile) return;

  const { data, error } = await supabase
    .from("event_submissions")
    .select("*, event_code:event_codes(code, title, reward_currency, pollution_delta)")
    .order("submitted_at", { ascending: false });

  if (error) throw error;

  qs("#submissionList").innerHTML = (data || []).map(row => `
    <tr>
      <td>${row.event_code?.code || "-"}</td>
      <td>${row.event_code?.title || "-"}</td>
      <td><span class="status ${row.status}">${row.status}</span></td>
      <td>${row.event_code?.reward_currency ?? 0}</td>
      <td>${row.event_code?.pollution_delta ?? 0}</td>
      <td>${formatDate(row.submitted_at)}</td>
      <td>${row.admin_note || ""}</td>
    </tr>
  `).join("") || `<tr><td colspan="7">제출 내역이 없습니다.</td></tr>`;
}

qs("#codeForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const code = qs("#eventCode").value.trim();
  const proof = qs("#proofText").value.trim();

  const { data, error } = await supabase.rpc("submit_event_code", {
    p_code: code,
    p_proof_text: proof
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showMessage(data.message, "success");
  qs("#codeForm").reset();
  await loadSubmissions();
});

loadSubmissions().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
