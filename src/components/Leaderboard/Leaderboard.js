import { useEffect, useState } from 'react';
import axios from 'axios';
import s from './Leaderboard.module.css';

const Leaderboard = () => {
    const [leaderboardData, setLeaderboardData] = useState({
        topUsers: [],
        currentUser: null,
        error: null
    });

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const response = await axios.get('http://localhost:4000/leaderboard', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    withCredentials: true
                });

                setLeaderboardData({
                    topUsers: response.data.topUsers || [],
                    currentUser: response.data.currentUser,
                    error: null
                });
            } catch (error) {
                console.error('Ошибка при загрузке таблицы лидеров:', error);
                setLeaderboardData(prev => ({
                    ...prev,
                    error: 'Не удалось загрузить таблицу лидеров'
                }));
            }
        };

        fetchLeaderboard();
    }, []);

    const { topUsers, currentUser, error } = leaderboardData;
    const isCurrentUserInTop = currentUser && topUsers.some(user => user.id === currentUser.id);

    if (error) return <div className={s.error}>{error}</div>;

    return (
        <div>
            <h3 className={s.title}>Таблица лидеров</h3>
            <table className={s.table}>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Пользователь</th>
                        <th>Очки</th>
                    </tr>
                </thead>
                <tbody>
                    {topUsers.map((user, index) => (
                        <tr key={user.id} className={currentUser && user.id === currentUser.id ? s.you : ''}>
                            <td>{index + 1}</td>
                            <td>{user.login}</td>
                            <td>{user.points}</td>
                        </tr>
                    ))}
                    {currentUser && !isCurrentUserInTop && (
                        <tr className={s.you}>
                            <td>{currentUser.rank}</td>
                            <td>Вы</td>
                            <td>{currentUser.points}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Leaderboard;