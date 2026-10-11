"use client";
export default function Imprimir() {
  return <button type="button" className="btn-contorno" onClick={() => window.print()}>Imprimir</button>;
}
