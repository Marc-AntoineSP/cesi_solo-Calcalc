/* eslint-disable import/no-extraneous-dependencies */
import { configDotenv } from 'dotenv';
import { Pool } from 'pg';

import QueryError from './errors/QueryError.js';
import type { Product } from './types.js';

configDotenv();
export default class Requests {
  private _connString = process.env.PGCONNSTRING;

  private _pool = new Pool({ connectionString: this._connString });

  // GET ALL PRODUCTS
  public async getAllItems():Promise<Product[]> {
    try {
      const res = await this._pool.query('SELECT * FROM Products');
      console.log(res.rows[0]);
      return res.rows;
    } catch (e) {
      console.error(e);
      throw new QueryError('Probleme de BDD');
    }
  }
}
