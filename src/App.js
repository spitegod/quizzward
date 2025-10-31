import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import logo from './logo.svg';
import './App.css';
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import Dashboard from "./pages/Dashboard/Dashboard"
import CreateQuiz from "./pages/CreateQuiz/CreateQuiz";
import PlayQuiz from "./pages/PlayQuiz/PlayQuiz";
import Profile from "./pages/Profile/Profile";
import AdminPanel from "./pages/AdminPanel/AdminPanel";
import UsersAdmin from "./pages/UsersAdmin/UsersAdmin";
import QuizzesAdmin from "./pages/QuizzesAdmin/QuizzesAdmin";
import EditQuiz from "./pages/EditQuiz/EditQuiz";

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
          path="/admin"
          element={<AdminPanel />}
        />
        <Route
          path="/users-admin"
          element={<UsersAdmin />}
        />
        <Route
          path="/quizzes-admin"
          element={<QuizzesAdmin />}
        />
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />
        <Route
          path="/profile"
          element={<Profile />}
        />
        <Route
          path="/profile/:userId"
          element={<Profile />}
        />
        <Route
          path="/create-quiz"
          element={<CreateQuiz />}
        />
        <Route
          path="/play-quiz/:id"
          element={<PlayQuiz />} />
        <Route
          path="/edit-quiz/:id"
          element={<EditQuiz />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
