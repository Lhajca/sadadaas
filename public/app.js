const form = document.getElementById("reservationForm");
const toast = document.getElementById("toast");
const year = document.getElementById("year");
year.textContent = new Date().getFullYear();

const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

navToggle?.addEventListener("click", () => {
  const open = navLinks.classList.toggle("show");
  navToggle.setAttribute("aria-expanded", String(open));
});

document.addEventListener("click", (e) => {
  if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
    navLinks.classList.remove("show");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

function showToast(msg, ok=true){
  toast.style.display = "block";
  toast.textContent = msg;
  toast.style.background = ok ? "rgba(183,255,90,.35)" : "rgba(255,90,68,.20)";
  toast.style.borderColor = ok ? "rgba(6,18,27,.18)" : "rgba(255,90,68,.35)";
  setTimeout(()=>{ toast.style.display="none"; }, 5000);
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  // radio pack fix (FormData already has it, but keep safe)
  const pack = form.querySelector('input[name="pack"]:checked')?.value;
  if (pack) payload.pack = pack;

  try{
    const res = await fetch("/api/reservation", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data?.error || "Erreur d’envoi.");

    form.reset();
    // restore default radio
    const first = form.querySelector('input[name="pack"]');
    if (first) first.checked = true;

    showToast("✅ Demande envoyée ! On te répond rapidement par email.", true);
  }catch(err){
    showToast("❌ " + (err?.message || "Impossible d’envoyer. Réessaie."), false);
  }
});
