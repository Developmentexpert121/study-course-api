import bcrypt from "bcryptjs";
import conf from "../conf/hash.conf";
import * as CryptoJS from 'crypto-js';

export default {
  /**
   *
   * @param hashedPassword Hashed Password from the database
   * @param plainPassword Plain Password sent by the client
   *
   * @returns {Boolean}
   */
  compare: async (plainPassword: string, hashedPassword: string) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },
  /**
   *
   * @param plainPassword
   */
  generate: async (plainPassword: string) => {
    return await bcrypt.hash(plainPassword, conf.saltRounds);
  },

  decrypt: async (encryptedPassword: string) => {
    const bytes  = CryptoJS.AES.decrypt(encryptedPassword, conf.encryptSecret);
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedPassword;
  },
};