// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { Users, AlertTriangle, Scale, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-red-950 via-black to-black flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      {/* Griglia bottoni (ingranditi il doppio) */}
      <div className="grid grid-cols-2 gap-12 relative z-10">
        <Link
          to="/clienti"
          className="flex flex-col items-center justify-center bg-gradient-to-br from-amber-500 to-yellow-600 text-black font-bold px-20 py-16 rounded-3xl shadow-2xl hover:scale-105 transition-transform text-2xl"
        >
          <Users className="w-20 h-20 mb-6" />
          Clienti
        </Link>

        <Link
          to="/insoluti"
          className="flex flex-col items-center justify-center bg-gradient-to-br from-red-700 to-red-900 text-white font-bold px-20 py-16 rounded-3xl shadow-2xl hover:scale-105 transition-transform text-2xl"
        >
          <AlertTriangle className="w-20 h-20 mb-6" />
          Insoluti
        </Link>

        <Link
          to="/pratiche-legali"
          className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-800 to-purple-900 text-white font-bold px-20 py-16 rounded-3xl shadow-2xl hover:scale-105 transition-transform text-2xl"
        >
          <Scale className="w-20 h-20 mb-6" />
          Pratiche Legali
        </Link>

        <Link
          to="/report"
          className="flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-white font-bold px-20 py-16 rounded-3xl shadow-2xl hover:scale-105 transition-transform text-2xl"
        >
          <BarChart3 className="w-20 h-20 mb-6" />
          Report
        </Link>
      </div>

      {/* Filigrane */}
      <div className="absolute bottom-10 right-6 flex flex-col items-end space-y-4 text-[5rem] md:text-[12rem] font-extrabold tracking-widest select-none pointer-events-none z-0">
        <div className="flex">
          <span className="text-white/20">DASH</span>
          <span className="ml-4 bg-gradient-to-r from-gray-600 to-gray-900 bg-clip-text text-transparent opacity-40">
            BOARD
          </span>
        </div>
      </div>
    </div>
  );
}
