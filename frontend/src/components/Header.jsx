import { Link } from "react-router-dom";

function Header() {
  return (
      <header className="bg-[#1E1E1E]/80 backdrop-blur-md shadow-lg border-b border-[#2C2C2C]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-[#FFCA28] tracking-wide">
            DCP Credit Office
          </h1>
          <nav className="space-x-6 text-[#E0E0E0] font-medium">
            <Link to="/dashboard" className="hover:text-[#7E57C2] transition">Dashboard</Link>
            <Link to="/clienti" className="hover:text-[#7E57C2] transition">Clienti</Link>
            <Link to="/insoluti" className="hover:text-[#7E57C2] transition">Insoluti</Link>
            <Link to="/pratiche-legali" className="hover:text-[#7E57C2] transition">Pratiche Legali</Link>
            <Link to="/report" className="hover:text-[#7E57C2] transition">Report</Link>
          </nav>
        </div>
      </header>
  );
}

export default Header;


