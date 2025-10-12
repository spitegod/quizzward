import Nav from "../../components/Nav/Nav";
import ProfileStatistics from "../../components/ProfileStatistics/ProifileStatistics";
import s from "./Profile.module.css";

const Profile = () => {
    return (
        <div className={s.profileContainer}>
            <Nav />
            <main className={s.profileMain}>
                <header className={s.header}>
                    <div className={s.avatar} aria-hidden="true">S</div>
                    <div>
                        <h2 className={s.title}>Профиль</h2>
                        <h3 className={s.username}>spitegod</h3>
                    </div>
                </header>

                <section className={s.card}>
                    <ProfileStatistics
                        rating={"99"}
                        regDate={"11.11.2011"}
                        completedQuizzes={5}
                    />
                </section>
            </main>
        </div>
    );
};

export default Profile;
