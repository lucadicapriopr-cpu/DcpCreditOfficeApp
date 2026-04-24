import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureMsalInitialized, loginRequest, msalInstance } from "../msalInstance";

export default function Login() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setError("");
      try {
        await ensureMsalInitialized();
        const active = msalInstance.getActiveAccount();
        if (mounted) setAccount(active || null);
      } catch (e) {
        if (mounted) setError(`Errore inizializzazione MSAL: ${e?.message || String(e)}`);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const onLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await msalInstance.loginPopup(loginRequest);
      if (resp?.account) {
        msalInstance.setActiveAccount(resp.account);
        setAccount(resp.account);
      }
    } catch (e) {
      setError(`Accesso Microsoft non riuscito: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    setLoading(true);
    setError("");
    try {
      await msalInstance.logoutPopup();
      setAccount(null);
    } catch (e) {
      setError(`Logout non riuscito: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900/70 backdrop-blur p-8 shadow-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">DCP Credit App</h1>
          <p className="mt-2 text-slate-300">Accesso riservato al team credito</p>
        </div>

        {!account ? (
          <button
            type="button"
            onClick={onLogin}
            disabled={loading}
            className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold px-4 py-3 disabled:opacity-60"
          >
            {loading ? "Accesso in corso…" : "Accedi con Microsoft 365"}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-700 p-4 bg-slate-800/50">
              <div className="text-sm text-slate-300">Accesso effettuato come</div>
              <div className="font-semibold">{account.name || "Utente Microsoft"}</div>
              <div className="text-sm text-slate-300">{account.username || ""}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-3"
              >
                Entra nell'app
              </button>
              <button
                type="button"
                onClick={onLogout}
                disabled={loading}
                className="rounded-xl border border-slate-600 hover:bg-slate-800 px-4 py-3 disabled:opacity-60"
              >
                Esci
              </button>
            </div>
          </div>
        )}

        {error && <div className="rounded-lg bg-red-900/40 border border-red-700 text-red-100 px-3 py-2 text-sm">{error}</div>}
      </div>
    </div>
  );
}
