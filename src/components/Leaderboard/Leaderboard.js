const Leaderboard = () => {
    return (
        <div>
            <h3>Таблица лидеров</h3>
            <table>
                <thead>
                    <th>№</th>
                    <th>Пользователь</th>
                    <th>Очки</th>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>spitegod</td>
                        <td>100</td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>denis</td>
                        <td>99</td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td>pavel</td>
                        <td>80</td>
                    </tr>
                    <tr>
                        <td>4</td>
                        <td>anatoliy</td>
                        <td>70</td>
                    </tr>
                    <tr>
                        <td>5</td>
                        <td>michael</td>
                        <td>60</td>
                    </tr>
                    <tr>
                        <td>49</td>
                        <td>You</td>
                        <td>3</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

export default Leaderboard