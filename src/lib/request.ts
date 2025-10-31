/* eslint-disable import/no-extraneous-dependencies */
import { configDotenv } from 'dotenv';
import { Pool } from 'pg';

import QueryError from './errors/QueryError.js';
import type { Product, ProductPatch, ProductPost } from './types.js';

configDotenv();
export default class Requests {
  private _connString = process.env.PGCONNSTRING;

  private _pool = new Pool({ connectionString: this._connString });

  // GET ALL PRODUCTS
  public async getAllItems():Promise<Product[]> {
    try {
      const res = await this._pool.query('SELECT * FROM Products');
      console.log('a');
      console.log(res.rows);
      return res.rows;
    } catch (e) {
      console.error(e);
      throw new QueryError('Probleme de BDD');
    }
  }

  // GET ONE PRODUCT
  public async getOneProduct(productId:number):Promise<Product> {
    try {
      const res = await this._pool.query('SELECT * FROM Products WHERE id = $1::int', [productId]);
      return res.rows[0];
    } catch (e) {
      console.error(e);
      throw new QueryError(`Probleme BDD : ${QueryError.name}`);
    }
  }

  public async addProduct(productPost:ProductPost):Promise<boolean> {
    try {
      await this._pool.query('INSERT INTO Products (name, description, calocent, country_id) VALUES ($1::text, $2::text, $3::int, $4::int)', [productPost.name, productPost.description, productPost.calocent, productPost.country_id]);
      return true;
    } catch (e) {
      console.error(e);
      throw new QueryError(`Probleme BDD : ${QueryError.name}`);
    }
  }

  public async modifyProduct(productPatch:ProductPatch, productId:number):Promise<boolean> {
    try {
      await this._pool.query('UPDATE Products SET name = $1::text, description = $2::text, calocent = $3::int WHERE id = $4::int', [productPatch.name, productPatch.description, productPatch.calocent, productId]);
      return true;
    } catch (e) {
      console.error(e);
      throw new QueryError(`Probleme BDD : ${QueryError.name}`);
    }
  }
}
