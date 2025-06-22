import { marked } from 'marked';
import { fractionScenario } from './cases/fractions-grade3.js';

import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { db } from './firebaseConfig.js';
import { collection, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import Swal from 'sweetalert2';

const userInfoDiv = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, (user) => {
  if (user) {
    userInfoDiv.textContent = `👤 ${user.displayName} 님`;
    logoutBtn.style.display = 'inline-block';
  } else {
    userInfoDiv.textContent = '🔐 로그인 후 이용해 주세요.';
    logoutBtn.style.display = 'none';
    alert('로그인이 필요합니다.');
    window.location.href = '/index.html';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    alert('로그아웃 되었습니다.');
    window.location.href = '/index.html';
  } catch (error) {
    console.error('로그아웃 오류:', error);
  }
});



const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const assistantId = import.meta.env.VITE_OPENAI_ASSISTANT_ID;

const chatbox = document.getElementById("chatbox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const feedbackBtn = document.getElementById("feedbackBtn");
const inputText = document.getElementById("inputText");
const result = document.getElementById("result");

const characterDescription = Object.entries(fractionScenario.characters)
  .map(([name, desc]) => `- ${name}: ${desc}`)
  .join("\n");

const scenarioPrompt = `
당신은 다음 네 명의 초등학생입니다:

${characterDescription}

교사의 질문에 응답하세요. 아래 형식을 따르세요:
민지: ...
준호: ...
유진: ...
소율: ...
`;

let messages = [
  { role: "system", content: scenarioPrompt }
];

async function fetchGptResponse() {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      messages,
      temperature: 0.7
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content.trim() || "(응답 없음)";
}

sendBtn.addEventListener("click", async () => {
  const input = userInput.value.trim();
  if (!input) return;

  messages.push({ role: "user", content: input });
  updateChat();

  userInput.value = "";
  const reply = await fetchGptResponse();
  const parsed = parseCharacterResponses(reply);
  messages.push(...parsed);
  updateChat();
});

// ⌨️ Enter 키로 질문 전송
userInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});


function parseCharacterResponses(reply) {
  return reply
    .split("\n")
    .filter(line => line.includes(":"))
    .map(line => {
      const [name, ...rest] = line.split(":");
      return {
        role: "assistant",
        character: name.trim(),
        content: rest.join(":").trim()
      };
    });
}

function updateChat() {
  const visibleMessages = messages
    .filter(msg => msg.role !== "system")
    .map(msg => {
      if (msg.role === "user") return `👩‍🏫 교사: ${msg.content}`;
      const icon = msg.character === "준호" ? "👦" : "👧";
      return `${icon} ${msg.character}: ${msg.content}`;
    });

  chatbox.innerHTML = visibleMessages.join("<br><br>");
  if (inputText) {
    inputText.value = visibleMessages.join("\n");
  }  
}

// 페이지 로딩 시 첫 질문 자동 발화
window.addEventListener("DOMContentLoaded", async () => {
  const initialTeacherUtterance = fractionScenario.prompt;
  messages.push({ role: "user", content: initialTeacherUtterance });
  updateChat();

  const reply = await fetchGptResponse();
  const parsed = parseCharacterResponses(reply);
  messages.push(...parsed);
  updateChat();
});

// 🧠 TMSSR 피드백 생성
const feedbackPrompt = `
다음은 교사와 학생의 대화 또는 수업 기록입니다. 
첨부한 문서에 수록된 TMSSR Framework의 내용을 바탕으로, 사용자와 가상의 학생 사이에 이루어진 대화를 분석하여 피드백을 제공해줘.
표 형태로 정리해줘도 좋을 것 같아

피드백에는 다음이 반드시 포함되어야 해:
1. TMSSR Framework의 네 가지 요소(Eliciting, Responding, Facilitating, Extending)에 따라 교사의 발화나 상호작용을 분류하고 해석할 것
2. 교사의 발문이나 피드백 방식이 학생의 수학적 사고에 어떤 영향을 미치는지 평가할 것
3. TMSSR Framework를 바탕으로 더 효과적인 교수 전략을 구체적으로 제안할 것

중요:
- 피드백은 반드시 **마크다운 형식**으로 작성해줘
- 학생과 교사의 대화를 그대로 반복하거나 인용하지 말고, 핵심 내용을 요약하고 분석 중심으로 작성해줘
- 첨부된 문서의 내용을 참고하여 TMSSR Framework에 기반한 분석을 명확히 반영해줘
`;

async function getAssistantFeedback(userText) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "OpenAI-Beta": "assistants=v2"
  };

  const threadRes = await fetch("https://api.openai.com/v1/threads", {
    method: "POST", headers
  });
  const threadData = await threadRes.json();
  const threadId = threadData.id;

  await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: "POST", headers,
    body: JSON.stringify({
      role: "user",
      content: `${feedbackPrompt}\n\n${userText}`
    })
  });

  const runRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: "POST", headers,
    body: JSON.stringify({
      assistant_id: assistantId,
      instructions: "출력은 반드시 한국어 마크다운 형식으로 작성해주세요."
    })
  });
  const runData = await runRes.json();
  const runId = runData.id;

  let status = runData.status;
  while (status !== "completed") {
    await new Promise(r => setTimeout(r, 1000));
    const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, { headers });
    const statusData = await statusRes.json();
    status = statusData.status;
    if (status === "failed") throw new Error("GPT 실행 실패");
  }

  const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, { headers });
  const messagesData = await messagesRes.json();
  const assistantMessages = messagesData.data.filter(msg => msg.role === "assistant");
  return assistantMessages.map(m => m.content[0].text.value).join("\n").replace(/【.*?†.*?】/g, '');
}

feedbackBtn.addEventListener("click", async () => {
  const text = inputText.value.trim();
  if (!text) {
    alert("대화를 먼저 진행해 주세요.");
    return;
  }

  result.innerHTML = "⏳ 피드백 생성 중...";
  try {
    const feedback = await getAssistantFeedback(text);
    result.innerHTML = marked.parse(feedback);
    if (window.MathJax) MathJax.typeset();

    // ✅ Firestore에 저장 (lessonPlayResponses 컬렉션, 문서 ID: uid_page2)
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, "lessonPlayResponses", `${user.uid}_page2`), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        createdAt: serverTimestamp(),
        conversation: text,
        feedback: feedback
      });
      console.log("✅ page2 Firestore 저장 완료");
      Swal.fire({
        icon: "success",
        title: "피드백 저장 완료",
        text: "대화와 GPT 피드백이 저장되었습니다!",
        confirmButtonColor: "#3085d6"
      });
    }
  } catch (err) {
    console.error("오류:", err);
    result.textContent = "⚠️ 피드백 생성에 실패했습니다.";
    Swal.fire({
      icon: "error",
      title: "저장 실패",
      text: "GPT 피드백을 생성하거나 저장하는 데 실패했습니다.",
      confirmButtonColor: "#d33"
    });
  }
});


// 이미지 캐러셀 제어
const images = [
  "../public/Imgs/test_1.png",
  "../public/Imgs/test_2.png",
  "../public/Imgs/test_3.png"
];

let currentIndex = 0;

const carouselImage = document.getElementById("carouselImage");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

if (carouselImage && prevBtn && nextBtn) {
  prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    carouselImage.src = images[currentIndex];
  });

  nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % images.length;
    carouselImage.src = images[currentIndex];
  });
}
