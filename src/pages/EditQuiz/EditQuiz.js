import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CreateQuiz from "../CreateQuiz/CreateQuiz";

export default function EditQuiz() {
    const navigate = useNavigate();
    
    // Если пользователь не авторизован, перенаправляем на страницу входа
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    return <CreateQuiz isEdit={true} />;
}
