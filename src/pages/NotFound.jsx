import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';

export default function NotFound() {
  const { t } = useLanguage();
  return <section className="notfound"><span className="eyebrow">{t('notFound.eyebrow')}</span><h1>{t('notFound.title')}</h1><p>{t('notFound.text')}</p><Link className="btn btn-primary" to="/">{t('notFound.button')}</Link></section>;
}
