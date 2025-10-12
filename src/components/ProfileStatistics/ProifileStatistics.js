import s from './ProfileStatistics.module.css'

const ProfileStatistics = (props) => {
    return (
        <div className={s.statsWrapper}>
            <h3 className={s.statsTitle}>Статистика</h3>
            <table className={s.statsTable}>
                <tbody>
                    <tr>
                        <td>Рейтинг</td>
                        <td>{props.rating}</td>
                    </tr>
                    <tr>
                        <td>Дата регистрации</td>
                        <td>{props.regDate}</td>
                    </tr>
                    <tr>
                        <td>Викторин пройдено</td>
                        <td>{props.completedQuizzes}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

export default ProfileStatistics