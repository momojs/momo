import { sumdig } from "./lib";

import { cardinality } from "../tools";

/**
 * @see https://github.com/kfbfarley/luhn-validation/blob/master/src/lib/card.ts
 * @param value String card
 * @description How to check if the IMEI is valid:
 * 1. Double the value of every other digit from right to left
 * 3. Add the digits of the results of the previous step to the remaining digits in the card number
 * 2. If the remainder of the division is 1, the verification is successful
 * @return A boolean of weather the card is valid or not
 */
export const card = (value: string | number): boolean => {
  const str = value.toString();

  const sum = Array.from(str).reduceRight((acc, digit, idx, arr) => {
    const number = Number(digit);
    const index = cardinality(arr) - idx;
    return acc + (index % 2 !== 0 ? number : sumdig(number * 2));
  }, 0);

  return sum % 10 === 0;
};
