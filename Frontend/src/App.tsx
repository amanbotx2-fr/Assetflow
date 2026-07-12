import { Navigate, Route, Routes } from "react-router-dom";
import { developerBRoutes } from "./routes/developerBRoutes";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/assets" replace />} />
      {developerBRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={<route.Component />} />
      ))}
      <Route path="*" element={<Navigate to="/assets" replace />} />
    </Routes>
  );
}
