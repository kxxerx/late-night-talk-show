import * as config from "./config.js";
import { qs, showMessage, getMyProfile, revealMemberLinks } from "./common.js";

await revealMemberLinks();

const profile = await getMyProfile();

qs("#openInviteBtn")?.addEventListener("click", () => {
  if (!profile) return;

  const url = config.BAND_INVITE_URL || "https://band.us/";

  if (!url || url === "#" || url === "https://band.us/") {
    showMessage("아직 특별관 연결 주소가 설정되지 않았습니다. js/config.js에 BAND_INVITE_URL을 추가하세요.", "error");
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
});
