// api.js
const fetch = require("node-fetch");
const helmet = require("helmet");

module.exports = function (app) {
  // Seguridad con Helmet
  app.use(
    helmet.contentSecurityPolicy({
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
      },
    })
  );

  const stockLikes = {};

  // Función para obtener datos de la API de stocks
  async function getStockPrice(stock) {
    const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`;
    const res = await fetch(url);
    const data = await res.json();
    return {
      stock: data.symbol,
      price: data.latestPrice,
    };
  }

  // Endpoint principal
  app.get("/api/stock-prices", async (req, res) => {
    try {
      let { stock, like } = req.query;
      const ip = req.ip;

      if (!Array.isArray(stock)) {
        stock = [stock];
      }

      const results = [];

      for (let s of stock) {
        s = s.toUpperCase();
        const stockData = await getStockPrice(s);

        // Manejar likes como número (1 o 0)
        if (!stockLikes[s]) {
          stockLikes[s] = { likes: 0, ips: new Set() };
        }

        if (like === "1" && !stockLikes[s].ips.has(ip)) {
          stockLikes[s].likes++;
          stockLikes[s].ips.add(ip);
        }

        results.push({
          stock: stockData.stock,
          price: stockData.price,
          likes: stockLikes[s].likes,
        });
      }

      if (results.length === 1) {
        res.json({ stockData: results[0] });
      } else {
        const rel_likes1 = results[0].likes - results[1].likes;
        const rel_likes2 = results[1].likes - results[0].likes;

        res.json({
          stockData: [
            { stock: results[0].stock, price: results[0].price, rel_likes: rel_likes1 },
            { stock: results[1].stock, price: results[1].price, rel_likes: rel_likes2 },
          ],
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
};
