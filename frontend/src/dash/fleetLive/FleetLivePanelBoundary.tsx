import { Component, type ComponentChildren } from "preact";
import { t, type Lang } from "../../i18n";

interface Props {
  lang: Lang;
  children: ComponentChildren;
}

interface State {
  failed: boolean;
}

export default class FleetLivePanelBoundary extends Component<Props, State> {
  state: State = { failed: false };

  componentDidCatch(error: unknown): void {
    console.error("Fleet live telemetry panel failed", error);
    this.setState({ failed: true });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="og-fleet-live og-fleet-live--fallback" aria-labelledby="og-fleet-live-title">
        <h2 id="og-fleet-live-title" className="og-dashboard-sheet-title">
          {t("dash.live.title", this.props.lang)}
        </h2>
        <p role="status">{t("dash.live.error", this.props.lang)}</p>
      </section>
    );
  }
}
