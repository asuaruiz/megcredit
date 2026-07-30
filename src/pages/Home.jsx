import { Link } from 'react-router-dom';
import { posts } from '../data/posts.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx';

const smartCreditUrl = 'https://www.smartcredit.com/join/?pid=62622';
const reportEmail = 'mailto:info@magicenterprisegroup.com?subject=Reportes%20para%20evaluaci%C3%B3n%20de%20cr%C3%A9dito';

function Orbits() {
  return <svg className="hero-orbits" viewBox="0 0 1000 1000" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2"><circle cx="500" cy="500" r="300"/><ellipse cx="500" cy="500" rx="180" ry="440" transform="rotate(55 500 500)"/><ellipse cx="500" cy="500" rx="180" ry="440" transform="rotate(-55 500 500)"/></g></svg>;
}

export default function Home() {
  const { t } = useLanguage();
  return (
    <>
      <section className="hero on-navy">
        <Orbits />
        <div className="hero-inner">
          <span className="eyebrow centered">{t('home.eyebrowHero')}</span>
          <h1>{t('home.heroTitlePart1')} <em>{t('home.heroTitleEm')}</em></h1>
          <p className="lead">{t('home.heroLead')}</p>
          <div className="hero-actions"><a className="btn btn-primary" href="#evaluacion">{t('home.ctaEvaluation')}</a><Link className="btn btn-outline" to="/servicios">{t('home.ctaProcess')}</Link></div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head centered"><span className="eyebrow centered">{t('home.eyebrowMore')}</span><h2>{t('home.sectionTitleUnderstand')}</h2><p>{t('home.sectionLeadUnderstand')}</p></div>
          <div className="card-grid">
            <article className="card service-card"><span className="service-icon">01</span><h3>{t('home.card1Title')}</h3><p>{t('home.card1Text')}</p></article>
            <article className="card service-card"><span className="service-icon">02</span><h3>{t('home.card2Title')}</h3><p>{t('home.card2Text')}</p></article>
            <article className="card service-card"><span className="service-icon">03</span><h3>{t('home.card3Title')}</h3><p>{t('home.card3Text')}</p></article>
          </div>
        </div>
      </section>

      <section className="section evaluation-section" id="evaluacion">
        <div className="container">
          <div className="section-head"><span className="eyebrow">{t('home.eyebrowEvaluation')}</span><h2>{t('home.sectionTitleSteps')}</h2><p>{t('home.sectionLeadSteps')}</p></div>
          <div className="evaluation-grid">
            <article className="evaluation-step"><span className="step-number">01</span><div><h3>{t('home.step1Title')}</h3><p>{t('home.step1Text')}</p><Link className="inline-action" to="/contacto">{t('home.step1Link')}</Link></div></article>
            <article className="evaluation-step"><span className="step-number">02</span><div><h3>{t('home.step2Title')}</h3><p>{t('home.step2Text')}</p><a className="inline-action" href={smartCreditUrl} target="_blank" rel="sponsored noopener noreferrer">{t('home.step2Link')}</a><small>{t('home.step2Small')}</small></div></article>
            <article className="evaluation-step"><span className="step-number">03</span><div><h3>{t('home.step3Title')}</h3><p>{t('home.step3Text')}</p></div></article>
            <article className="evaluation-step"><span className="step-number">04</span><div><h3>{t('home.step4Title')}</h3><p>{t('home.step4Text')}</p><a className="inline-action" href={reportEmail}>{t('home.step4Link')}</a></div></article>
            <article className="evaluation-step"><span className="step-number">05</span><div><h3>{t('home.step5Title')}</h3><p>{t('home.step5Text')}</p></div></article>
          </div>
          <div className="privacy-callout"><strong>{t('home.privacyTitle')}</strong><p>{t('home.privacyText')}</p></div>
        </div>
      </section>

      <section className="section"><div className="container"><div className="section-head"><span className="eyebrow">{t('home.eyebrowLearn')}</span><h2>{t('home.sectionTitleGuides')}</h2><p>{t('home.sectionLeadGuides')}</p></div><div className="post-grid">{posts.map((post) => <Link className="card post-card" to={`/blog/${post.slug}`} key={post.slug}><div className="post-meta"><span className="category">{post.category}</span><span className="dot"/><span>{post.readTime}</span></div><h3>{post.title}</h3><p className="excerpt">{post.excerpt}</p><span className="read-more">{t('home.readGuide')}</span></Link>)}</div></div></section>
    </>
  );
}
