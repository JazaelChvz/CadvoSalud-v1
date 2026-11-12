import React from 'react';

// Referencias puntuales de terceros, asociadas por CLUES tras revisar nombre y dirección.
export const externalRatings = {
  DGSMP000450: { rating: '4.8', count: 5, source: 'DrLoop', url: 'https://drloop.com.mx/o7539-hospital-de-la-sierra/', checked: '12 de noviembre de 2026' },
  DGSMP000223: { rating: '4.94', count: 771, source: 'Cylex / Yably', url: 'https://www.cylex.mx/durango-durango/hospital%20cl%C3%ADnica%20de%20diagn%C3%B3stico%20del%20guadiana-11414851.html', checked: '12 de noviembre de 2026' },
  DGSMP000124: { rating: '3.9', count: 14, source: 'Cylex / Yably', url: 'https://www.cylex.mx/durango-durango/hospital+fatima-11414938.html', checked: '12 de noviembre de 2026' },
  DGSMP000800: { rating: '3.99', count: 71, source: 'Cylex / Yably', url: 'https://www.cylex.mx/durango-durango/hospital+del+parque-11876246.html', checked: '12 de noviembre de 2026' },
  DGSMP000206: { rating: '4.89', count: 1183, source: 'Cylex / Yably', url: 'https://www.cylex.mx/durango-durango/hospital+san+jorge+sa+de+cv-11092485.html', checked: '12 de noviembre de 2026' },
  DFSMP001123: { rating: '3.59', count: 629, source: 'Cylex / Yably', url: 'https://www.cylex.mx/ciudad-de-mexico/centro+hospitalario+sanatorio+durango-11159543.html', checked: '12 de noviembre de 2026' },
  DFSSA003973: { rating: '3.8', count: 1805, source: 'DrLoop', url: 'https://drloop.com.mx/o8358-hospital-general-de-mexico-dr-eduardo-liceaga/', checked: '12 de noviembre de 2026' },
  DFSSA003944: { rating: '3.8', count: 989, source: 'DrLoop', url: 'https://drloop.com.mx/o1141-hospital-juarez-de-mexico/', checked: '12 de noviembre de 2026' },
  DFSMP000032: { rating: '4.2', count: 6, source: 'Yelp', url: 'https://m.yelp.com/biz/hospital-espa%C3%B1ol-m%C3%A9xico', checked: '12 de noviembre de 2026' },
};

const disputedCenters = {
  DGSMP000462: 'Por verificar',
  DGSMP000474: 'Por verificar',
};

export function VerificationNotice({ clues }) {
  return <p className="verification-notice">{disputedCenters[clues] || 'Por verificar'}</p>;
}

export default function ExternalRating({ clues }) {
  const rating = externalRatings[clues];
  return rating
    ? <p className="external-card-rating"><strong>{rating.rating} / 5</strong> · {rating.count} votos según <a href={rating.url} target="_blank" rel="noreferrer">{rating.source}</a><br/><small>Consulta puntual: {rating.checked}. Puede estar desactualizada.</small></p>
    : <p className="external-card-rating">Calificación externa: no disponible</p>;
}
