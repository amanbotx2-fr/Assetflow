import type { PageShellConfig, ShellPanel } from "../config/developerBPages";

interface FeaturePageShellProps {
  page: PageShellConfig;
}

const renderRows = (items: string[]) =>
  items.map((item) => (
    <li className="feature-placeholder-row" key={item}>
      <span className="feature-placeholder-line" aria-hidden="true" />
      <span>{item}</span>
    </li>
  ));

const panelClassName = (panel: ShellPanel) =>
  ["feature-panel", panel.span === "wide" ? "feature-panel--wide" : "", panel.span === "tall" ? "feature-panel--tall" : ""]
    .filter(Boolean)
    .join(" ");

export function FeaturePageShell({ page }: FeaturePageShellProps) {
  return (
    <main className="feature-page" aria-labelledby="feature-page-title">
      <div className="feature-page__inner">
        <header className="feature-page__header">
          <div>
            <p className="feature-page__eyebrow">{page.eyebrow}</p>
            <h1 id="feature-page-title">{page.title}</h1>
            <p className="feature-page__description">{page.description}</p>
          </div>
          <aside className="feature-page__intent" aria-label="Layout intent">
            <span>Phase 1 shell</span>
            <p>{page.layoutIntent}</p>
          </aside>
        </header>

        <section className="feature-summary-grid" aria-label={`${page.title} scaffold areas`}>
          {page.summaryAreas.map((area) => (
            <div className="feature-summary-item" key={area}>
              <span className="feature-summary-item__marker" aria-hidden="true" />
              <span>{area}</span>
            </div>
          ))}
        </section>

        <section className="feature-panel-grid" aria-label={`${page.title} page layout`}>
          {page.panels.map((panel) => (
            <article className={panelClassName(panel)} key={panel.title}>
              <div className="feature-panel__header">
                <h2>{panel.title}</h2>
                <p>{panel.description}</p>
              </div>
              <ul className="feature-placeholder-list" aria-label={`${panel.title} placeholder regions`}>
                {renderRows(panel.placeholderItems)}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
