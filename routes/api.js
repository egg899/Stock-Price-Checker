'use strict';

const express = require('express');

const fetch = require('node-fetch');

module.exports = function (app) {

  

  // Base de likes en memoria
  const stockLikes = {};

  // Función para obtener datos del stock
  async function getStockPrice(stock) {
    const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error al obtener datos de ${stock}`);
    const data = await res.json();
    return {
      stock: data.symbol,
      price: data.latestPrice
    };
  }

  app.get('/api/stock-prices', async (req, res) => {
    try {
      let { stock, like } = req.query;
      const ip = req.ip;
      like = like === 'true' || like === '1';

      if (!stock) return res.status(400).json({ error: 'No stock symbol provided' });

      if (!Array.isArray(stock)) {
        stock = [stock];
      }

      const results = [];

      for (let s of stock) {
        s = s.toUpperCase();
        const stockData = await getStockPrice(s);

        if (!stockLikes[s]) {
          stockLikes[s] = { likes: 0, ips: new Set() };
        }

        if (like && !stockLikes[s].ips.has(ip)) {
          stockLikes[s].likes++;
          stockLikes[s].ips.add(ip);
        }

        results.push({
          stock: stockData.stock,
          price: stockData.price,
          likes: stockLikes[s].likes
        });
      }

      if (results.length === 1) {
        return res.json({ stockData: results[0] });
      } else {
        const rel_likes0 = results[0].likes - results[1].likes;
        const rel_likes1 = results[1].likes - results[0].likes;

        return res.json({
          stockData: [
            { stock: results[0].stock, price: results[0].price, rel_likes: rel_likes0 },
            { stock: results[1].stock, price: results[1].price, rel_likes: rel_likes1 }
          ]
        });
      }

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
};
