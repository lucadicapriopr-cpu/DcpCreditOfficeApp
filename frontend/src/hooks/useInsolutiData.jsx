import { useEffect, useMemo, useState } from "react";

export default function useInsolutiData() {
  const now = new Date();
  const [anno, setAnno] = useState(now.getFullYear());
  const [trimestre, setTrimestre] = useState(null); // 1..4 oppure null
  const [scope, setScope] = useState("all");        // all | gas | power
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("year", String(anno));
    if (trimestre) p.set("quarter", String(trimestre));
    p.set("scope", scope);
    return `/api/insoluti?${p.toString()}`;
  }, [anno, trimestre, scope]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(query)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(j => alive && setData(j))
      .catch(e => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query]);

  return { anno, setAnno, trimestre, setTrimestre, scope, setScope, data, loading, error };
}
