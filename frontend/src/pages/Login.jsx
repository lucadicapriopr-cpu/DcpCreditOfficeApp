import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest, msalInstance } from "../msalInstance";

function resolveAccount() {
  return msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null;
}

export default function Login() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(() => resolveAccount());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasActiveAccount = useMemo(() => Boolean(account), [account]);

  useEffect(() => {
    const active = resolveAccount();
    if (active) {
      msalInstance.setActiveAccount(active);
      setAccount(active);
    }
  }, []);

  const goHome = (active) => {
    if (!active) return;
    msalInstance.setActiveAccount(active);
    setAccount(active);
    navigate("/", { replace: true });
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const resp = await msalInstance.loginPopup(loginRequest);
      const nextAccount = resp?.account ?? resolveAccount();
      goHome(nextAccount);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore durante il login");
    } finally {
      setLoading(false);
    }
  };

  const enterApp = () => {
    goHome(resolveAccount());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-4">
        <h1 className="text-2xl font-bold">Accesso Microsoft 365</h1>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? "Accesso in corso..." : "Accedi con Microsoft"}
        </button>

        <button
          type="button"
          onClick={enterApp}
          disabled={!hasActiveAccount}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
        >
          Entra nell'app
        </button>

        {account && (
          <p className="text-sm text-slate-300">
            Connesso come: {account.username}
          </p>
        )}

        {error && (
          <p className="text-sm text-rose-300">{error}</p>
        )}
      </div>
    </div>
  );
}