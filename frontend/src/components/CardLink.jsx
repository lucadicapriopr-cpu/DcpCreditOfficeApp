import React from "react";
import { Link } from "react-router-dom";

export default function CardLink({ title, to }) {
  return (
    <Link
      to={to}
      className="block bg-white rounded-2xl shadow-lg p-10 text-center 
                 hover:shadow-2xl transition-all hover:-translate-y-1"
    >
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
    </Link>
  );
}
