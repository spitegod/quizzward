import NavAdmin from '../../components/NavAdmin/NavAdmin'
import s from './UsersAdmin.module.css'

const UsersAdmin = () => {
  return (
    <div className={s.page}>
      <NavAdmin />
      <div className={s.content}>
        <h2 className={s.h2}>Список пользователей</h2>

        <div className={s.card}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <td className={s.colIndex}>№</td>
                  <td>Пользователь</td>
                  <td>Действие</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={s.colIndex}>1</td>
                  <td>spitegod</td>
                  <td>
                    <div className={s.actions}>
                      <button className={s.btnDanger}>Удалить</button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={s.colIndex}>1</td>
                  <td>spitegod</td>
                  <td>
                    <div className={s.actions}>
                      <button className={s.btnDanger}>Удалить</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

export default UsersAdmin
