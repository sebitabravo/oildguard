import Dashboard from "../../dash/Dashboard";
import "./wheel.css";

// Página de detalle de rueda: el contenedor con datos vive en dash/Dashboard.
export default function WheelDetailPage() {
  const wheelId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("wheel") : null;
  return <Dashboard wheelId={wheelId} />;
}
