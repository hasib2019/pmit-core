/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-03-21 11:06:22
 * @modify date 2022-03-21 11:06:22
 * @desc [description]
 */

import { ServiceChargeCalculator } from "../service-charge-calculator.util";

describe("test service charge", () => {
  it("tests the class", () => {
    const cal = new ServiceChargeCalculator();

    const data = cal.setPrincipal(10000).setRate(8).setTime(12).get();

    expect(data.serviceCharge).toEqual(800);
  });

  it("tests the loan period 6 months", () => {
    const cal = new ServiceChargeCalculator().setPrincipal(10000).setRate(8).setTime(6).get();

    expect(cal.serviceCharge).toEqual(400);
  });

  it("tests the loan period 24 months", () => {
    const charge = new ServiceChargeCalculator({
      principal: 10000,
      rate: 8,
      loanTerm: 24,
    }).get();

    expect(charge.serviceCharge).toEqual(1600);
  });

  it("tests decline service charge", () => {
    const data = new ServiceChargeCalculator({
      principal: 10000,
      rate: 8,
      loanTerm: 12,
      type: "D",
    }).get();

    expect(data.serviceCharge).toEqual(438.61);
  });

  it("tests decline service charge for 24 months", () => {
    const data = new ServiceChargeCalculator({
      principal: 10000,
      rate: 8,
      loanTerm: 24,
      type: "D",
    }).get();

    expect(data.serviceCharge).toEqual(854.55);
  });
});

describe("test installment amount", () => {
  it("tests the loan period 12 months", () => {
    const cal = new ServiceChargeCalculator().setPrincipal(10000).setRate(8).setTime(12).get();

    expect(cal.installmentAmount).toEqual(900);
  });

  it("tests the loan period 6 months", () => {
    const cal = new ServiceChargeCalculator().setPrincipal(10000).setRate(8).setTime(6).get();

    expect(cal.installmentAmount).toBeCloseTo(1735);
  });

  it("tests weekly installment", () => {
    const data = new ServiceChargeCalculator({
      principal: 10000,
      rate: 8,
      loanTerm: 12,
      installmentNumber: 52,
    }).get();

    expect(data.installmentAmount).toBeCloseTo(210, 2);
  });

  it("tests decline weekly installment", () => {
    const data = new ServiceChargeCalculator({
      principal: 10000,
      rate: 8,
      loanTerm: 12,
      installmentNumber: 52,
      type: "D",
      installmentType: "W",
    }).get();

    expect(data.installmentAmount).toBeCloseTo(200.25, 2);
  });
});
