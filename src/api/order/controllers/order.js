"use strict";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products, userId, email, totalPrice } = ctx.request.body;

    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::item.item")
            .findOne(product.id);

          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.name,
              },
              unit_amount: (item.price * 100).toFixed(0),
            },
            quantity: product.count,
          };
        })
      );

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        mode: "payment",
        success_url: "http://localhost:3000/checkout/success",
        cancel_url: "http://localhost:3000/cart",
        line_items: lineItems,
      });

      const response = await strapi.service("api::order.order").create({
        data: { userId, products, totalPrice, stripeSessionId: session.id },
      });

      console.log("response", response);

      return { id: session.id };
    } catch (error) {
      ctx.response.status = 500;
      return {
        error: {
          message: `There was a problem creating a charge. ${error.message}`,
        },
      };
    }
  },
}));
