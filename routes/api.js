'use strict';

const helmet = require("helmet");
const axios = require('axios');
const Stock = require('../models/Stock');

module.exports = function (app) {

  // Helmet básico (incluye varias protecciones por defecto)
  app.use(helmet.hidePoweredBy());
  app.use(helmet.frameguard({ action: 'DENY' }));
  app.use(helmet.noSniff());
  app.use(helmet.ieNoOpen());

  // HSTS por 90 días
  const ninetyDaysInSeconds = 90 * 24 * 60 * 60;
  app.use(helmet.hsts({ maxAge: ninetyDaysInSeconds, force: true }));

  app.use(helmet.dnsPrefetchControl());

  // Desactivar cache
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // Content Security Policy (solo scripts y CSS del mismo servidor)
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"]
    }
  }));

  app.route('/api/stock-prices').get(async (req, res) => {
    try {
      let { stock } = req.query;
      const like = req.query.like === 'true';

      if (!Array.isArray(stock)) {
        stock = [stock];
      }

      stock = stock.map(s => s.replace(/^['"]+|['"]+$/g, ""));

      const userIp = req.ip || req.connection.remoteAddress;
      const anonymizeIp = (ip) => ip.replace(/\d+$/, '0');
      const anonIp = anonymizeIp(userIp);

      const results = [];

      for (const symbol of stock) {
        try {
          const response = await axios.get(
            `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`
          );

          const data = response.data;
          let stockDoc = await Stock.findOne({ stock: data.symbol });

          if (!stockDoc) {
            stockDoc = new Stock({ stock: data.symbol, likes: 0, ips: [] });
          }

          if (like && !stockDoc.ips.includes(anonIp)) {
            stockDoc.likes++;
            stockDoc.ips.push(anonIp);
          }

          await stockDoc.save();

          results.push({
            stock: data.symbol,
            price: data.latestPrice,
            likes: stockDoc.likes
          });

        } catch (error) {
          results.push({
            stock: symbol,
            error: 'No se pudo obtener la información'
          });
        }
      }

      if (results.length === 2) {
        const likes0 = results[0].likes;
        const likes1 = results[1].likes;

        results[0].rel_likes = likes0 - likes1;
        results[1].rel_likes = likes1 - likes0;
      }

      res.json(results);

    } catch (e) {
      console.error('Error en /api/stock:', e.message);
      res.status(500).json({ error: 'internal server error' });
    }
  });
};
