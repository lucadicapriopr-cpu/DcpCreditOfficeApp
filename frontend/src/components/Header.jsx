import { Link, NavLink } from "react-router-dom";
import { useState } from "react";

function Header() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSync = async () => {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/sync-import", { method: "POST" });
      const json = await r.json();
      if (json.ok) {
        setMsg("✅ Import completato");
        console.log("Risultato import:", json);
      } else {
        setMsg(`❌ Errore: ${json.error}`);
      }
    } catch (e) {
      setMsg(`❌ Errore: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="bg-[#1E1E1E]/80 backdrop-blur-md shadow-lg border-b border-[#2C2C2C]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-extrabold text-[#FFCA28] tracking-wide">
          DCP Credit Office
        </h1>

        <nav className="space-x-6 text-[#E0E0E0] font-medium flex items-center">
          <Link to="/dashboard" className="hover:text-[#7E57C2] transition">
            Dashboard
          </Link>
          <Link to="/clienti" className="hover:text-[#7E57C2] transition">
            Clienti
          </Link>
          <Link to="/insoluti" className="hover:text-[#7E57C2] transition">
            Insoluti
          </Link>
          <Link to="/pratiche-legali" className="hover:text-[#7E57C2] transition">
            Pratiche Legali
          </Link>
          <Link to="/report" className="hover:text-[#7E57C2] transition">
            Report
          </Link>

          {/* Pulsante Import */}
          <button
            onClick={handleSync}
            disabled={loading}
            className="ml-6 bg-[#FFCA28] text-black font-semibold px-4 py-2 rounded-lg shadow hover:bg-[#FFD54F] transition disabled:opacity-50"
          >
            {loading ? "Import..." : "🔄 Import Insoluti"}
          </button>
          {msg && (
            <span className="ml-2 text-sm text-[#E0E0E0]">{msg}</span>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
