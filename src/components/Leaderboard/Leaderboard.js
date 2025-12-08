import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import s from './Leaderboard.module.css';

const Leaderboard = () => {
    const navigate = useNavigate();
    
    const handleUserClick = (userId) => {
        navigate(`/profile/${userId}`);
    };
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

    const renderRow = (user, indexLabel, highlight) => (
        <div key={`${user.id}-${indexLabel}`} className={`${s.row} ${highlight ? s.you : ''}`}>
            <span className={s.colRank}>{indexLabel}</span>
            <span 
                className={s.colUser}
                onClick={() => handleUserClick(user.id)}
            >
                {highlight && !isCurrentUserInTop ? 'Вы' : user.login}
            </span>
            <span className={s.colPoints}>{user.points}</span>
        </div>
    );

    return (
        <div className={s.card}>
            <h3 className={s.title}>Таблица лидеров</h3>
            <div className={s.tableWrap}>
                <div className={`${s.row} ${s.head}`}>
                    <span className={s.colRank}>№</span>
                    <span className={s.colUser}>Пользователь</span>
                    <span className={s.colPoints}>Очки</span>
                </div>
                <div className={s.body}>
                    {topUsers.map((user, index) => 
                        renderRow(user, index + 1, currentUser && user.id === currentUser.id)
                    )}
                    {currentUser && !isCurrentUserInTop && renderRow(currentUser, currentUser.rank, true)}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
