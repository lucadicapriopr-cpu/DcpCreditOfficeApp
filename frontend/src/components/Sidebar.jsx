// src/components/Sidebar.jsx
import React from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-100 h-screen p-4 space-y-4 border-r">
      <nav className="space-y-2">
        <Link to="/" className="block p-2 rounded hover:bg-gray-200">
          📊 Dashboard
        </Link>
        <Link to="/clienti" className="block p-2 rounded hover:bg-gray-200">
          👥 Clienti
        </Link>
        <Link to="/fatture" className="block p-2 rounded hover:bg-gray-200">
          🧾 Fatture
        </Link>
      </nav>
    </div>
  );
};

export default Sidebar;
