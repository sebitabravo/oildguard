import { Notice } from "../../ui/foundation";
import { t } from "../../i18n";
import "./login.css";

export default function Login() {
  // Solo español (S03): sin botones de idioma ni sincronía; el shell declara es.

  return (
    <div className="login">
      <h1 className="og-visually-hidden">{t("login.pageTitle")}</h1>
      <header className="login__top">
        <a href="/" className="login__back">← {t("login.back")}</a>
      </header>
      <main className="login__main">
        <section className="login__card" aria-labelledby="login-title">
          <div className="login__brand" aria-hidden="true">OG</div>
          <p className="login__system">{t("login.system")}</p>
          <h2 id="login-title">{t("login.title")}</h2>
          <p className="login__intro">{t("login.intro")}</p>
          <label className="login__field" htmlFor="login-email"><span>{t("login.emailLabel")}</span><input id="login-email" type="email" placeholder={t("login.emailPlaceholder")} autoComplete="email" /></label>
          <label className="login__field" htmlFor="login-password"><span>{t("login.passwordLabel")}</span><input id="login-password" type="password" placeholder={t("login.passwordPlaceholder")} autoComplete="current-password" /></label>
          <label className="login__remember"><input type="checkbox" disabled /><span>{t("login.keepSignedIn")}</span><small>{t("login.unavailable")}</small></label>
          <Notice kind="simulation">
            <span>{t("login.prototypeNotice")}</span>
          </Notice>
          <a className="login__submit" href="/fleet">{t("login.enterDemo")} <span aria-hidden="true">↗</span></a>
          <p className="login__footnote">{t("login.footnote")}</p>
        </section>
      </main>
      <footer className="login__footer"><span>{t("login.brand")}</span><span>{t("login.scope")}</span></footer>
    </div>
  );
}
