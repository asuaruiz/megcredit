import { Link } from 'react-router-dom';
import { posts } from '../data/posts.jsx';

const smartCreditUrl = 'https://www.smartcredit.com/join/?pid=62622';
const reportEmail = 'mailto:info@magicenterprisegroup.com?subject=Reportes%20para%20evaluaci%C3%B3n%20de%20cr%C3%A9dito';

function Orbits() {
  return <svg className="hero-orbits" viewBox="0 0 1000 1000" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2"><circle cx="500" cy="500" r="300"/><ellipse cx="500" cy="500" rx="180" ry="440" transform="rotate(55 500 500)"/><ellipse cx="500" cy="500" rx="180" ry="440" transform="rotate(-55 500 500)"/></g></svg>;
}

export default function Home() {
  return (
    <>
      <section className="hero on-navy">
        <Orbits />
        <div className="hero-inner">
          <span className="eyebrow centered">Estrategia de crédito en español</span>
          <h1>Construye un crédito más sólido con <em>claridad y dirección</em></h1>
          <p className="lead">Revisamos tus tres reportes, identificamos oportunidades y te explicamos un plan responsable para avanzar hacia tus metas financieras.</p>
          <div className="hero-actions"><a className="btn btn-primary" href="#evaluacion">Solicitar mi evaluación</a><Link className="btn btn-outline" to="/servicios">Conocer el proceso</Link></div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head centered"><span className="eyebrow centered">Más que un puntaje</span><h2>Entiende tu situación antes de tomar decisiones</h2><p>La reparación de crédito responsable comienza revisando información, entendiendo tus derechos y definiendo una estrategia realista.</p></div>
          <div className="card-grid">
            <article className="card service-card"><span className="service-icon">01</span><h3>Análisis de los tres burós</h3><p>Comparamos Equifax, Experian y TransUnion para detectar diferencias, datos incompletos y posibles inconsistencias.</p></article>
            <article className="card service-card"><span className="service-icon">02</span><h3>Plan personalizado</h3><p>Organizamos los próximos pasos según tu reporte y tu objetivo, sin fórmulas genéricas ni promesas imposibles.</p></article>
            <article className="card service-card"><span className="service-icon">03</span><h3>Educación y seguimiento</h3><p>Te ayudamos a comprender el proceso y los hábitos que pueden fortalecer tu perfil a largo plazo.</p></article>
          </div>
        </div>
      </section>

      <section className="section evaluation-section" id="evaluacion">
        <div className="container">
          <div className="section-head"><span className="eyebrow">Evaluación inicial</span><h2>Estos son los pasos para evaluar tu crédito</h2><p>Completa el recorrido en orden. Tener información actualizada nos permite darte una orientación más precisa.</p></div>
          <div className="evaluation-grid">
            <article className="evaluation-step"><span className="step-number">01</span><div><h3>Comparte tus datos de contacto</h3><p>Envíanos tu nombre, teléfono, correo y el mejor horario para comunicarnos. También cuéntanos brevemente cuál es tu meta financiera.</p><Link className="inline-action" to="/contacto">Completar mis datos →</Link></div></article>
            <article className="evaluation-step"><span className="step-number">02</span><div><h3>Obtén tus reportes de los tres burós</h3><p>Necesitamos reportes recientes de Equifax, Experian y TransUnion. Puedes solicitarlos mediante SmartCredit en el siguiente enlace.</p><a className="inline-action" href={smartCreditUrl} target="_blank" rel="sponsored noopener noreferrer">Obtener mis tres reportes ↗</a><small>Enlace externo afiliado. Magic Enterprise Group podría recibir una compensación si te registras. La compra no garantiza resultados.</small></div></article>
            <article className="evaluation-step"><span className="step-number">03</span><div><h3>Descarga y revisa los documentos</h3><p>Confirma que los tres reportes estén completos y sean legibles. Anota cualquier cuenta, balance, dirección o pago tardío que no reconozcas.</p></div></article>
            <article className="evaluation-step"><span className="step-number">04</span><div><h3>Coordina el envío protegido de tus reportes</h3><p>Escríbenos primero para recibir instrucciones. No adjuntes reportes crediticios a un correo ordinario ni compartas tu contraseña de SmartCredit.</p><a className="inline-action" href={reportEmail}>Solicitar instrucciones de envío →</a></div></article>
            <article className="evaluation-step"><span className="step-number">05</span><div><h3>Recibe tu evaluación</h3><p>Revisaremos la información y coordinaremos una conversación para explicarte lo encontrado, tus opciones y los próximos pasos recomendados.</p></div></article>
          </div>
          <div className="privacy-callout"><strong>Antes de enviar información sensible</strong><p>Espera nuestras instrucciones, oculta números completos de Seguro Social y confirma que estás usando el canal acordado. Nunca solicitaremos tus contraseñas.</p></div>
        </div>
      </section>

      <section className="section"><div className="container"><div className="section-head"><span className="eyebrow">Aprende a tu ritmo</span><h2>Guías para tomar mejores decisiones</h2><p>Contenido claro para entender tu reporte, tu puntaje y el proceso de evaluación.</p></div><div className="post-grid">{posts.map((post) => <Link className="card post-card" to={`/blog/${post.slug}`} key={post.slug}><div className="post-meta"><span className="category">{post.category}</span><span className="dot"/><span>{post.readTime}</span></div><h3>{post.title}</h3><p className="excerpt">{post.excerpt}</p><span className="read-more">Leer guía →</span></Link>)}</div></div></section>
    </>
  );
}
