import {
  CognitoUser,
  CognitoUserPool,
  ICognitoUserData,
  ICognitoUserPoolData,
} from "amazon-cognito-identity-js";

export class CognitoServices {
  constructor(private userPoolId: string, private clientId: string) {}

  private poolData: ICognitoUserPoolData = {
    UserPoolId: this.userPoolId,
    ClientId: this.clientId,
  };

  public singUp(email: string, password: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const userPool = new CognitoUserPool(this.poolData);
      const attributeList = [];
      userPool.signUp(
        email,
        password,
        attributeList,
        attributeList,
        (err, result) => {
          if (err) {
            reject(err);
          }
          resolve(result);
        },
      );
    });
  }

  public confirmEmail(code: string, email: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const userPool = new CognitoUserPool(this.poolData);
      const userData: ICognitoUserData = {
        Username: email,
        Pool: userPool,
      };
      const pool = new CognitoUser(userData);
      pool.confirmRegistration(code, true, (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }
}
