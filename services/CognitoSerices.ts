import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  IAuthenticationDetailsData,
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

  public forgotPassword(email: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const userPool = new CognitoUserPool(this.poolData);
      const userData: ICognitoUserData = {
        Username: email,
        Pool: userPool,
      };
      const user = new CognitoUser(userData);
      user.forgotPassword({
        onFailure(err) {
          reject(err);
        },
        onSuccess(data) {
          resolve(data);
        },
      });
    });
  }
  public confirmPassword(
    code: string,
    newPassord: string,
    email: string,
  ): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const userPool = new CognitoUserPool(this.poolData);
      const userData: ICognitoUserData = {
        Username: email,
        Pool: userPool,
      };
      const user = new CognitoUser(userData);
      user.confirmPassword(code, newPassord, {
        onFailure(err) {
          reject(err);
        },
        onSuccess(data) {
          resolve(data);
        },
      });
    });
  }
  public login(login: string, password: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const userPool = new CognitoUserPool(this.poolData);

      const userData: ICognitoUserData = {
        Username: login,
        Pool: userPool,
      };
      const authenticationDetailsData: IAuthenticationDetailsData = {
        Username: login,
        Password: password,
      };
      const authenticationDetails = new AuthenticationDetails(
        authenticationDetailsData,
      );
      const user = new CognitoUser(userData);

      user.authenticateUser(authenticationDetails, {
        onFailure(err) {
          reject(err);
        },
        onSuccess(session) {
          const accessToken = session.getAccessToken().getJwtToken();
          const refreshToken = session.getRefreshToken().getToken();
          resolve({
            email: login,
            token: accessToken,
            refreshToken,
          });
        },
      });
    });
  }
}
