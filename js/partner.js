import * as config from "./config.js";
import { qs, showMessage, getMyProfile, revealMemberLinks, applyVisitorModeClass } from "./common.js";

await revealMemberLinks();

const profile = await getMyProfile();
applyVisitorModeClass(profile);

const PROCLAMATION_TEXT = "내가 백만가면의 소유자요, 혼돈의 군주요, 광기의 정점이요, 쾌락과 유희의 꿈이요, 전쟁의 선동자요, 과학의 어버이요, 낮은 네발짐승이요, 기는 자의 욕망이요, 별의 군주요, 환상의 심연이요, 지혜의 입이요, 충동의 포효요, 달의 뒷면이요, 나는...";
const WHO_AM_I_TEXT = "나는 누구야? ".repeat(28);
const REDACTED_TEXT = "■, 이 ■■■ ■■■■■ ■■■■ ■■, ■■, ■■, ■■■■ ■■ ■■■ ■■■ ■■ 리■■■ ■■■ ■■■■와 ■■■■.";
const COME_HERE_TEXT = "이리와".repeat(90);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function showNotFoundOverlay() {
  let modal = document.createElement("div");
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

async function renderHumanInvite() {
  const content = qs("#inviteDynamicContent");
  qs("#inviteLead").textContent = "수신 중입니다.";

  content.innerHTML = `
    <div id="beholdFlash" class="behold-flash" hidden>보라!</div>
    <p id="proclamationLine" class="mad-proclamation" hidden></p>
    <p id="whoAmILine" class="who-am-i-line" hidden></p>
    <div id="whoAreYouFlash" class="who-are-you-flash" hidden>너는 누구야?</div>
    <p id="redactedLine" class="invite-corrupt-copy" hidden></p>
    <p id="comeHereLine" class="invite-corrupt-copy come-here-wall" hidden></p>
    <p id="audienceInvite" class="audience-invite final-invite-line" hidden>심야토크쇼의 방청객으로 초대되셨습니다.</p>
    <button id="openInviteBtn" type="button" hidden>방청하기</button>
  `;

  const behold = qs("#beholdFlash");
  const proclamation = qs("#proclamationLine");
  const whoAmI = qs("#whoAmILine");
  const whoAreYou = qs("#whoAreYouFlash");
  const redacted = qs("#redactedLine");
  const comeHere = qs("#comeHereLine");
  const audience = qs("#audienceInvite");
  const button = qs("#openInviteBtn");

  behold.hidden = false;
  await sleep(700);
  behold.classList.add("fade-out");
  await sleep(420);
  behold.hidden = true;

  proclamation.hidden = false;
  await typeText(proclamation, PROCLAMATION_TEXT, 35);
  await sleep(450);

  whoAmI.hidden = false;
  await typeText(whoAmI, WHO_AM_I_TEXT, 8);
  await sleep(350);

  whoAreYou.hidden = false;
  await sleep(900);
  whoAreYou.classList.add("fade-out");
  proclamation.hidden = true;
  whoAmI.hidden = true;
  await sleep(360);
  whoAreYou.hidden = true;

  redacted.hidden = false;
  await typeText(redacted, REDACTED_TEXT, 24);
  await sleep(420);
  redacted.hidden = true;

  comeHere.hidden = false;
  await typeText(comeHere, COME_HERE_TEXT, 5);
  await sleep(350);

  audience.hidden = false;
  qs("#inviteLead").textContent = "수신이 완료되었습니다.";
  await sleep(260);
  button.hidden = false;
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
    renderEntityInvite();
  } else {
    renderHumanInvite();
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
