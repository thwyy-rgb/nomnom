import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQCed1Led55t9s8deU1BZSpkVe1oSt-oU",
  authDomain: "nomnom-42f0b.firebaseapp.com",
  projectId: "nomnom-42f0b",
  storageBucket: "nomnom-42f0b.firebasestorage.app",
  messagingSenderId: "1011885827413",
  appId: "1:1011885827413:web:56a91e6298d8f219dc7bdc",
  measurementId: "G-75C54T7XFC",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: "select_account",
});

const emailLoginForm = document.getElementById("emailLoginForm");
const googleAuthBtn = document.getElementById("googleAuthBtn");

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "index.html";
  }
});

getRedirectResult(auth)
  .then((result) => {
    if (result && result.user) {
      showToast("Đăng nhập Google thành công!", "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    }
  })
  .catch((err) => {
    console.error("Lỗi Google Auth Redirect:", err);
    if (err.code !== "auth/credential-already-in-use") {
      showToast("Đăng nhập bằng Google thất bại!", "danger");
    }
  });

if (emailLoginForm) {
  emailLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Đăng nhập thành công!", "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    } catch (err) {
      console.error("Lỗi đăng nhập:", err);
      showToast("Sai tài khoản hoặc mật khẩu, vui lòng thử lại!", "danger");
    }
  });
}

if (googleAuthBtn) {
  googleAuthBtn.addEventListener("click", () => {
    signInWithRedirect(auth, provider);
  });
}