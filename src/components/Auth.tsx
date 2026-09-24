import { useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "../supabaseClient";
import type { Theme } from "../theme";
import ThemeToggle from "./ThemeToggle";

export default function Auth({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/@([a-z0-9-]+\.)*cgi\.com$/i.test(email.trim())) {
      setError("Seules les adresses e-mail se terminant par @cgi.com sont autorisées.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) setError(error.message);
    else setStep("code");
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setLoading(false);
    if (error) setError(error.message);
    // en cas de succès, onAuthStateChange (dans App) prend le relais automatiquement
  };

  return (
    <div className="studio-auth-screen">
      <div className="studio-auth-theme-toggle">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <div className="studio-auth-card">
        <div className="studio-mark"><span>LS</span></div>
        <h1>Le Studio — Kanban</h1>
        <p>Connecte-toi avec ton e-mail d'équipe pour accéder à l'espace de travail partagé.</p>

        {step === "email" ? (
          <form onSubmit={requestCode} className="studio-auth-form">
            <input
              type="email"
              required
              placeholder="prenom@cgi.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="studio-btn-primary" disabled={loading}>
              {loading ? "Envoi…" : "Recevoir le code de connexion"}
            </button>
            {error && <div className="studio-auth-error">{error}</div>}
          </form>
        ) : (
          <form onSubmit={verifyCode} className="studio-auth-form">
            <div className="studio-auth-sent">
              <KeyRound size={18} />
              <span>Code envoyé à <strong>{email}</strong>. Saisis les 6 chiffres reçus par e-mail.</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              required
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="submit" className="studio-btn-primary" disabled={loading}>
              {loading ? "Vérification…" : "Se connecter"}
            </button>
            <button
              type="button"
              className="studio-btn-ghost"
              onClick={() => { setStep("email"); setCode(""); setError(null); }}
            >
              Changer d'e-mail
            </button>
            {error && <div className="studio-auth-error">{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
