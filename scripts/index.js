const tearAudio = document.getElementById("tear-audio");
document.querySelectorAll(".ticket-wrapper").forEach(wrapper => {
  const cover = wrapper.querySelector(".cover");
  let isDragging = false;
  let startX = 0;
  let currentDeg = 0;
  let tearTimer = null;

  // 撕開音效播放 function
  function playTearSound() {
    tearAudio.currentTime = 0;
    tearAudio.play();
    clearTimeout(tearTimer);
    tearTimer = setTimeout(() => {
      tearAudio.pause();
      tearAudio.currentTime = 0;
    }, 2000); // 2.9秒後停止
  }

  // 彈窗顯示 function
  function showResult(prize) {
    document.getElementById("result-prize").textContent = prize;
    document.getElementById("result-modal").style.display = "flex";
  }

  // 滑鼠事件
  cover.addEventListener("mousedown", e => {
    isDragging = true;
    startX = e.clientX;
    cover.classList.add("dragging");
    playTearSound();
  });

  window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    currentDeg = Math.max(-120, Math.min(0, deltaX / 2));
    cover.style.transform = `rotateY(${currentDeg}deg)`;
  });

  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    cover.classList.remove("dragging");
    if (currentDeg < -60) {
      cover.style.transition = "transform 0.5s ease-out";
      cover.style.transform = "rotateY(-120deg)";
      // 彈窗顯示獎項
      const prize = wrapper.getAttribute("data-prize");
      setTimeout(() => showResult(prize), 500);
    } else {
      cover.style.transition = "transform 0.3s ease-out";
      cover.style.transform = "rotateY(0deg)";
    }
  });

  // 手機觸控事件
  cover.addEventListener("touchstart", e => {
    isDragging = true;
    startX = e.touches[0].clientX;
    cover.classList.add("dragging");
    playTearSound();
  });

  window.addEventListener("touchmove", e => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - startX;
    currentDeg = Math.max(-120, Math.min(0, deltaX / 2));
    cover.style.transform = `rotateY(${currentDeg}deg)`;
  });

  window.addEventListener("touchend", () => {
    if (!isDragging) return;
    isDragging = false;
    cover.classList.remove("dragging");
    if (currentDeg < -60) {
      cover.style.transition = "transform 0.5s ease-out";
      cover.style.transform = "rotateY(-120deg)";
      // 彈窗顯示獎項
      const prize = wrapper.getAttribute("data-prize");
      setTimeout(() => showResult(prize), 500);
    } else {
      cover.style.transition = "transform 0.3s ease-out";
      cover.style.transform = "rotateY(0deg)";
    }
  });
});

// 彈窗關閉
document.getElementById("close-modal").onclick = function() {
  document.getElementById("result-modal").style.display = "none";
};
document.querySelector(".modal-bg").onclick = function() {
  document.getElementById("result-modal").style.display = "none";
};