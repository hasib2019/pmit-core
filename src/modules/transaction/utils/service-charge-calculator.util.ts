/**
 * @author Md Raju Ahmed
 * @email rajucse1705@gmail.com
 * @create date 2022-03-21 10:06:43
 * @modify date 2022-03-21 10:06:43
 * @desc [description]
 */
import { ipmt, pmt } from "financial";
import { range } from "lodash";
import moment, { Moment } from "moment-timezone";
import { defaultDateFormat } from "../../../configs/app.config";
import {
  GracePeriodType,
  InstallmentType,
  InterestType,
  RoundingType,
  ServiceChargeAttrs,
} from "../../../modules/schedule/interfaces/schedule.interface";

export class ServiceChargeCalculator {
  protected principal: number;
  protected time: number;
  protected loanTerm: number;
  protected rate: number;
  protected charge: number = 0;
  protected type: InterestType;
  protected unitTime: number = 12;
  protected installmentPrincipal: number = 0;
  protected installmentAmount: number = 0;
  protected installmentType: InstallmentType;
  protected installmentNumber: number = 0;
  protected installmentServiceCharge: number = 0;
  protected installmentServiceChargeGracePeriod: number = 0;
  protected gracePeriodType: GracePeriodType = "EQUAL";
  protected gracePeriod: number = 0;
  protected gracePeriodServiceCharge: number = 0;
  protected disbursementDate: Moment;
  protected roundingValue: number = 5;
  protected roundingType: RoundingType = "C";

  constructor({
    principal = 0,
    loanTerm = 0,
    rate = 0,
    type = "F",
    installmentType = "M",
    installmentNumber = 0,
    gracePeriodType = "NO",
    gracePeriod = 0,
    disbursementDate = moment(),
    roundingType = "C",
    roundingValue = 5,
  }: ServiceChargeAttrs = {}) {
    this.principal = principal;
    this.loanTerm = loanTerm;
    this.rate = rate;
    this.type = type;
    this.installmentType = installmentType;
    this.gracePeriodType = gracePeriodType;
    this.gracePeriod = gracePeriod;
    this.disbursementDate = disbursementDate;
    this.roundingType = roundingType;
    this.roundingValue = roundingValue;

    this.calTime();
    this.calInstallmentNumber(installmentNumber);
    this.calUnitTime();
    this.calCharge();
    this.calInstallmentPrincipal();
    this.calInstallmentServiceCharge();
  }

  setPrincipal(principal: number) {
    this.principal = principal;
    return this.calCharge();
  }

  setTime(time: number) {
    this.time = time;
    if (this.installmentNumber > this.time || this.installmentNumber <= 0) {
      this.installmentNumber = this.time;
    }
    return this.calCharge();
  }

  setInstallmentNumber(value: number) {
    if (value) this.installmentNumber = value;
    return this.calCharge();
  }

  setRate(rate: number) {
    this.rate = rate;
    return this.calCharge();
  }

  setType(type: InterestType) {
    this.type = type;
    return this.calCharge();
  }

  protected calTime() {
    this.time = this.loanTerm - this.gracePeriod;
    return this;
  }

  protected calUnitTime() {
    if (this.installmentType === "W") this.unitTime = 52;
    return this;
  }

  protected calInstallmentNumber(installmentNumber: number) {
    if (installmentNumber) this.installmentNumber = installmentNumber;

    if (!this.installmentNumber && this.installmentType === "M") this.installmentNumber = this.time;

    if (this.installmentType === "W" && !this.installmentNumber) this.installmentNumber = (this.time / 12) * 52;

    return this.calInstallmentPrincipal();
  }

  protected calCharge() {
    if (this.principal == 0 || this.principal < 0) return this;

    //flat rate and no grace period or no charge in grace period
    if (this.type === "F" && (this.gracePeriodType == "NO" || this.gracePeriodType == "NO-CHARGE")) {
      const charge = (this.principal * this.rate * this.time) / (12 * 100);
      this.charge = this.round(charge);
    }

    //flat rate and equal grace period and monthly installment
    if (this.type == "F" && this.gracePeriodType == "EQUAL") {
      let chargeWithoutGracePeriod = 0,
        chargeInGracePeriod = 0;

      if (this.installmentType == "M") {
        chargeWithoutGracePeriod = (this.principal * this.rate * this.time) / (12 * 100);
        chargeInGracePeriod = (this.principal * this.rate * this.gracePeriod) / (12 * 100);
      }
      if (this.installmentType == "W") {
        chargeWithoutGracePeriod = (this.principal * this.rate * ((this.time / 12) * 52)) / (52 * 100);
        chargeInGracePeriod = (this.principal * this.rate * this.gracePeriod) / (52 * 100);
      }

      this.gracePeriodServiceCharge = this.round(chargeInGracePeriod);
      this.charge = this.round(chargeWithoutGracePeriod + chargeInGracePeriod);
    }

    //declined rate
    if (this.type === "D") {
      const periods = range(1, this.installmentNumber + 1);

      const ipmts = periods.map((p) =>
        ipmt(this.rate / (this.unitTime * 100), p, this.installmentNumber, -this.principal)
      );

      const charge = ipmts.reduce((a, b) => a + b);

      this.charge = this.round(charge);
    }

    return this.calInstallmentAmount();
  }

  protected calInstallmentPrincipal() {
    this.installmentPrincipal = this.roundNearest(
      this.roundingValue,
      Math.ceil(this.principal / this.installmentNumber),
      this.roundingType
    );

    return this.calInstallmentServiceCharge();
  }

  protected calInstallmentServiceCharge() {
    if (this.type == "F") {
      this.installmentServiceCharge = Math.floor(this.charge / this.installmentNumber);
      this.installmentServiceChargeGracePeriod = Math.floor(this.gracePeriodServiceCharge / this.installmentNumber);
    } else this.installmentServiceCharge = 0;

    return this;
  }

  protected calInstallmentAmount() {
    if (this.principal == 0 || this.principal < 0 || !this.installmentNumber || !this.charge) return this;

    let iAmount: number = 0;

    if (this.type === "F") {
      iAmount = (this.principal + this.charge) / this.installmentNumber;
      this.installmentAmount = this.roundNearest(this.roundingValue, iAmount, this.roundingType);
    }

    if (this.type === "D") {
      iAmount = pmt(this.rate / (this.unitTime * 100), this.installmentNumber, -this.principal);
      this.installmentAmount = this.round(iAmount);
    }

    return this.calInstallmentServiceCharge();
  }

  protected round(value: number, step?: number) {
    step || (step = 1);
    var inv = 1.0 / step;
    return Math.round(value * inv) / inv;
  }

  protected roundNearest(nearestValue: number, value: number, roundType: RoundingType = "C") {
    if (roundType == "F") return Math.floor(value / nearestValue) * nearestValue;
    return Math.ceil(value / nearestValue) * nearestValue;
  }

  get() {
    return {
      serviceCharge: this.charge,
      installmentPrincipal: this.installmentPrincipal,
      installmentServiceCharge: this.installmentServiceCharge,
      installmentServiceChargeGracePeriod: this.installmentServiceChargeGracePeriod,
      installmentAmount: this.installmentAmount || this.installmentPrincipal,
      principal: this.principal,
      loanTerm: this.loanTerm,
      time: this.time,
      rate: this.rate,
      charge: this.charge,
      type: this.type,
      installmentType: this.installmentType,
      installmentNumber: this.installmentNumber,
      gracePeriod: this.gracePeriod,
      gracePeriodType: this.gracePeriodType,
      gracePeriodServiceCharge: this.gracePeriodServiceCharge,
      disbursementDate: this.disbursementDate.format(defaultDateFormat),
      roundingType: this.roundingType,
      roundingValue: this.roundingValue,
    };
  }
}
