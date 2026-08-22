import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app);

const CLOUDINARY_CLOUD_NAME = "dnurk6t58";
const CLOUDINARY_UPLOAD_PRESET = "uniqblfi";
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

const profileLoading = document.getElementById("profileLoading");
const profileForm = document.getElementById("editProfileForm");
const editNameInput = document.getElementById("editDisplayName");
const editAvatarInput = document.getElementById("editAvatarUrl");
const avatarPreview = document.getElementById("avatarPreview");
const avatarFileInput = document.getElementById("avatarFileInput");
const uploadStatus = document.getElementById("uploadStatus");
const btnSaveProfile = document.getElementById("btnSaveProfile");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    if (editNameInput) editNameInput.value = user.displayName || "";
    if (editAvatarInput) editAvatarInput.value = user.photoURL || "";
    if (avatarPreview) {
      avatarPreview.src = user.photoURL || DEFAULT_AVATAR;
    }

    if (profileLoading) profileLoading.style.display = "none";
    if (profileForm) profileForm.style.display = "block";
  }
});

if (editAvatarInput) {
  editAvatarInput.addEventListener("input", (e) => {
    const url = e.target.value.trim();
    if (avatarPreview) {
      avatarPreview.src = url || auth.currentUser?.photoURL || DEFAULT_AVATAR;
    }
  });
}

if (avatarPreview) {
  avatarPreview.addEventListener("error", () => {
    avatarPreview.src = auth.currentUser?.photoURL || DEFAULT_AVATAR;
    if (uploadStatus) {
      uploadStatus.innerText = "Link ảnh không hợp lệ!";
      uploadStatus.style.color = "#ff4d4f";
    }
  });
}

if (avatarFileInput) {
  avatarFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (uploadStatus) {
      uploadStatus.innerText = "Đang tải ảnh lên...";
      uploadStatus.style.color = "#27ae60";
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();

      if (data.secure_url) {
        if (editAvatarInput) editAvatarInput.value = data.secure_url;
        if (avatarPreview) avatarPreview.src = data.secure_url;
        if (uploadStatus) {
          uploadStatus.innerText = "Tải ảnh thành công!";
          uploadStatus.style.color = "#2ecc71";
        }
      } else {
        throw new Error("Tải ảnh thất bại");
      }
    } catch (err) {
      console.error(err);
      if (uploadStatus) {
        uploadStatus.innerText = "Lỗi khi tải ảnh lên!";
        uploadStatus.style.color = "#ff4d4f";
      }
    }
  });
}

if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const newName = editNameInput.value.trim();
    const inputAvatarUrl = editAvatarInput.value.trim();

    const newAvatar = inputAvatarUrl || user.photoURL || DEFAULT_AVATAR;

    try {
      if (btnSaveProfile) {
        btnSaveProfile.disabled = true;
        btnSaveProfile.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang lưu...`;
      }

      await updateProfile(user, {
        displayName: newName,
        photoURL: newAvatar,
      });

      await updateUserContentInFirestore(user.uid, newName, newAvatar);

      alert("Cập nhật trang cá nhân thành công!");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Lỗi cập nhật profile:", err);
      alert("Không thể cập nhật hồ sơ!");
      if (btnSaveProfile) {
        btnSaveProfile.disabled = false;
        btnSaveProfile.innerHTML = `<i class="fas fa-save"></i> Lưu thay đổi`;
      }
    }
  });
}

async function updateUserContentInFirestore(uid, newName, newAvatar) {
  try {
    const batch = writeBatch(db);

    const postsQuery = query(collection(db, "posts"), where("userId", "==", uid));
    const postsSnap = await getDocs(postsQuery);
    postsSnap.forEach((docSnap) => {
      batch.update(doc(db, "posts", docSnap.id), {
        userName: newName,
        userAvatar: newAvatar,
      });
    });

    const commentsQuery = query(collection(db, "comments"), where("userId", "==", uid));
    const commentsSnap = await getDocs(commentsQuery);
    commentsSnap.forEach((docSnap) => {
      batch.update(doc(db, "comments", docSnap.id), {
        userName: newName,
        userAvatar: newAvatar,
      });
    });

    await batch.commit();
  } catch (err) {
    console.warn("Lỗi đồng bộ bài viết/bình luận cũ:", err);
  }
}