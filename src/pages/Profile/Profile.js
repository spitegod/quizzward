import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Nav from "../../components/Nav/Nav";
import ProfileStatistics from "../../components/ProfileStatistics/ProifileStatistics";
import UserQuizzes from '../../components/UserQuizzes/UserQuizzes';
import { getCurrentUser, getUserById } from '../../services/userService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import s from "./Profile.module.css";

const Profile = () => {
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCurrentUser, setIsCurrentUser] = useState(true);
    const navigate = useNavigate();
    const { userId } = useParams();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                let data;
                
                if (userId) {
                    // Загружаем данные другого пользователя
                    data = await getUserById(userId);
                    setIsCurrentUser(false);
                } else {
                    // Загружаем данные текущего пользователя
                    data = await getCurrentUser();
                    setIsCurrentUser(true);
                }
                
                setUserData(data);
            } catch (error) {
                console.error('Ошибка при загрузке данных пользователя:', error);
                toast.error('Не удалось загрузить данные профиля');
                
                // Перенаправляем на главную, если пользователь не авторизован
                if (error.response?.status === 401) {
                    navigate('/login');
                } else if (error.response?.status === 404) {
                    toast.error('Пользователь не найден');
                    navigate(-1); // Возвращаемся на предыдущую страницу
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [navigate, userId]);

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
                        <h2 className={s.title}>Профиль {isCurrentUser ? '' : 'пользователя'}</h2>
                        <h3 className={s.username}>
                            {userData.username} 
                            {isCurrentUser && <span className={s.youBadge}>(Вы)</span>}
                        </h3>
                    </div>
                </header>

                <section className={s.card}>
                    <ProfileStatistics
                        rating={userData.points.toString()}
                        regDate={userData.registrationDate}
                        completedQuizzes={userData.completedQuizzes}
                    />
                </section>

                <section className={s.quizzesSection}>
                    <UserQuizzes 
                        userId={userData.id}
                        isCurrentUser={isCurrentUser}
                    />
                </section>
            </main>
        </div>
    );
};

export default Profile;
