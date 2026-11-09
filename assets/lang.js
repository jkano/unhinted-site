// Remembers a language chosen with the EN / ES button, so the site opens in that language next time.
// (The redirect to /es/ for Spanish browsers is the small script in each page's head, so it runs before anything is drawn.)
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[data-lang]');
  if (!a) return;
  try { localStorage.setItem('lang', a.dataset.lang); } catch (err) { /* private mode: the choice just is not remembered */ }
});
