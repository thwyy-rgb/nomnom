import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
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

const emailRegisterForm = document.getElementById("emailRegisterForm");

function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${type === "success" ? "fa-check-circle" : "fa-exclamation-circle"}"></i> <span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

if (emailRegisterForm) {
  emailRegisterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;

    if (password.length < 6) {
      showToast("Mật khẩu bảo mật phải từ 6 ký tự trở lên!", "danger");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(userCredential.user, {
        displayName: name,
        photoURL: "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
      });

      showToast("Tạo tài khoản thành công! Đang vào trang chủ...", "success");

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1200);
    } catch (err) {
      console.error("Lỗi đăng ký:", err);
      if (err.code === "auth/email-already-in-use") {
        showToast("Email này đã được đăng ký cho tài khoản khác!", "danger");
      } else if (err.code === "auth/invalid-email") {
        showToast("Định dạng email không hợp lệ!", "danger");
      } else if (err.code === "auth/weak-password") {
        showToast("Mật khẩu quá yếu!", "danger");
      } else {
        showToast(
          "Đăng ký thất bại! Vui lòng kiểm tra lại kết nối mạng.",
          "danger",
        );
      }
    }
  });
}
