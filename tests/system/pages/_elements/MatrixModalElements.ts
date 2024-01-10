import { baseTestConfig } from '../../BaseTestConfig';

export class MatrixModalElements {
  userName = 'Enter username';
  userPassword = 'Enter password';
  logIn = 'Log in';
  logOut = 'Log out';
  logedIn = 'text=Logged in as';
  loggedOutBannerText = 'Log in to Matrix account';
  multisigLoggednInd = `text=@${baseTestConfig.matrix_username_1}:${baseTestConfig.matrix_server}`;
}
