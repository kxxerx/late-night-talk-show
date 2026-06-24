import * as config from "./config.js";
import { qs, showMessage, getMyProfile, revealMemberLinks, applyVisitorModeClass } from "./common.js";

await revealMemberLinks();

const profile = await getMyProfile();
applyVisitorModeClass(profile);

const PROCLAMATION_TEXT = "내가 백만가면의 소유자요, 혼돈의 군주요, 광기의 정점이요, 쾌락과 유희의 꿈이요, 전쟁의 선동자요, 과학의 어버이요, 낮은 네발짐승이요, 기는 자의 욕망이요, 별의 군주요, 환상의 심연이요, 지혜의 입이요, 충동의 포효요, 달의 뒷면이요, 나는...";
const WHO_AM_I_TEXT = "나는 누구야? ".repeat(28);
const REDACTED_LINES = [
  "■, 이 ■■■ ■■■■■ ■■■■ ■■, ■■, ■■, ■■■■ ■■ ■■■ ■■■ ■■ 리■■■ ■■■ ■■■■와 ■■■■.",
  "■ ■ ■ ■ ■ ■",
  "■■■■■■! ■ ■■ ■■■. 매일 ■■■ ■■■ ■■. ■■■ ■■■ ■■■ ■■■! ■■■■■■. 여기■ ■■ ■■■■■■! ■■■ ■영■■■ ■■원 ■히 환영합니다."
];
const COME_HERE_TEXT = "이리와".repeat(90);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function typeText(node, text, interval = 18) {
  return new Promise(resolve => {
    node.textContent = "";
    let i = 0;
    const timer = setInterval(() => {
      node.textContent += text[i] || "";
      i += 1;
      if (i >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, interval);
  });
}

async function typeLines(container, lines, interval = 18) {
  container.innerHTML = "";
  for (const line of lines) {
    const p = document.createElement("p");
    p.className = "corrupt-line";
    container.appendChild(p);
    await typeText(p, line, interval);
    await sleep(120);
  }
}

function showNotFoundOverlay() {
  const modal = document.createElement("div");
  modal.className = "not-found-overlay open";
  modal.innerHTML = `
    <div class="not-found-box">
      <h2>404 NOT FOUND</h2>
      <p>■■■■■■■■■■■■■■■■■■■■■■</p>
    </div>
  `;
  document.body.appendChild(modal);

  setTimeout(() => {
    modal.classList.remove("open");
    setTimeout(() => modal.remove(), 350);
  }, 1050);
}

function makeMadPopup() {
  const overlay = document.createElement("div");
  overlay.className = "mad-popup-overlay open";
  overlay.innerHTML = `
    <div class="mad-popup-box">
      <div id="madPopupContent" class="mad-popup-content"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

async function clearMadPopup(overlay, pause = 320) {
  const content = overlay.querySelector("#madPopupContent");
  content.classList.add("fade-out");
  await sleep(240);
  content.classList.remove("fade-out");
  content.innerHTML = "";
  await sleep(pause);
}

async function runHumanPrelude() {
  const overlay = makeMadPopup();
  const content = overlay.querySelector("#madPopupContent");

  content.innerHTML = `<div class="mad-popup-big">보라!</div>`;
  await sleep(900);
  await clearMadPopup(overlay, 360);

  content.innerHTML = `<p id="proclamationLine" class="mad-popup-text"></p>`;
  await typeText(content.querySelector("#proclamationLine"), PROCLAMATION_TEXT, 34);
  await sleep(620);
  await clearMadPopup(overlay, 420);

  content.innerHTML = `<p id="whoAmILine" class="mad-popup-text who-am-i-screen"></p>`;
  await typeText(content.querySelector("#whoAmILine"), WHO_AM_I_TEXT, 7);
  await sleep(560);
  await clearMadPopup(overlay, 420);

  content.innerHTML = `<div class="mad-popup-big who-are-you">너는 누구야?</div>`;
  await sleep(900);

  overlay.classList.remove("open");
  await sleep(260);
  overlay.remove();
}

function renderOriginalInvitation(content) {
  qs("#inviteLead").textContent = "수신 중입니다.";
  content.innerHTML = `
    <div id="originalInviteBlock" class="original-invite-block">
      <p class="original-warning">단, 이 버튼을 누름으로써 발생하는 공포, 환청, ■■, ■■■■ 등의 문제에 대하여 골든 리조트는 일체의 배상책임이 없습니다.</p>
      <p class="original-play">우 리 같 이 놀 자</p>
      <p class="original-gabia">안녕하십니까! 이 밤의 즐거움. 매일 만나는 새로운 얼굴. 그리고 친근한 당신의 사회자! 안녕하십니까. 여기는 심야 토크쇼입니다! 오늘의 방청객으로 초대된 것을 환영합니다.</p>
    </div>
  `;
}

async function corruptOriginalInvitation() {
  const block = qs("#originalInviteBlock");
  if (!block) return;

  block.classList.add("is-shaking-before-redact");
  await sleep(900);

  block.classList.remove("is-shaking-before-redact");
  block.classList.add("is-corrupting");
  block.innerHTML = `<div id="redactedLine" class="invite-corrupt-copy corrupting-redacted"></div>`;

  await typeLines(qs("#redactedLine"), REDACTED_LINES, 22);
  await sleep(520);
  block.classList.add("fade-out");
  await sleep(260);
  block.remove();
}

async function renderHumanInvite() {
  const content = qs("#inviteDynamicContent");
  qs("#inviteLead").textContent = "수신 중입니다.";

  await runHumanPrelude();

  renderOriginalInvitation(content);
  await sleep(5000);

  await corruptOriginalInvitation();

  content.insertAdjacentHTML("beforeend", `
    <p id="comeHereLine" class="invite-corrupt-copy come-here-wall"></p>
    <p id="audienceInvite" class="audience-invite final-invite-line" hidden>심야토크쇼의 방청객으로 초대되셨습니다.</p>
    <button id="openInviteBtn" type="button" hidden>방청하기</button>
  `);

  await typeText(qs("#comeHereLine"), COME_HERE_TEXT, 5);
  await sleep(350);

  qs("#audienceInvite").hidden = false;
  qs("#inviteLead").textContent = "수신이 완료되었습니다.";
  await sleep(260);
  qs("#openInviteBtn").hidden = false;
}

async function renderEntityInvite() {
  const content = qs("#inviteDynamicContent");
  qs("#inviteLead").textContent = "게스트 확인 중입니다.";
  content.innerHTML = `
    <p id="entityLine1" class="entity-welcome"></p>
    <p id="entityLine2" class="entity-copy"></p>
    <p id="entityLine3" class="entity-copy"></p>
    <p id="entitySmile" class="entity-smile" hidden>😊</p>
    <button id="openInviteBtn" type="button" hidden>참여하기</button>
  `;

  await typeText(qs("#entityLine1"), "어서 오세요, 게스트님.", 45);
  await typeText(qs("#entityLine2"), "당신은 심야 토크쇼의 게스트로 초대되었습니다.", 35);
  await typeText(qs("#entityLine3"), "오늘도 멋진 경험담 들려주세요.", 35);
  qs("#entitySmile").hidden = false;
  await sleep(320);
  qs("#inviteLead").textContent = "게스트 확인이 완료되었습니다.";
  qs("#openInviteBtn").hidden = false;
}

function renderInvite() {
  if (profile?.visitor_type === "entity") {
    document.body.classList.add("entity-invite-page");
    renderEntityInvite().catch(error => {
      console.error(error);
      showMessage(error.message, "error");
    });
  } else {
    renderHumanInvite().catch(error => {
      console.error(error);
      showMessage(error.message, "error");
    });
  }
}

function wireInviteButton() {
  document.addEventListener("click", (event) => {
    if (event.target?.id !== "openInviteBtn") return;

    const url = config.BAND_INVITE_URL || "https://band.us/";

    if (!url || url === "#" || url === "https://band.us/") {
      showMessage("아직 특별관 연결 주소가 설정되지 않았습니다. js/config.js에 BAND_INVITE_URL을 추가하세요.", "error");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  });
}

showNotFoundOverlay();
setTimeout(renderInvite, 1120);
wireInviteButton();
