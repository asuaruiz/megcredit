import { Link } from 'react-router-dom';
export default function NotFound() { return <section className="notfound"><span className="eyebrow">Error 404</span><h1>Esta página no existe</h1><p>La dirección puede haber cambiado o estar incompleta.</p><Link className="btn btn-primary" to="/">Volver al inicio</Link></section>; }
