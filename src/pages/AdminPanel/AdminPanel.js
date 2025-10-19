import NavAdmin from "../../components/NavAdmin/NavAdmin"
import s from './AdminPanel.module.css'

const AdminPanel = () => {
  return (
    <div className={s.page}>
      <NavAdmin />
      <div className={s.content}>
        <h2 className={s.h2}>Добро пожаловать!</h2>
        <p className={s.sub}>Вы находитесь в панели администратора веб-приложения Quizzward</p>

        <div className={s.card}>
          <h3 className={s.h3}>Активные пользователи</h3>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.colIndex}>№</th>
                  <th>Пользователь</th>
                  <th className={s.mono}>Время онлайн, мин</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={`${s.colIndex} ${s.mono}`}>1</td>
                  <td>spitegod</td>
                  <td className={s.mono}>100</td>
                </tr>
                <tr>
                  <td className={`${s.colIndex} ${s.mono}`}>2</td>
                  <td>denis</td>
                  <td className={s.mono}>200</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
