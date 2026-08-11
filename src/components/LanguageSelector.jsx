import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { findIndexalPost, translationFor } from '../data/indexalPosts.js';

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  function selectLanguage(target) {
    setLanguage(target);

    if (target === 'en' && pathname.startsWith('/blog')) {
      const slugMatch = pathname.match(/^\/blog\/(.+)$/);
      const post = slugMatch ? findIndexalPost('es', slugMatch[1]) : null;
      const translation = post ? translationFor(post, 'en') : null;
      navigate(translation ? `/en/blog/${translation.slug}` : '/en/blog');
    } else if (target === 'es' && pathname.startsWith('/en/blog')) {
      const slugMatch = pathname.match(/^\/en\/blog\/(.+)$/);
      const post = slugMatch ? findIndexalPost('en', slugMatch[1]) : null;
      const translation = post ? translationFor(post, 'es') : null;
      navigate(translation ? `/blog/${translation.slug}` : '/blog');
    }
  }

  return (
    <div className="language-selector">
      <button
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => selectLanguage('en')}
        title="English"
      >
        EN
      </button>
      <span className="lang-separator">|</span>
      <button
        className={`lang-btn ${language === 'es' ? 'active' : ''}`}
        onClick={() => selectLanguage('es')}
        title="Español"
      >
        ES
      </button>
    </div>
  );
}
