import { Notice } from "../../ui/foundation";
import { t, useLang } from "../../i18n";
import { useEffect } from "preact/hooks";
import "./login.css";

export default function Login() {
  const [lang, setLang] = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
    const control = document.querySelector(".login__language");
    control?.setAttribute("data-current-lang", lang);
    control?.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
    });
    const email = document.querySelector<HTMLInputElement>(".login__field input[type=email]");
    const password = document.querySelector<HTMLInputElement>(".login__field input[type=password]");
    if (email) email.placeholder = t("login.emailPlaceholder", lang);
    if (password) password.placeholder = t("login.passwordPlaceholder", lang);
  }, [lang]);

  return (
    <div className="login">
      <h1 className="og-visually-hidden">{t("login.pageTitle", lang)}</h1>
      <header className="login__top">
        <a href="/" className="login__back">← {t("login.back", lang)}</a>
        <div className="login__language" data-current-lang={lang} role="group" aria-label={t("login.language", lang)}>
          <button type="button" data-lang="en" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
          <button type="button" data-lang="es" aria-pressed={lang === "es"} onClick={() => setLang("es")}>ES</button>
        </div>
      </header>
      <main className="login__main">
        <section className="login__card" aria-labelledby="login-title">
          <div className="login__brand" aria-hidden="true">OG</div>
          <p className="login__system">{t("login.system", lang)}</p>
          <h2 id="login-title">{t("login.title", lang)}</h2>
          <p className="login__intro">{t("login.intro", lang)}</p>
          <label className="login__field"><span>{t("login.emailLabel", lang)}</span><input type="email" placeholder={t("login.emailPlaceholder", lang)} autoComplete="email" /></label>
          <label className="login__field"><span>{t("login.passwordLabel", lang)}</span><input type="password" placeholder={t("login.passwordPlaceholder", lang)} autoComplete="current-password" /></label>
          <label className="login__remember"><input type="checkbox" disabled /><span>{t("login.keepSignedIn", lang)}</span><small>{t("login.unavailable", lang)}</small></label>
          <Notice lang={lang} kind="simulation">
            <span>{t("login.prototypeNotice", lang)}</span>
          </Notice>
          <a className="login__submit" href="/fleet">{t("login.enterDemo", lang)} <span aria-hidden="true">↗</span></a>
          <p className="login__footnote">{t("login.footnote", lang)}</p>
        </section>
      </main>
      <footer className="login__footer"><span>{t("login.brand", lang)}</span><span>{t("login.scope", lang)}</span></footer>
    </div>
  );
}
