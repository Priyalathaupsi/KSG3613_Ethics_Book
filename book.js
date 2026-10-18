(function(){
  /* ===== In page tabs ===== */
  var panels = [].slice.call(document.querySelectorAll(".panel"));
  var marks = document.querySelectorAll(".bookbar .marks a");
  var current = null;
  function show(panel, target){
    if (panel !== current) {
      var fwd = current && panels.indexOf(panel) > panels.indexOf(current);
      panels.forEach(function(p){ p.hidden = p !== panel; p.classList.remove("turn-fwd", "turn-back"); });
      if (current) { void panel.offsetWidth; panel.classList.add(fwd ? "turn-fwd" : "turn-back"); }
      document.querySelectorAll("audio,video").forEach(function(m){ if (!panel.contains(m)) m.pause(); });
      marks.forEach(function(t){ t.setAttribute("aria-current", t.dataset.page === panel.id ? "page" : "false"); });
      var cur = document.querySelector('.bookbar .marks [aria-current="page"]'); if (cur) cur.parentElement.scrollLeft = cur.offsetLeft - 40;
      document.body.classList.toggle("on-cover", panel.id === "cover");
      current = panel;
      var h = panel.querySelector("h1"); document.title = (h && panel.id !== "cover" ? h.textContent + " | " : "") + "Ethics in Practice";
    }
    if (target && target !== panel) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }
  function route(){
    var id = decodeURIComponent(location.hash.slice(1)) || "cover";
    var el = document.getElementById(id);
    if (!el) { show(document.getElementById("cover")); return; }
    var panel = el.classList.contains("panel") ? el : el.closest(".panel");
    if (!panel) panel = document.getElementById("cover");
    show(panel, el);
  }
  window.addEventListener("hashchange", route);
  route();

  /* Arrow keys turn the page */
  document.addEventListener("keydown", function(e){
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var t = e.target; if (t && (t.closest("input,textarea,select,audio,video,[contenteditable]") )) return;
    if (document.getElementById("zoom").classList.contains("open")) return;
    var i = panels.indexOf(current) + (e.key === "ArrowRight" ? 1 : -1);
    if (i >= 0 && i < panels.length) location.hash = panels[i].id;
  });

  /* ===== Full size image viewer ===== */
  var zoom = document.getElementById("zoom");
  if (zoom) {
    var zimg = zoom.querySelector("img"), close = zoom.querySelector("button"), last = null;
    document.querySelectorAll("[data-zoom]").forEach(function(b){
      b.addEventListener("click", function(){ last = b; zimg.src = b.dataset.zoom || b.querySelector("img").src; zimg.alt = b.querySelector("img").alt; zoom.classList.add("open"); close.focus(); });
    });
    function shut(){ zoom.classList.remove("open"); if (last) last.focus(); }
    close.addEventListener("click", shut);
    document.addEventListener("keydown", function(e){ if (e.key === "Escape" && zoom.classList.contains("open")) shut(); });
  }

  /* ===== Chapter audio with slide highlighting ===== */
  var follow = true, ft;
  function pauseFollow(){ follow = false; clearTimeout(ft); ft = setTimeout(function(){ follow = true; }, 4000); }
  document.addEventListener("wheel", pauseFollow, {passive: true});
  document.addEventListener("touchmove", pauseFollow, {passive: true});
  document.querySelectorAll(".panel").forEach(function(panel){
    var a = panel.querySelector(".chapAudio"); if (!a) return;
    var box = a.closest(".audio-box"), marks = JSON.parse(box.querySelector(".audioMarks").textContent), now = box.querySelector(".now"), cur = null, ch = a.dataset.ch;
    function slideAt(t){ var n = marks[0].n; for (var i = 0; i < marks.length; i++) { if (t >= marks[i].t) n = marks[i].n; else break; } return n; }
    function highlight(n, scroll){
      if (n === cur) return; cur = n;
      panel.querySelectorAll(".lesson.playing").forEach(function(x){ x.classList.remove("playing"); });
      var el = document.getElementById(ch + "_slide" + n); if (!el) return;
      el.classList.add("playing");
      var h = el.querySelector("h3"); now.textContent = "Now playing: " + (h ? h.textContent : "Slide " + n);
      if (scroll && follow && !a.paused && !panel.hidden) el.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center"});
    }
    a.addEventListener("timeupdate", function(){ highlight(slideAt(a.currentTime), true); });
    panel.querySelectorAll(".listen").forEach(function(b){
      b.addEventListener("click", function(){
        var n = +b.dataset.slide, m = marks.filter(function(x){ return x.n === n; })[0]; if (!m) return;
        function go(){ a.currentTime = m.t; cur = null; a.play(); highlight(n, false); }
        if (a.readyState >= 1) go(); else { a.preload = "auto"; a.addEventListener("loadedmetadata", go, {once: true}); a.load(); }
      });
    });
  });

  /* ===== Practice quiz ===== */
  var data = document.getElementById("quizData"), box = document.getElementById("quiz");
  if (data && box) {
    var Q = JSON.parse(data.textContent), picks = {}, scoreTxt = document.getElementById("scoreTxt");
    function render(){
      box.innerHTML = "";
      Q.forEach(function(it, i){
        var d = document.createElement("div"); d.className = "q";
        var fs = document.createElement("fieldset");
        var lg = document.createElement("legend"); lg.innerHTML = "<b>" + (i + 1) + "</b>"; lg.appendChild(document.createTextNode(it.q)); fs.appendChild(lg);
        var fb = document.createElement("div"); fb.className = "fb"; fb.setAttribute("aria-live", "polite");
        it.o.forEach(function(opt, k){
          var l = document.createElement("label"); l.className = "opt";
          var r = document.createElement("input"); r.type = "radio"; r.name = "q" + i;
          l.appendChild(r); l.appendChild(document.createTextNode(opt)); fs.appendChild(l);
          r.addEventListener("change", function(){
            if (picks[i] !== undefined) return; picks[i] = k;
            fs.querySelectorAll(".opt").forEach(function(x, j){ x.querySelector("input").disabled = true; if (j === it.a) x.classList.add("right"); else if (j === k) x.classList.add("wrong"); });
            fb.innerHTML = "<b>" + (k === it.a ? "Correct. " : "Not quite. ") + "</b>"; fb.appendChild(document.createTextNode(it.e));
            update();
          });
        });
        d.appendChild(fs); d.appendChild(fb); box.appendChild(d);
      });
      update();
    }
    function update(){
      var n = Object.keys(picks).length, r = 0;
      Object.keys(picks).forEach(function(i){ if (picks[i] === Q[i].a) r++; });
      scoreTxt.textContent = n < Q.length ? n + " of " + Q.length + " answered, " + r + " correct" : "Finished: " + r + " of " + Q.length + " correct";
    }
    document.getElementById("quizReset").addEventListener("click", function(){ picks = {}; render(); });
    render();
  }
})();
