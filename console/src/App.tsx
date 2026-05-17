import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import routes from "./routes";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {Object.values(routes).map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
      </Route>
    </Routes>
  );
}
