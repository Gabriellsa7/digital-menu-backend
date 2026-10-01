export interface IParamsSendSms {
  to: string;
  message: string;
}

export interface ISmsProvider {
  sendSms(params: IParamsSendSms): Promise<void>;
}
