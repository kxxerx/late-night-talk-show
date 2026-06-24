import * as config from "./config.js";
import { qs, showMessage, getMyProfile, revealMemberLinks } from "./common.js";

await revealMemberLinks();
const profile = await getMyProfile();

function showNotFoundOverlay() {
  const modal = document.createElement("div");
  modal.className = "not-found-overlay open";
  modal.innerHTML = `<div class="not-found-box"><h2>404 NOT FOUND</h2><p>■■■■■■■■■■■■■■■■■■■■■■</p></div>`;
  document.body.appendChild(modal);
  setTimeout(() => {
    modal.classList.remove("open");
    setTimeout(() => modal.remove(), 350);
  }, 1150);
}

function renderInvite() {
  const content = qs("#inviteDynamicContent");
  if (!content) return;
  if (profile?.visitor_type === "entity") {
    document.body.classList.add("entity-mode", "entity-invite-page");
    qs("#inviteLead").textContent = "게스트 확인이 완료되었습니다.";
    content.innerHTML = `
      <p class="entity-glitch">■■■■■ 수신자 식별 오류 ■■■■■</p>
      <p class="entity-glitch small">당신은 초대된 적이 없습니다. 당신은 이미 여기 있었습니다. ■■■■■■■■■■■■■■■</p>
      <p class="entity-welcome">어서 오세요, 게스트님.</p>
      <p class="entity-copy">당신은 심야 토크쇼의 게스트로 초대되었습니다.<br>오늘도 멋진 경험담 들려주세요.</p>
      <p class="entity-smile">😊</p>
      <button id="openInviteBtn" type="button">참여하기</button>
    `;
    return;
  }
  qs("#inviteLead").textContent = "심야토크쇼의 방청객으로 초청되셨습니다.";
  content.innerHTML = `
    <p class="glitched-warning">■, 이 ■■■ ■■■■■ ■■■■ ■■, ■■, ■■, ■■■■ ■■ ■■■ ■■■ ■■ 리■■■ ■■■ ■■■■와 ■■■■.</p>
    <p class="play-with-us">우 리 같 이 놀 자</p>
    <p class="come-here-wall">이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와이리와</p>
    <p class="audience-invite">심야토크쇼의 방청객으로 초청되셨습니다.</p>
    <button id="openInviteBtn" type="button">초대권 받기</button>
  `;
}

document.addEventListener("click", (event) => {
  if (event.target?.id !== "openInviteBtn") return;
  const url = config.BAND_INVITE_URL || "https://band.us/";
  if (!url || url === "#" || url === "https://band.us/") {
    showMessage("아직 특별관 연결 주소가 설정되지 않았습니다. js/config.js에 BAND_INVITE_URL을 추가하세요.", "error");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
});

showNotFoundOverlay();
renderInvite();
