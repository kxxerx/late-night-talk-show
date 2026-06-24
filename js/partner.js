import * as config from "./config.js";
import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getMyProfile, revealMemberLinks } from "./common.js";

await revealMemberLinks();

const profile = await getMyProfile();

function entityInviteRewrite() {
  if (!profile || profile.visitor_type !== "entity") return;
  document.body.classList.add("entity-mode", "entity-invite-page");
  const invite = document.querySelector(".midnight-invite");
  if (!invite) return;
  invite.insertAdjacentHTML("afterbegin", `
    <p class="entity-glitch">■■■■■ 수신자 식별 오류 ■■■■■</p>
    <p class="entity-glitch small">당신은 초대된 적이 없습니다. 당신은 이미 여기 있었습니다. ■■■■■■■■■■■■■■■</p>
  `);
}

entityInviteRewrite();

qs("#openInviteBtn")?.addEventListener("click", async () => {
  if (!profile) return;

  const button = qs("#openInviteBtn");
  button.disabled = true;
  button.textContent = "초대장 처리 중...";

  const { data, error } = await supabase.rpc("claim_partner_invitation");

  if (error) {
    showMessage(error.message, "error");
    button.disabled = false;
    button.textContent = "초대장 받기";
    return;
  }

  showMessage(data.message || "초대장을 받았습니다.", "success");

  const url = config.BAND_INVITE_URL || "https://band.us/";

  if (!url || url === "#" || url === "https://band.us/") {
    showMessage("아직 특별관 연결 주소가 설정되지 않았습니다. js/config.js에 BAND_INVITE_URL을 추가하세요.", "error");
    button.disabled = false;
    button.textContent = "초대장 받기";
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
  button.disabled = false;
  button.textContent = data.already_claimed ? "초대장 다시 열기" : "초대장 받기";
});
