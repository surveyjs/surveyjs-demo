import type { SurveyJSON } from "../src/schemas";

/**
 * The smallest checkout a visitor is allowed to store.
 *
 * A spec that needs `/starter` to complete in a couple of clicks used to write a
 * one-question definition under the checkout id. It cannot any more, and that is
 * the point: `PUT /api/storage/definitions/checkout` runs the form's own suite
 * (`src/schemas/tests/checkout.tests.json`) before it stores anything, so a
 * definition that no longer does what checkout does is refused — for a spec as
 * for anybody else.
 *
 * So this is a real checkout, only short: the two conditional blocks the suite is
 * about (the card panel, the separate billing address) and the review summary it
 * calculates, plus one free-text question on the last page for a spec to fill in.
 * It lints clean and passes all four tests.
 */
export const SHORT_CHECKOUT: SurveyJSON = {
  title: "Checkout",
  pages: [
    {
      name: "payment",
      elements: [
        {
          type: "radiogroup",
          name: "paymentMethod",
          title: "How would you like to pay?",
          defaultValue: "card",
          choices: [
            { value: "card", text: "Card" },
            { value: "paypal", text: "PayPal" },
          ],
        },
        {
          type: "panel",
          name: "cardPanel",
          visibleIf: "{paymentMethod} = 'card'",
          elements: [{ type: "text", name: "cardNumber", title: "Card number" }],
        },
        {
          type: "boolean",
          name: "billingSameAsShipping",
          title: "Billing address is the same as shipping",
          defaultValue: true,
        },
        {
          type: "panel",
          name: "billingAddress",
          visibleIf: "{billingSameAsShipping} = false",
          elements: [
            { type: "text", name: "billingAddress1", title: "Billing address" },
            { type: "text", name: "billingCity", title: "Billing city", isRequired: true },
          ],
        },
      ],
    },
    {
      name: "review",
      elements: [
        { type: "text", name: "fullName", title: "Full name" },
        { type: "text", name: "city", title: "City" },
        {
          type: "expression",
          name: "reviewShipTo",
          title: "Ship to",
          expression: "{fullName} + ', ' + {city}",
        },
        {
          type: "expression",
          name: "reviewBillTo",
          title: "Bill to",
          expression:
            "iif({billingSameAsShipping} = false, {billingAddress1} + ', ' + {billingCity}, 'Same as shipping')",
        },
        { type: "text", name: "note", title: "Anything else?" },
      ],
    },
  ],
};
