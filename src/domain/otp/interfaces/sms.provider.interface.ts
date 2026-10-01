export interface IParamsSendSms {
  /** E.164 phone */
  to: string;
  message: string;
}

export interface ISmsProvider {
  sendSms(params: IParamsSendSms): Promise<void>;
}
