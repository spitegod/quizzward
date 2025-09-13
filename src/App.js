import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import logo from './logo.svg';
import './App.css';
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Dashboard from "./pages/Dashboard/Dashboard"
import CreateQuiz from "./pages/CreateQuiz/CreateQuiz";
import PlayQuiz from "./pages/PlayQuiz/PlayQuiz";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={<Login />}
        />
        <Route
          path="/register"
          element={<Register />}
        />
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />
        <Route
          path="/create-quiz"
          element={<CreateQuiz />}
        />
        <Route
          path="/play-quiz/:id"
          element={<PlayQuiz />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
