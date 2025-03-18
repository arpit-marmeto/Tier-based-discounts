// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  const eligibleLines = input.cart.lines
    .filter((line) => line.merchandise.product.hasAnyTag !== false && line.merchandise.product.metafield)
    .map((line) => {
      const { jsonValue } = line.merchandise.product.metafield;
      if (!Array.isArray(jsonValue)) {
        console.warn(`Metafield is not an array for product ${line.merchandise.product.id}`);
        return null;
      }

      // Find the highest applicable discount based on quantity
      const applicableDiscount = jsonValue
        .filter((rule) => line.quantity >= rule.quantity)
        .reduce((best, current) => (current.quantity > (best?.quantity || 0) ? current : best), null);

      if (!applicableDiscount || isNaN(applicableDiscount.discount)) {
        console.warn(`No valid discount found for product ${line.merchandise.product.id}`);
        return null;
      }

      return {
        targets: [{ cartLine: { id: line.id } }],
        value: { percentage: { value: applicableDiscount.discount.toString() } },
        message: applicableDiscount.message || "Volume discount applied",
      };
    })
    .filter(Boolean); // Remove null entries

  return {
    discounts: eligibleLines,
    discountApplicationStrategy: DiscountApplicationStrategy.All,
  };
}
