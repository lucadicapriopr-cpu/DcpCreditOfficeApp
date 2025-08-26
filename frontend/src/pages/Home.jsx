// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { Users, AlertTriangle, Scale, BarChart3, Calendar } from "lucide-react";
import CalendarTest from "./CalendarTest"; // 👈 importa il widget calendario

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-red-950 via-black to-black flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      {/* Griglia bottoni */}
      <div className="grid grid-cols-2 gap-10 relative z-10">
        <Link
          to="/clienti"
          className="flex flex-col items-center justify-center bg-gradient-to-br from-amber-500 to-yellow-600 text-black font-bold px-10 py-8 rounded-2xl shadow-xl hover:scale-105 transition-transform"
        >
          <Users className="w-10 h-10 mb-3" />
          Clienti
        </Link>

        <Link
          to="/insoluti"
          className="flex flex-col items-center justify-center bg-gradient-to-br from-red-700 to-red-900 text-white font-bold px-10 py-8 rounded-2xl shadow-xl hover:scale-105 transition-transform"
        >
          <AlertTriangle className="w-10 h-10 mb-3" />
          Insoluti
        </Link>

        <Link
          to="/pratiche-legali"
          className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-800 to-purple-900 text-white font-bold px-10 py-8 rounded-2xl shadow-xl hover:scale-105 transition-transform"
        >
          <Scale className="w-10 h-10 mb-3" />
          Pratiche Legali
        </Link>

        <Link
          to="/report"
          className="flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-white font-bold px-10 py-8 rounded-2xl shadow-xl hover:scale-105 transition-transform"
        >
          <BarChart3 className="w-10 h-10 mb-3" />
          Report
        </Link>
      </div>

      {/* Widget Calendario */}
      <div className="relative z-10 w-full max-w-2xl mt-16 p-6 bg-white/10 rounded-2xl shadow-lg">
        <div className="flex items-center mb-4">
          <Calendar className="w-8 h-8 text-white mr-3" />
          <h2 className="text-xl font-bold text-white">Calendario Outlook</h2>
        </div>
        <CalendarTest /> {/* 👈 widget calendario */}
      </div>

      {/* Filigrane*/}
      <div className="absolute bottom-10 right-6 flex flex-col items-end space-y-4 text-[4rem] md:text-[10rem] font-extrabold tracking-widest select-none pointer-events-none z-0">
        {/* Gradient Classy */}
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
