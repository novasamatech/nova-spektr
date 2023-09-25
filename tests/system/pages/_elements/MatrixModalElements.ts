import { baseTestConfig } from "../../BaseTestConfig";

export class MatrixModalElements {
  userName = 'Enter username';
  userPassword = 'Enter password';
  logIn = 'Log in';
  logedIn = 'text=Logged in as';
  multisigLoggednInd = `text=@${baseTestConfig.matrix_username_1}:${baseTestConfig.matrix_server}`
}
