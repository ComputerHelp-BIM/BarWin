  /* ---------- start ---------- */
  try { var th = localStorage.getItem(THEME_KEY); if (th === 'light' || th === 'dark') document.documentElement.setAttribute('data-theme', th); } catch (e) { /* storage unavailable */ }
  $('#ver').textContent = 'v' + B.VERSION;
  st.p = load(); if (!st.p) { st.p = B.normalise(B.newProject()); st.p.levels[0].members = []; }
  refresh();
  window.__bbs = st; window.__bbsImport = importWorkbook;
})();

