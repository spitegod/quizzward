import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from "../../components/Nav/Nav";
import ProfileStatistics from "../../components/ProfileStatistics/ProifileStatistics";
import { getCurrentUser } from '../../services/userService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import s from "./Profile.module.css";

const Profile = () => {
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await getCurrentUser();
                setUserData(data);
            } catch (error) {
                console.error('Ошибка при загрузке данных пользователя:', error);
                toast.error('Не удалось загрузить данные профиля');
                // Перенаправляем на главную, если пользователь не авторизован
                if (error.response?.status === 401) {
                    navigate('/');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [navigate]);

    // Показываем заглушку, пока данные загружаются
    if (isLoading) {
        return (
            <div className={s.profileContainer}>
                <Nav />
                <main className={s.profileMain}>
                    <div className={s.loading}>Загрузка данных профиля...</div>
                </main>
            </div>
        );
    }

    // Если данные не загрузились
    if (!userData) {
        return (
            <div className={s.profileContainer}>
                <Nav />
                <main className={s.profileMain}>
                    <div className={s.error}>Не удалось загрузить данные профиля</div>
                </main>
            </div>
        );
    }

    // Получаем первую букву имени для аватара
    const avatarLetter = userData.username ? userData.username.charAt(0).toUpperCase() : 'U';

    return (
        <div className={s.profileContainer}>
            <Nav />
            <main className={s.profileMain}>
                <header className={s.header}>
                    <div className={s.avatar} aria-hidden="true">
                        {avatarLetter}
                    </div>
                    <div>
                        <h2 className={s.title}>Профиль</h2>
                        <h3 className={s.username}>{userData.username}</h3>
                    </div>
                </header>

                <section className={s.card}>
                    <ProfileStatistics
                        rating={userData.points.toString()}
                        regDate={userData.registrationDate}
                        completedQuizzes={userData.completedQuizzes}
                    />
                </section>
            </main>
        </div>
    );
};

export default Profile;
